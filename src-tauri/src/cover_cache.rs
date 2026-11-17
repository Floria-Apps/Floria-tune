use std::collections::{HashMap, VecDeque};
use std::path::PathBuf;
use std::sync::Arc;

use tokio::sync::Mutex;

/// In-memory budget for decoded cover art bytes.
const MAX_MEMORY_BYTES: usize = 64 * 1024 * 1024;
/// Single cover larger than this is never cached (avoids poisoning the cache).
const MAX_ENTRY_BYTES: usize = 12 * 1024 * 1024;

pub struct CoverCache {
    dir: Option<PathBuf>,
    inner: Mutex<Inner>,
}

struct Inner {
    order: VecDeque<String>,
    entries: HashMap<String, Arc<Vec<u8>>>,
    bytes: usize,
}

impl CoverCache {
    pub fn new(dir: Option<PathBuf>) -> Self {
        if let Some(d) = &dir {
            let _ = std::fs::create_dir_all(d);
        }
        Self {
            dir,
            inner: Mutex::new(Inner {
                order: VecDeque::new(),
                entries: HashMap::new(),
                bytes: 0,
            }),
        }
    }

    pub async fn stats(&self) -> (usize, usize) {
        let inner = self.inner.lock().await;
        (inner.entries.len(), inner.bytes)
    }

    fn key(namespace: &str, id: &str, size: Option<i32>) -> String {
        format!("{}-{}-{}", namespace, fnv1a(id), size.unwrap_or(0))
    }

    /// Stable hash for a server/namespace string (used to key the cache per server).
    pub fn hash_str(s: &str) -> u64 {
        fnv1a(s)
    }

    /// Look up a cover in memory, then on disk. Promotes hits to memory.
    pub async fn get(
        &self,
        namespace: &str,
        id: &str,
        size: Option<i32>,
    ) -> Option<Arc<Vec<u8>>> {
        let key = Self::key(namespace, id, size);

        {
            let mut inner = self.inner.lock().await;
            if let Some(bytes) = inner.entries.get(&key).cloned() {
                inner.order.retain(|k| k != &key);
                inner.order.push_back(key.clone());
                return Some(bytes);
            }
        }

        if let Some(dir) = &self.dir {
            let path = dir.join(format!("{}.bin", key));
            if let Ok(bytes) = tokio::fs::read(&path).await {
                if !bytes.is_empty() && bytes.len() <= MAX_ENTRY_BYTES {
                    let arc = Arc::new(bytes);
                    let mut inner = self.inner.lock().await;
                    Self::insert_memory(&mut inner, key, arc.clone());
                    return Some(arc);
                }
            }
        }

        None
    }

    /// Store a cover in memory and (asynchronously) on disk.
    pub async fn put(
        &self,
        namespace: &str,
        id: &str,
        size: Option<i32>,
        bytes: Vec<u8>,
    ) {
        if bytes.is_empty() || bytes.len() > MAX_ENTRY_BYTES {
            return;
        }
        let key = Self::key(namespace, id, size);
        let arc = Arc::new(bytes.clone());

        {
            let mut inner = self.inner.lock().await;
            Self::insert_memory(&mut inner, key.clone(), arc);
        }

        if let Some(dir) = &self.dir {
            let path = dir.join(format!("{}.bin", key));
            let bytes = bytes.clone();
            let dir = dir.clone();
            tauri::async_runtime::spawn(async move {
                let _ = tokio::fs::write(path, bytes).await;
                Self::prune_disk(dir).await;
            });
        }
    }

    /// Drop every cached cover (memory + disk).
    pub async fn clear(&self) {
        {
            let mut inner = self.inner.lock().await;
            inner.order.clear();
            inner.entries.clear();
            inner.bytes = 0;
        }
        if let Some(dir) = &self.dir {
            if let Ok(mut entries) = tokio::fs::read_dir(dir).await {
                while let Ok(Some(entry)) = entries.next_entry().await {
                    let path = entry.path();
                    if path.extension().and_then(|e| e.to_str()) == Some("bin") {
                        let _ = tokio::fs::remove_file(path).await;
                    }
                }
            }
        }
    }

    fn insert_memory(inner: &mut Inner, key: String, bytes: Arc<Vec<u8>>) {
        if let Some(old) = inner.entries.remove(&key) {
            inner.bytes = inner.bytes.saturating_sub(old.len());
            inner.order.retain(|k| k != &key);
        }

        while inner.bytes + bytes.len() > MAX_MEMORY_BYTES && !inner.order.is_empty() {
            if let Some(old_key) = inner.order.pop_front() {
                if let Some(old) = inner.entries.remove(&old_key) {
                    inner.bytes = inner.bytes.saturating_sub(old.len());
                }
            } else {
                break;
            }
        }

        inner.bytes += bytes.len();
        inner.entries.insert(key.clone(), bytes);
        inner.order.push_back(key);
    }

    /// Cap the on-disk cache at a fixed number of files, dropping the oldest.
    async fn prune_disk(dir: PathBuf) {
        const MAX_DISK_FILES: usize = 800;
        let mut entries: Vec<(std::time::SystemTime, std::path::PathBuf)> = Vec::new();
        if let Ok(mut rd) = tokio::fs::read_dir(&dir).await {
            while let Ok(Some(entry)) = rd.next_entry().await {
                let path = entry.path();
                if path.extension().and_then(|e| e.to_str()) != Some("bin") {
                    continue;
                }
                let mtime = entry
                    .metadata()
                    .await
                    .ok()
                    .and_then(|m| m.modified().ok())
                    .unwrap_or(std::time::UNIX_EPOCH);
                entries.push((mtime, path));
            }
        }
        if entries.len() <= MAX_DISK_FILES {
            return;
        }
        entries.sort_by_key(|(t, _)| *t);
        let to_remove = entries.len() - MAX_DISK_FILES;
        for (_, path) in entries.into_iter().take(to_remove) {
            let _ = tokio::fs::remove_file(path).await;
        }
    }
}

/// FNV-1a 64-bit, deterministic across runs (no dependency on DefaultHasher).
fn fnv1a(input: &str) -> u64 {
    let mut hash: u64 = 0xcbf29ce484222325;
    for byte in input.bytes() {
        hash ^= byte as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

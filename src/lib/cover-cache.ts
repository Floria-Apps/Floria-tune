import { fetchCoverBytes } from "../services/tauri";

const DB_NAME = "floria-tune-covers";
const STORE = "covers";
const DB_VERSION = 2;
const MAX_ENTRIES = 600;
const MAX_MEMORY = 400;
const TTL_MS = 21 * 24 * 60 * 60 * 1000;
const MAX_CONCURRENT = 4;

interface StoredCover {
  key: string;
  blob: Blob;
  storedAt: number;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "key" });
          store.createIndex("storedAt", "storedAt");
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function idbGet(db: IDBDatabase, key: string): Promise<StoredCover | null> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as StoredCover) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function idbPut(db: IDBDatabase, entry: StoredCover): Promise<void> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

function idbDelete(db: IDBDatabase, key: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function idbPrune(db: IDBDatabase): Promise<void> {
  const count = await new Promise<number>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    } catch {
      resolve(0);
    }
  });

  if (count <= MAX_ENTRIES) return;

  const toRemove = count - Math.floor(MAX_ENTRIES * 0.85);
  if (toRemove <= 0) return;

  const keys: string[] = [];
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readonly");
      const idx = tx.objectStore(STORE).index("storedAt");
      const req = idx.openCursor();
      req.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor && keys.length < toRemove) {
          keys.push(cursor.value.key);
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });

  for (const k of keys) {
    await idbDelete(db, k);
  }
}

function sniffMime(bytes: Uint8Array): string {
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return "image/jpeg";
}

// In-memory LRU of object URLs (survives component unmounts).
const memory = new Map<string, string>();
const memoryOrder: string[] = [];

function touchMemory(key: string, url: string): void {
  if (memory.has(key)) {
    const idx = memoryOrder.indexOf(key);
    if (idx >= 0) memoryOrder.splice(idx, 1);
  }
  memory.set(key, url);
  memoryOrder.push(key);
  while (memoryOrder.length > MAX_MEMORY) {
    const old = memoryOrder.shift();
    if (!old) break;
    const u = memory.get(old);
    if (u) URL.revokeObjectURL(u);
    memory.delete(old);
  }
}

// In-flight deduplication.
const pending = new Map<string, Promise<string>>();

// Concurrency limiter.
let active = 0;
const queue: Array<() => void> = [];

function schedule<T>(fn: () => Promise<T>, priority: boolean): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const run = () => {
      active++;
      fn()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          active--;
          const next = queue.shift();
          if (next) next();
        });
    };
    if (active < MAX_CONCURRENT) {
      run();
    } else if (priority) {
      queue.unshift(run);
    } else {
      queue.push(run);
    }
  });
}

async function fetchCoverBytesWithRetry(id: string, size?: number): Promise<Uint8Array> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fetchCoverBytes(id, size);
    } catch (error) {
      lastError = error;
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

let writes = 0;

export async function getCoverUrl(id: string, size?: number, priority = false): Promise<string> {
  const key = `${id}:${size ?? 0}`;

  const cached = memory.get(key);
  if (cached) {
    const idx = memoryOrder.indexOf(key);
    if (idx >= 0) {
      memoryOrder.splice(idx, 1);
      memoryOrder.push(key);
    }
    return cached;
  }

  const inFlight = pending.get(key);
  if (inFlight) return inFlight;

  const promise = (async () => {
    const db = await openDb();

    if (db) {
      const stored = await idbGet(db, key);
      if (stored) {
        if (Date.now() - stored.storedAt < TTL_MS) {
          const url = URL.createObjectURL(stored.blob);
          touchMemory(key, url);
          return url;
        }
        await idbDelete(db, key);
      }
    }

    const bytes = await schedule(() => fetchCoverBytesWithRetry(id, size), priority);
    const blob = new Blob([bytes as unknown as BlobPart], { type: sniffMime(bytes) });
    const url = URL.createObjectURL(blob);
    touchMemory(key, url);

    if (db) {
      idbPut(db, { key, blob, storedAt: Date.now() })
        .then(() => {
          writes++;
          if (writes % 25 === 0) void idbPrune(db);
        })
        .catch(() => {});
    }

    return url;
  })();

  pending.set(key, promise);
  try {
    return await promise;
  } catch (error) {
    pending.delete(key);
    throw error;
  } finally {
    pending.delete(key);
  }
}

export function prefetchCover(id: string, size?: number): void {
  void getCoverUrl(id, size, false).catch(() => {});
}

export async function clearCoverCache(): Promise<void> {
  // Revoke all in-memory object URLs.
  for (const url of memory.values()) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  }
  memory.clear();
  memoryOrder.length = 0;
  pending.clear();

  const db = await openDb();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      } catch {
        resolve();
      }
    });
  }
}

export async function getCacheStats(): Promise<{ entries: number; maxEntries: number }> {
  const db = await openDb();
  let entries = 0;
  if (db) {
    entries = await new Promise<number>((resolve) => {
      try {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(0);
      } catch {
        resolve(0);
      }
    });
  }
  return { entries, maxEntries: MAX_ENTRIES };
}

// Exported for Tauri command bridge
export { getCacheStats as fetchCoverCacheStats };

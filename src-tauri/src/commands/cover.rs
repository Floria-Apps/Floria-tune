use tauri::{ipc::Response, State};

use crate::config::load;
use crate::cover_cache::CoverCache;
use crate::state::AppState;
use crate::subsonic::client::fetch_cover_art;

#[tauri::command]
pub async fn get_cover_art(
    state: State<'_, AppState>,
    cache: State<'_, CoverCache>,
    id: String,
    size: Option<i32>,
) -> Result<Response, String> {
    let size = size.map(|s| s.clamp(32, 1200));

    let settings = load();
    let ns_input = format!(
        "{}|{}|{}|{}",
        settings.navidrome_local_url.as_deref().unwrap_or(""),
        settings.navidrome_external_url.as_deref().unwrap_or(""),
        settings.navidrome_url_mode.as_deref().unwrap_or(""),
        settings.navidrome_username.as_deref().unwrap_or(""),
    );
    let namespace = crate::cover_cache::CoverCache::hash_str(&ns_input).to_string();

    if let Some(bytes) = cache.get(&namespace, &id, size).await {
        return Ok(Response::new(bytes.as_ref().clone()));
    }

    let client = state.navidrome_client().await?;
    let bytes = fetch_cover_art(&client, &id, size)
        .await
        .map_err(|e| e.to_string())?;

    if bytes.is_empty() {
        return Err("empty cover art".to_string());
    }

    cache.put(&namespace, &id, size, bytes.clone()).await;
    Ok(Response::new(bytes))
}

#[tauri::command]
pub async fn clear_cover_cache(cache: State<'_, CoverCache>) -> Result<(), String> {
    cache.clear().await;
    Ok(())
}

#[tauri::command]
pub async fn get_cover_cache_stats(cache: State<'_, CoverCache>) -> Result<(u64, u64), String> {
    let (entries, _bytes) = cache.stats().await;
    Ok((entries as u64, 600))
}

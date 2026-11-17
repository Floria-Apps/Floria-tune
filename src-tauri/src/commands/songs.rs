use tauri::State;

use crate::api::error::ApiError;
use crate::api::parse_pagination;
use crate::models::{Paginated, Song};
use crate::state::AppState;
use crate::subsonic::client::{fetch_song, fetch_songs_paginated};

/// List songs with validated pagination and optional query.
///
/// An empty query is interpreted by Navidrome as "all songs".
///
/// # Errors
/// Returns a typed `ApiError` JSON envelope on failure.
#[tauri::command]
pub async fn get_songs(
    state: State<'_, AppState>,
    page: Option<u32>,
    limit: Option<u32>,
    query: Option<String>,
) -> Result<Paginated<Song>, String> {
    let (page, limit, offset) = parse_pagination(page, limit)?;
    let q = query.unwrap_or_default();

    let client = state.navidrome_client().await?;
    let (raw, total) = fetch_songs_paginated(&client, &q, offset, limit as usize)
        .await
        .map_err(|e| String::from(ApiError::from(e)))?;

    let items = raw.into_iter().map(Song::from).collect();
    Ok(Paginated::new(items, page, limit, total))
}

/// Fetch a single song by ID.
///
/// # Errors
/// Returns a typed error envelope when the song is missing or the
/// upstream server is unreachable.
#[tauri::command]
pub async fn get_song(state: State<'_, AppState>, id: String) -> Result<Song, String> {
    if id.trim().is_empty() {
        return Err("id da música não pode ser vazio".into());
    }

    let client = state.navidrome_client().await?;
    let song = fetch_song(&client, &id)
        .await
        .map_err(|e| String::from(ApiError::from(e)))?;
    Ok(Song::from(song))
}

/// Return a random selection of songs.
///
/// `size` is clamped to the range `[1, 500]` and defaults to 8.
///
/// # Errors
/// Returns a typed error envelope when the upstream server is unreachable.
#[tauri::command]
pub async fn get_random_songs(
    state: State<'_, AppState>,
    size: Option<i32>,
) -> Result<Vec<Song>, String> {
    let size = size.unwrap_or(8).clamp(1, 500);
    let client = state.navidrome_client().await?;
    let songs = client
        .get_random_songs(&opensubsonic::RandomSongsOptions::new().size(size))
        .await
        .map_err(|e| String::from(ApiError::from(crate::subsonic::SubsonicError::Upstream(e))))?;
    Ok(songs.into_iter().map(Song::from).collect())
}

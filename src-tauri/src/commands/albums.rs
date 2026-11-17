use tauri::State;

use crate::api::error::ApiError;
use crate::api::parse_pagination;
use crate::models::{Album, Paginated, Song};
use crate::state::AppState;
use crate::subsonic::client::{fetch_album, fetch_albums_paginated};

/// List albums (newest first) with validated pagination.
///
/// # Errors
/// Returns a typed `ApiError` JSON envelope on failure.
#[tauri::command]
pub async fn get_albums(
    state: State<'_, AppState>,
    page: Option<u32>,
    limit: Option<u32>,
) -> Result<Paginated<Album>, String> {
    let (page, limit, offset) = parse_pagination(page, limit)?;

    let client = state.navidrome_client().await?;
    let (raw, total) = fetch_albums_paginated(
        &client,
        opensubsonic::AlbumListType::Newest,
        offset,
        limit as usize,
    )
    .await
    .map_err(|e| String::from(ApiError::from(e)))?;

    let items = raw.into_iter().map(Album::from).collect();
    Ok(Paginated::new(items, page, limit, total))
}

/// Fetch a single album by ID.
///
/// # Errors
/// Returns a typed error envelope when the album is missing or the
/// upstream server is unreachable.
#[tauri::command]
pub async fn get_album(state: State<'_, AppState>, id: String) -> Result<Album, String> {
    if id.trim().is_empty() {
        return Err("id do álbum não pode ser vazio".into());
    }

    let client = state.navidrome_client().await?;
    let album = fetch_album(&client, &id).await.map_err(|e| e.to_string())?;
    Ok(Album::from(album))
}

/// List every song contained in an album.
///
/// # Errors
/// Returns a typed error envelope when the album is missing or the
/// upstream server is unreachable.
#[tauri::command]
pub async fn get_album_songs(state: State<'_, AppState>, id: String) -> Result<Vec<Song>, String> {
    if id.trim().is_empty() {
        return Err("id do álbum não pode ser vazio".into());
    }

    let client = state.navidrome_client().await?;
    let album = fetch_album(&client, &id)
        .await
        .map_err(|e| String::from(ApiError::from(e)))?;
    Ok(album.song.into_iter().map(Song::from).collect())
}

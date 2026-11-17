use tauri::State;

use crate::api::error::ApiError;
use crate::api::parse_pagination;
use crate::models::{Artist, Paginated};
use crate::state::AppState;
use crate::subsonic::client::{fetch_artist, fetch_artist_info, fetch_artists_paginated};

/// List artists with validated pagination.
///
/// # Errors
/// Returns a typed `ApiError` JSON envelope on failure (invalid params,
/// upstream unavailable, or configuration problems).
#[tauri::command]
pub async fn get_artists(
    state: State<'_, AppState>,
    page: Option<u32>,
    limit: Option<u32>,
) -> Result<Paginated<Artist>, String> {
    let (page, limit, offset) = parse_pagination(page, limit)?;

    let client = state.navidrome_client().await?;
    let (raw, total) = fetch_artists_paginated(&client, offset, limit as usize)
        .await
        .map_err(|e| String::from(ApiError::from(e)))?;

    let items = raw.into_iter().map(Artist::from).collect();
    Ok(Paginated::new(items, page, limit, total))
}

/// Fetch a single artist by ID, including biography/description.
///
/// Uses the Navidrome `get_artist_info2` endpoint to retrieve the biography,
/// then maps it into our local `Artist` type so the ArtistPage can display it.
///
/// # Errors
/// Returns `not_found` when the artist does not exist or the upstream
/// server reports an error.
#[tauri::command]
pub async fn get_artist(state: State<'_, AppState>, id: String) -> Result<Artist, String> {
    if id.trim().is_empty() {
        return Err("id do artista não pode ser vazio".into());
    }

    let client = state.navidrome_client().await?;
    // Fetch the basic artist data first
    let raw_artist = fetch_artist(&client, &id)
        .await
        .map_err(|e| String::from(ApiError::from(e)))?;

    // Fetch the artist info (biography) separately
    let info = fetch_artist_info(&client, &id)
        .await
        .map_err(|e| String::from(ApiError::from(e)))?;

    let description = info
        .biography
        .map(|b| b.trim().to_string())
        .filter(|s| !s.is_empty());

    // Construct our Artist, using cover_art from the basic artist fetch
    Ok(Artist {
        id: raw_artist.id,
        name: raw_artist.name,
        album_count: raw_artist.album_count,
        cover_art: raw_artist.cover_art,
        music_brainz_id: raw_artist.music_brainz_id,
        description,
    })
}

/// Fetch every album released by a given artist.
///
/// # Errors
/// Returns a typed error envelope when the artist is missing or the
/// upstream server is unreachable.
#[tauri::command]
pub async fn get_artist_albums(
    state: State<'_, AppState>,
    id: String,
) -> Result<Vec<crate::models::Album>, String> {
    if id.trim().is_empty() {
        return Err("id do artista não pode ser vazio".into());
    }

    let client = state.navidrome_client().await?;
    let artist = fetch_artist(&client, &id)
        .await
        .map_err(|e| String::from(ApiError::from(e)))?;
    Ok(artist
        .album
        .into_iter()
        .map(crate::models::Album::from)
        .collect())
}
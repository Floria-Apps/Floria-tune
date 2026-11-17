use tauri::State;

use crate::api::error::ApiError;
use crate::models::SearchResults;
use crate::state::AppState;
use crate::subsonic::client::search_all;

/// Search across artists, albums, and songs with a validated limit.
///
/// An empty query returns an empty result set.
///
/// # Errors
/// Returns a typed `ApiError` JSON envelope on failure.
#[tauri::command]
pub async fn search(
    state: State<'_, AppState>,
    query: String,
    limit: Option<i32>,
) -> Result<SearchResults, String> {
    if query.trim().is_empty() {
        return Ok(SearchResults::empty());
    }

    let limit = limit.unwrap_or(20).clamp(1, 100);
    let client = state.navidrome_client().await?;
    let raw = search_all(&client, &query, limit)
        .await
        .map_err(|e| String::from(ApiError::from(e)))?;
    Ok(SearchResults::from_subsonic(raw))
}

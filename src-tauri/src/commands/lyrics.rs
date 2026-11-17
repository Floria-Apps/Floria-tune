use tauri::State;

use crate::models::LyricsList;
use crate::state::AppState;

#[tauri::command]
pub async fn get_lyrics(state: State<'_, AppState>, id: String) -> Result<LyricsList, String> {
    let client = state.navidrome_client().await?;
    let lyrics = client
        .get_lyrics_by_song_id(&id, Some(true))
        .await
        .map_err(|e| e.to_string())?;
    Ok(LyricsList::from(lyrics))
}

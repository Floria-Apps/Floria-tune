use tauri::State;

use crate::audio::AudioEngine;
use crate::state::AppState;

#[tauri::command]
pub async fn play_song(
    state: State<'_, AppState>,
    engine: State<'_, AudioEngine>,
    id: String,
) -> Result<(), String> {
    let client = state.navidrome_client().await?;
    let url = client
        .stream_url(&id, &opensubsonic::StreamOptions::new())
        .map_err(|e| e.to_string())?;

    engine.initialize()?;
    engine.load(url.as_str())?;

    // Restore saved volume from settings after loading the track.
    if let Ok(settings) = std::fs::read_to_string(crate::config::settings_path()) {
        if let Ok(parsed) = serde_json::from_str::<crate::config::Settings>(&settings) {
            if let Some(volume) = parsed.volume {
                let _ = engine.set_volume(volume as f64);
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub fn pause(engine: State<'_, AudioEngine>) -> Result<(), String> {
    engine.set_paused(true)
}

#[tauri::command]
pub fn resume(engine: State<'_, AudioEngine>) -> Result<(), String> {
    engine.set_paused(false)
}

#[tauri::command]
pub fn toggle_pause(engine: State<'_, AudioEngine>) -> Result<bool, String> {
    engine.toggle_pause()
}

#[tauri::command]
pub fn set_volume(engine: State<'_, AudioEngine>, volume: f64) -> Result<(), String> {
    engine.set_volume(volume)
}

#[tauri::command]
pub fn seek(engine: State<'_, AudioEngine>, seconds: f64) -> Result<(), String> {
    engine.seek(seconds)
}

#[tauri::command]
pub fn stop_playback(engine: State<'_, AudioEngine>) -> Result<(), String> {
    engine.stop()
}

#[tauri::command]
pub fn get_position(engine: State<'_, AudioEngine>) -> Result<f64, String> {
    // Use the underlying mpv property; fallback 0.
    engine.get_position()
}

#[tauri::command]
pub fn get_duration(engine: State<'_, AudioEngine>) -> Result<f64, String> {
    engine.get_duration()
}

#[tauri::command]
pub fn is_paused(engine: State<'_, AudioEngine>) -> Result<bool, String> {
    engine.is_paused()
}

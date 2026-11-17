use tauri::State;

use crate::audio::AudioEngine;

#[tauri::command]
pub fn audio_init(engine: State<'_, AudioEngine>) -> Result<(), String> {
    engine.initialize()
}

#[tauri::command]
pub fn audio_load(path: String, engine: State<'_, AudioEngine>) -> Result<(), String> {
    engine.load(&path)
}

#[tauri::command]
pub fn audio_toggle_pause(engine: State<'_, AudioEngine>) -> Result<bool, String> {
    engine.toggle_pause()
}

#[tauri::command]
pub fn audio_set_paused(paused: bool, engine: State<'_, AudioEngine>) -> Result<(), String> {
    engine.set_paused(paused)
}

#[tauri::command]
pub fn audio_set_volume(volume: f64, engine: State<'_, AudioEngine>) -> Result<(), String> {
    engine.set_volume(volume)
}

#[tauri::command]
pub fn audio_seek(seconds: f64, engine: State<'_, AudioEngine>) -> Result<(), String> {
    engine.seek(seconds)
}

#[tauri::command]
pub fn audio_stop(engine: State<'_, AudioEngine>) -> Result<(), String> {
    engine.stop()
}

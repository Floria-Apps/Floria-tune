mod api;
mod audio;
mod commands;
mod config;
mod cover_cache;
mod db;
mod models;
mod state;
mod subsonic;
mod tray;
mod listenbrainz;

#[cfg(test)]
mod tests;

use audio::AudioEngine;
use db::Db;
use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db = Db::new().expect("failed to open database");

    tauri::Builder::default()
        .manage(AudioEngine::default())
        .manage(AppState::default())
        .manage(db)
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                let _ = window.hide();
                api.prevent_close();
            }
            _ => {}
        })
        .setup(|app| {
            let dir = app.path().app_cache_dir().ok().map(|p| p.join("covers"));
            app.manage(cover_cache::CoverCache::new(dir));

            // Ensure the window has an icon on every platform (Wayland taskbars
            // do not always pick up the bundle icon automatically).
            if let Some(window) = app.get_webview_window("main") {
                const ICON_BYTES: &[u8] = include_bytes!("../icons/128x128.png");
                if let Ok(icon) = tauri::image::Image::from_bytes(ICON_BYTES) {
                    let _ = window.set_icon(icon);
                }
            }

            if let Err(err) = crate::tray::create_tray(app.handle()) {
                eprintln!("tray creation failed: {}", err);
            }
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::audio_init,
            commands::audio_load,
            commands::audio_toggle_pause,
            commands::audio_set_paused,
            commands::audio_set_volume,
            commands::audio_seek,
            commands::audio_stop,
            commands::get_connection_status,
            commands::cover::get_cover_art,
            commands::cover::clear_cover_cache,
            commands::get_artists,
            commands::get_artist,
            commands::get_artist_albums,
            commands::get_albums,
            commands::get_album,
            commands::get_album_songs,
            commands::get_songs,
            commands::get_song,
            commands::get_random_songs,
            commands::get_lyrics,
            commands::search,
            commands::get_settings,
            commands::update_settings,
            commands::test_connection,
            commands::star_item,
            commands::unstar_item,
            commands::get_starred,
            commands::get_playlists,
            commands::get_playlist,
            commands::create_playlist,
            commands::update_playlist,
            commands::delete_playlist,
            commands::get_recommendations_songs,
            commands::get_top_songs,
            commands::get_album_info,
            commands::get_artist_info,
            commands::get_genres,
            commands::get_songs_by_genre,
            commands::get_now_playing,
            commands::scrobble_song,
            commands::get_music_folders,
            commands::play_song,
            commands::pause,
            commands::resume,
            commands::toggle_pause,
            commands::set_volume,
            commands::seek,
            commands::stop_playback,
            commands::get_position,
            commands::get_duration,
            commands::is_paused,
            commands::db_get_preference,
            commands::db_set_preference,
            commands::db_add_history,
            commands::db_get_history,
            commands::update_tray_info,
            commands::listenbrainz_test_token,
            commands::listenbrainz_scrobble,
            commands::listenbrainz_now_playing,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

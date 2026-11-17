use tauri::AppHandle;

#[tauri::command]
pub fn update_tray_info(
    app: AppHandle,
    title: Option<String>,
    artist: Option<String>,
    is_paused: bool,
) -> Result<(), String> {
    let _ = crate::tray::update_tray_info(&app, title, artist, is_paused);
    Ok(())
}

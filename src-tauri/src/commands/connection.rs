use tauri::State;

use crate::state::AppState;

#[derive(serde::Serialize)]
pub struct ConnectionStatusDto {
    pub status: &'static str,
    pub service: &'static str,
    pub navidrome: &'static str,
}

#[tauri::command]
pub async fn get_connection_status(
    state: State<'_, AppState>,
) -> Result<ConnectionStatusDto, String> {
    let client = state.navidrome_client().await?;
    client.ping().await.map_err(|e| e.to_string())?;

    Ok(ConnectionStatusDto {
        status: "online",
        service: "floria-tune",
        navidrome: "connected",
    })
}

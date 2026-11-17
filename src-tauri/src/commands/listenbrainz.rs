use crate::config::{self};
use crate::listenbrainz;

#[tauri::command]
pub async fn listenbrainz_test_token(token: Option<String>) -> Result<String, String> {
    let final_token = if let Some(t) = token {
        if t.is_empty() {
            crate::config::load().listenbrainz_token.ok_or("token não configurado")?
        } else {
            t
        }
    } else {
        crate::config::load().listenbrainz_token.ok_or("token não configurado")?
    };

    listenbrainz::validate_token(&final_token).await
}

#[derive(serde::Deserialize)]
pub struct ScrobbleRequest {
    pub artist: String,
    pub track: String,
    pub album: Option<String>,
    pub duration_ms: Option<i64>,
}

#[tauri::command]
pub async fn listenbrainz_scrobble(
    request: ScrobbleRequest,
) -> Result<(), String> {
    let settings = config::load();
    if !settings.listenbrainz_enabled.unwrap_or(false) {
        return Err("ListenBrainz desabilitado".into());
    }
    let token = settings.listenbrainz_token.ok_or("token não configurado")?;

    listenbrainz::submit_listen(
        &token,
        "single",
        &request.artist,
        &request.track,
        request.album.as_deref(),
        request.duration_ms,
    ).await
}

#[tauri::command]
pub async fn listenbrainz_now_playing(
    request: ScrobbleRequest,
) -> Result<(), String> {
    let settings = config::load();
    if !settings.listenbrainz_enabled.unwrap_or(false) {
        return Ok(()); // Silently ignore if disabled
    }
    let token = match settings.listenbrainz_token {
        Some(t) => t,
        None => return Ok(()),
    };

    let _ = listenbrainz::submit_listen(
        &token,
        "playing_now",
        &request.artist,
        &request.track,
        request.album.as_deref(),
        request.duration_ms,
    ).await;
    Ok(())
}

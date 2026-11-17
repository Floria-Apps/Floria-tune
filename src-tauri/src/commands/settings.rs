use tauri::State;

use crate::config::{
    self, AUTH_API_KEY, AUTH_PASSWORD, Settings, URL_MODE_AUTO, URL_MODE_EXTERNAL, URL_MODE_LOCAL,
};
use crate::state::AppState;
use crate::subsonic::client;

#[derive(serde::Serialize)]
pub struct SettingsResponse {
    pub navidrome_local_url: Option<String>,
    pub navidrome_external_url: Option<String>,
    pub navidrome_url_mode: String,
    pub navidrome_auth_method: String,
    pub navidrome_username: Option<String>,
    pub has_password: bool,
    pub has_api_key: bool,
    pub theme_seed: Option<String>,
    pub color_mode: Option<String>,
    pub lyrics_font_family: Option<String>,
    pub lyrics_font_size_active: Option<f32>,
    pub lyrics_font_size_inactive: Option<f32>,
    pub lyrics_font_size_unsynced: Option<f32>,
    pub lyrics_font_weight_active: Option<String>,
    pub lyrics_font_weight_inactive: Option<String>,
    pub lyrics_line_height: Option<f32>,
    pub lyrics_letter_spacing: Option<f32>,
    pub lyrics_alignment: Option<String>,
    pub lyrics_color_active: Option<String>,
    pub lyrics_color_inactive: Option<String>,
    pub lyrics_color_passed: Option<String>,
    pub lyrics_opacity_inactive: Option<f32>,
    pub lyrics_margin_x: Option<f32>,
    pub lyrics_scroll_position: Option<f32>,
    pub lyrics_animation_speed: Option<f32>,
    pub locale: Option<String>,
    pub has_listenbrainz_token: bool,
    pub listenbrainz_enabled: bool,
    pub volume: Option<f32>,
    pub status: &'static str,
}

fn view_response(settings: &Settings, status: &'static str) -> SettingsResponse {
    let view = config::SettingsView::from(settings);
    SettingsResponse {
        navidrome_local_url: view.navidrome_local_url,
        navidrome_external_url: view.navidrome_external_url,
        navidrome_url_mode: view.navidrome_url_mode,
        navidrome_auth_method: view.navidrome_auth_method,
        navidrome_username: view.navidrome_username,
        has_password: view.has_password,
        has_api_key: view.has_api_key,
        theme_seed: view.theme_seed,
        color_mode: view.color_mode,
        lyrics_font_family: view.lyrics_font_family,
        lyrics_font_size_active: view.lyrics_font_size_active,
        lyrics_font_size_inactive: view.lyrics_font_size_inactive,
        lyrics_font_size_unsynced: view.lyrics_font_size_unsynced,
        lyrics_font_weight_active: view.lyrics_font_weight_active,
        lyrics_font_weight_inactive: view.lyrics_font_weight_inactive,
        lyrics_line_height: view.lyrics_line_height,
        lyrics_letter_spacing: view.lyrics_letter_spacing,
        lyrics_alignment: view.lyrics_alignment,
        lyrics_color_active: view.lyrics_color_active,
        lyrics_color_inactive: view.lyrics_color_inactive,
        lyrics_color_passed: view.lyrics_color_passed,
        lyrics_opacity_inactive: view.lyrics_opacity_inactive,
        lyrics_margin_x: view.lyrics_margin_x,
        lyrics_scroll_position: view.lyrics_scroll_position,
        locale: view.locale,
        lyrics_animation_speed: view.lyrics_animation_speed,
        has_listenbrainz_token: view.has_listenbrainz_token,
        listenbrainz_enabled: view.listenbrainz_enabled,
        volume: view.volume,
        status,
    }
}

#[tauri::command]
pub fn get_settings() -> Result<SettingsResponse, String> {
    Ok(view_response(&config::load(), "ok"))
}

#[derive(serde::Deserialize, Default, Clone)]
pub struct UpdateSettingsRequest {
    /// Legacy field: treated as the external URL.
    pub navidrome_url: Option<String>,
    pub navidrome_local_url: Option<String>,
    pub navidrome_external_url: Option<String>,
    pub navidrome_url_mode: Option<String>,
    pub navidrome_auth_method: Option<String>,
    pub navidrome_username: Option<String>,
    pub navidrome_password: Option<String>,
    pub navidrome_api_key: Option<String>,
    pub theme_seed: Option<String>,
    pub color_mode: Option<String>,
    pub lyrics_font_family: Option<String>,
    pub lyrics_font_size_active: Option<f32>,
    pub lyrics_font_size_inactive: Option<f32>,
    pub lyrics_font_size_unsynced: Option<f32>,
    pub lyrics_font_weight_active: Option<String>,
    pub lyrics_font_weight_inactive: Option<String>,
    pub lyrics_line_height: Option<f32>,
    pub lyrics_letter_spacing: Option<f32>,
    pub lyrics_alignment: Option<String>,
    pub lyrics_color_active: Option<String>,
    pub lyrics_color_inactive: Option<String>,
    pub lyrics_color_passed: Option<String>,
    pub lyrics_opacity_inactive: Option<f32>,
    pub lyrics_margin_x: Option<f32>,
    pub lyrics_scroll_position: Option<f32>,
    pub locale: Option<String>,
    pub lyrics_animation_speed: Option<f32>,
    /// ListenBrainz token (never stored empty if not provided).
    pub listenbrainz_token: Option<String>,
    /// Whether direct LB scrobbling is enabled.
    pub listenbrainz_enabled: Option<bool>,
    /// Player volume (0-100 scale).
    pub volume: Option<f32>,
}

fn set_optional(target: &mut Option<String>, value: String) {
    let trimmed = value.trim();
    *target = if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    };
}

fn normalize_url_mode(value: &str) -> Result<String, String> {
    match value.trim() {
        URL_MODE_AUTO => Ok(URL_MODE_AUTO.into()),
        URL_MODE_LOCAL => Ok(URL_MODE_LOCAL.into()),
        URL_MODE_EXTERNAL => Ok(URL_MODE_EXTERNAL.into()),
        _ => Err("preferência de rede inválida.".into()),
    }
}

fn normalize_auth_method(value: &str) -> Result<String, String> {
    match value.trim() {
        AUTH_PASSWORD => Ok(AUTH_PASSWORD.into()),
        AUTH_API_KEY => Ok(AUTH_API_KEY.into()),
        _ => Err("método de autenticação inválido.".into()),
    }
}

fn normalize_color_mode(value: &str) -> Result<Option<String>, String> {
    match value.trim() {
        "" => Ok(None),
        "light" | "dark" | "system" => Ok(Some(value.trim().to_string())),
        _ => Err("tema inválido.".into()),
    }
}

/// Merge a request into `settings` and report whether connection fields changed.
fn apply_request(settings: &mut Settings, request: &UpdateSettingsRequest) -> Result<bool, String> {
    let mut connection_changed = false;

    if let Some(value) = &request.navidrome_url {
        set_optional(&mut settings.navidrome_external_url, value.clone());
        connection_changed = true;
    }
    if let Some(value) = &request.navidrome_local_url {
        set_optional(&mut settings.navidrome_local_url, value.clone());
        connection_changed = true;
    }
    if let Some(value) = &request.navidrome_external_url {
        set_optional(&mut settings.navidrome_external_url, value.clone());
        connection_changed = true;
    }
    if let Some(value) = &request.navidrome_url_mode {
        settings.navidrome_url_mode = Some(normalize_url_mode(value)?);
        connection_changed = true;
    }
    if let Some(value) = &request.navidrome_auth_method {
        settings.navidrome_auth_method = Some(normalize_auth_method(value)?);
        connection_changed = true;
    }
    if let Some(value) = &request.navidrome_username {
        set_optional(&mut settings.navidrome_username, value.clone());
        connection_changed = true;
    }

    // Empty secrets keep the current value, so the UI never has to resend them.
    if let Some(password) = &request.navidrome_password
        && !password.is_empty()
    {
        settings.navidrome_password = Some(password.clone());
        connection_changed = true;
    }
    if let Some(api_key) = &request.navidrome_api_key
        && !api_key.is_empty()
    {
        settings.navidrome_api_key = Some(api_key.clone());
        connection_changed = true;
    }

    if let Some(value) = &request.theme_seed {
        set_optional(&mut settings.theme_seed, value.clone());
    }
    if let Some(value) = &request.color_mode {
        settings.color_mode = normalize_color_mode(value)?;
    }

    // Lyrics typography settings
    if let Some(value) = &request.lyrics_font_family {
        set_optional(&mut settings.lyrics_font_family, value.clone());
    }
    if let Some(value) = request.lyrics_font_size_active {
        settings.lyrics_font_size_active = Some(value);
    }
    if let Some(value) = request.lyrics_font_size_inactive {
        settings.lyrics_font_size_inactive = Some(value);
    }
    if let Some(value) = request.lyrics_font_size_unsynced {
        settings.lyrics_font_size_unsynced = Some(value);
    }
    if let Some(value) = &request.lyrics_font_weight_active {
        settings.lyrics_font_weight_active = Some(value.clone());
    }
    if let Some(value) = &request.lyrics_font_weight_inactive {
        settings.lyrics_font_weight_inactive = Some(value.clone());
    }
    if let Some(value) = request.lyrics_line_height {
        settings.lyrics_line_height = Some(value);
    }
    if let Some(value) = request.lyrics_letter_spacing {
        settings.lyrics_letter_spacing = Some(value);
    }
    if let Some(value) = &request.lyrics_alignment {
        settings.lyrics_alignment = Some(value.clone());
    }
    if let Some(value) = &request.lyrics_color_active {
        set_optional(&mut settings.lyrics_color_active, value.clone());
    }
    if let Some(value) = &request.lyrics_color_inactive {
        set_optional(&mut settings.lyrics_color_inactive, value.clone());
    }
    if let Some(value) = &request.lyrics_color_passed {
        set_optional(&mut settings.lyrics_color_passed, value.clone());
    }
    if let Some(value) = request.lyrics_opacity_inactive {
        settings.lyrics_opacity_inactive = Some(value);
    }
    if let Some(value) = request.lyrics_margin_x {
        settings.lyrics_margin_x = Some(value);
    }
    if let Some(value) = request.lyrics_scroll_position {
        settings.lyrics_scroll_position = Some(value);
    }
    if let Some(value) = &request.locale {
        set_optional(&mut settings.locale, value.clone());
    }
    if let Some(value) = request.lyrics_animation_speed {
        settings.lyrics_animation_speed = Some(value);
    }

    // ListenBrainz settings
    if let Some(token) = &request.listenbrainz_token {
        set_optional(&mut settings.listenbrainz_token, token.clone());
    }
    if let Some(enabled) = request.listenbrainz_enabled {
        settings.listenbrainz_enabled = Some(enabled);
    }

    // Volume setting (0-100 scale to match frontend and audio engine)
    if let Some(value) = request.volume {
        settings.volume = Some(value.clamp(0.0, 100.0));
    }

    Ok(connection_changed)
}

#[derive(serde::Serialize)]
pub struct TestConnectionResponse {
    pub url: String,
    pub status: &'static str,
}

/// Validate the credentials and URLs without persisting anything.
#[tauri::command]
pub async fn test_connection(
    request: UpdateSettingsRequest,
) -> Result<TestConnectionResponse, String> {
    let mut settings = config::load();
    apply_request(&mut settings, &request)?;

    let (url, _) = client::probe(&settings)
        .await
        .map_err(|error| error.to_string())?;

    Ok(TestConnectionResponse {
        url,
        status: "connected",
    })
}

#[tauri::command]
pub async fn update_settings(
    state: State<'_, AppState>,
    request: UpdateSettingsRequest,
) -> Result<SettingsResponse, String> {
    let mut settings = config::load();
    let connection_changed = apply_request(&mut settings, &request)?;

    // Only touch the network when connection fields actually changed. Saving
    // appearance preferences must keep working while Navidrome is offline.
    if connection_changed {
        client::probe(&settings)
            .await
            .map_err(|error| error.to_string())?;
    }

    config::save(&settings).map_err(|error| error.to_string())?;
    state.reset_navidrome();

    let status = if connection_changed {
        "connected"
    } else {
        "saved"
    };

    Ok(view_response(&settings, status))
}

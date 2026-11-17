use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

pub const AUTH_PASSWORD: &str = "password";
pub const AUTH_API_KEY: &str = "api_key";
pub const URL_MODE_AUTO: &str = "auto";
pub const URL_MODE_LOCAL: &str = "local";
pub const URL_MODE_EXTERNAL: &str = "external";

/// Persisted application preferences and Navidrome connection settings.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Settings {
    /// Legacy single URL. Migrated to `navidrome_external_url` on load.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub navidrome_url: Option<String>,
    pub navidrome_local_url: Option<String>,
    pub navidrome_external_url: Option<String>,
    /// `auto` (try local, then external), `local` or `external`.
    pub navidrome_url_mode: Option<String>,
    /// `password` or `api_key`.
    pub navidrome_auth_method: Option<String>,
    pub navidrome_username: Option<String>,
    pub navidrome_password: Option<String>,
    pub navidrome_api_key: Option<String>,
    pub theme_seed: Option<String>,
    pub color_mode: Option<String>,
    /// Player volume in range 0.0 (silent) to 100.0 (max), persisted in settings.json.
    pub volume: Option<f32>,
    /// Lyrics typography settings, stored as JSON string in settings.json.
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
    /// UI locale (e.g. "pt-BR", "en-US").
    pub locale: Option<String>,
    /// ListenBrainz user token for direct scrobbling.
    pub listenbrainz_token: Option<String>,
    pub listenbrainz_enabled: Option<bool>,
}

/// View returned to clients: never includes secrets.
#[derive(Debug, Clone, Serialize)]
pub struct SettingsView {
    pub navidrome_local_url: Option<String>,
    pub navidrome_external_url: Option<String>,
    pub navidrome_url_mode: String,
    pub navidrome_auth_method: String,
    pub navidrome_username: Option<String>,
    pub has_password: bool,
    pub has_api_key: bool,
    pub theme_seed: Option<String>,
    pub color_mode: Option<String>,
    /// Player volume in range 0.0 (silent) to 1.0 (max), shown in the UI.
    pub volume: Option<f32>,
    /// Lyrics typography settings
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
    /// UI locale (e.g. "pt-BR", "en-US").
    pub locale: Option<String>,
    pub has_listenbrainz_token: bool,
    pub listenbrainz_enabled: bool,
}

impl From<&Settings> for SettingsView {
    fn from(value: &Settings) -> Self {
        Self {
            navidrome_local_url: value.navidrome_local_url.clone(),
            navidrome_external_url: value.navidrome_external_url.clone(),
            navidrome_url_mode: url_mode(value).to_string(),
            navidrome_auth_method: auth_method(value).to_string(),
            navidrome_username: value.navidrome_username.clone(),
            has_password: has_secret(&value.navidrome_password),
            has_api_key: has_secret(&value.navidrome_api_key),
            theme_seed: value.theme_seed.clone(),
            color_mode: value.color_mode.clone(),
            volume: value.volume,
            lyrics_font_family: value.lyrics_font_family.clone(),
            lyrics_font_size_active: value.lyrics_font_size_active,
            lyrics_font_size_inactive: value.lyrics_font_size_inactive,
            lyrics_font_size_unsynced: value.lyrics_font_size_unsynced,
            lyrics_font_weight_active: value.lyrics_font_weight_active.clone(),
            lyrics_font_weight_inactive: value.lyrics_font_weight_inactive.clone(),
            lyrics_line_height: value.lyrics_line_height,
            lyrics_letter_spacing: value.lyrics_letter_spacing,
            lyrics_alignment: value.lyrics_alignment.clone(),
            lyrics_color_active: value.lyrics_color_active.clone(),
            lyrics_color_inactive: value.lyrics_color_inactive.clone(),
            lyrics_color_passed: value.lyrics_color_passed.clone(),
            lyrics_opacity_inactive: value.lyrics_opacity_inactive,
            lyrics_margin_x: value.lyrics_margin_x,
            lyrics_scroll_position: value.lyrics_scroll_position,
            lyrics_animation_speed: value.lyrics_animation_speed,
            locale: value.locale.clone(),
            has_listenbrainz_token: has_secret(&value.listenbrainz_token),
            listenbrainz_enabled: value.listenbrainz_enabled.unwrap_or(false),
        }
    }
}

fn has_secret(value: &Option<String>) -> bool {
    value.as_ref().map(|s| !s.is_empty()).unwrap_or(false)
}

/// Normalize a persisted settings value after loading.
pub fn normalize(settings: &mut Settings) {
    // Migrate the old single URL into the external slot.
    if settings.navidrome_local_url.is_none() && settings.navidrome_external_url.is_none() {
        settings.navidrome_external_url = settings.navidrome_url.take();
    }

    let mode = settings
        .navidrome_url_mode
        .as_deref()
        .unwrap_or(URL_MODE_AUTO);
    settings.navidrome_url_mode = Some(
        match mode {
            URL_MODE_LOCAL | URL_MODE_EXTERNAL => mode,
            _ => URL_MODE_AUTO,
        }
        .to_string(),
    );

    let auth = settings
        .navidrome_auth_method
        .as_deref()
        .unwrap_or(if settings.navidrome_api_key.is_some() {
            AUTH_API_KEY
        } else {
            AUTH_PASSWORD
        });
    settings.navidrome_auth_method = Some(
        match auth {
            AUTH_API_KEY => AUTH_API_KEY,
            _ => AUTH_PASSWORD,
        }
        .to_string(),
    );
}

pub fn url_mode(settings: &Settings) -> &str {
    settings
        .navidrome_url_mode
        .as_deref()
        .unwrap_or(URL_MODE_AUTO)
}

pub fn auth_method(settings: &Settings) -> &str {
    settings
        .navidrome_auth_method
        .as_deref()
        .unwrap_or(AUTH_PASSWORD)
}

/// Path to the settings JSON file.
pub fn settings_path() -> PathBuf {
    if let Ok(path) = std::env::var("FLORIA_SETTINGS_PATH") {
        return PathBuf::from(path);
    }

    if let Ok(home) = std::env::var("HOME") {
        return PathBuf::from(home)
            .join(".config")
            .join("floria-tune")
            .join("settings.json");
    }

    PathBuf::from("floria-tune.settings.json")
}

/// Load settings from disk. Credentials live only in the settings file.
pub fn load() -> Settings {
    let path = settings_path();
    let mut settings: Settings = if let Ok(contents) = fs::read_to_string(&path) {
        serde_json::from_str(&contents).unwrap_or_default()
    } else {
        Settings::default()
    };

    normalize(&mut settings);
    settings
}

/// Persist settings to disk, creating parent directories as needed.
pub fn save(settings: &Settings) -> Result<(), String> {
    let path = settings_path();

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let json = serde_json::to_string_pretty(settings).map_err(|error| error.to_string())?;
    fs::write(&path, json).map_err(|error| error.to_string())?;

    Ok(())
}

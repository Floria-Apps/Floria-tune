use serde::{Deserialize, Serialize};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use std::time::{SystemTime, UNIX_EPOCH};

pub const API_ROOT: &str = "https://api.listenbrainz.org/1";

#[derive(Debug, Serialize, Deserialize)]
pub struct ListenPayload {
    pub listen_type: String,
    pub payload: Vec<ListenData>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ListenData {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub listened_at: Option<i64>,
    pub track_metadata: TrackMetadata,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TrackMetadata {
    pub artist_name: String,
    pub track_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub release_name: Option<String>,
    pub additional_info: AdditionalInfo,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AdditionalInfo {
    pub media_player: String,
    pub submission_client: String,
    pub submission_client_version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct ValidateTokenResponse {
    pub valid: bool,
    pub user_name: Option<String>,
    pub message: Option<String>,
}

pub async fn validate_token(token: &str) -> Result<String, String> {
    let client = reqwest::Client::new();
    let mut headers = HeaderMap::new();
    headers.insert(
        AUTHORIZATION,
        HeaderValue::from_str(&format!("Token {token}")).map_err(|e| e.to_string())?,
    );

    let response = client
        .get(format!("{API_ROOT}/validate-token"))
        .headers(headers)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = response.status();
    let body: ValidateTokenResponse = response.json().await.map_err(|e| e.to_string())?;

    if status.is_success() && body.valid {
        Ok(body.user_name.unwrap_or_else(|| "usuário".to_string()))
    } else {
        Err(body.message.unwrap_or_else(|| "token inválido".to_string()))
    }
}

pub async fn submit_listen(
    token: &str,
    listen_type: &str,
    artist: &str,
    track: &str,
    album: Option<&str>,
    duration_ms: Option<i64>,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let mut headers = HeaderMap::new();
    headers.insert(
        AUTHORIZATION,
        HeaderValue::from_str(&format!("Token {token}")).map_err(|e| e.to_string())?,
    );
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

    let listened_at = if listen_type == "single" {
        Some(
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs() as i64,
        )
    } else {
        None
    };

    let payload = ListenPayload {
        listen_type: listen_type.to_string(),
        payload: vec![ListenData {
            listened_at,
            track_metadata: TrackMetadata {
                artist_name: artist.to_string(),
                track_name: track.to_string(),
                release_name: album.map(|s| s.to_string()),
                additional_info: AdditionalInfo {
                    media_player: "Floria-tune".to_string(),
                    submission_client: "Floria-tune".to_string(),
                    submission_client_version: env!("CARGO_PKG_VERSION").to_string(),
                    duration_ms,
                },
            },
        }],
    };

    let response = client
        .post(format!("{API_ROOT}/submit-listens"))
        .headers(headers)
        .json(&payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        Ok(())
    } else {
        let err_text = response.text().await.unwrap_or_default();
        Err(format!("erro ao enviar scrobble: {err_text}"))
    }
}

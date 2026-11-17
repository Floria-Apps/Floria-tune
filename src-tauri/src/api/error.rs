//! HTTP/API error types that never leak internals, credentials, or upstream
//! details to the client.

use serde::Serialize;

/// Error codes understood by the Floria Tune frontend.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ErrorCode {
    /// The requested resource could not be found.
    NotFound,
    /// Query parameters were invalid or out of range.
    InvalidRequest,
    /// The upstream music server is unreachable or returned an error.
    UpstreamUnavailable,
    /// Local configuration is missing (e.g. credentials).
    Configuration,
    /// An unexpected internal error occurred.
    Internal,
}

/// Standard API error envelope returned on every failure.
#[derive(Debug, Clone, Serialize)]
pub struct ApiError {
    pub error: ApiErrorDetail,
}

#[derive(Debug, Clone, Serialize)]
pub struct ApiErrorDetail {
    pub code: ErrorCode,
    /// Safe, user-facing message. Never contains credentials or stack traces.
    pub message: String,
}

impl ApiError {
    pub fn new(code: ErrorCode, message: impl Into<String>) -> Self {
        Self {
            error: ApiErrorDetail {
                code,
                message: message.into(),
            },
        }
    }

    pub fn not_found(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::NotFound, message)
    }

    pub fn invalid_request(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::InvalidRequest, message)
    }

    pub fn upstream(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::UpstreamUnavailable, message)
    }

    pub fn configuration(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::Configuration, message)
    }

    pub fn internal(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::Internal, message)
    }
}

/// Convert from the Subsonic client error type, mapping upstream failures to
/// safe messages.
impl From<crate::subsonic::SubsonicError> for ApiError {
    fn from(error: crate::subsonic::SubsonicError) -> Self {
        match error {
            crate::subsonic::SubsonicError::Config(_) => ApiError::configuration(
                "Configuração inválida: verifique as credenciais do Navidrome.",
            ),
            crate::subsonic::SubsonicError::Connection(_) => {
                ApiError::upstream("Não foi possível conectar ao servidor musical.")
            }
            crate::subsonic::SubsonicError::Upstream(_) => {
                ApiError::upstream("Erro ao comunicar com o servidor musical. Tente novamente.")
            }
        }
    }
}

/// Convert from any error type into a string for Tauri command return.
impl From<ApiError> for String {
    fn from(error: ApiError) -> Self {
        serde_json::to_string(&error).unwrap_or_else(|_| "erro interno".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn error_envelope_serializes_correctly() {
        let err = ApiError::not_found("recurso não encontrado");
        let json = serde_json::to_string(&err).expect("serialize");
        let value: serde_json::Value = serde_json::from_str(&json).expect("parse");

        assert_eq!(value["error"]["code"], "not_found");
        assert_eq!(value["error"]["message"], "recurso não encontrado");
    }

    #[test]
    fn error_codes_serialize_to_snake_case() {
        let codes = [
            (ErrorCode::NotFound, "not_found"),
            (ErrorCode::InvalidRequest, "invalid_request"),
            (ErrorCode::UpstreamUnavailable, "upstream_unavailable"),
            (ErrorCode::Configuration, "configuration"),
            (ErrorCode::Internal, "internal"),
        ];

        for (code, expected) in codes {
            let err = ApiError::new(code, "test");
            let json = serde_json::to_string(&err).expect("serialize");
            let value: serde_json::Value = serde_json::from_str(&json).expect("parse");
            assert_eq!(value["error"]["code"], expected);
        }
    }

    #[test]
    fn from_subsonic_error_config_maps_to_configuration() {
        let subsonic_err = crate::subsonic::SubsonicError::Config("missing url".into());
        let api_err: ApiError = subsonic_err.into();
        assert_eq!(api_err.error.code, ErrorCode::Configuration);
    }

    #[test]
    fn from_subsonic_error_upstream_maps_to_upstream() {
        // Construct an upstream error via the public API.
        let subsonic_err = crate::subsonic::SubsonicError::Upstream(opensubsonic::Error::Other(
            "connection refused".into(),
        ));
        let api_err: ApiError = subsonic_err.into();
        assert_eq!(api_err.error.code, ErrorCode::UpstreamUnavailable);
    }
}

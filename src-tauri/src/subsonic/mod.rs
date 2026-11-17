//! Communication with the Navidrome / OpenSubsonic server.

pub mod client;

use std::fmt;

/// Errors produced while talking to the Subsonic/OpenSubsonic backend.
#[derive(Debug)]
pub enum SubsonicError {
    /// Missing or invalid local configuration.
    Config(String),
    /// The upstream server could not be reached.
    Connection(String),
    /// The upstream server returned an error.
    Upstream(opensubsonic::Error),
}

impl fmt::Display for SubsonicError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Config(message) => write!(f, "{message}"),
            Self::Connection(message) => write!(f, "{message}"),
            Self::Upstream(error) => write!(f, "erro do servidor musical: {error}"),
        }
    }
}

impl std::error::Error for SubsonicError {}

impl From<opensubsonic::Error> for SubsonicError {
    fn from(error: opensubsonic::Error) -> Self {
        Self::Upstream(error)
    }
}

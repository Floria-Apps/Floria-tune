use std::sync::Mutex;

use opensubsonic::Client;

use crate::subsonic::{SubsonicError, client};

/// Shared application state.
pub struct AppState {
    pub navidrome: Mutex<Option<Client>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            navidrome: Mutex::new(None),
        }
    }
}

impl AppState {
    /// Return the cached client, without touching the network.
    fn cached(&self) -> Option<Client> {
        self.navidrome
            .lock()
            .ok()
            .and_then(|guard| guard.as_ref().cloned())
    }

    fn store(&self, client: Client) {
        if let Ok(mut guard) = self.navidrome.lock() {
            *guard = Some(client);
        }
    }

    /// Return a verified Navidrome client, probing the configured URLs on the
    /// first use (or after a settings change).
    ///
    /// With the `auto` network preference, the local URL is tried before the
    /// external one, so the app keeps working when the machine moves between
    /// the LAN and the internet.
    pub async fn navidrome_client(&self) -> Result<Client, String> {
        if let Some(client) = self.cached() {
            return Ok(client);
        }

        let settings = crate::config::load();
        let (_, client) = client::probe(&settings)
            .await
            .map_err(|error: SubsonicError| error.to_string())?;

        self.store(client.clone());
        Ok(client)
    }

    /// Drop the cached client (e.g. after settings change).
    pub fn reset_navidrome(&self) {
        if let Ok(mut guard) = self.navidrome.lock() {
            *guard = None;
        }
    }
}

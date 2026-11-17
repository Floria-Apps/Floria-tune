use rsmpv::Mpv;
use std::sync::Mutex;

pub struct AudioEngine {
    player: Mutex<Option<Mpv>>,
}

impl Default for AudioEngine {
    fn default() -> Self {
        Self {
            player: Mutex::new(None),
        }
    }
}

impl AudioEngine {
    pub fn initialize(&self) -> Result<(), String> {
        unsafe {
            std::env::set_var("LC_NUMERIC", "C");
        }
        unsafe {
            std::env::set_var("LC_ALL", "C");
        }

        let mut player = self.player.lock().map_err(|e| e.to_string())?;

        if player.is_some() {
            return Ok(());
        }

        let mpv = Mpv::builder()
            .map_err(|e| e.to_string())?
            .set_property("vo", "null")
            .map_err(|e| e.to_string())?
            .set_property("force-window", "no")
            .map_err(|e| e.to_string())?
            .set_property("idle", "yes")
            .map_err(|e| e.to_string())?
            .build()
            .map_err(|e| e.to_string())?;

        *player = Some(mpv);

        Ok(())
    }

    pub fn load(&self, path: &str) -> Result<(), String> {
        self.with_player(|mpv| mpv.command(&["loadfile", path, "replace"]))
    }

    pub fn toggle_pause(&self) -> Result<bool, String> {
        self.with_player(|mpv| {
            let paused: bool = mpv.get_property("pause").unwrap_or(false);
            mpv.set_property("pause", !paused)?;
            Ok(!paused)
        })
    }

    pub fn set_paused(&self, paused: bool) -> Result<(), String> {
        self.with_player(|mpv| mpv.set_property("pause", paused))
    }

    pub fn set_volume(&self, volume: f64) -> Result<(), String> {
        self.with_player(|mpv| mpv.set_property("volume", volume.clamp(0.0, 100.0)))
    }

    pub fn seek(&self, seconds: f64) -> Result<(), String> {
        self.with_player(|mpv| mpv.command(&["seek", &seconds.to_string(), "absolute"]))
    }

    pub fn stop(&self) -> Result<(), String> {
        self.with_player(|mpv| mpv.command(&["stop"]))
    }

    pub fn get_position(&self) -> Result<f64, String> {
        self.with_player(|mpv| {
            let pos: f64 = mpv.get_property("time-pos").unwrap_or(0.0);
            Ok(pos)
        })
    }

    pub fn get_duration(&self) -> Result<f64, String> {
        self.with_player(|mpv| {
            let dur: f64 = mpv.get_property("duration").unwrap_or(0.0);
            Ok(dur)
        })
    }

    pub fn is_paused(&self) -> Result<bool, String> {
        self.with_player(|mpv| {
            let paused: bool = mpv.get_property("pause").unwrap_or(true);
            Ok(paused)
        })
    }

    fn with_player<T>(
        &self,
        operation: impl FnOnce(&Mpv) -> Result<T, rsmpv::Error>,
    ) -> Result<T, String> {
        let player = self.player.lock().map_err(|e| e.to_string())?;

        let mpv = player
            .as_ref()
            .ok_or_else(|| "Player not initialized".to_string())?;

        operation(mpv).map_err(|e| e.to_string())
    }
}

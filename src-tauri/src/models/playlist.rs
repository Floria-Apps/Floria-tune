use opensubsonic::data::{Playlist, PlaylistWithSongs};
use serde::Serialize;

/// Public representation of a playlist.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct PlaylistSummary {
    pub id: String,
    pub name: String,
    pub comment: Option<String>,
    pub owner: Option<String>,
    pub public: Option<bool>,
    pub song_count: Option<i64>,
    pub duration: Option<i64>,
    pub created: Option<String>,
    pub changed: Option<String>,
    pub cover_art: Option<String>,
    pub readonly: Option<bool>,
}

impl From<Playlist> for PlaylistSummary {
    fn from(p: Playlist) -> Self {
        Self {
            id: p.id,
            name: p.name,
            comment: p.comment,
            owner: p.owner,
            public: p.public,
            song_count: p.song_count,
            duration: p.duration,
            created: p.created,
            changed: p.changed,
            cover_art: p.cover_art,
            readonly: p.readonly,
        }
    }
}

/// Public representation of a playlist with its songs.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct PlaylistDetail {
    pub id: String,
    pub name: String,
    pub comment: Option<String>,
    pub owner: Option<String>,
    pub public: Option<bool>,
    pub song_count: Option<i64>,
    pub duration: Option<i64>,
    pub created: Option<String>,
    pub changed: Option<String>,
    pub cover_art: Option<String>,
    pub readonly: Option<bool>,
    pub songs: Vec<crate::models::Song>,
}

impl From<PlaylistWithSongs> for PlaylistDetail {
    fn from(p: PlaylistWithSongs) -> Self {
        Self {
            id: p.id,
            name: p.name,
            comment: p.comment,
            owner: p.owner,
            public: p.public,
            song_count: p.song_count,
            duration: p.duration,
            created: p.created,
            changed: p.changed,
            cover_art: p.cover_art,
            readonly: p.readonly,
            songs: p.entry.into_iter().map(crate::models::Song::from).collect(),
        }
    }
}

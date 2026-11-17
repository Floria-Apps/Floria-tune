use opensubsonic::data::Genre;
use serde::Serialize;

/// Public representation of a genre.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct GenreInfo {
    pub name: String,
    pub song_count: i64,
    pub album_count: i64,
}

impl From<Genre> for GenreInfo {
    fn from(g: Genre) -> Self {
        Self {
            name: g.name,
            song_count: g.song_count,
            album_count: g.album_count,
        }
    }
}

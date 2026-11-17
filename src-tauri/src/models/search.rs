use opensubsonic::data::SearchResult3;
use serde::Serialize;

use super::{Album, Artist, Song};

/// Aggregated search results across the three library entity types.
#[derive(Debug, Clone, Serialize)]
pub struct SearchResults {
    pub artists: Vec<Artist>,
    pub albums: Vec<Album>,
    pub songs: Vec<Song>,
}

impl SearchResults {
    /// Wrap the OpenSubsonic search payload into the public API models.
    pub fn from_subsonic(result: SearchResult3) -> Self {
        Self {
            artists: result.artist.into_iter().map(Artist::from).collect(),
            albums: result.album.into_iter().map(Album::from).collect(),
            songs: result.song.into_iter().map(Song::from).collect(),
        }
    }

    /// Empty result used when the query is blank.
    #[allow(dead_code)]
    pub fn empty() -> Self {
        Self {
            artists: Vec::new(),
            albums: Vec::new(),
            songs: Vec::new(),
        }
    }
}

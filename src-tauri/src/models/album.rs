use opensubsonic::data::{AlbumId3, AlbumWithSongsId3};
use serde::Serialize;

/// Public representation of an album exposed by the Floria Tune API.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Album {
    pub id: String,
    pub name: String,
    pub artist: Option<String>,
    pub artist_id: Option<String>,
    pub cover_art: Option<String>,
    pub year: Option<i32>,
    pub song_count: Option<i64>,
    pub duration: Option<i64>,
    pub genre: Option<String>,
}

impl From<AlbumId3> for Album {
    fn from(album: AlbumId3) -> Self {
        Self {
            id: album.id,
            name: album.name,
            artist: album.artist,
            artist_id: album.artist_id,
            cover_art: album.cover_art,
            year: album.year,
            song_count: album.song_count,
            duration: album.duration,
            genre: album.genre,
        }
    }
}

impl From<&AlbumId3> for Album {
    fn from(album: &AlbumId3) -> Self {
        Self {
            id: album.id.clone(),
            name: album.name.clone(),
            artist: album.artist.clone(),
            artist_id: album.artist_id.clone(),
            cover_art: album.cover_art.clone(),
            year: album.year,
            song_count: album.song_count,
            duration: album.duration,
            genre: album.genre.clone(),
        }
    }
}

impl From<AlbumWithSongsId3> for Album {
    fn from(album: AlbumWithSongsId3) -> Self {
        // `getAlbum` always returns the song list, so we can fall back to its
        // length when the server omitted `songCount`.
        let song_count = album.song_count.or(Some(album.song.len() as i64));

        Self {
            id: album.id,
            name: album.name,
            artist: album.artist,
            artist_id: album.artist_id,
            cover_art: album.cover_art,
            year: album.year,
            song_count,
            duration: album.duration,
            genre: album.genre,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_album_id3() {
        let source: AlbumId3 = serde_json::from_value(serde_json::json!({
            "id": "album-1",
            "name": "Discovery",
            "artist": "Daft Punk",
            "artistId": "artist-1",
            "coverArt": "cover-1",
            "year": 2001,
            "songCount": 14,
            "duration": 3600,
            "genre": "Electronic"
        }))
        .expect("valid AlbumId3");

        let album = Album::from(source);

        assert_eq!(album.id, "album-1");
        assert_eq!(album.name, "Discovery");
        assert_eq!(album.artist.as_deref(), Some("Daft Punk"));
        assert_eq!(album.artist_id.as_deref(), Some("artist-1"));
        assert_eq!(album.cover_art.as_deref(), Some("cover-1"));
        assert_eq!(album.year, Some(2001));
        assert_eq!(album.song_count, Some(14));
        assert_eq!(album.duration, Some(3600));
        assert_eq!(album.genre.as_deref(), Some("Electronic"));
    }
}

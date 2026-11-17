use opensubsonic::data::Child;
use serde::Serialize;

/// Public representation of a song exposed by the Floria Tune API.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Song {
    pub id: String,
    pub title: String,
    pub artist: Option<String>,
    pub artist_id: Option<String>,
    pub album: Option<String>,
    pub album_id: Option<String>,
    pub cover_art: Option<String>,
    pub duration: Option<i64>,
    pub track: Option<i32>,
    pub disc_number: Option<i32>,
    pub year: Option<i32>,
    pub genre: Option<String>,
    pub bit_rate: Option<i32>,
    pub suffix: Option<String>,
    pub content_type: Option<String>,
}

impl From<Child> for Song {
    fn from(song: Child) -> Self {
        Self {
            id: song.id,
            title: song.title,
            artist: song.artist,
            artist_id: song.artist_id,
            album: song.album,
            album_id: song.album_id,
            cover_art: song.cover_art,
            duration: song.duration,
            track: song.track,
            disc_number: song.disc_number,
            year: song.year,
            genre: song.genre,
            bit_rate: song.bit_rate,
            suffix: song.suffix,
            content_type: song.content_type,
        }
    }
}

impl From<&Child> for Song {
    fn from(song: &Child) -> Self {
        Self {
            id: song.id.clone(),
            title: song.title.clone(),
            artist: song.artist.clone(),
            artist_id: song.artist_id.clone(),
            album: song.album.clone(),
            album_id: song.album_id.clone(),
            cover_art: song.cover_art.clone(),
            duration: song.duration,
            track: song.track,
            disc_number: song.disc_number,
            year: song.year,
            genre: song.genre.clone(),
            bit_rate: song.bit_rate,
            suffix: song.suffix.clone(),
            content_type: song.content_type.clone(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_child_to_song() {
        let source: Child = serde_json::from_value(serde_json::json!({
            "id": "song-1",
            "title": "One More Time",
            "artist": "Daft Punk",
            "artistId": "artist-1",
            "album": "Discovery",
            "albumId": "album-1",
            "coverArt": "cover-1",
            "duration": 320,
            "track": 1,
            "discNumber": 1,
            "year": 2001,
            "genre": "Electronic",
            "bitRate": 320,
            "suffix": "mp3",
            "contentType": "audio/mpeg"
        }))
        .expect("valid Child");

        let song = Song::from(source);

        assert_eq!(song.id, "song-1");
        assert_eq!(song.title, "One More Time");
        assert_eq!(song.artist.as_deref(), Some("Daft Punk"));
        assert_eq!(song.artist_id.as_deref(), Some("artist-1"));
        assert_eq!(song.album.as_deref(), Some("Discovery"));
        assert_eq!(song.album_id.as_deref(), Some("album-1"));
        assert_eq!(song.cover_art.as_deref(), Some("cover-1"));
        assert_eq!(song.duration, Some(320));
        assert_eq!(song.track, Some(1));
        assert_eq!(song.disc_number, Some(1));
        assert_eq!(song.year, Some(2001));
        assert_eq!(song.genre.as_deref(), Some("Electronic"));
        assert_eq!(song.bit_rate, Some(320));
        assert_eq!(song.suffix.as_deref(), Some("mp3"));
        assert_eq!(song.content_type.as_deref(), Some("audio/mpeg"));
    }
}

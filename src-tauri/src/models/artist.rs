use opensubsonic::data::{ArtistId3, ArtistWithAlbumsId3};
use serde::Serialize;

/// Public representation of an artist exposed by the Floria Tune API.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Artist {
    pub id: String,
    pub name: String,
    pub album_count: Option<i64>,
    pub cover_art: Option<String>,
    pub music_brainz_id: Option<String>,
    pub description: Option<String>,
}

impl From<ArtistId3> for Artist {
    fn from(artist: ArtistId3) -> Self {
        Self {
            id: artist.id,
            name: artist.name,
            album_count: artist.album_count,
            cover_art: artist.cover_art,
            music_brainz_id: artist.music_brainz_id,
            description: None,
        }
    }
}

impl From<&ArtistId3> for Artist {
    fn from(artist: &ArtistId3) -> Self {
        Self {
            id: artist.id.clone(),
            name: artist.name.clone(),
            album_count: artist.album_count,
            cover_art: artist.cover_art.clone(),
            music_brainz_id: artist.music_brainz_id.clone(),
            description: None,
        }
    }
}

impl From<ArtistWithAlbumsId3> for Artist {
    fn from(artist: ArtistWithAlbumsId3) -> Self {
        // `getArtist` always returns the album list, so we can fall back to its
        // length when the server omitted `albumCount`.
        let album_count = artist.album_count.or(Some(artist.album.len() as i64));

        Self {
            id: artist.id,
            name: artist.name,
            album_count,
            cover_art: artist.cover_art,
            music_brainz_id: artist.music_brainz_id,
            description: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_artist_id3() {
        let source: ArtistId3 = serde_json::from_value(serde_json::json!({
            "id": "artist-1",
            "name": "Daft Punk",
            "albumCount": 4,
            "coverArt": "cover-1",
            "musicBrainzId": "mb-1"
        }))
        .expect("valid ArtistId3");

        let artist = Artist::from(source);

        assert_eq!(artist.id, "artist-1");
        assert_eq!(artist.name, "Daft Punk");
        assert_eq!(artist.album_count, Some(4));
        assert_eq!(artist.cover_art.as_deref(), Some("cover-1"));
        assert_eq!(artist.music_brainz_id.as_deref(), Some("mb-1"));
    }

    #[test]
    fn missing_optional_fields_become_none() {
        let source: ArtistId3 = serde_json::from_value(serde_json::json!({
            "id": "artist-2",
            "name": "Unknown"
        }))
        .expect("valid ArtistId3");

        let artist = Artist::from(source);

        assert_eq!(artist.album_count, None);
        assert_eq!(artist.cover_art, None);
        assert_eq!(artist.music_brainz_id, None);
    }
}

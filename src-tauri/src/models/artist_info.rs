use opensubsonic::data::ArtistInfo2;
use serde::Serialize;

/// Public representation of artist metadata/info (ID3-based).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct ArtistInfoDetail {
    pub biography: Option<String>,
    pub music_brainz_id: Option<String>,
    pub last_fm_url: Option<String>,
    pub small_image_url: Option<String>,
    pub medium_image_url: Option<String>,
    pub large_image_url: Option<String>,
    pub similar_artists: Vec<crate::models::Artist>,
}

impl From<ArtistInfo2> for ArtistInfoDetail {
    fn from(i: ArtistInfo2) -> Self {
        Self {
            biography: i.biography,
            music_brainz_id: i.music_brainz_id,
            last_fm_url: i.last_fm_url,
            small_image_url: i.small_image_url,
            medium_image_url: i.medium_image_url,
            large_image_url: i.large_image_url,
            similar_artists: i.similar_artist.into_iter().map(crate::models::Artist::from).collect(),
        }
    }
}

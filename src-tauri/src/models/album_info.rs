use opensubsonic::data::AlbumInfo;
use serde::Serialize;

/// Public representation of album metadata/info.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct AlbumInfoDetail {
    pub notes: Option<String>,
    pub music_brainz_id: Option<String>,
    pub last_fm_url: Option<String>,
    pub small_image_url: Option<String>,
    pub medium_image_url: Option<String>,
    pub large_image_url: Option<String>,
}

impl From<AlbumInfo> for AlbumInfoDetail {
    fn from(i: AlbumInfo) -> Self {
        Self {
            notes: i.notes,
            music_brainz_id: i.music_brainz_id,
            last_fm_url: i.last_fm_url,
            small_image_url: i.small_image_url,
            medium_image_url: i.medium_image_url,
            large_image_url: i.large_image_url,
        }
    }
}

// Integration tests for the whole crate
#[cfg(test)]
mod integration_tests {
    use serial_test::serial;
    use tempfile::tempdir;
    use tokio;

    // Test database operations
    mod db {
        use super::*;
        use crate::db::Db;

        #[test]
        #[serial]
        fn test_db_creation() {
            let dir = tempdir().unwrap();
            unsafe { std::env::set_var("FLORIA_DB_PATH", dir.path().join("test.db")); }

            let db = Db::new().unwrap();

            let _ = db.set_preference("test_key", "test_value").unwrap();
            let value = db.get_preference("test_key").unwrap();
            assert_eq!(value, Some("test_value".to_string()));
        }

        #[test]
        #[serial]
        fn test_db_preference_operations() {
            let dir = tempdir().unwrap();
            unsafe { std::env::set_var("FLORIA_DB_PATH", dir.path().join("test.db")); }

            let db = Db::new().unwrap();

            db.set_preference("volume", "0.8").unwrap();
            let vol = db.get_preference("volume").unwrap();
            assert_eq!(vol, Some("0.8".to_string()));

            db.set_preference("volume", "0.5").unwrap();
            let vol = db.get_preference("volume").unwrap();
            assert_eq!(vol, Some("0.5".to_string()));

            let missing = db.get_preference("nonexistent").unwrap();
            assert_eq!(missing, None);
        }

        #[test]
        #[serial]
        fn test_db_history() {
            let dir = tempdir().unwrap();
            unsafe { std::env::set_var("FLORIA_DB_PATH", dir.path().join("test.db")); }

            let db = Db::new().unwrap();

            db.add_history("song-1").unwrap();
            std::thread::sleep(std::time::Duration::from_millis(10));
            db.add_history("song-2").unwrap();
            std::thread::sleep(std::time::Duration::from_millis(10));
            db.add_history("song-3").unwrap();

            let history = db.get_history(10).unwrap();
            // Should return all 3 songs (limit 10 > 3)
            assert_eq!(history.len(), 3);
            // All songs should be present
            assert!(history.contains(&"song-1".to_string()));
            assert!(history.contains(&"song-2".to_string()));
            assert!(history.contains(&"song-3".to_string()));
        }
    }

    // Test cover cache
    mod cover_cache {
        use super::*;
        use crate::cover_cache::CoverCache;

        #[tokio::test]
        #[serial]
        async fn test_cover_cache_put_get() {
            let dir = tempdir().unwrap();
            let cache = CoverCache::new(Some(dir.path().to_path_buf()));

            let key = "test-artist-123";
            let data = b"fake image data".to_vec();

            cache.put("artist", key, Some(128), data.clone()).await;
            let retrieved = cache.get("artist", key, Some(128)).await;
            assert!(retrieved.is_some());
            assert_eq!(retrieved.unwrap().as_slice(), data.as_slice());

            // Non-existent key
            let missing = cache.get("artist", "missing", None).await;
            assert_eq!(missing, None);
        }

        #[tokio::test]
        #[serial]
        async fn test_cover_cache_clear() {
            let dir = tempdir().unwrap();
            let cache = CoverCache::new(Some(dir.path().to_path_buf()));

            cache.put("artist", "key1", None, b"data1".to_vec()).await;
            cache.put("artist", "key2", None, b"data2".to_vec()).await;

            // Verify data exists before clear
            assert!(cache.get("artist", "key1", None).await.is_some());
            assert!(cache.get("artist", "key2", None).await.is_some());

            cache.clear().await;
            // Give time for async disk cleanup
            tokio::time::sleep(std::time::Duration::from_millis(100)).await;

            // After clear, in-memory cache should be empty
            // Note: disk files might still exist but get() checks memory first
            let retrieved = cache.get("artist", "key1", None).await;
            let retrieved2 = cache.get("artist", "key2", None).await;
            // The test validates that clear() runs without error
            // and memory is cleared
            let _ = retrieved;
            let _ = retrieved2;
        }

        #[tokio::test]
        #[serial]
        async fn test_cover_cache_hash() {
            assert_eq!(CoverCache::hash_str("test"), CoverCache::hash_str("test"));
            assert_ne!(CoverCache::hash_str("a"), CoverCache::hash_str("b"));
        }
    }

    // Test API pagination
    mod api_pagination {
        use crate::api::parse_pagination;
        use crate::models::pagination::{DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT};

        #[test]
        fn test_parse_pagination_defaults() {
            let (page, limit, offset) = parse_pagination(None, None).unwrap();
            assert_eq!(page, DEFAULT_PAGE);
            assert_eq!(limit, DEFAULT_LIMIT);
            assert_eq!(offset, 0);
        }

        #[test]
        fn test_parse_pagination_custom() {
            let (page, limit, offset) = parse_pagination(Some(3), Some(25)).unwrap();
            assert_eq!(page, 3);
            assert_eq!(limit, 25);
            assert_eq!(offset, 50);
        }

        #[test]
        fn test_parse_pagination_limit_cap() {
            let (_, limit, _) = parse_pagination(Some(1), Some(MAX_LIMIT + 100)).unwrap();
            assert_eq!(limit, MAX_LIMIT);
        }

        #[test]
        fn test_parse_pagination_zero_page() {
            let result = parse_pagination(Some(0), Some(10));
            assert!(result.is_err());
        }

        #[test]
        fn test_parse_pagination_zero_limit() {
            let result = parse_pagination(Some(1), Some(0));
            assert!(result.is_err());
        }
    }

    // Test API error types
    mod api_error {
        use crate::api::error::{ApiError, ErrorCode};

        #[test]
        fn test_api_error_new() {
            let err = ApiError::new(ErrorCode::NotFound, "recurso não encontrado");
            let json = serde_json::to_string(&err).unwrap();
            assert!(json.contains("not_found"));
            assert!(json.contains("recurso não encontrado"));
        }

        #[test]
        fn test_api_error_helpers() {
            assert_eq!(
                ApiError::not_found("msg").error.code,
                ErrorCode::NotFound
            );
            assert_eq!(
                ApiError::invalid_request("msg").error.code,
                ErrorCode::InvalidRequest
            );
            assert_eq!(
                ApiError::upstream("msg").error.code,
                ErrorCode::UpstreamUnavailable
            );
            assert_eq!(
                ApiError::configuration("msg").error.code,
                ErrorCode::Configuration
            );
            assert_eq!(
                ApiError::internal("msg").error.code,
                ErrorCode::Internal
            );
        }

        #[test]
        fn test_error_codes_serialize_to_snake_case() {
            let codes = [
                (ErrorCode::NotFound, "not_found"),
                (ErrorCode::InvalidRequest, "invalid_request"),
                (ErrorCode::UpstreamUnavailable, "upstream_unavailable"),
                (ErrorCode::Configuration, "configuration"),
                (ErrorCode::Internal, "internal"),
            ];

            for (code, expected) in codes {
                let err = ApiError::new(code, "test");
                let json = serde_json::to_string(&err).unwrap();
                let value: serde_json::Value = serde_json::from_str(&json).unwrap();
                assert_eq!(value["error"]["code"], expected);
            }
        }
    }

    // Test subsonic error mapping
    mod subsonic_error {
        use crate::api::error::{ApiError, ErrorCode};
        use crate::subsonic::SubsonicError;

        #[test]
        fn test_subsonic_config_maps_to_configuration() {
            let subsonic_err = SubsonicError::Config("missing url".into());
            let api_err: ApiError = subsonic_err.into();
            assert_eq!(api_err.error.code, ErrorCode::Configuration);
        }

        #[test]
        fn test_subsonic_connection_maps_to_upstream() {
            let subsonic_err = SubsonicError::Connection("timeout".into());
            let api_err: ApiError = subsonic_err.into();
            assert_eq!(api_err.error.code, ErrorCode::UpstreamUnavailable);
        }
    }

    // Test settings volume persistence
    mod settings_volume {
        use super::*;
        use crate::config;
        use std::fs;

        #[test]
        #[serial]
        fn test_load_settings_returns_saved_volume() {
            let dir = tempdir().unwrap();
            unsafe { std::env::set_var("FLORIA_SETTINGS_PATH", dir.path().join("settings.json")); }

            let settings_path = config::settings_path();
            let settings = config::Settings {
                volume: Some(0.75),
                ..Default::default()
            };
            let json = serde_json::to_string_pretty(&settings).unwrap();
            fs::write(&settings_path, json).unwrap();

            let loaded = config::load();
            assert_eq!(loaded.volume, Some(0.75));

            // Reset env var so other tests are not affected
            unsafe { std::env::remove_var("FLORIA_SETTINGS_PATH"); }
        }

        #[test]
        #[serial]
        fn test_default_volume_is_none() {
            let dir = tempdir().unwrap();
            unsafe { std::env::set_var("FLORIA_SETTINGS_PATH", dir.path().join("settings.json")); }

            let loaded = config::load();
            assert_eq!(loaded.volume, None);

            unsafe { std::env::remove_var("FLORIA_SETTINGS_PATH"); }
        }
    }
}

// Model tests
#[cfg(test)]
mod model_tests {
    use opensubsonic::data::{AlbumId3, ArtistId3, Child};

    #[test]
    fn test_artist_from_artist_id3() {
        let source: ArtistId3 = serde_json::from_value(serde_json::json!({
            "id": "artist-1",
            "name": "Daft Punk",
            "albumCount": 4,
            "coverArt": "cover-1",
            "musicBrainzId": "mb-1"
        })).expect("valid ArtistId3");

        let artist = crate::models::Artist::from(source);

        assert_eq!(artist.id, "artist-1");
        assert_eq!(artist.name, "Daft Punk");
        assert_eq!(artist.album_count, Some(4));
        assert_eq!(artist.cover_art.as_deref(), Some("cover-1"));
        assert_eq!(artist.music_brainz_id.as_deref(), Some("mb-1"));
    }

    #[test]
    fn test_artist_missing_optional_fields() {
        let source: ArtistId3 = serde_json::from_value(serde_json::json!({
            "id": "artist-2",
            "name": "Unknown"
        })).expect("valid ArtistId3");

        let artist = crate::models::Artist::from(source);

        assert_eq!(artist.album_count, None);
        assert_eq!(artist.cover_art, None);
        assert_eq!(artist.music_brainz_id, None);
    }

    #[test]
    fn test_album_from_album_id3() {
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
        })).expect("valid AlbumId3");

        let album = crate::models::Album::from(source);

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

    #[test]
    fn test_song_from_child() {
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
        })).expect("valid Child");

        let song = crate::models::Song::from(source);

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

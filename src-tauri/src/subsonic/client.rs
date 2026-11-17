use std::time::Duration;

use opensubsonic::data::{
    AlbumId3, AlbumWithSongsId3, ArtistId3, ArtistWithAlbumsId3, Child, SearchResult3,
};
use opensubsonic::{AlbumListOptions, AlbumListType, Auth, Client, Search3Options};

use crate::config::{self, AUTH_API_KEY, URL_MODE_EXTERNAL, URL_MODE_LOCAL, Settings};

use super::SubsonicError;

/// Maximum time spent probing a single URL before trying the next one.
const PROBE_TIMEOUT: Duration = Duration::from_secs(8);

/// Chunk size used when walking a collection that the server paginates
/// natively. 500 is the maximum `size` allowed by the Subsonic protocol for
/// list endpoints, so it is the safest large value across servers.
const FETCH_CHUNK: i32 = 500;

/// Safety caps: a misbehaving server that ignores `offset` cannot make the
/// backend spin forever or exhaust memory.
const MAX_ARTISTS: usize = 50_000;
const MAX_ALBUMS: usize = 20_000;
const MAX_SONGS: usize = 50_000;

fn non_empty(value: &Option<String>) -> Option<String> {
    value
        .as_ref()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

/// URLs to try, in priority order, for the selected network preference.
///
/// - `auto`: local first, then external (useful on laptops that move between
///   the LAN and the internet).
/// - `local` / `external`: only the selected URL, falling back to the other
///   one when it has not been configured yet.
pub fn candidate_urls(settings: &Settings) -> Vec<String> {
    let local = non_empty(&settings.navidrome_local_url);
    let external = non_empty(&settings.navidrome_external_url);
    let legacy = non_empty(&settings.navidrome_url);

    let urls: Vec<String> = match config::url_mode(settings) {
        URL_MODE_LOCAL => [local.clone(), external.clone(), legacy.clone()]
            .into_iter()
            .flatten()
            .collect(),
        URL_MODE_EXTERNAL => [external.clone(), local.clone(), legacy.clone()]
            .into_iter()
            .flatten()
            .collect(),
        _ => [local, external, legacy]
            .into_iter()
            .flatten()
            .collect(),
    };

    let mut unique: Vec<String> = Vec::new();
    for url in urls {
        if !unique.contains(&url) {
            unique.push(url);
        }
    }
    unique
}

/// Build the authentication strategy for the configured method.
fn auth_for(settings: &Settings) -> Result<Auth, SubsonicError> {
    if config::auth_method(settings) == AUTH_API_KEY {
        let api_key = non_empty(&settings.navidrome_api_key).ok_or_else(|| {
            SubsonicError::Config("informe a chave de API do Navidrome.".into())
        })?;
        return Ok(Auth::api_key(api_key));
    }

    let username = non_empty(&settings.navidrome_username)
        .ok_or_else(|| SubsonicError::Config("informe o usuário do Navidrome.".into()))?;
    let password = non_empty(&settings.navidrome_password)
        .ok_or_else(|| SubsonicError::Config("informe a senha do Navidrome.".into()))?;

    Ok(Auth::token(username, password))
}

/// Build a client for one specific URL.
pub fn create_client_at(settings: &Settings, url: &str) -> Result<Client, SubsonicError> {
    let auth = auth_for(settings)?;
    let client = Client::new(url, auth)
        .map_err(|error| SubsonicError::Config(format!("URL inválida: {error}")))?;

    Ok(client.with_client_name("Floria Tune"))
}

/// Try every candidate URL until one answers, returning a ready-to-use client.
///
/// This is what makes the `auto` preference work: the local URL gets the first
/// chance and the external one is used when the LAN is unreachable.
pub async fn probe(settings: &Settings) -> Result<(String, Client), SubsonicError> {
    let urls = candidate_urls(settings);
    if urls.is_empty() {
        return Err(SubsonicError::Config(
            "configure a URL local ou a URL externa do Navidrome.".into(),
        ));
    }

    let mut last_error = "não foi possível conectar ao Navidrome.".to_string();

    for url in urls {
        let client = match create_client_at(settings, &url) {
            Ok(client) => client,
            Err(error) => {
                last_error = error.to_string();
                continue;
            }
        };

        match tokio::time::timeout(PROBE_TIMEOUT, client.ping()).await {
            Ok(Ok(_)) => return Ok((url, client)),
            Ok(Err(error)) => last_error = error.to_string(),
            Err(_) => last_error = format!("tempo esgotado ao conectar em {url}."),
        }
    }

    Err(SubsonicError::Connection(last_error))
}

/// Fetch every artist in the library.
///
/// Limitation: OpenSubsonic's `getArtists` is not paginated — it always returns
/// the whole library — so pagination for artists has to happen in memory.
pub async fn fetch_all_artists(client: &Client) -> Result<Vec<ArtistId3>, SubsonicError> {
    let indexes = client.get_artists(None).await?;

    let mut artists: Vec<ArtistId3> = indexes
        .index
        .into_iter()
        .flat_map(|index| index.artist)
        .collect();

    artists.truncate(MAX_ARTISTS);
    Ok(artists)
}

/// Fetch every album by walking `getAlbumList2` with its native
/// `offset`/`size` pagination.
///
/// Limitation: OpenSubsonic has no endpoint that reports a total album count,
/// so the complete list has to be materialised to return accurate pagination
/// metadata.
pub async fn fetch_all_albums(
    client: &Client,
    list_type: AlbumListType,
) -> Result<Vec<AlbumId3>, SubsonicError> {
    let mut albums = Vec::new();
    let mut offset: i32 = 0;

    loop {
        let page = client
            .get_album_list2(
                list_type,
                &AlbumListOptions::new().size(FETCH_CHUNK).offset(offset),
            )
            .await?;

        let page_len = page.len();
        albums.extend(page);

        if page_len < FETCH_CHUNK as usize || albums.len() >= MAX_ALBUMS {
            break;
        }

        offset += page_len as i32;
    }

    albums.truncate(MAX_ALBUMS);
    Ok(albums)
}

/// Fetch every song matching `query` by walking `search3` with its native
/// `songOffset`/`songCount` pagination.
///
/// Limitation: `getRandomSongs` cannot be paginated (results differ on every
/// call), so a stable listing is built with `search3`. An empty query is
/// interpreted by Navidrome as "all songs".
pub async fn fetch_all_songs(client: &Client, query: &str) -> Result<Vec<Child>, SubsonicError> {
    let mut songs = Vec::new();
    let mut offset: i32 = 0;

    loop {
        let result = client
            .search3(
                query,
                &Search3Options::new()
                    .song_count(FETCH_CHUNK)
                    .song_offset(offset),
            )
            .await?;

        let page_len = result.song.len();
        songs.extend(result.song);

        if page_len < FETCH_CHUNK as usize || songs.len() >= MAX_SONGS {
            break;
        }

        offset += page_len as i32;
    }

    songs.truncate(MAX_SONGS);
    Ok(songs)
}

/// Run a combined search across artists, albums and songs.
///
/// `limit` is applied per entity type; OpenSubsonic `search3` defaults to 20
/// results per type when no count is given.
pub async fn search_all(
    client: &Client,
    query: &str,
    limit: i32,
) -> Result<SearchResult3, SubsonicError> {
    let result = client
        .search3(
            query,
            &Search3Options::new()
                .artist_count(limit)
                .album_count(limit)
                .song_count(limit),
        )
        .await?;

    Ok(result)
}

/// Fetch a page of artists using in-memory pagination.
///
/// Limitation: OpenSubsonic's `getArtists` is not paginated — it always returns
/// the whole library — so we fetch all and slice.
pub async fn fetch_artists_paginated(
    client: &Client,
    offset: usize,
    limit: usize,
) -> Result<(Vec<ArtistId3>, u64), SubsonicError> {
    let all = fetch_all_artists(client).await?;
    let total = all.len() as u64;
    let page: Vec<ArtistId3> = all.into_iter().skip(offset).take(limit).collect();
    Ok((page, total))
}

/// Fetch a page of albums using native `getAlbumList2` pagination.
///
/// Returns the page and the total count (requires fetching all once for accuracy).
pub async fn fetch_albums_paginated(
    client: &Client,
    list_type: AlbumListType,
    offset: usize,
    limit: usize,
) -> Result<(Vec<AlbumId3>, u64), SubsonicError> {
    // For accurate total, we need to fetch all once.
    // This is a limitation of the Subsonic API.
    let all = fetch_all_albums(client, list_type).await?;
    let total = all.len() as u64;
    let page: Vec<AlbumId3> = all.into_iter().skip(offset).take(limit).collect();
    Ok((page, total))
}

/// Fetch a page of songs using native `search3` pagination.
///
/// Consistent with the artist and album pagination helpers: a single fetch
/// provides both the page slice and the accurate total count.
pub async fn fetch_songs_paginated(
    client: &Client,
    query: &str,
    offset: usize,
    limit: usize,
) -> Result<(Vec<Child>, u64), SubsonicError> {
    let all = fetch_all_songs(client, query).await?;
    let total = all.len() as u64;
    let page: Vec<Child> = all.into_iter().skip(offset).take(limit).collect();
    Ok((page, total))
}

/// Fetch a single artist by ID.
pub async fn fetch_artist(client: &Client, id: &str) -> Result<ArtistWithAlbumsId3, SubsonicError> {
    let artist = client.get_artist(id).await?;
    Ok(artist)
}

/// Fetch a single album by ID (includes songs).
pub async fn fetch_album(client: &Client, id: &str) -> Result<AlbumWithSongsId3, SubsonicError> {
    let album = client.get_album(id).await?;
    Ok(album)
}

/// Fetch a single song by ID.
pub async fn fetch_song(client: &Client, id: &str) -> Result<Child, SubsonicError> {
    let song = client.get_song(id).await?;
    Ok(song)
}

/// Fetch cover art bytes by ID.
pub async fn fetch_cover_art(
    client: &Client,
    id: &str,
    size: Option<i32>,
) -> Result<Vec<u8>, SubsonicError> {
    let bytes = client.get_cover_art(id, size).await?;
    Ok(bytes.to_vec())
}

// ---------------------------------------------------------------------------
// Star / Favorite
// ---------------------------------------------------------------------------

/// Star an item (song, album, or artist) by ID.
pub async fn star_item(client: &Client, id: &str) -> Result<(), SubsonicError> {
    client.star(&[id], &[], &[]).await.map_err(SubsonicError::Upstream)?;
    Ok(())
}

/// Unstar an item (song, album, or artist) by ID.
pub async fn unstar_item(client: &Client, id: &str) -> Result<(), SubsonicError> {
    client.unstar(&[id], &[], &[]).await.map_err(SubsonicError::Upstream)?;
    Ok(())
}

/// Fetch starred content (artists, albums, songs).
pub async fn fetch_starred(client: &Client) -> Result<opensubsonic::api::lists::Starred2Content, SubsonicError> {
    let starred = client.get_starred2(None).await.map_err(SubsonicError::Upstream)?;
    Ok(starred)
}

// ---------------------------------------------------------------------------
// Playlists
// ---------------------------------------------------------------------------

/// Fetch all playlists.
pub async fn fetch_playlists(client: &Client) -> Result<Vec<opensubsonic::data::Playlist>, SubsonicError> {
    let playlists = client.get_playlists(None).await.map_err(SubsonicError::Upstream)?;
    Ok(playlists)
}

/// Fetch a single playlist with songs.
pub async fn fetch_playlist(client: &Client, id: &str) -> Result<opensubsonic::data::PlaylistWithSongs, SubsonicError> {
    let playlist = client.get_playlist(id).await.map_err(SubsonicError::Upstream)?;
    Ok(playlist)
}

/// Create a new playlist.
pub async fn create_playlist(client: &Client, name: &str, song_ids: &[String]) -> Result<(), SubsonicError> {
    let ids: Vec<&str> = song_ids.iter().map(|s| s.as_str()).collect();
    client.create_playlist(None, Some(name), &ids).await.map_err(SubsonicError::Upstream)?;
    Ok(())
}

/// Update a playlist (rename, add/remove songs).
pub async fn update_playlist(
    client: &Client,
    id: &str,
    name: Option<&str>,
    comment: Option<&str>,
    public: Option<bool>,
    song_ids_to_add: &[String],
    song_indexes_to_remove: &[i32],
) -> Result<(), SubsonicError> {
    let mut opts = opensubsonic::UpdatePlaylistOptions::new();
    if let Some(n) = name { opts = opts.name(n); }
    if let Some(c) = comment { opts = opts.comment(c); }
    if let Some(p) = public { opts = opts.public(p); }
    for sid in song_ids_to_add { opts = opts.add_song(sid); }
    for idx in song_indexes_to_remove { opts = opts.remove_index(*idx); }
    client
        .update_playlist(id, &opts)
        .await
        .map_err(SubsonicError::Upstream)?;
    Ok(())
}

/// Delete a playlist.
pub async fn delete_playlist(client: &Client, id: &str) -> Result<(), SubsonicError> {
    client.delete_playlist(id).await.map_err(SubsonicError::Upstream)?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Similar songs
// ---------------------------------------------------------------------------

/// Fetch similar songs by ID.
pub async fn fetch_similar_songs(client: &Client, id: &str, count: i32) -> Result<Vec<opensubsonic::data::Child>, SubsonicError> {
    let songs = client.get_similar_songs2(id, Some(count)).await.map_err(SubsonicError::Upstream)?;
    Ok(songs)
}

/// Fetch top songs by artist.
pub async fn fetch_top_songs(client: &Client, artist: &str, count: i32) -> Result<Vec<opensubsonic::data::Child>, SubsonicError> {
    let songs = client.get_top_songs(artist, Some(count)).await.map_err(SubsonicError::Upstream)?;
    Ok(songs)
}

// ---------------------------------------------------------------------------
// Album/Artist info
// ---------------------------------------------------------------------------

/// Fetch album info (notes, MusicBrainz ID, images).
pub async fn fetch_album_info(client: &Client, id: &str) -> Result<opensubsonic::data::AlbumInfo, SubsonicError> {
    let info = client.get_album_info(id).await.map_err(SubsonicError::Upstream)?;
    Ok(info)
}

/// Fetch artist info (biography, similar artists, images).
pub async fn fetch_artist_info(client: &Client, id: &str) -> Result<opensubsonic::data::ArtistInfo2, SubsonicError> {
    let info = client.get_artist_info2(id, None, Some(true)).await.map_err(SubsonicError::Upstream)?;
    Ok(info)
}

// ---------------------------------------------------------------------------
// Genres
// ---------------------------------------------------------------------------

/// Fetch all genres.
pub async fn fetch_genres(client: &Client) -> Result<Vec<opensubsonic::data::Genre>, SubsonicError> {
    let genres = client.get_genres().await.map_err(SubsonicError::Upstream)?;
    Ok(genres)
}

/// Fetch songs by genre.
pub async fn fetch_songs_by_genre(
    client: &Client,
    genre: &str,
    count: i32,
    offset: i32,
) -> Result<Vec<opensubsonic::data::Child>, SubsonicError> {
    let opts = opensubsonic::SongsByGenreOptions::new()
        .count(count)
        .offset(offset);
    let songs = client.get_songs_by_genre(genre, &opts).await.map_err(SubsonicError::Upstream)?;
    Ok(songs)
}

// ---------------------------------------------------------------------------
// Now playing
// ---------------------------------------------------------------------------

/// Fetch currently playing tracks.
pub async fn fetch_now_playing(client: &Client) -> Result<Vec<opensubsonic::data::NowPlayingEntry>, SubsonicError> {
    let entries = client.get_now_playing().await.map_err(SubsonicError::Upstream)?;
    Ok(entries)
}

// ---------------------------------------------------------------------------
// Scrobble
// ---------------------------------------------------------------------------

/// Scrobble a song (report play).
pub async fn scrobble_song(client: &Client, id: &str, submission: bool) -> Result<(), SubsonicError> {
    client.scrobble(id, None, Some(submission)).await.map_err(SubsonicError::Upstream)?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Music folders
// ---------------------------------------------------------------------------

/// Fetch music folders.
pub async fn fetch_music_folders(client: &Client) -> Result<Vec<opensubsonic::data::MusicFolder>, SubsonicError> {
    let folders = client.get_music_folders().await.map_err(SubsonicError::Upstream)?;
    Ok(folders)
}

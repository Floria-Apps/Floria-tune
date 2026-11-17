use tauri::State;

use crate::models::{AlbumInfoDetail, ArtistInfoDetail, GenreInfo, PlaylistDetail, PlaylistSummary, Song};
use crate::state::AppState;
use crate::subsonic::client;

/// Star a song/album/artist by ID.
#[tauri::command]
pub async fn star_item(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let client = state.navidrome_client().await?;
    client::star_item(&client, &id).await.map_err(|e| e.to_string())?;
    Ok(())
}

/// Unstar a song/album/artist by ID.
#[tauri::command]
pub async fn unstar_item(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let client = state.navidrome_client().await?;
    client::unstar_item(&client, &id).await.map_err(|e| e.to_string())?;
    Ok(())
}

/// Fetch starred content (artists, albums, songs).
#[tauri::command]
pub async fn get_starred(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let client = state.navidrome_client().await?;
    let starred = client::fetch_starred(&client).await.map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(starred).unwrap_or_default())
}

/// List all playlists.
#[tauri::command]
pub async fn get_playlists(state: State<'_, AppState>) -> Result<Vec<PlaylistSummary>, String> {
    let client = state.navidrome_client().await?;
    let playlists = client::fetch_playlists(&client).await.map_err(|e| e.to_string())?;
    Ok(playlists.into_iter().map(PlaylistSummary::from).collect())
}

/// Fetch a single playlist with its songs.
#[tauri::command]
pub async fn get_playlist(state: State<'_, AppState>, id: String) -> Result<PlaylistDetail, String> {
    let client = state.navidrome_client().await?;
    let playlist = client::fetch_playlist(&client, &id).await.map_err(|e| e.to_string())?;
    Ok(PlaylistDetail::from(playlist))
}

/// Create a new playlist.
#[tauri::command]
pub async fn create_playlist(
    state: State<'_, AppState>,
    name: String,
    song_ids: Vec<String>,
) -> Result<(), String> {
    let client = state.navidrome_client().await?;
    client::create_playlist(&client, &name, &song_ids)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Update a playlist.
#[tauri::command]
pub async fn update_playlist(
    state: State<'_, AppState>,
    id: String,
    name: Option<String>,
    comment: Option<String>,
    public: Option<bool>,
    song_ids_to_add: Vec<String>,
    song_indexes_to_remove: Vec<i32>,
) -> Result<(), String> {
    let client = state.navidrome_client().await?;
    client::update_playlist(
        &client,
        &id,
        name.as_deref(),
        comment.as_deref(),
        public,
        &song_ids_to_add,
        &song_indexes_to_remove,
    )
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Delete a playlist.
#[tauri::command]
pub async fn delete_playlist(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let client = state.navidrome_client().await?;
    client::delete_playlist(&client, &id).await.map_err(|e| e.to_string())?;
    Ok(())
}

/// Fetch recommended songs by ID (also known as "similar songs").
#[tauri::command]
pub async fn get_recommendations_songs(
    state: State<'_, AppState>,
    id: String,
    count: Option<i32>,
) -> Result<Vec<Song>, String> {
    let client = state.navidrome_client().await?;
    let songs = client::fetch_similar_songs(&client, &id, count.unwrap_or(20))
        .await
        .map_err(|e| e.to_string())?;
    Ok(songs.into_iter().map(Song::from).collect())
}

/// Fetch top songs by artist name.
#[tauri::command]
pub async fn get_top_songs(
    state: State<'_, AppState>,
    artist: String,
    count: Option<i32>,
) -> Result<Vec<Song>, String> {
    let client = state.navidrome_client().await?;
    let songs = client::fetch_top_songs(&client, &artist, count.unwrap_or(20))
        .await
        .map_err(|e| e.to_string())?;
    Ok(songs.into_iter().map(Song::from).collect())
}

/// Fetch album info (notes, MusicBrainz ID, images).
#[tauri::command]
pub async fn get_album_info(state: State<'_, AppState>, id: String) -> Result<AlbumInfoDetail, String> {
    let client = state.navidrome_client().await?;
    let info = client::fetch_album_info(&client, &id).await.map_err(|e| e.to_string())?;
    Ok(AlbumInfoDetail::from(info))
}

/// Fetch artist info (biography, similar artists, images).
#[tauri::command]
pub async fn get_artist_info(state: State<'_, AppState>, id: String) -> Result<ArtistInfoDetail, String> {
    let client = state.navidrome_client().await?;
    let info = client::fetch_artist_info(&client, &id).await.map_err(|e| e.to_string())?;
    Ok(ArtistInfoDetail::from(info))
}

/// Fetch all genres.
#[tauri::command]
pub async fn get_genres(state: State<'_, AppState>) -> Result<Vec<GenreInfo>, String> {
    let client = state.navidrome_client().await?;
    let genres = client::fetch_genres(&client).await.map_err(|e| e.to_string())?;
    Ok(genres.into_iter().map(GenreInfo::from).collect())
}

/// Fetch songs by genre.
#[tauri::command]
pub async fn get_songs_by_genre(
    state: State<'_, AppState>,
    genre: String,
    count: Option<i32>,
    offset: Option<i32>,
) -> Result<Vec<Song>, String> {
    let client = state.navidrome_client().await?;
    let songs = client::fetch_songs_by_genre(&client, &genre, count.unwrap_or(50), offset.unwrap_or(0))
        .await
        .map_err(|e| e.to_string())?;
    Ok(songs.into_iter().map(Song::from).collect())
}

/// Fetch currently playing tracks.
#[tauri::command]
pub async fn get_now_playing(state: State<'_, AppState>) -> Result<Vec<crate::models::Song>, String> {
    let client = state.navidrome_client().await?;
    let entries = client::fetch_now_playing(&client).await.map_err(|e| e.to_string())?;
    Ok(entries.into_iter().map(|e| Song::from(e.child)).collect())
}

/// Scrobble a song (report play).
#[tauri::command]
pub async fn scrobble_song(state: State<'_, AppState>, id: String, submission: bool) -> Result<(), String> {
    let client = state.navidrome_client().await?;
    client::scrobble_song(&client, &id, submission).await.map_err(|e| e.to_string())?;
    Ok(())
}

/// Fetch music folders.
#[tauri::command]
pub async fn get_music_folders(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let client = state.navidrome_client().await?;
    let folders = client::fetch_music_folders(&client).await.map_err(|e| e.to_string())?;
    Ok(folders.into_iter().filter_map(|f| f.name).collect())
}

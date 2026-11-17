import { invoke } from "@tauri-apps/api/core";

import type { Album } from "../types/album";
import type { Artist } from "../types/artist";
import type { Paginated } from "../types/pagination";
import type { SearchResults } from "../types/search";
import type { Song } from "../types/song";

export interface ConnectionStatus {
  status: string;
  service: string;
  navidrome: string;
}

export interface SettingsResponse {
  navidrome_local_url: string | null;
  navidrome_external_url: string | null;
  navidrome_url_mode: UrlMode;
  navidrome_auth_method: AuthMethod;
  navidrome_username: string | null;
  has_password: boolean;
  has_api_key: boolean;
  theme_seed: string | null;
  color_mode: "light" | "dark" | "system" | null;
  volume?: number | null;
  lyrics_font_family?: string | null;
  lyrics_font_size_active?: number | null;
  lyrics_font_size_inactive?: number | null;
  lyrics_font_size_unsynced?: number | null;
  lyrics_font_weight_active?: string | null;
  lyrics_font_weight_inactive?: string | null;
  lyrics_line_height?: number | null;
  lyrics_letter_spacing?: number | null;
  lyrics_alignment?: string | null;
  lyrics_color_active?: string | null;
  lyrics_color_inactive?: string | null;
  lyrics_color_passed?: string | null;
  lyrics_opacity_inactive?: number | null;
  lyrics_margin_x?: number | null;
  lyrics_scroll_position?: number | null;
  lyrics_animation_speed?: number | null;
  locale?: string | null;
  has_listenbrainz_token?: boolean;
  listenbrainz_enabled?: boolean;
  status: string;
}

export type UrlMode = "auto" | "local" | "external";
export type AuthMethod = "password" | "api_key";

export async function getConnectionStatus(): Promise<ConnectionStatus> {
  return invoke<ConnectionStatus>("get_connection_status");
}

export async function getArtists(page = 1, limit = 50): Promise<Paginated<Artist>> {
  return invoke<Paginated<Artist>>("get_artists", { page, limit });
}

export async function getArtist(id: string): Promise<Artist> {
  return invoke<Artist>("get_artist", { id });
}

export async function getArtistAlbums(id: string): Promise<Album[]> {
  return invoke<Album[]>("get_artist_albums", { id });
}

export async function getAlbums(page = 1, limit = 50): Promise<Paginated<Album>> {
  return invoke<Paginated<Album>>("get_albums", { page, limit });
}

export async function getAlbum(id: string): Promise<Album> {
  return invoke<Album>("get_album", { id });
}

export async function getAlbumSongs(id: string): Promise<Song[]> {
  return invoke<Song[]>("get_album_songs", { id });
}

export async function getSongs(
  page = 1,
  limit = 50,
  query?: string,
): Promise<Paginated<Song>> {
  return invoke<Paginated<Song>>("get_songs", { page, limit, query });
}

export async function getSong(id: string): Promise<Song> {
  return invoke<Song>("get_song", { id });
}

export async function getRandomSongs(size = 8): Promise<Song[]> {
  return invoke<Song[]>("get_random_songs", { size });
}

export async function searchLibrary(query: string, limit = 20): Promise<SearchResults> {
  return invoke<SearchResults>("search", { query, limit });
}

export async function getSettings(): Promise<SettingsResponse> {
  return invoke<SettingsResponse>("get_settings");
}

export interface UpdateSettingsPayload {
  navidrome_local_url?: string;
  navidrome_external_url?: string;
  navidrome_url_mode?: UrlMode;
  navidrome_auth_method?: AuthMethod;
  navidrome_username?: string;
  navidrome_password?: string;
  navidrome_api_key?: string;
  theme_seed?: string;
  color_mode?: "light" | "dark" | "system";
  volume?: number;
  lyrics_font_family?: string;
  lyrics_font_size_active?: number;
  lyrics_font_size_inactive?: number;
  lyrics_font_size_unsynced?: number;
  lyrics_font_weight_active?: string;
  lyrics_font_weight_inactive?: string;
  lyrics_line_height?: number;
  lyrics_letter_spacing?: number;
  lyrics_alignment?: string;
  lyrics_color_active?: string;
  lyrics_color_inactive?: string;
  lyrics_color_passed?: string;
  lyrics_opacity_inactive?: number;
  lyrics_margin_x?: number;
  lyrics_scroll_position?: number;
  lyrics_animation_speed?: number;
  locale?: string;
  listenbrainz_token?: string;
  listenbrainz_enabled?: boolean;
}

export async function updateSettings(
  payload: UpdateSettingsPayload,
): Promise<SettingsResponse> {
  return invoke<SettingsResponse>("update_settings", { request: payload });
}

export interface TestConnectionResponse {
  url: string;
  status: string;
}

export async function testConnection(
  payload: UpdateSettingsPayload,
): Promise<TestConnectionResponse> {
  return invoke<TestConnectionResponse>("test_connection", { request: payload });
}

export async function playSong(id: string): Promise<void> {
  return invoke("play_song", { id });
}

export async function pausePlayback(): Promise<void> {
  return invoke("pause");
}

export async function resumePlayback(): Promise<void> {
  return invoke("resume");
}

export async function togglePause(): Promise<boolean> {
  return invoke<boolean>("toggle_pause");
}

export async function setVolume(volume: number): Promise<void> {
  return invoke("set_volume", { volume });
}

export async function seek(seconds: number): Promise<void> {
  return invoke("seek", { seconds });
}

export async function stopPlayback(): Promise<void> {
  return invoke("stop_playback");
}

export async function getPosition(): Promise<number> {
  return invoke<number>("get_position");
}

export async function getDuration(): Promise<number> {
  return invoke<number>("get_duration");
}

export async function isPaused(): Promise<boolean> {
  return invoke<boolean>("is_paused");
}

export async function clearCoverCacheBackend(): Promise<void> {
  return invoke("clear_cover_cache");
}

export async function fetchCoverBytes(id: string, size?: number): Promise<Uint8Array> {
  const result = await invoke<ArrayBuffer | Uint8Array | number[] | { data: number[] }>(
    "get_cover_art",
    { id, size },
  );

  if (result instanceof ArrayBuffer) {
    return new Uint8Array(result);
  }
  if (ArrayBuffer.isView(result)) {
    return new Uint8Array(result.buffer, result.byteOffset, result.byteLength);
  }
  if (Array.isArray(result)) {
    return new Uint8Array(result);
  }
  if (result && Array.isArray((result as { data?: number[] }).data)) {
    return new Uint8Array((result as { data: number[] }).data);
  }
  throw new Error("unexpected cover response");
}

export interface LyricsLine {
  value: string;
  start?: number | null;
}

export interface CueWord {
  start: number;
  end?: number | null;
  value: string;
}

export interface StructuredCueLine {
  index: number;
  agent_id?: string | null;
  start?: number | null;
  end?: number | null;
  value: string;
  cue: CueWord[];
}

export interface StructuredLyricsV2 {
  lang: string;
  synced: boolean;
  line: LyricsLine[];
  display_artist?: string | null;
  display_title?: string | null;
  offset?: number | null;
  kind?: string | null; // "main" | "translation" | "pronunciation"
  agents?: { id: string; role: string; name: string }[] | null;
  cue_line?: StructuredCueLine[] | null;
}

export interface LyricsList {
  structured_lyrics: StructuredLyricsV2[];
}

export async function getLyrics(id: string): Promise<LyricsList> {
  return invoke<LyricsList>("get_lyrics", { id });
}

export async function dbGetPreference(key: string): Promise<string | null> {
  return invoke<string | null>("db_get_preference", { key });
}

export async function dbSetPreference(key: string, value: string): Promise<void> {
  return invoke("db_set_preference", { key, value });
}

export async function dbAddHistory(songId: string): Promise<void> {
  return invoke("db_add_history", { songId });
}

export async function dbGetHistory(limit?: number): Promise<string[]> {
  return invoke<string[]>("db_get_history", { limit });
}

// ---------------------------------------------------------------------------
// Star / Favorite
// ---------------------------------------------------------------------------

export async function starItem(id: string): Promise<void> {
  return invoke("star_item", { id });
}

export async function unstarItem(id: string): Promise<void> {
  return invoke("unstar_item", { id });
}

export interface StarredContent {
  artist: unknown[];
  album: unknown[];
  song: unknown[];
}

export async function getStarred(): Promise<StarredContent> {
  return invoke<StarredContent>("get_starred");
}

// ---------------------------------------------------------------------------
// Playlists
// ---------------------------------------------------------------------------

export interface PlaylistSummary {
  id: string;
  name: string;
  comment?: string | null;
  owner?: string | null;
  public?: boolean | null;
  song_count?: number | null;
  duration?: number | null;
  created?: string | null;
  changed?: string | null;
  cover_art?: string | null;
  readonly?: boolean | null;
}

export interface PlaylistDetail {
  id: string;
  name: string;
  comment?: string | null;
  owner?: string | null;
  public?: boolean | null;
  song_count?: number | null;
  duration?: number | null;
  created?: string | null;
  changed?: string | null;
  cover_art?: string | null;
  readonly?: boolean | null;
  songs: import("../types/song").Song[];
}

export async function getPlaylists(): Promise<PlaylistSummary[]> {
  return invoke<PlaylistSummary[]>("get_playlists");
}

export async function getPlaylist(id: string): Promise<PlaylistDetail> {
  return invoke<PlaylistDetail>("get_playlist", { id });
}

export async function createPlaylist(
  name: string,
  songIds: string[],
): Promise<void> {
  return invoke("create_playlist", { name, songIds });
}

export async function updatePlaylist(
  id: string,
  name?: string,
  comment?: string,
  isPublic?: boolean,
  songIdsToAdd?: string[],
  songIndexesToRemove?: number[],
): Promise<void> {
  return invoke("update_playlist", {
    id,
    name,
    comment,
    public: isPublic,
    songIdsToAdd: songIdsToAdd ?? [],
    songIndexesToRemove: songIndexesToRemove ?? [],
  });
}

export async function deletePlaylist(id: string): Promise<void> {
  return invoke("delete_playlist", { id });
}

// ---------------------------------------------------------------------------
// Similar songs & top songs
// ---------------------------------------------------------------------------

export async function getRecommendations(id: string, count?: number): Promise<import("../types/song").Song[]> {
  return invoke("get_recommendations_songs", { id, count });
}

export async function getTopSongs(artist: string, count?: number): Promise<import("../types/song").Song[]> {
  return invoke("get_top_songs", { artist, count });
}

// ---------------------------------------------------------------------------
// Album/Artist info
// ---------------------------------------------------------------------------

export interface AlbumInfoDetail {
  notes?: string | null;
  music_brainz_id?: string | null;
  last_fm_url?: string | null;
  small_image_url?: string | null;
  medium_image_url?: string | null;
  large_image_url?: string | null;
}

export async function getAlbumInfo(id: string): Promise<AlbumInfoDetail> {
  return invoke<AlbumInfoDetail>("get_album_info", { id });
}

export interface ArtistInfoDetail {
  biography?: string | null;
  music_brainz_id?: string | null;
  last_fm_url?: string | null;
  small_image_url?: string | null;
  medium_image_url?: string | null;
  large_image_url?: string | null;
  similar_artists: import("../types/artist").Artist[];
}

export async function getArtistInfo(id: string): Promise<ArtistInfoDetail> {
  return invoke<ArtistInfoDetail>("get_artist_info", { id });
}

export async function getArtistWithInfo(id: string): Promise<{ description: string | null }> {
  return invoke<{ description: string | null }>("get_artist_with_info", { id });
}

// ---------------------------------------------------------------------------
// Genres
// ---------------------------------------------------------------------------

export interface GenreInfo {
  name: string;
  song_count: number;
  album_count: number;
}

export async function getGenres(): Promise<GenreInfo[]> {
  return invoke<GenreInfo[]>("get_genres");
}

export async function getSongsByGenre(genre: string, count?: number, offset?: number): Promise<import("../types/song").Song[]> {
  return invoke("get_songs_by_genre", { genre, count, offset });
}

// ---------------------------------------------------------------------------
// Now playing
// ---------------------------------------------------------------------------

export async function getNowPlaying(): Promise<import("../types/song").Song[]> {
  return invoke("get_now_playing");
}

// ---------------------------------------------------------------------------
// Scrobble
// ---------------------------------------------------------------------------

export async function scrobbleSong(id: string, submission?: boolean): Promise<void> {
  return invoke("scrobble_song", { id, submission: submission ?? true });
}

// ---------------------------------------------------------------------------
// Music folders
// ---------------------------------------------------------------------------

export async function getMusicFolders(): Promise<string[]> {
  return invoke<string[]>("get_music_folders");
}

// ---------------------------------------------------------------------------
// ListenBrainz scrobble (separate from server) — see https://listenbrainz.org/
// ---------------------------------------------------------------------------

export interface ScrobbleTrackArgs {
  artist: string;
  track: string;
  album?: string | null;
  duration_ms?: number | null;
}

export async function listenbrainzTestToken(token: string): Promise<string> {
  // spread to avoid TS invoke error with a single string arg
  return invoke("listenbrainz_test_token", { token });
}

export async function listenbrainzScrobble(payload: ScrobbleTrackArgs): Promise<void> {
  return invoke("listenbrainz_scrobble", { ...payload });
}

export async function listenbrainzNowPlaying(payload: ScrobbleTrackArgs): Promise<void> {
  return invoke("listenbrainz_now_playing", { ...payload });
}

// ---------------------------------------------------------------------------
// Tray integration
// ---------------------------------------------------------------------------

export interface UpdateTrayInfoPayload {
  title?: string | null;
  artist?: string | null;
  isPaused: boolean;
}

export async function updateTrayInfo(payload: UpdateTrayInfoPayload): Promise<void> {
  return invoke("update_tray_info", { ...payload });
}

# Backend — Tauri Commands

## Conexão
- `get_connection_status` → `{ status, service, navidrome }`

## Artistas
- `get_artists(page?, limit?)` → `Paginated<Artist>`
- `get_artist(id)` → `Artist`
- `get_artist_albums(id)` → `Album[]`

## Álbuns
- `get_albums(page?, limit?)` → `Paginated<Album>`
- `get_album(id)` → `Album`
- `get_album_songs(id)` → `Song[]`

## Músicas
- `get_songs(page?, limit?, query?)` → `Paginated<Song>`
- `get_song(id)` → `Song`
- `get_random_songs(size?)` → `Song[]`

## Busca
- `search(query, limit?)` → `SearchResults`

## Configurações
- `get_settings()` → `SettingsResponse` (URLs local/externa, preferência de rede, método de autenticação, cor do tema e modo de cor; nunca devolve segredos)
- `update_settings(request)` → `SettingsResponse` (valida a conexão apenas quando campos de conexão mudam; salva preferências offline)
- `test_connection(request)` → `{ url, status }` (testa credenciais e endereços sem salvar)

## Capas
- `get_cover_art(id, size?)` → `{ data: number[], mime: string }` (blob URL no frontend)

## Letras
- `get_lyrics(id)` → `LyricsList`

## Áudio
- `play_song(id)` — resolve URL de stream e carrega no mpv
- `pause`, `resume`, `toggle_pause`, `set_volume`, `seek`, `stop_playback`
- `get_position`, `get_duration`, `is_paused`
- `audio_init`, `audio_load`, `audio_toggle_pause`, `audio_set_paused`, `audio_set_volume`, `audio_seek`, `audio_stop`

## Modelos
- `Artist`: id, name, album_count, cover_art, music_brainz_id
- `Album`: id, name, artist, artist_id, cover_art, year, song_count, duration, genre
- `Song`: id, title, artist, artist_id, album, album_id, cover_art, duration, track, disc_number, year, genre, bit_rate, suffix, content_type
- `Paginated<T>`: items, pagination { page, limit, total, total_pages }
- `SearchResults`: artists, albums, songs
- `SettingsResponse`: navidrome_url, navidrome_username, has_password, theme_seed, status
- `LyricsList`: structured_lyrics[]

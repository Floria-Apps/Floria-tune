# Frontend

## Páginas (`src/pages/`)
- `HomePage` — destaque, shelves de álbuns/artistas/músicas, Descobrir (aleatório)
- `ArtistsPage` / `ArtistPage` — listagem e detalhe (álbuns do artista)
- `AlbumsPage` / `AlbumPage` — listagem e detalhe (faixas, reproduzir álbum)
- `SongsPage` — listagem paginada com filtro
- `SearchPage` — busca combinada (artistas/álbuns/músicas)
- `SettingsPage` — tema (claro/escuro/sistema), cor de destaque com botão **Salvar preferências**, credenciais Navidrome (usuário/senha ou chave de API) e URLs local/externa com preferência de rede

## Componentes principais (`src/components/`)
- `AppShell`, `Sidebar`, `TopBar` — layout e navegação
- `PlayerDock` — player integrado (play/pause, prev/next, volume, shuffle/repeat, letras, progresso)
- `CoverArt` — capa real (proxy) com fallback generativo, cache de blob URLs
- `AlbumCard`, `ArtistCard`, `SongRow`, `SongTeaser` — itens de biblioteca
- `Section`, `Pager`, `FactList`, `Feedback` (Error/Empty/Loading)
- `RightPanel`, `QueueSection`, `SyncedLyrics` — painel lateral com fila e letras sincronizadas
- `ConnectionStatus`, `BrandMark`

## Roteamento
Hash-based (`useHashRoute`): `#/`, `#/artists`, `#/artists/:id`, `#/albums`, `#/albums/:id`, `#/songs`, `#/search?q=`, `#/settings`.

## Serviços
- `src/services/tauri.ts` — wrapper de `invoke` + tipos.
- `src/player/PlayerContext.tsx` — estado do player (fila, shuffle, repeat).
- `src/hooks/` — useResource, useHashRoute, useDebouncedValue, useMediaQuery.

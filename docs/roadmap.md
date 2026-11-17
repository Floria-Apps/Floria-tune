# Roadmap — O que falta

## Backend
- [ ] Cache em memória (moka) para listas de artistas/álbuns.
- [ ] Streaming de áudio (`/api/stream` equivalente) com suporte a Range.
- [ ] Favoritos / avaliação (star, rating) e scrobble.
- [ ] Playlists (CRUD).
- [ ] Busca avançada (filtros por gênero/ano, ordenação).
- [ ] OpenAPI/Swagger (utoipa já no Cargo.toml).
- [ ] Rate limiting (governor já no Cargo.toml).
- [ ] Health check rico com latência do Navidrome.
- [ ] SQLite para histórico, fila persistente, preferências.

## Frontend / UI
- [ ] Fila editável (reordenar, remover) — QueueSection já existe, integrar ao dock.
- [ ] Letras sincronizadas com destaque da linha atual (SyncedLyrics já existe).
- [ ] Shuffle/repeat persistidos.
- [ ] Volume persistido nas settings.
- [ ] Mini player / system tray.
- [ ] Media keys (Linux MPRIS).
- [ ] Crossfade / gapless.
- [ ] Página de artista/álbum com background tint pela capa.
- [ ] Notificações toast (sonner).
- [ ] Modo offline / cache de biblioteca.

## Infra
- [ ] Empacotar backend como sidecar no Tauri build.
- [ ] Auto-update.
- [ ] Testes E2E do frontend.
- [ ] CI (lint, typecheck, build, cargo test).

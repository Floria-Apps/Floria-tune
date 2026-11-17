# Arquitetura

## Comunicação
- Frontend ↔ Backend exclusivamente via **Tauri Commands** (`invoke`).
- Camada centralizada: `src/services/tauri.ts`.
- Sem servidor HTTP local (Axum removido).

## Estado compartilhado
- `AppState` (em `src-tauri/src/state.rs`) guarda o cliente Navidrome (lazy, reutilizado) e valida a conexão na primeira chamada.
- `AudioEngine` (rsmpv) gerenciado pelo Tauri.

## Persistência
- Settings: `~/.config/floria-tune/settings.json` (URLs local/externa, preferência de rede, autenticação, usuário, senha ou chave de API, cor do tema e modo claro/escuro).
- Credenciais vêm **apenas** do arquivo de settings; não há fallback por variáveis de ambiente ou `.env`.
- Volume/estado do player mantidos em memória (SQLite guarda histórico e preferências do player).

## Módulos backend
- `config/` — load/save settings.
- `subsonic/` — cliente OpenSubsonic + fetch helpers.
- `models/` — Artist, Album, Song, Paginated, SearchResults.
- `commands/` — Tauri commands.
- `audio/` — AudioEngine (mpv).
- `state.rs` — AppState.

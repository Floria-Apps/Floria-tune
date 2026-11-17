# Floria Tune — Documentação

## Visão geral
Floria Tune é um aplicativo desktop (Tauri 2) para biblioteca de música conectada ao Navidrome (OpenSubsonic), com frontend React + TypeScript e backend Rust integrado.

## Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, shadcn-m3e.
- **Backend**: Rust (Tauri 2 commands), OpenSubsonic, rsmpv/libmpv.
- **Persistência**: `~/.config/floria-tune/settings.json` (credenciais/tema), volume/estado no player.

## Estrutura
```
src/                 # React app
src-tauri/           # Rust backend (Tauri)
  src/commands/      # Tauri commands
  src/models/        # Modelos Serde
  src/subsonic/      # Cliente OpenSubsonic
  src/config/        # Settings
  src/audio/         # AudioEngine (rsmpv)
  src/state.rs       # Estado compartilhado
```

## Como rodar
```
pnpm tauri dev       # inicia tudo (frontend + backend integrado)
pnpm build           # build frontend
pnpm typecheck       # tsc --noEmit
pnpm gen:icons       # regenera ícones
cargo check --manifest-path src-tauri/Cargo.toml
```

## Documentação detalhada
- [Arquitetura](./architecture.md)
- [Backend / API (Tauri Commands)](./backend.md)
- [Frontend / Páginas](./frontend.md)
- [Componentes shadcn-m3e](./components-m3e.md)
- [Roadmap / O que falta](./roadmap.md)

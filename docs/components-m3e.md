# Componentes shadcn-m3e utilizados

## Instalados (`src/components/m3e/`)
- `app-bar` — AppBar, useScrolled
- `badge` — Badge, NotificationBadge
- `button` — Button, buttonVariants
- `card` — Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- `color-mode-provider` — ColorModeProvider, useColorMode
- `empty` — Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia
- `icon` — Icon, registerIcons
- `loading-indicator` — LoadingIndicator
- `m3e-provider` — M3eProvider
- `m3-theme-provider` — M3ThemeProvider, useM3Theme
- `m3-theme-scope` — M3ThemeScope
- `navigation` — NavigationBar, NavigationBarItem, NavigationRail, NavigationRailItem, ...
- `pagination` — Pagination, PaginationContent, PaginationItem, PaginationLink, ...
- `ripple` — Ripple
- `skeleton` — Skeleton
- `text-field` — TextField
- `symbols` — ícones internos (ChevronLeft, etc.)

## Tokens M3E usados
- Cores: `bg-surface`, `text-on-surface`, `bg-primary`, `text-on-primary`, `bg-secondary-container`, etc.
- Tipografia: `text-title-large`, `text-body-medium`, `text-label-small`, ... (e variantes `-emphasized`)
- Forma: `rounded-md`, `rounded-full`, `rounded-sm`
- Elevação: `shadow-elevation-1` … `shadow-elevation-3`
- Movimento: `transition-shape`, `motion-spatial-*`
- Estado: `state-layer`, `focus-ring`

## Ícones
- Material Symbols Rounded via `@iconify/react/offline`, bundle gerado por `scripts/icons.mjs`.
- Comando: `pnpm gen:icons` / `pnpm check:icons`.

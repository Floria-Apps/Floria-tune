import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";

import { AppShell, type PageMeta } from "./components/AppShell";
import { EmptyPanel, LoadingPanel } from "./components/Feedback";
import { useHashRoute } from "./hooks/useHashRoute";
// useTrayListeners is mounted inside AppShell (within PlayerProvider).
import { LyricsSettingsProvider } from "./lib/lyrics-settings";
import { PlayerProvider } from "./player/PlayerContext";
import { useTranslation } from "./lib/i18n";

const HomePage = lazy(() =>
  import("./pages/HomePage").then((module) => ({ default: module.HomePage })),
);
const AlbumPage = lazy(() =>
  import("./pages/AlbumPage").then((module) => ({ default: module.AlbumPage })),
);
const AlbumsPage = lazy(() =>
  import("./pages/AlbumsPage").then((module) => ({
    default: module.AlbumsPage,
  })),
);
const ArtistPage = lazy(() =>
  import("./pages/ArtistPage").then((module) => ({
    default: module.ArtistPage,
  })),
);
const ArtistsPage = lazy(() =>
  import("./pages/ArtistsPage").then((module) => ({
    default: module.ArtistsPage,
  })),
);
const SongsPage = lazy(() =>
  import("./pages/SongsPage").then((module) => ({ default: module.SongsPage })),
);
const PlaylistPage = lazy(() =>
  import("./pages/PlaylistPage").then((module) => ({
    default: module.PlaylistPage,
  })),
);
const SearchPage = lazy(() =>
  import("./pages/SearchPage").then((module) => ({
    default: module.SearchPage,
  })),
);
const SettingsPage = lazy(() =>
  import("./pages/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  })),
);

function parsePage(value: string | null): number {
  const parsed = Number.parseInt(value ?? "1", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default function App() {
  const { route, navigate } = useHashRoute();
  const t = useTranslation();

  // Tray listeners are registered inside AppShell (within PlayerProvider).
  const page = parsePage(route.query.get("page"));
  const query = route.query.get("q") ?? "";

  const handleSearch = useCallback(
    (value: string) => {
      const trimmed = value.trim();

      navigate(
        trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search",
      );
    },
    [navigate],
  );

  const handleSongsPageChange = useCallback(
    (next: number) => {
      const params = new URLSearchParams();

      if (query) {
        params.set("q", query);
      }

      params.set("page", String(next));
      navigate(`/songs?${params.toString()}`);
    },
    [navigate, query],
  );

  const { meta, content } = useMemo<{
    meta: PageMeta;
    content: ReactNode;
  }>(() => {
    const [head, id] = route.segments;

  if (!head) {
    return {
      meta: { title: t.pages.home },
      content: <HomePage />,
    };
  }

  if (head === "artists") {
    if (id) {
      return {
        meta: { title: t.pages.artist, backHref: "#/artists" },
        content: <ArtistPage id={id} />,
      };
    }

    return {
      meta: { title: t.pages.artists },
      content: (
        <ArtistsPage
          page={page}
          onPageChange={(next) => navigate(`/artists?page=${next}`)}
        />
      ),
    };
  }

  if (head === "albums") {
    if (id) {
      return {
        meta: { title: t.pages.album, backHref: "#/albums" },
        content: <AlbumPage id={id} />,
      };
    }

    return {
      meta: { title: t.pages.albums },
      content: (
        <AlbumsPage
          page={page}
          onPageChange={(next) => navigate(`/albums?page=${next}`)}
        />
      ),
    };
  }

  if (head === "songs") {
    return {
      meta: { title: t.pages.songs },
      content: (
        <SongsPage
          page={page}
          query={query}
          onPageChange={handleSongsPageChange}
          onQueryChange={handleSearch}
        />
      ),
    };
  }

  if (head === "playlists") {
    return {
      meta: { title: t.pages.playlists },
      content: <PlaylistPage page={page} />,
    };
  }

  if (head === "search") {
    return {
      meta: { title: t.pages.search, backHref: "#/" },
      content: <SearchPage query={query} onQueryChange={handleSearch} />,
    };
  }

  if (head === "settings") {
    const section =
      id === "letras"
        ? "lyrics"
        : id === "conexao"
          ? "connection"
          : id === "sobre"
            ? "about"
            : id === "preferencias"
              ? "preferences"
              : "all";
    const titles: Record<string, string> = {
      lyrics: t.settings.lyrics,
      connection: t.settings.connection,
      about: t.settings.about,
      preferences: t.settings.preferences,
      all: t.pages.settings,
    };
    return {
      meta: { title: titles[section] ?? t.pages.settings },
      content: <SettingsPage section={section === "all" ? "all" : section} />,
    };
  }

  return {
    meta: { title: t.pages.notFound },
    content: (
      <EmptyPanel
        title={t.common.notFound}
        message={t.common.notFoundMessage}
        icon="error"
        actionLabel={t.common.goHome}
        actionHref="#/"
      />
    ),
  };
  }, [
    route.segments,
    page,
    query,
    navigate,
    handleSearch,
    handleSongsPageChange,
    t,
  ]);

  useEffect(() => {
    document.title = `${meta.title} · Floria Tune`;
  }, [meta.title]);

  const scrollKey = `${route.path}?${route.query.toString()}`;

  return (
    <LyricsSettingsProvider>
      <PlayerProvider>
        <AppShell
          meta={meta}
          currentPath={route.path}
          scrollKey={scrollKey}
          onSearch={handleSearch}
        >
          <Suspense fallback={<LoadingPanel />}>{content}</Suspense>
        </AppShell>
      </PlayerProvider>
    </LyricsSettingsProvider>
  );
}

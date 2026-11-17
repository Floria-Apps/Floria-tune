import { getPlaylists } from "../services/tauri";
import { EmptyPanel, ErrorPanel, LoadingGrid } from "../components/Feedback";
import { CoverArt } from "../components/CoverArt";
import { useResource } from "../hooks/useResource";
import { pluralize } from "../lib/format";

interface PlaylistPageProps {
  page: number;
}

export function PlaylistPage({ page }: PlaylistPageProps) {
  const playlists = useResource(`playlists:${page}`, () => getPlaylists());

  if (playlists.error) {
    return <ErrorPanel message={playlists.error} onRetry={playlists.reload} />;
  }

  if (playlists.loading || !playlists.data) {
    return <LoadingGrid items={6} />;
  }

  const data = playlists.data;

  if (data.length === 0) {
    return (
      <EmptyPanel
        title="Nenhuma playlist ainda"
        message="Clique no botão + para criar sua primeira playlist."
        icon="playlist_add"
      />
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((playlist) => {
          const count = playlist.song_count ?? 0;

          return (
            <article
              key={playlist.id}
              className="glass-card flex flex-col rounded-[20px] p-4 transition-shadow hover:shadow-elevation-2"
            >
              <CoverArt
                id={playlist.id}
                name={playlist.name}
                kind="album"
                coverArt={playlist.cover_art}
                className="w-full"
              />

              <div className="pt-3">
                <h3 className="truncate text-body-medium-emphasizing">
                  {playlist.name}
                </h3>
                <p className="truncate text-body-small text-on-surface-variant">
                  {count} {pluralize(count, "música", "músicas")}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

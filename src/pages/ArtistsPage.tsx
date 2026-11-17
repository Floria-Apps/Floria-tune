import { getArtists } from "../services/tauri";
import { ArtistCard } from "../components/ArtistCard";
import { EmptyPanel, ErrorPanel, LoadingGrid } from "../components/Feedback";
import { Pager } from "../components/Pager";
import { useResource } from "../hooks/useResource";
import { pluralize } from "../lib/format";

const PAGE_SIZE = 36;

interface ArtistsPageProps {
  page: number;
  onPageChange: (page: number) => void;
}

export function ArtistsPage({ page, onPageChange }: ArtistsPageProps) {
  const artists = useResource(`artists:${page}`, () =>
    getArtists(page, PAGE_SIZE),
  );

  if (artists.error) {
    return <ErrorPanel message={artists.error} onRetry={artists.reload} />;
  }

  if (artists.loading || !artists.data) {
    return <LoadingGrid items={12} />;
  }

  const { items, pagination } = artists.data;

  if (items.length === 0 && page > 1) {
    return (
      <EmptyPanel
        title="Esta página não existe"
        message="A lista de artistas terminou antes desta página."
        icon="person"
        actionLabel="Voltar à primeira página"
        actionHref="#/artists"
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyPanel
        title="Nenhum artista no acervo"
        message="Quando o Navidrome indexar sua música, os artistas aparecem aqui."
        icon="person"
      />
    );
  }

  return (
    <div>
      <p className="max-w-[65ch] text-body-medium text-on-surface-variant">
        {pluralize(pagination.total, "artista", "artistas")} no acervo.
      </p>

      <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-x-4 gap-y-7">
        {items.map((artist) => (
          <ArtistCard key={artist.id} artist={artist} />
        ))}
      </div>

      <Pager
        page={pagination.page}
        limit={pagination.limit}
        total={pagination.total}
        onChange={onPageChange}
      />
    </div>
  );
}

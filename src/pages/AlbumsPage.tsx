import { getAlbums } from "../services/tauri";
import { AlbumCard } from "../components/AlbumCard";
import { EmptyPanel, ErrorPanel, LoadingGrid } from "../components/Feedback";
import { Pager } from "../components/Pager";
import { useResource } from "../hooks/useResource";
import { pluralize } from "../lib/format";

const PAGE_SIZE = 24;

interface AlbumsPageProps {
  page: number;
  onPageChange: (page: number) => void;
}

export function AlbumsPage({ page, onPageChange }: AlbumsPageProps) {
  const albums = useResource(`albums:${page}`, () =>
    getAlbums(page, PAGE_SIZE),
  );

  if (albums.error) {
    return <ErrorPanel message={albums.error} onRetry={albums.reload} />;
  }

  if (albums.loading || !albums.data) {
    return <LoadingGrid items={12} />;
  }

  const { items, pagination } = albums.data;

  if (items.length === 0 && page > 1) {
    return (
      <EmptyPanel
        title="Esta página não existe"
        message="A lista de álbuns terminou antes desta página."
        icon="album"
        actionLabel="Voltar à primeira página"
        actionHref="#/albums"
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyPanel
        title="Nenhum álbum no acervo"
        message="Quando o Navidrome indexar sua música, os álbuns aparecem aqui."
        icon="album"
      />
    );
  }

  return (
    <div>
      <p className="max-w-[65ch] text-body-medium text-on-surface-variant">
        {pluralize(pagination.total, "álbum", "álbuns")}, dos mais recentes para
        os mais antigos.
      </p>

      <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-x-4 gap-y-8">
        {items.map((album) => (
          <AlbumCard key={album.id} album={album} />
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

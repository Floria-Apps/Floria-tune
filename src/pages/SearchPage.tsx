import { useEffect, useState } from "react";

import { searchLibrary as search } from "../services/tauri";
import type { SearchResults } from "../api/types";
import { AlbumCard } from "../components/AlbumCard";
import { ArtistCard } from "../components/ArtistCard";
import { EmptyPanel, ErrorPanel, LoadingRows } from "../components/Feedback";
import { Section } from "../components/Section";
import { SongRow } from "../components/SongRow";
import { Icon } from "../components/m3e/icon";
import { TextField } from "../components/m3e/text-field";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useResource } from "../hooks/useResource";
import { pluralize } from "../lib/format";

const SEARCH_LIMIT = 20;

interface SearchPageProps {
  query: string;
  onQueryChange: (query: string) => void;
}

export function SearchPage({ query, onQueryChange }: SearchPageProps) {
  const [term, setTerm] = useState(query);
  const debounced = useDebouncedValue(term, 350);

  useEffect(() => {
    setTerm(query);
  }, [query]);

  useEffect(() => {
    if (debounced.trim() !== query) {
      onQueryChange(debounced.trim());
    }
  }, [debounced, query, onQueryChange]);

  const results = useResource(`search:${query}`, () =>
    query
      ? search(query, SEARCH_LIMIT)
      : Promise.resolve<SearchResults>({
          artists: [],
          albums: [],
          songs: [],
        }),
  );

  const total = results.data
    ? results.data.artists.length +
      results.data.albums.length +
      results.data.songs.length
    : 0;

  return (
    <div>
      <div className="mb-6 max-w-[44rem]">
        <TextField
          variant="outlined"
          label="Música, álbum ou artista"
          leadingIcon={<Icon name="search" />}
          type="search"
          value={term}
          autoFocus
          autoComplete="off"
          aria-label="Buscar músicas, álbuns e artistas"
          onChange={(event) => setTerm(event.target.value)}
        />
      </div>

      {!query && (
        <EmptyPanel
          title="Busque no acervo"
          message="Digite o nome de uma música, álbum ou artista para começar."
          icon="search"
        />
      )}

      {query && results.error && (
        <ErrorPanel message={results.error} onRetry={results.reload} />
      )}

      {query && !results.error && results.loading && <LoadingRows rows={8} />}

      {query && !results.error && results.data && (
        <>
          {total === 0 ? (
            <EmptyPanel
              title="Nada encontrado"
              message={`Não há resultados para “${query}”. Tente outro termo.`}
              icon="search"
              actionLabel="Limpar busca"
              actionHref="#/search"
            />
          ) : (
            <>
              <p className="max-w-[65ch] text-body-medium text-on-surface-variant">
                {pluralize(total, "resultado", "resultados")} para “{query}”.
                Até {SEARCH_LIMIT} por tipo.
              </p>

              {results.data.artists.length > 0 && (
                <Section title="Artistas" layout="grid">
                  {results.data.artists.map((artist) => (
                    <ArtistCard key={artist.id} artist={artist} />
                  ))}
                </Section>
              )}

              {results.data.albums.length > 0 && (
                <Section title="Álbuns" layout="grid">
                  {results.data.albums.map((album) => (
                    <AlbumCard key={album.id} album={album} />
                  ))}
                </Section>
              )}

              {results.data.songs.length > 0 && (
                <Section title="Músicas" layout="stack">
                  {results.data.songs.map((song) => (
                    <SongRow
                      key={song.id}
                      song={song}
                      showAlbum
                      showYear
                    />
                  ))}
                </Section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

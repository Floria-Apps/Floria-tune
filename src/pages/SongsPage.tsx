import { useEffect, useState } from "react";

import { getSongs } from "../services/tauri";
import { EmptyPanel, ErrorPanel, LoadingRows } from "../components/Feedback";
import { Pager } from "../components/Pager";
import { SongRow } from "../components/SongRow";
import { Icon } from "../components/m3e/icon";
import { TextField } from "../components/m3e/text-field";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useResource } from "../hooks/useResource";
import { pluralize } from "../lib/format";

const PAGE_SIZE = 50;

const TABLE_GRID =
  "grid grid-cols-[2.25rem_minmax(0,1fr)_3.5rem] items-center gap-3 px-3 sm:grid-cols-[2.25rem_minmax(0,1.5fr)_minmax(0,1fr)_3rem_3.5rem]";

interface SongsPageProps {
  page: number;
  query: string;
  onPageChange: (page: number) => void;
  onQueryChange: (query: string) => void;
}

export function SongsPage({
  page,
  query,
  onPageChange,
  onQueryChange,
}: SongsPageProps) {
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

  const songs = useResource(`songs:${page}:${query}`, () =>
    getSongs(page, PAGE_SIZE, query),
  );

  const data = songs.data;
  const offset = ((data?.pagination.page ?? 1) - 1) * (data?.pagination.limit ?? PAGE_SIZE);

  return (
    <div>
      <div className="mb-5 max-w-[40rem]">
        <TextField
          variant="outlined"
          label="Filtrar músicas"
          leadingIcon={<Icon name="search" />}
          type="search"
          value={term}
          autoComplete="off"
          onChange={(event) => {
            setTerm(event.target.value);

            if (event.target.value === "") {
              onPageChange(1);
            }
          }}
        />
      </div>

      {songs.error && (
        <ErrorPanel message={songs.error} onRetry={songs.reload} />
      )}

      {!songs.error && (songs.loading || !data) && <LoadingRows rows={10} />}

      {!songs.error && data && (
        <>
          <p className="max-w-[65ch] text-body-medium text-on-surface-variant">
            {query
              ? `${pluralize(data.pagination.total, "resultado", "resultados")} para “${query}”.`
              : `${pluralize(data.pagination.total, "música", "músicas")} no acervo.`}
          </p>

          {data.items.length === 0 ? (
            <EmptyPanel
              title={query ? "Nada encontrado" : "Nenhuma música no acervo"}
              message={
                query
                  ? `Não há músicas com “${query}”. Tente outro termo.`
                  : "Quando o Navidrome indexar sua música, as faixas aparecem aqui."
              }
              icon={query ? "search" : "music_off"}
              actionLabel={query ? "Limpar busca" : undefined}
              actionHref={query ? "#/songs" : undefined}
            />
          ) : (
            <>
              <div className="mt-4">
                <div
                  className={`${TABLE_GRID} border-b border-outline-variant/60 pb-2.5 text-label-small text-on-surface-variant`}
                  aria-hidden="true"
                >
                  <span />
                  <span>Música</span>
                  <span className="hidden sm:block">Álbum</span>
                  <span className="hidden sm:block">Ano</span>
                  <span className="text-right">Duração</span>
                </div>

                <div>
                  {data.items.map((song, index) => (
                    <SongRow
                      key={song.id}
                      song={song}
                      position={offset + index + 1}
                      showAlbum
                      showYear
                    />
                  ))}
                </div>
              </div>

              <Pager
                page={data.pagination.page}
                limit={data.pagination.limit}
                total={data.pagination.total}
                onChange={onPageChange}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

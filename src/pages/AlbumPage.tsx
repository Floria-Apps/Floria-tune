import { getAlbum, getAlbumSongs } from "../services/tauri";
import type { Song } from "../api/types";
import { CoverArt } from "../components/CoverArt";
import { FactList, compactFacts } from "../components/FactList";
import { EmptyPanel, ErrorPanel } from "../components/Feedback";
import { SongRow } from "../components/SongRow";
import { Button } from "../components/m3e/button";
import { Icon } from "../components/m3e/icon";
import { usePlayer } from "../player/PlayerContext";
import { useResource } from "../hooks/useResource";
import { formatLongDuration, pluralize } from "../lib/format";

export function AlbumPage({ id }: { id: string }) {
  const { playQueue } = usePlayer();
  const album = useResource(`album:${id}`, async () => {
    const [details, songs] = await Promise.all([
      getAlbum(id),
      getAlbumSongs(id),
    ]);

    return { details, songs };
  });

  if (album.error) {
    return (
      <ErrorPanel
        title="Álbum não encontrado"
        message={album.error}
        onRetry={album.reload}
      />
    );
  }

  if (album.loading || !album.data) {
    return <AlbumSkeleton />;
  }

  const { details, songs } = album.data;

  const facts = compactFacts([
    details.year ? { label: "Ano", value: String(details.year) } : null,
    details.genre ? { label: "Gênero", value: details.genre } : null,
    details.song_count
      ? {
          label: "Faixas",
          value: pluralize(details.song_count, "faixa", "faixas"),
        }
      : null,
    details.duration
      ? { label: "Duração", value: formatLongDuration(details.duration) }
      : null,
  ]);

  return (
    <div>
      <header className="grid gap-6 md:grid-cols-[minmax(10rem,15rem)_minmax(0,1fr)] md:items-end md:gap-10">
        <CoverArt
          id={details.id}
          name={details.name}
          kind="album"
          coverArt={details.cover_art}
          size={512}
          priority
          className="shadow-elevation-3"
        />

        <div className="min-w-0">
          <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-[600] leading-[0.98] tracking-[-0.03em] [font-stretch:90%]">
            {details.name}
          </h2>

          {details.artist && (
            <p className="mt-2 text-body-large text-on-surface-variant">
              {details.artist_id ? (
                <a
                  className="underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
                  href={`#/artists/${details.artist_id}`}
                >
                  {details.artist}
                </a>
              ) : (
                details.artist
              )}
            </p>
          )}

          <FactList facts={facts} />

          <div className="mt-6 flex flex-wrap items-center gap-2 max-[760px]:mt-5">
            {songs.length > 0 && (
              <Button variant="filled" onClick={() => playQueue(songs, 0)}>
                <Icon name="play_arrow" data-icon="inline-start" />
                Reproduzir álbum
              </Button>
            )}

            {details.artist_id && (
              <Button
                variant="tonal"
                nativeButton={false}
                render={<a href={`#/artists/${details.artist_id}`} />}
              >
                Ver artista
              </Button>
            )}
          </div>
        </div>
      </header>

      {songs.length === 0 ? (
        <EmptyPanel
          title="Nenhuma faixa neste álbum"
          message="O Navidrome não retornou faixas para este álbum."
          icon="music_off"
        />
      ) : (
        <section className="mt-10 max-[760px]:mt-8" aria-labelledby="tracklist-title">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-outline-variant/60 pb-3">
            <h2
              className="text-title-large-emphasized"
              id="tracklist-title"
            >
              Faixas
            </h2>
            <span className="text-body-small text-on-surface-variant">
              Selecione uma faixa para abrir no player
            </span>
          </div>

          <Discs songs={songs} />
        </section>
      )}
    </div>
  );
}

function Discs({ songs }: { songs: Song[] }) {
  const discNumbers = Array.from(
    new Set(songs.map((song) => song.disc_number ?? 1)),
  ).sort((a, b) => a - b);

  if (discNumbers.length <= 1) {
    return (
      <div>
        {songs.map((song, index) => (
          <SongRow
            key={song.id}
            song={song}
            position={song.track ?? index + 1}
            showArtist={false}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {discNumbers.map((disc) => (
        <section key={disc}>
          <h3 className="mb-1 text-body-medium-emphasized text-on-surface-variant">
            Disco {disc}
          </h3>
          <div>
            {songs
              .filter((song) => (song.disc_number ?? 1) === disc)
              .map((song, index) => (
                <SongRow
                  key={song.id}
                  song={song}
                  position={song.track ?? index + 1}
                  showArtist={false}
                />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function AlbumSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando álbum">
      <div className="grid gap-6 md:grid-cols-[minmax(10rem,15rem)_minmax(0,1fr)] md:items-end md:gap-10">
        <span className="block aspect-square w-full animate-pulse rounded-md bg-surface-container-high" />
        <div className="space-y-3">
          <span className="block h-12 w-3/4 animate-pulse rounded-md bg-surface-container-high" />
          <span className="block h-4 w-1/3 animate-pulse rounded-md bg-surface-container-high" />
          <span className="block h-3 w-2/3 animate-pulse rounded-md bg-surface-container-high" />
        </div>
      </div>

      <div className="mt-10 space-y-1">
        {Array.from({ length: 6 }, (_, index) => (
          <span
            className="block h-12 w-full animate-pulse rounded-lg bg-surface-container-high"
            key={index}
          />
        ))}
      </div>
    </div>
  );
}

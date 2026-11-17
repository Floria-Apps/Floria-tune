import { getArtist, getArtistAlbums } from "../services/tauri";
import { AlbumCard } from "../components/AlbumCard";
import { CoverArt } from "../components/CoverArt";
import { EmptyPanel, ErrorPanel, LoadingGrid } from "../components/Feedback";
import { Section } from "../components/Section";
import { Button } from "../components/m3e/button";
import { useResource } from "../hooks/useResource";
import { useTranslation } from "../lib/i18n";
import { pluralize } from "../lib/format";
import { useCallback } from "react";

export function ArtistPage({ id }: { id: string }) {
  const copyToClipboard = useCallback(
    async (text: string) => {
      if (!navigator.clipboard) {
        // Fallback for older browsers
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      } else {
        await navigator.clipboard.writeText(text);
      }
    },
    []
  );

  const artist = useResource(`artist:${id}`, async () => {
    const [details, albums] = await Promise.all([
      getArtist(id),
      getArtistAlbums(id),
    ]);

    return { details, albums };
  });

  const t = useTranslation();

  if (artist.error) {
    return (
      <ErrorPanel
        title={t.artist.notFound}
        message={artist.error}
        onRetry={artist.reload}
      />
    );
  }

  if (artist.loading || !artist.data) {
    return <LoadingGrid items={8} />;
  }

  const { details, albums } = artist.data;
  const albumCount = details.album_count ?? albums.length;
  const totalSongs = albums.reduce((sum, alb) => sum + (alb.song_count ?? 0), 0);

  // Separate full albums (≥5 tracks or unknown count) from EPs/singles (<5 tracks)
  const mainAlbums = albums.filter(
    (a) => (a.song_count ?? 0) >= 5 || a.song_count === null,
  );
  const epsSingles = albums.filter(
    (a) => (a.song_count ?? 0) > 0 && (a.song_count ?? 0) < 5,
  );

  return (
    <div>
      <header className="grid gap-6 md:grid-cols-[minmax(10rem,15rem)_minmax(0,1fr)] md:items-end md:gap-10">
        <CoverArt
          id={details.id}
          name={details.name}
          kind="artist"
          round
          coverArt={details.cover_art}
          size={512}
          priority
          className="shadow-elevation-3"
        />

        <div className="min-w-0">
          <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-[600] leading-[0.98] tracking-[-0.03em] [font-stretch:90%]">
            {details.name}
          </h2>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 mt-3">
            <div>
              <p className="text-body-large text-on-surface-variant">
                {albumCount === 0
                  ? t.artist.noAlbums
                  : pluralize(albumCount, t.artist.album, t.artist.albumsPlural)}
              </p>
              <p className="mt-1 text-body-medium text-on-surface-variant">
                {totalSongs > 0
                  ? `${totalSongs} ${totalSongs === 1 ? t.artist.song : t.artist.songs}`
                  : "—"}
              </p>
            </div>
            <div className="flex flex-col items-start gap-1.5">
              {details.music_brainz_id ? (
                <>
                  <a
                    href={`https://musicbrainz.org/artist/${details.music_brainz_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-body-medium transition-colors"
                  >
                    MBID
                  </a>
                  <button
                    onClick={() => copyToClipboard(details.music_brainz_id!)}
                    className="btn-icon btn-sm opacity-50 hover:opacity-100 transition-opacity p-1 rounded-md"
                    aria-label="Copiar MBID para a área de transferência"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                </>
              ) : (
                <p className="text-body-small text-on-surface-variant">
                  {t.artist.mbidUnavailable}
                </p>
              )}

              {details.music_brainz_id && (
                <p className="text-body-medium text-on-surface-variant ml-2 whitespace-nowrap">
                  {details.music_brainz_id}
                </p>
              )}
            </div>
          </div>

          {details.description && (
            <p className="mt-3 text-body-large text-on-surface-variant line-clamp-3">
              {details.description}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-2 max-[760px]:mt-5">
            <Button
              variant="filled"
              nativeButton={false}
              render={<a href="#/albums" />}
            >
              {t.artist.exploreAlbums}
            </Button>
          </div>
        </div>
      </header>

      {/* Álbums */}
      {mainAlbums.length > 0 ? (
        <Section title={t.artist.albums} layout="grid">
          {mainAlbums.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </Section>
      ) : (
        <EmptyPanel
          title={t.artist.noAlbums}
          message={t.artist.emptyAlbums}
          icon="album"
        />
      )}

      {/* EPs / Singles */}
      {epsSingles.length > 0 ? (
        <Section title={t.artist.singlesAndEPs} layout="grid">
          {epsSingles.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </Section>
      ) : null}
    </div>
  );
}

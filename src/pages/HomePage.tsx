import { getAlbums, getArtists, getRandomSongs, getSongs } from "../services/tauri";
import type { Album } from "../api/types";
import { AlbumCard } from "../components/AlbumCard";
import { ArtistCard } from "../components/ArtistCard";
import { CoverArt } from "../components/CoverArt";
import { FactList, compactFacts } from "../components/FactList";
import { ErrorPanel } from "../components/Feedback";
import { Section } from "../components/Section";
import { SongTeaser } from "../components/SongRow";
import { Button } from "../components/m3e/button";
import { Card } from "../components/m3e/card";
import { Icon } from "../components/m3e/icon";
import { Skeleton } from "../components/m3e/skeleton";
import { useResource } from "../hooks/useResource";
import { formatLongDuration, formatNumber, pluralize } from "../lib/format";

const ALBUM_SHELF = 12;
const ARTIST_SHELF = 14;
const SONG_SHELF = 8;

export function HomePage() {
  const home = useResource("home", async () => {
    const [albums, artists, songs, random] = await Promise.all([
      getAlbums(1, ALBUM_SHELF),
      getArtists(1, ARTIST_SHELF),
      getSongs(1, SONG_SHELF),
      getRandomSongs(SONG_SHELF),
    ]);

    return { albums, artists, songs, random };
  });

  if (home.error) {
    return <ErrorPanel message={home.error} onRetry={home.reload} />;
  }

  if (home.loading || !home.data) {
    return <HomeSkeleton />;
  }

  const { albums, artists, songs, random } = home.data;
  const featured = albums.items[0];

  return (
    <div>
      <p className="max-w-[70ch] text-body-medium text-on-surface-variant">
        {formatNumber(artists.pagination.total)} artistas,{" "}
        {formatNumber(albums.pagination.total)} álbuns e{" "}
        {formatNumber(songs.pagination.total)} músicas no acervo.
      </p>

      {featured && <FeaturedAlbum album={featured} />}

      {albums.items.length > 0 && (
        <Section
          title="Adicionados recentemente"
          href="#/albums"
          actionLabel="Ver álbuns"
        >
          {albums.items.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </Section>
      )}

      {artists.items.length > 0 && (
        <Section title="Artistas" href="#/artists" actionLabel="Ver artistas">
          {artists.items.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </Section>
      )}

      {songs.items.length > 0 && (
        <Section
          title="Músicas"
          href="#/songs"
          actionLabel="Ver músicas"
          layout="wide"
        >
          {songs.items.map((song) => (
            <SongTeaser key={song.id} song={song} />
          ))}
        </Section>
      )}

      {random.length > 0 && (
        <Section title="Descobrir" actionLabel="Mais" href="#/songs">
          {random.map((song) => (
            <SongTeaser key={song.id} song={song} />
          ))}
        </Section>
      )}
    </div>
  );
}

function FeaturedAlbum({ album }: { album: Album }) {
  const facts = compactFacts([
    album.year ? { label: "Ano", value: String(album.year) } : null,
    album.song_count
      ? {
          label: "Faixas",
          value: pluralize(album.song_count, "faixa", "faixas"),
        }
      : null,
    album.duration
      ? { label: "Duração", value: formatLongDuration(album.duration) }
      : null,
    album.genre ? { label: "Gênero", value: album.genre } : null,
  ]);

  return (
    <Card
      variant="filled"
      size="lg"
      className="mt-6 bg-surface-container-low max-[760px]:[--card-spacing:1rem]"
      aria-labelledby="featured-title"
    >
      <div className="grid gap-4 md:grid-cols-[minmax(10rem,16rem)_minmax(0,1fr)] md:items-end md:gap-8">
        <CoverArt
          id={album.id}
          name={album.name}
          kind="album"
          coverArt={album.cover_art}
          priority
          className="shadow-elevation-3"
        />

        <div className="min-w-0">
          <span className="text-label-large text-primary">
            Adicionado recentemente
          </span>
          <h2
            className="mt-2 text-[clamp(2.1rem,4.6vw,3.6rem)] font-[600] leading-[0.95] tracking-[-0.03em] [font-stretch:88%]"
            id="featured-title"
          >
            {album.name}
          </h2>
          <p className="mt-3 text-body-large text-on-surface-variant">
            {album.artist ?? "Artista desconhecido"}
          </p>

          <FactList facts={facts} />

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Button
              variant="filled"
              nativeButton={false}
              render={<a href={`#/albums/${album.id}`} />}
            >
              <Icon name="album" data-icon="inline-start" />
              Abrir álbum
            </Button>

            {album.artist_id && (
              <Button
                variant="text"
                nativeButton={false}
                render={<a href={`#/artists/${album.artist_id}`} />}
              >
                Ver artista
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function HomeSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando biblioteca">
      <Skeleton className="block h-4 w-72 max-w-full rounded-sm" />
      <div className="mt-6 grid gap-6 rounded-3xl border border-outline-variant/60 bg-surface-container-low p-4 sm:p-6 md:grid-cols-[minmax(10rem,16rem)_minmax(0,1fr)] md:items-end md:gap-10">
        <Skeleton className="block aspect-square w-full rounded-md" />
        <div className="space-y-3">
          <Skeleton className="block h-3 w-32 rounded-sm" />
          <Skeleton className="block h-12 w-3/4 rounded-sm" />
          <Skeleton className="block h-4 w-1/2 rounded-sm" />
          <Skeleton className="block h-3 w-2/3 rounded-sm" />
        </div>
      </div>
      <div className="mt-10 flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton
            className="aspect-square w-[clamp(8.5rem,14vw,11.5rem)] shrink-0 rounded-md"
            key={index}
          />
        ))}
      </div>
    </div>
  );
}

import type { Artist } from "../api/types";
import { pluralize } from "../lib/format";
import { CoverArt } from "./CoverArt";

export function ArtistCard({ artist }: { artist: Artist }) {
  const albumCount = artist.album_count ?? 0;

  return (
    <a
      href={`#/artists/${artist.id}`}
      className="state-layer group block rounded-md text-on-surface outline-none focus-ring"
    >
      <CoverArt
        id={artist.id}
        name={artist.name}
        kind="artist"
        round
        coverArt={artist.cover_art}
        className="transition-shadow group-hover:shadow-elevation-2"
      />
      <div className="mt-2.5 px-0.5 text-center">
        <span className="block truncate text-body-medium-emphasized">
          {artist.name}
        </span>
        <span className="mt-0.5 block truncate text-body-small text-on-surface-variant">
          {albumCount > 0
            ? pluralize(albumCount, "álbum", "álbuns")
            : "Artista"}
        </span>
      </div>
    </a>
  );
}

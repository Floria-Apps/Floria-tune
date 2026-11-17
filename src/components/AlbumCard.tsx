import type { Album } from "../api/types";
import { CoverArt } from "./CoverArt";

export function AlbumCard({ album }: { album: Album }) {
  return (
    <a
      href={`#/albums/${album.id}`}
      className="state-layer group block rounded-md text-on-surface outline-none focus-ring"
    >
      <CoverArt
        id={album.id}
        name={album.name}
        kind="album"
        coverArt={album.cover_art}
        className="transition-shadow group-hover:shadow-elevation-2"
      />
      <div className="mt-2.5 px-0.5">
        <span className="line-clamp-2 text-body-medium-emphasized">
          {album.name}
        </span>
        <span className="mt-0.5 block truncate text-body-small text-on-surface-variant">
          {album.artist ?? "Artista desconhecido"}
        </span>
      </div>
    </a>
  );
}

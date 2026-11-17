import type { Song } from "../api/types";
import { formatDuration } from "../lib/format";
import { usePlayer } from "../player/PlayerContext";
import { CoverArt } from "./CoverArt";
import { Icon } from "./m3e/icon";

interface SongRowProps {
  song: Song;
  /** Track position; when omitted a music note is shown instead. */
  position?: number;
  showArtist?: boolean;
  showAlbum?: boolean;
  showYear?: boolean;
}

export function SongRow({
  song,
  position,
  showArtist = true,
  showAlbum = false,
  showYear = false,
}: SongRowProps) {
  const { current, select } = usePlayer();
  const selected = current?.id === song.id;

  return (
    <button
      type="button"
      className={[
        "state-layer grid w-full grid-cols-[2.25rem_minmax(0,1fr)_3.5rem] items-center gap-3",
        "rounded-sm border-b border-outline-variant/35 px-3 py-2.5 text-left",
        "outline-none transition-shape focus-ring last:border-b-0",
        showAlbum || showYear
          ? "sm:grid-cols-[2.25rem_minmax(0,1.5fr)_minmax(0,1fr)_3rem_3.5rem]"
          : "",
        selected
          ? "bg-secondary-container text-on-secondary-container"
          : "text-on-surface hover:bg-surface-container-high",
      ].join(" ")}
      onClick={() => select(song)}
      aria-pressed={selected}
      title={`Selecionar ${song.title}`}
    >
      <span
        className="text-label-small tabular-nums text-on-surface-variant"
        aria-hidden="true"
      >
        {position === undefined ? (
          <Icon name="music_note" size={18} />
        ) : (
          String(position).padStart(2, "0")
        )}
      </span>

      <span className="min-w-0">
        <span className="block truncate text-body-medium-emphasized">
          {song.title}
        </span>
        {showArtist && (
          <span className="mt-0.5 block truncate text-body-small text-on-surface-variant">
            {song.artist ?? "Artista desconhecido"}
          </span>
        )}
      </span>

      {showAlbum && (
        <span className="hidden truncate text-body-medium text-on-surface-variant sm:block">
          {song.album ?? "—"}
        </span>
      )}

      {showYear && (
        <span className="hidden text-body-medium tabular-nums text-on-surface-variant sm:block">
          {song.year ?? "—"}
        </span>
      )}

      <span className="text-right text-label-small tabular-nums text-on-surface-variant">
        {formatDuration(song.duration)}
      </span>
    </button>
  );
}

/** Compact row used on the home page, with a leading generative thumbnail. */
export function SongTeaser({ song }: { song: Song }) {
  const { current, select } = usePlayer();
  const selected = current?.id === song.id;

  return (
    <button
      type="button"
      className={[
        "state-layer flex w-full items-center gap-3 rounded-md px-2.5 py-2.5 text-left outline-none transition-shape focus-ring",
        selected
          ? "bg-secondary-container text-on-secondary-container"
          : "text-on-surface hover:bg-surface-container-high",
      ].join(" ")}
      onClick={() => select(song)}
      aria-pressed={selected}
      title={`Selecionar ${song.title}`}
    >
      <CoverArt
        id={song.album_id ?? song.id}
        name={song.album ?? song.title}
        kind="song"
        coverArt={song.cover_art}
        size={96}
        className="w-11 shrink-0 rounded-sm"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-medium-emphasized">
          {song.title}
        </span>
        <span className="mt-0.5 block truncate text-body-small text-on-surface-variant">
          {song.artist ?? "Artista desconhecido"}
        </span>
      </span>
      <span className="text-label-small tabular-nums text-on-surface-variant">
        {formatDuration(song.duration)}
      </span>
    </button>
  );
}

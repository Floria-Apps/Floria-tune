import { useCallback, useEffect, useRef, useState } from "react";

import { useMediaQuery } from "../hooks/useMediaQuery";
import { useResource } from "../hooks/useResource";
import { formatDuration } from "../lib/format";
import { usePlayer, type RepeatMode } from "../player/PlayerContext";
import type { Song } from "../types/song";
import { CoverArt } from "./CoverArt";
import { prefetchCover } from "../lib/cover-cache";
import { Button } from "./m3e/button";
import { Icon } from "./m3e/icon";
import { Slider } from "./m3e/slider";
import { getRecommendations } from "../services/tauri";
import {
  isPaused,
  pausePlayback,
  resumePlayback,
  stopPlayback,
  setVolume,
  seek as seekAudio,
  getPosition,
  getDuration,
  dbGetPreference,
  scrobbleSong,
  updateTrayInfo,
  listenbrainzScrobble,
  listenbrainzNowPlaying,
  getSettings,
  updateSettings,
} from "../services/tauri";

interface PlayerDockProps {
  onToggleRightPanel?: () => void;
  rightPanelOpen?: boolean;
}

/** Scrobble after 75% of the track, capped at 4 minutes, whichever comes first. */
const SCROBBLE_RATIO = 0.75;
const SCROBBLE_MAX_SECONDS = 240;

function scrobbleThreshold(duration: number): number {
  return Math.min(duration * SCROBBLE_RATIO, SCROBBLE_MAX_SECONDS);
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLButtonElement ||
    target instanceof HTMLAnchorElement ||
    target.isContentEditable
  ) {
    return true;
  }

  return (
    target.closest(
      "[role='button'], [role='slider'], [role='switch'], [role='tab'], [role='menuitem']",
    ) !== null
  );
}

function toNumber(value: number | readonly number[]): number {
  return Array.isArray(value) ? value[0] : (value as number);
}

/* ------------------------------------------------------------------ */
/* Mobile: floating mini player + full "now playing" sheet            */
/* ------------------------------------------------------------------ */

interface MiniPlayerProps {
  song: Song;
  paused: boolean;
  progress: number;
  hasNext: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onNext: () => void;
  playQueue: (songs: Song[], startIndex?: number) => void;
}

function MiniPlayer({
  song,
  paused,
  progress,
  hasNext,
  onOpen,
  onToggle,
  onNext,
  playQueue,
}: MiniPlayerProps) {
  return (
    <footer className="flex-none px-2 pb-2" aria-label="Reprodutor">
      <div className="app-panel relative overflow-hidden rounded-[22px]">
        {/* Progress hairline across the top edge of the card. */}
        <div
          className="absolute inset-x-0 top-0 h-[3px] bg-on-surface/10"
          aria-hidden="true"
        >
          <div
            className="h-full rounded-r-full bg-primary transition-[width] duration-500 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center gap-1.5 p-2">
          <button
            type="button"
            onClick={onOpen}
            aria-label="Abrir player"
            className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <CoverArt
              id={song.album_id ?? song.id}
              name={song.album ?? song.title}
              kind="song"
              coverArt={song.cover_art}
              size={96}
              className="size-11 shrink-0 rounded-xl shadow-none"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-body-medium-emphasized">
                {song.title}
              </span>
              <span className="block truncate text-body-small text-on-surface-variant">
                {song.artist ?? "Artista desconhecido"}
              </span>
            </span>
          </button>

          <Button
            variant="filled"
            size="icon-sm"
            onClick={onToggle}
            aria-label={paused ? "Reproduzir" : "Pausar"}
          >
            <Icon name={paused ? "play_arrow" : "pause"} />
          </Button>
          <Button
            variant="text"
            size="icon"
            disabled={!hasNext}
            onClick={onNext}
            aria-label="Próxima faixa"
          >
            <Icon name="skip_next" />
          </Button>
          <Button variant="text">Pular álbum</Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const songId = song.id;
              if (!songId) return;
              getRecommendations(songId, 10).then((songs) => {
                if (songs.length > 0) {
                  playQueue(songs, 0);
                }
              });
            }}
            aria-label="Adicionar 10 recomendações na fila"
          >
            <Icon name="music" />
          </Button>
        </div>
      </div>
    </footer>
  );
}

interface NowPlayingSheetProps {
  song: Song;
  paused: boolean;
  position: number;
  duration: number;
  scrub: number | null;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  hasNext: boolean;
  hasPrev: boolean;
  onClose: () => void;
  onStop: () => void;
  onToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onScrub: (value: number) => void;
  onSeek: (value: number) => void;
  onVolume: (value: number) => void;
  onPersistVolume: (value: number) => void;
}

function NowPlayingSheet({
  song,
  paused,
  position,
  duration,
  scrub,
  volume,
  shuffle,
  repeat,
  hasNext,
  hasPrev,
  onClose,
  onStop,
  onToggle,
  onPrev,
  onNext,
  onToggleShuffle,
  onCycleRepeat,
  onScrub,
  onSeek,
  onVolume,
  onPersistVolume,
}: NowPlayingSheetProps) {
  const total = duration || song.duration || 0;
  const shown = scrub ?? position;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tocando agora"
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-surface text-on-surface animate-in fade-in slide-in-from-bottom-6 duration-300 ease-out motion-reduce:animate-none"
    >
      {/* Soft tint pulled from the brand primary, anchored at the top. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-primary/18 via-primary/5 to-transparent"
      />

      <header className="relative flex flex-none items-center justify-between px-2 pt-[max(env(safe-area-inset-top),0.5rem)]">
        <Button
          variant="text"
          size="icon"
          onClick={onClose}
          aria-label="Fechar player"
        >
          <Icon name="chevron_left" className="-rotate-90" />
        </Button>
        <span className="text-label-large text-on-surface-variant">
          Tocando agora
        </span>
        <Button
          variant="text"
          size="icon"
          onClick={onStop}
          aria-label="Parar reprodução"
        >
          <Icon name="stop" />
        </Button>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col items-center gap-5 overflow-y-auto overscroll-contain px-5 pb-[max(env(safe-area-inset-bottom),1.75rem)] pt-3">
        <CoverArt
          id={song.album_id ?? song.id}
          name={song.album ?? song.title}
          kind="song"
          coverArt={song.cover_art}
          size={640}
          priority
          className="w-[min(68vw,300px)] shrink-0 rounded-[28px] shadow-elevation-4 ring-1 ring-on-surface/10"
        />

        <div className="w-full max-w-[420px] text-center">
          <h2 className="line-clamp-2 text-headline-small-emphasized">
            {song.title}
          </h2>
          <p className="mt-1 truncate text-body-large text-on-surface-variant">
            {song.artist ?? "Artista desconhecido"}
          </p>
        </div>

        <div className="w-full max-w-[420px]">
          <Slider
            value={shown}
            min={0}
            max={total > 0 ? total : 1}
            onValueChange={(value) => onScrub(toNumber(value))}
            onValueCommitted={(value) => onSeek(toNumber(value))}
            aria-label="Progresso da faixa"
            className="w-full"
          />
          <div className="mt-1 flex items-center justify-between text-label-small tabular-nums text-on-surface-variant">
            <span>{formatDuration(shown)}</span>
            <span>{formatDuration(total)}</span>
          </div>
        </div>

        <div className="flex w-full max-w-[420px] items-center justify-center gap-1">
          <Button
            variant={shuffle ? "tonal" : "text"}
            size="icon"
            onClick={onToggleShuffle}
            aria-label={shuffle ? "Desativar embaralhar" : "Embaralhar"}
          >
            <Icon name="shuffle" />
          </Button>
          <Button
            variant="text"
            size="icon"
            disabled={!hasPrev}
            onClick={onPrev}
            aria-label="Faixa anterior"
          >
            <Icon name="skip_previous" />
          </Button>
          <Button
            variant="text"
            size="icon"
            disabled={!hasPrev}
            onClick={onPrev}
            aria-label="Faixa anterior"
          >
            <Icon name="skip_previous" />
          </Button>
          <Button
            variant="filled"
            size="icon-md"
            onClick={onToggle}
            aria-label={paused ? "Reproduzir" : "Pausar"}
            className="mx-3 size-16 shadow-elevation-2 [&_svg]:size-7"
          >
            <Icon name={paused ? "play_arrow" : "pause"} />
          </Button>
          <Button
            variant="text"
            size="icon"
            disabled={!hasNext}
            onClick={onNext}
            aria-label="Próxima faixa"
          >
            <Icon name="skip_next" />
          </Button>
          <Button
            variant={repeat !== "off" ? "tonal" : "text"}
            size="icon"
            onClick={onCycleRepeat}
            aria-label={
              repeat === "one"
                ? "Repetir uma"
                : repeat === "all"
                  ? "Repetir todas"
                  : "Não repetir"
            }
          >
            <Icon name={repeat === "one" ? "repeat_one" : "repeat"} />
          </Button>
        </div>

        <div className="flex w-full max-w-[420px] items-center gap-3">
          <Icon
            name="volume_up"
            size={20}
            className="shrink-0 text-on-surface-variant"
          />
          <Slider
            value={volume}
            min={0}
            max={100}
            onValueChange={(value) => void onVolume(toNumber(value))}
            onValueCommitted={(value) =>
              void onPersistVolume(toNumber(value))
            }
            aria-label="Volume"
            className="flex-1"
            showValueLabel
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dock                                                               */
/* ------------------------------------------------------------------ */

export function PlayerDock({
  onToggleRightPanel,
  rightPanelOpen = false,
}: PlayerDockProps) {
  const {
    current,
    clear,
    next,
    prev,
    hasNext,
    hasPrev,
    shuffle,
    repeat,
    toggleShuffle,
    cycleRepeat,
    playQueue,
  } = usePlayer();
  const [scrub, setScrub] = useState<number | null>(null);
  const [volume, setVolumeState] = useState(80);
  const [expanded, setExpanded] = useState(false);
  const [paused, setPaused] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const mobile = useMediaQuery("(max-width: 760px)");
  const scrobbledRef = useRef(false);

  // Update the system-tray tooltip/menu whenever the playing state changes.
  useEffect(() => {
    if (!current) {
      void updateTrayInfo({ isPaused: true });
      return;
    }
    void updateTrayInfo({
      title: current.title ?? "",
      artist: current.artist ?? "",
      isPaused: paused,
    });
  }, [current, paused]);

  // Fetch LB settings once so the effect below knows whether LB is enabled.
  const lbSettings = useResource("lb-settings", () => getSettings());

  const sendNowPlayingToLB = useCallback(async () => {
    if (!current || !lbSettings.data?.listenbrainz_enabled) return;
    void listenbrainzNowPlaying({
      artist: current.artist ?? "",
      track: current.title ?? "",
      album: current.album ?? undefined,
      duration_ms: current.duration ? Math.round(current.duration * 1000) : undefined,
    }).catch(() => {});
  }, [current, lbSettings.data]);

  const sendScrobbleToLB = useCallback(async () => {
    if (!current || !lbSettings.data?.listenbrainz_enabled) return;
    await listenbrainzScrobble({
      artist: current.artist ?? "",
      track: current.title ?? "",
      album: current.album ?? undefined,
      duration_ms: current.duration ? Math.round(current.duration * 1000) : undefined,
    }).catch(() => {});
  }, [current, lbSettings.data]);

  useEffect(() => {
    if (!current) {
      return;
    }

    setPaused(false);
    setPosition(0);
    setScrub(null);
    setDuration(current.duration ?? 0);
    scrobbledRef.current = false;

    // Warm the cover cache for the now-playing artwork at hero resolution.
    if (current.cover_art) {
      prefetchCover(current.cover_art, 640);
    }

    // Send "now playing" notification.
    void scrobbleSong(current.id, false).catch(() => {});
    void sendNowPlayingToLB();

    const interval = window.setInterval(async () => {
      try {
        const [p, d, isP] = await Promise.all([
          getPosition(),
          getDuration(),
          isPaused(),
        ]);
        setPosition(p);
        if (d > 0) {
          setDuration(d);
        }
        setPaused(isP);

        // Submit the scrobble once the play reaches the threshold.
        if (!scrobbledRef.current && !isP && p > 0) {
          const duration = d > 0 ? d : (current.duration ?? 0);
          if (duration > 0 && p >= scrobbleThreshold(duration)) {
            scrobbledRef.current = true;
            void scrobbleSong(current.id, true).catch(() => {});
            void sendScrobbleToLB();
          }
        }
      } catch {
        // Player not ready yet.
      }
    }, 500);

    return () => window.clearInterval(interval);
  }, [current, sendNowPlayingToLB, sendScrobbleToLB]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (isInteractiveTarget(event.target) || !current) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        event.preventDefault();
        void (paused ? resumePlayback() : pausePlayback()).catch(() => {});
        setPaused((p) => !p);
      } else if (event.code === "ArrowRight") {
        event.preventDefault();
        next();
      } else if (event.code === "ArrowLeft") {
        event.preventDefault();
        prev();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [current, paused, next, prev]);

  useEffect(() => {
    (async () => {
      try {
        const settings = await getSettings();
        if (typeof settings.volume === "number") {
          setVolumeState(settings.volume);
          await setVolume(settings.volume);
        } else {
          const v = await dbGetPreference("volume");
          if (v) {
            const n = Number(v);
            if (!Number.isNaN(n)) {
              setVolumeState(n);
              await setVolume(n);
            }
          }
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // The sheet only makes sense while something is loaded.
  useEffect(() => {
    if (!current) {
      setExpanded(false);
    }
  }, [current]);

  // Escape closes the expanded player.
  useEffect(() => {
    if (!expanded) {
      return;
    }

    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExpanded(false);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [expanded]);

  const handleToggle = async () => {
    try {
      if (paused) {
        await resumePlayback();
        setPaused(false);
      } else {
        await pausePlayback();
        setPaused(true);
      }
    } catch {
      // ignore
    }
  };

  // Listen for tray toggle-play events to update local pause state.
  useEffect(() => {
    const handler = () => {
      void handleToggle();
    };
    window.addEventListener("tray-toggle-play", handler);
    return () => window.removeEventListener("tray-toggle-play", handler);
  }, [handleToggle]);

  const handleStop = async () => {
    try {
      await stopPlayback();
    } catch {
      // ignore
    }
    clear();
  };

  const handleVolume = async (value: number) => {
    setVolumeState(value);
    try {
      await setVolume(value);
    } catch {
      // ignore
    }
  };

  const persistVolume = async (value: number) => {
    try {
      await updateSettings({ volume: value });
    } catch {
      // ignore
    }
  };

  const commitSeek = async (value: number) => {
    setPosition(value);
    setScrub(null);
    try {
      await seekAudio(value);
    } catch {
      // ignore
    }
  };

  const total = duration || current?.duration || 0;
  const shownPosition = scrub ?? position;
  const progress =
    total > 0
      ? Math.max(0, Math.min(100, (shownPosition / total) * 100))
      : 0;

  if (mobile) {
    if (!current) {
      return null;
    }

    return (
      <>
        <MiniPlayer
          song={current}
          paused={paused}
          progress={progress}
          hasNext={hasNext}
          onOpen={() => setExpanded(true)}
          onToggle={handleToggle}
          onNext={next}
          playQueue={playQueue}
        />

        {expanded && (
          <NowPlayingSheet
            song={current}
            paused={paused}
            position={position}
            duration={duration}
            scrub={scrub}
            volume={volume}
            shuffle={shuffle}
            repeat={repeat}
            hasNext={hasNext}
            hasPrev={hasPrev}
            onClose={() => setExpanded(false)}
            onStop={handleStop}
            onToggle={handleToggle}
            onPrev={prev}
            onNext={next}
            onToggleShuffle={toggleShuffle}
            onCycleRepeat={cycleRepeat}
            onScrub={setScrub}
            onSeek={(value) => void commitSeek(value)}
            onVolume={handleVolume}
            onPersistVolume={persistVolume}
          />
        )}
      </>
    );
  }

  return (
    <footer
      className="app-panel mx-3 mb-3 flex-none overflow-hidden"
      aria-label="Reprodutor"
    >
      <div className="flex items-center gap-3 px-gutter py-2.5">
        {/* Faixa atual */}
        <div className="flex min-w-0 items-center gap-3 max-[1080px]:flex-1 min-[1081px]:w-[24%] min-[1081px]:flex-none">
          <CoverArt
            id={current?.album_id ?? current?.id ?? "song-cover"}
            name={current?.album ?? current?.title ?? "Música"}
            kind="song"
            coverArt={current?.cover_art}
            size={96}
            className="size-12 shrink-0 rounded-md max-[760px]:size-10 shadow-none"
          />

          <div className="min-w-0">
            <p className="truncate text-body-medium-emphasized">
              {current?.title ?? "Música"}
            </p>
            <p className="truncate text-body-small text-on-surface-variant">
              {current?.artist ?? "Artista desconhecido"}
            </p>
          </div>
        </div>

        {/* Controles centrais + progresso logo abaixo */}
        <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
          <div className="flex items-center gap-0.5">
            <Button
              variant={shuffle ? "tonal" : "text"}
              size="icon"
              onClick={toggleShuffle}
              aria-label={shuffle ? "Desativar embaralhar" : "Embaralhar"}
              title="Embaralhar"
            >
              <Icon name="shuffle" />
            </Button>
            <Button
              variant="text"
              size="icon"
              disabled={!hasPrev}
              onClick={prev}
              aria-label="Faixa anterior"
              title="Faixa anterior"
            >
              <Icon name="skip_previous" />
            </Button>
            <Button
              variant="filled"
              size="icon-md"
              onClick={handleToggle}
              aria-label={paused ? "Reproduzir" : "Pausar"}
              title={paused ? "Reproduzir" : "Pausar"}
              className="mx-0.5"
            >
              <Icon name={paused ? "play_arrow" : "pause"} />
            </Button>
            <Button
              variant="text"
              size="icon"
              disabled={!hasNext}
              onClick={next}
              aria-label="Próxima faixa"
              title="Próxima faixa"
            >
              <Icon name="skip_next" />
            </Button>
            <Button
              variant={repeat !== "off" ? "tonal" : "text"}
              size="icon"
              onClick={cycleRepeat}
              aria-label={
                repeat === "one"
                  ? "Repetir uma"
                  : repeat === "all"
                    ? "Repetir todas"
                    : "Não repetir"
              }
              title="Repetir"
            >
              <Icon name={repeat === "one" ? "repeat_one" : "repeat"} />
            </Button>
          </div>

          <div className="flex w-full max-w-[640px] items-center gap-2">
            <span className="w-10 text-right text-label-small tabular-nums text-on-surface-variant max-[760px]:w-8">
              {formatDuration(shownPosition)}
            </span>
            <Slider
              value={shownPosition}
              min={0}
              max={total > 0 ? total : 1}
              onValueChange={(value) => setScrub(toNumber(value))}
              onValueCommitted={(value) => void commitSeek(toNumber(value))}
              aria-label="Progresso da faixa"
              className="flex-1"
            />
            <span className="w-10 text-label-small tabular-nums text-on-surface-variant max-[760px]:w-8">
              {formatDuration(total)}
            </span>
          </div>
        </div>

        {/* Ações da direita */}
        <div className="flex items-center justify-end gap-0.5 min-[1081px]:w-[24%] min-[1081px]:flex-none">
          <Button
            variant="text"
            size="icon"
            onClick={handleStop}
            aria-label="Parar reprodução"
            title="Parar"
          >
            <Icon name="stop" />
          </Button>

          <div className="ml-1.5 flex items-center gap-1.5">
            <Icon
              name="volume_up"
              size={18}
              className="flex-none text-on-surface-variant"
            />
            <Slider
              value={volume}
              min={0}
              max={100}
              onValueChange={(value) => void handleVolume(toNumber(value))}
              onValueCommitted={(value) => void persistVolume(toNumber(value))}
              aria-label="Volume"
              style={{ width: 96 }}
              showValueLabel
            />
          </div>

          {onToggleRightPanel && (
            <Button
              variant={rightPanelOpen ? "tonal" : "text"}
              size="icon"
              onClick={onToggleRightPanel}
              aria-label={
                rightPanelOpen ? "Fechar fila e letras" : "Abrir fila e letras"
              }
              title="Fila e letras"
            >
              <Icon name="queue_music" />
            </Button>
          )}
        </div>
      </div>
    </footer>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";

import { usePlayer } from "../player/PlayerContext";
import { getLyrics, seek, type LyricsList } from "../services/tauri";
import { Button } from "./m3e/button";
import { Icon } from "./m3e/icon";
import { QueueSection } from "./QueueSection";
import { SyncedLyrics } from "./SyncedLyrics";
import { useTranslation } from "../lib/i18n";

interface RightPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const MIN_WIDTH = 280;
const MAX_WIDTH = 500;
const DEFAULT_WIDTH = 320;

const LYRICS_LAYER_KEYS = ["main", "translation", "pronunciation"] as const;

/** Translate a lyrics layer kind, falling back to the raw language tag. */
function lyricsLayerLabel(
  t: ReturnType<typeof useTranslation>,
  kind: string | null | undefined,
): string | null {
  const key = LYRICS_LAYER_KEYS.find((candidate) => candidate === kind);

  return key ? t.player.lyricsLayers[key] : null;
}

function RightPanelInner({ isOpen, onClose, t }: RightPanelProps & { t: ReturnType<typeof useTranslation> }) {
  const { current } = usePlayer();
  const [lyrics, setLyrics] = useState<LyricsList | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const lastFetchedIdRef = useRef<string | null>(null);

  // Resizable panel state
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Lyrics layer selector
  const [activeLayerIdx, setActiveLayerIdx] = useState(0);
  // Font size for lyrics

  // Lyrics delay offset (ms) - allows adjusting timing
  const [lyricsOffset, setLyricsOffset] = useState(0);

  useEffect(() => {
    if (!isOpen || !current) return;

    if (lastFetchedIdRef.current === current.id) return;
    lastFetchedIdRef.current = current.id;

    setLyrics(null);
    setLyricsLoading(true);
    setActiveLayerIdx(0);
    getLyrics(current.id)
      .then((result) => setLyrics(result))
      .catch(() => setLyrics(null))
      .finally(() => setLyricsLoading(false));
  }, [isOpen, current]);

  // Load persisted width
  useEffect(() => {
    try {
      const stored = localStorage.getItem("floria-tune:rightPanelWidth");
      if (stored) {
        const w = parseInt(stored, 10);
        if (!isNaN(w) && w >= MIN_WIDTH && w <= MAX_WIDTH) {
          setPanelWidth(w);
        }
      }
      const offset = localStorage.getItem("floria-tune:lyricsOffset");
      if (offset) {
        const n = parseInt(offset, 10);
        if (!isNaN(n)) setLyricsOffset(n);
      }
    } catch {
      // ignore
    }
  }, []);

  // Resize drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = panelWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  }, [panelWidth]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    const delta = startXRef.current - e.clientX;
    const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidthRef.current + delta));
    setPanelWidth(newWidth);
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      try {
        localStorage.setItem("floria-tune:rightPanelWidth", String(panelWidth));
      } catch {
        // ignore
      }
    }
  }, [panelWidth]);

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  if (!isOpen) {
    return null;
  }

  const lyricsLayer = lyrics?.structured_lyrics?.[activeLayerIdx] ?? null;
  const availableLayers = lyrics?.structured_lyrics ?? [];

  return (
    <aside
      className="app-panel relative my-3 mr-3 flex flex-none flex-col overflow-hidden"
      style={{ width: `${panelWidth}px` }}
      aria-label={t.player.lyricsPanel}
    >
      {/* Resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors z-10"
        onMouseDown={handleMouseDown}
        title={t.player.resizeTooltip}
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={panelWidth}
        aria-valuemin={MIN_WIDTH}
        aria-valuemax={MAX_WIDTH}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setPanelWidth((w) => Math.min(MAX_WIDTH, w + 20));
          if (e.key === "ArrowRight") setPanelWidth((w) => Math.max(MIN_WIDTH, w - 20));
        }}
      />

      {/* Header */}
      <header className="flex items-center justify-between border-b border-outline-variant/60 px-4 py-3 flex-none">
        <div className="flex items-center gap-2">
          <Icon name="menu" size={24} className="text-on-surface-variant" />
          <span className="font-medium text-on-surface">{t.player.queueAndLyrics}</span>
        </div>
        <Button
          variant="tonal"
          size="icon"
          onClick={onClose}
          aria-label={t.player.closePanel}
          title={t.common.close}
        >
          <Icon name="close" />
        </Button>
      </header>

      {/* TOP: Queue (fila) */}
      <section className="flex-1 min-h-0 flex flex-col overflow-hidden" aria-label={t.player.queue}>
        <div className="px-4 py-2 border-b border-outline-variant/60 flex-none">
          <h3 className="text-title-small-emphasized">{t.player.queue}</h3>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto scroll-slim">
          <QueueSection />
        </div>
      </section>

      {/* BOTTOM: Lyrics */}
      <section className="flex-1 min-h-0 flex flex-col overflow-hidden" aria-label={t.player.lyrics}>
        <div className="px-4 py-2 border-b border-outline-variant/60 flex-none flex items-center justify-between">
          <h3 className="text-title-small-emphasized">{t.player.lyrics}</h3>
          <div className="flex items-center gap-2">
            {/* Reload lyrics button */}
            <button
              type="button"
              onClick={() => {
                if (!current) return;
                lastFetchedIdRef.current = null;
                setLyrics(null);
                setLyricsLoading(true);
                getLyrics(current.id)
                  .then((result) => setLyrics(result))
                  .catch(() => setLyrics(null))
                  .finally(() => setLyricsLoading(false));
              }}
              className="p-1 rounded-sm text-on-surface-variant hover:bg-surface-container-high transition-colors"
              aria-label={t.player.reloadLyrics}
              title={t.player.reloadLyrics}
            >
              <Icon name="refresh" size={16} />
            </button>
          </div>
        </div>

        {/* Layer selector (main/translation/pronunciation) */}
        {availableLayers.length > 1 && (
          <div className="px-4 py-1.5 border-b border-outline-variant/60 flex-none flex gap-1 flex-wrap">
            {availableLayers.map((layer, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveLayerIdx(idx)}
                className={[
                  "text-xs px-2.5 py-1 rounded-full transition-colors",
                  activeLayerIdx === idx
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest",
                ].join(" ")}
                title={layer.display_title ?? undefined}
              >
                {lyricsLayerLabel(t, layer.kind) ?? layer.lang ?? `${t.player.layer} ${idx + 1}`}
                {layer.lang && ` (${layer.lang})`}
              </button>
            ))}
          </div>
        )}

        {/* Lyrics timing offset control */}
        {lyricsLayer && lyricsLayer.synced && (
          <div className="px-4 py-1.5 border-b border-outline-variant/60 flex-none flex items-center gap-2">
            <span className="text-xs text-on-surface-variant">{t.player.offset}:</span>
            <input
              type="range"
              min="-5000"
              max="5000"
              step="100"
              value={lyricsOffset}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setLyricsOffset(v);
                try {
                  localStorage.setItem("floria-tune:lyricsOffset", String(v));
                } catch {
                  // ignore
                }
              }}
              className="flex-1 h-1 accent-primary"
              aria-label={t.player.timingAdjustment}
            />
            <span className="text-xs text-on-surface-variant w-12 text-right tabular-nums">
              {lyricsOffset > 0 ? "+" : ""}{lyricsOffset}ms
            </span>
          </div>
        )}

        <div
          className="flex-1 min-h-0 overflow-y-auto scroll-slim p-4"
          style={{ fontSize: "0.875rem" }}
        >
          {lyricsLoading && (
            <div className="flex items-center justify-center h-full">
              <p className="text-body-medium text-on-surface-variant">{t.common.loading}…</p>
            </div>
          )}

          {!lyricsLoading && !lyrics && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <Icon name="lyrics" size={48} className="text-on-surface-variant/40" />
              <p className="text-body-medium text-on-surface-variant">
                {t.player.lyricsUnavailable}
              </p>
            </div>
          )}

          {lyricsLayer && lyricsLayer.synced && (
            <SyncedLyrics
              lyrics={lyricsLayer}
              onLineSeek={(seconds) => void seek(seconds).catch(() => {})}
              showTiming
              timeOffsetMs={lyricsOffset}
            />
          )}

          {lyricsLayer && !lyricsLayer.synced && (
            <div className="space-y-1.5 text-body-medium text-on-surface leading-relaxed">
              {lyricsLayer.line.map((line, i) => (
                <p key={i} className="whitespace-pre-wrap break-words">
                  {line.value || "\u00A0"}
                </p>
              ))}
            </div>
          )}

          {lyrics && lyrics.structured_lyrics.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <Icon name="lyrics" size={48} className="text-on-surface-variant/40" />
              <p className="text-body-medium text-on-surface-variant">
                {t.player.noLyricsFound}
              </p>
            </div>
          )}
        </div>
      </section>
    </aside>
  );
}

export function RightPanel({ isOpen, onClose }: RightPanelProps) {
  const t = useTranslation();
  return <RightPanelInner isOpen={isOpen} onClose={onClose} t={t} />;
}
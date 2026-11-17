import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { getPosition } from "../services/tauri";
import type { StructuredCueLine, StructuredLyricsV2 } from "../services/tauri";
import { useLyricsSettings } from "../lib/lyrics-settings";

// ---------------------------------------------------------------------------
// Serialised position reading
// ---------------------------------------------------------------------------

async function readTimeMs(): Promise<number> {
  try {
    const pos = await getPosition();
    return Math.max(0, pos * 1000);
  } catch {
    return 0;
  }
}

function useRAFPosition(initialTMs: number): number {
  const [tMs, setTMs] = useState(initialTMs);
  const rafRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(0);
  const readIdRef = useRef(0);
  const runningRef = useRef(false);

  const scheduleRead = useCallback(() => {
    if (!runningRef.current) return;
    const id = ++readIdRef.current;
    readTimeMs().then((ms) => {
      if (id === readIdRef.current && runningRef.current) setTMs(ms);
    });
    timerRef.current = setTimeout(scheduleRead, 100);
  }, []);

  const paint = useCallback(() => {
    rafRef.current = requestAnimationFrame(paint);
  }, []);

  useEffect(() => {
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    clearTimeout(timerRef.current);
    readIdRef.current = 0;
    setTMs(initialTMs);
    runningRef.current = true;
    rafRef.current = requestAnimationFrame(paint);
    scheduleRead();
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(rafRef.current);
      clearTimeout(timerRef.current);
    };
  }, [initialTMs, paint, scheduleRead]);

  return tMs;
}

// ---------------------------------------------------------------------------
// Active line finder (binary search for performance)
// ---------------------------------------------------------------------------

function findActiveLineIdx(cueLines: StructuredCueLine[], tMs: number): number {
  if (cueLines.length === 0) return 0;

  // Binary search for the line whose start <= tMs < end
  let lo = 0;
  let hi = cueLines.length - 1;
  let result = 0;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const start = cueLines[mid].start ?? 0;
    const end = cueLines[mid].end ?? cueLines[mid].cue.at(-1)?.end ?? start + 5000;

    if (tMs >= start && tMs < end) {
      return mid;
    } else if (tMs < start) {
      hi = mid - 1;
    } else {
      result = mid;
      lo = mid + 1;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Active word finder (binary search)
// ---------------------------------------------------------------------------

function findActiveWordIdx(cues: StructuredCueLine["cue"], tMs: number): number {
  if (cues.length === 0) return -1;

  let lo = 0;
  let hi = cues.length - 1;
  let result = -1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const start = cues[mid].start;
    const end = cues[mid].end ?? cues[mid + 1]?.start ?? cues[mid].start + 1000;

    if (tMs >= start && tMs < end) {
      return mid;
    } else if (tMs < start) {
      hi = mid - 1;
    } else {
      result = mid;
      lo = mid + 1;
    }
  }

  return result;
}

function hasWordLevelSync(cueLines: StructuredCueLine[] | null | undefined): boolean {
  if (!cueLines || cueLines.length === 0) return false;
  return cueLines.some((cl) => cl.cue && cl.cue.length > 0);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SyncedLyricsProps {
  lyrics: StructuredLyricsV2 | null;
  className?: string;
  timeOffsetMs?: number;
  onLineSeek?: (seconds: number) => void;
  showTiming?: boolean;
}

export function SyncedLyrics({
  lyrics,
  className,
  timeOffsetMs = 0,
  onLineSeek,
  showTiming = false,
}: SyncedLyricsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const tMs = useRAFPosition(0);
  const activeIdxRef = useRef(0);
  const ls = useLyricsSettings().settings;

  const wordSync = hasWordLevelSync(lyrics?.cue_line);

  // Reset when song changes
  useEffect(() => {
    activeIdxRef.current = 0;
  }, [lyrics?.lang]);

  // Update active line
  useLayoutEffect(() => {
    if (!lyrics?.synced || !lyrics.cue_line?.length) return;
    const idx = findActiveLineIdx(lyrics.cue_line, tMs - timeOffsetMs);
    activeIdxRef.current = idx;
  }, [lyrics, tMs, timeOffsetMs]);

  // Auto-scroll
  useLayoutEffect(() => {
    const el = lineRefs.current.get(activeIdxRef.current);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeIdxRef.current]);

  const handleLineClick = useCallback(
    (lineStartMs: number | null | undefined) => {
      if (lineStartMs == null || !onLineSeek) return;
      onLineSeek(lineStartMs / 1000);
    },
    [onLineSeek],
  );

  if (!lyrics || !lyrics.synced) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-3 p-4">
        <p className="text-body-medium text-on-surface-variant">
          Letra não disponível para esta faixa.
        </p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Timing header
  // ---------------------------------------------------------------------------
  const cueLines = lyrics.cue_line ?? [];
  const nextLineStartMs =
    activeIdxRef.current + 1 < cueLines.length
      ? cueLines[activeIdxRef.current + 1].start ?? null
      : null;
  const timeToNextLine = nextLineStartMs
    ? Math.max(0, (nextLineStartMs - tMs + (lyrics.offset ?? 0) + timeOffsetMs) / 1000)
    : null;

  const formatMs = (ms: number) => {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  const currentTimeMs = tMs + (lyrics.offset ?? 0) + timeOffsetMs;
  const currentTimeFormatted = formatMs(currentTimeMs);

  // ---------------------------------------------------------------------------
  // MODE 1: Word/syllable sync (karaoke)
  // ---------------------------------------------------------------------------
  if (wordSync && lyrics.cue_line) {
    const mainLayer = lyrics.cue_line;
    const offsetMs = (lyrics.offset ?? 0) + timeOffsetMs;
    const adjusted = tMs - offsetMs;

    return (
      <div className={className ?? ""}>
        {showTiming && (
          <div className="flex items-center justify-between gap-4 mb-4 px-2 text-body-small text-on-surface-variant">
            <span>Now: {currentTimeFormatted}</span>
            {nextLineStartMs !== null && timeToNextLine !== null && (
              <span>
                Em {formatMs(timeToNextLine * 1000)}{
                  timeToNextLine < 60 ? " para a próxima linha" : ""
                }
              </span>
            )}
          </div>
        )}
        <div
          ref={containerRef}
          className="karlke-scroll"
          aria-label="Letra sincronizada"
          role="log"
        >
          {mainLayer.map((cl, li) => {
            const isActive = li === activeIdxRef.current;
            let wordIdx = -1;
            let wordProgress = 0;
            let lineProgress = 0;
            const cues = cl.cue;
            const lineStart = cl.start ?? 0;
            const lineEnd = cl.end ?? cues.at(-1)?.end ?? lineStart + 5000;
            wordIdx = findActiveWordIdx(cues, adjusted);
            if (wordIdx >= 0) {
              const c = cues[wordIdx];
              const cEnd = c.end ?? cues[wordIdx + 1]?.start ?? cl.end ?? c.start + 1000;
              if (adjusted >= cEnd) {
                wordProgress = 1;
              } else {
                wordProgress = (adjusted - c.start) / (cEnd - c.start);
              }
            }
            if (isActive && lineEnd > lineStart) {
              lineProgress = Math.min(100, Math.max(0, ((adjusted - lineStart) / (lineEnd - lineStart)) * 100));
            }

            return (
              <div
                key={li}
                ref={(el) => {
                  if (el) lineRefs.current.set(li, el);
                  else lineRefs.current.delete(li);
                }}
                className={`karlke-line ${isActive ? "karlke-active" : "karlke-inactive"} ${onLineSeek ? "cursor-pointer" : ""}`}
                style={{
                  fontFamily: ls.fontFamily !== "inherit" ? ls.fontFamily : undefined,
                  fontSize: `${isActive ? ls.fontSizeActive : ls.fontSizeInactive}rem`,
                  fontWeight: isActive ? ls.fontWeightActive : ls.fontWeightInactive,
                  lineHeight: ls.lineHeight,
                  letterSpacing: `${ls.letterSpacing}em`,
                  textAlign: ls.alignment,
                  marginInline: `${ls.marginX}px`,
                  transitionDuration: `${ls.animationSpeed}ms`,
                }}
                onClick={() => handleLineClick(cl.start)}
              >
                <span
                  className={`karlke-word${isActive ? " karlke-text-fill" : ""}`}
                  style={isActive ? { "--lf": `${lineProgress}%` } as React.CSSProperties : undefined}
                >
                  {cues.map((w, wi) => {
                    const isPast = wordIdx > wi;
                    const isCurrent = wordIdx === wi && isActive;
                    return (
                      <span
                        key={wi}
                        className={`karlke-word${isPast ? " karlke-past" : ""}${isCurrent ? " karlke-current" : ""}`}
                        style={isCurrent ? { "--fill": `${wordProgress * 100}%` } as React.CSSProperties : undefined}
                      >
                        {w.value}
                      </span>
                    );
                  })}
                </span>
              </div>
            );
          })}
        </div>
        <style>{injectedStyles}</style>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // MODE 2: Line-only sync
  // ---------------------------------------------------------------------------
  return (
    <div
      className="space-y-2 leading-relaxed"
      style={{
        fontFamily: ls.fontFamily !== "inherit" ? ls.fontFamily : undefined,
        fontSize: `${ls.fontSizeUnsynced}rem`,
        lineHeight: ls.lineHeight,
        letterSpacing: `${ls.letterSpacing}em`,
        textAlign: ls.alignment,
        marginInline: `${ls.marginX}px`,
      }}
    >
      {lyrics.line.map((line, i) => {
        const isActive = lyrics.cue_line?.[i]?.start != null
          ? i === activeIdxRef.current
          : false;
        return (
          <p
            key={i}
            className={[
              "whitespace-pre-wrap break-words transition-all",
              isActive
                ? "text-on-surface font-bold opacity-100"
                : "opacity-50 text-on-surface-variant",
              onLineSeek && lyrics.cue_line?.[i]?.start != null ? "cursor-pointer hover:opacity-70" : "",
            ].filter(Boolean).join(" ")}
            style={{
              transitionDuration: `${ls.animationSpeed}ms`,
            }}
            onClick={() => {
              if (!onLineSeek || !lyrics.cue_line?.[i]?.start) return;
              onLineSeek(lyrics.cue_line[i].start / 1000);
            }}
          >
            {line.value || "\u00A0"}
          </p>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const injectedStyles = `
.karlke-scroll {
  overflow-y: auto;
  scrollbar-width: thin;
  scroll-behavior: smooth;
}
.karlke-line {
  line-height: 1.9;
  font-size: 1.125rem;
  padding: 0.3em 0.5em;
  border-radius: 0.5em;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: pre-wrap;
  word-break: keep-all;
  font-weight: 500;
}
.karlke-active {
  opacity: 1;
  filter: none;
  color: var(--md-sys-color-on-surface);
  font-weight: 700;
}
.karlke-inactive {
  opacity: 0.6;
  filter: blur(0.15px);
  color: var(--md-sys-color-on-surface-variant);
}
.karlke-word {
  display: inline;
  margin-right: 0.1em;
  transition: color 0.1s;
}
.karlke-text-fill {
  -webkit-background-clip: text;
  background-clip: text;
  color: var(--md-sys-color-on-surface);
  background-image: linear-gradient(
    to right,
    var(--md-sys-color-primary) 0%,
    var(--md-sys-color-primary) var(--lf, 0%),
    var(--md-sys-color-on-surface) var(--lf, 0%),
    var(--md-sys-color-on-surface) 100%
  );
  font-weight: 600;
}
.karlke-past {
  color: var(--md-sys-color-on-surface-variant);
}
.karlke-current {
  color: var(--md-sys-color-on-surface);
  -webkit-background-clip: text;
  background-clip: text;
  background-image: linear-gradient(
    to right,
    var(--md-sys-color-primary) 0%,
    var(--md-sys-color-primary) var(--fill, 0%),
    var(--md-sys-color-on-surface) var(--fill, 0%),
    var(--md-sys-color-on-surface) 100%
  );
  background-repeat: no-repeat;
  font-weight: 600;
}
@media (prefers-reduced-motion: reduce) {
  .karlke-line, .karlke-word { transition: none !important; }
}
`;
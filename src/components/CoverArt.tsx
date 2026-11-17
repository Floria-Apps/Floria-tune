import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

import { getCoverUrl } from "../lib/cover-cache";
import { hashSeed, initials } from "../lib/format";

export type CoverKind = "album" | "artist" | "song";

interface CoverArtProps {
  /** Stable entity id: the same record always gets the same artwork. */
  id: string;
  name: string;
  kind?: CoverKind;
  /** Circular treatment, used for artists. */
  round?: boolean;
  className?: string;
  /** Navidrome cover art id; when present a real image is loaded. */
  coverArt?: string | null;
  /** Requested image size in px (passed to the backend). */
  size?: number;
  /** Load eagerly with high priority (hero images). */
  priority?: boolean;
  /** Show initials fallback when no cover is available */
  showFallback?: boolean;
}

/** Palette pairs for generative fallbacks (Tailwind-aware). */
const PALETTES = [
  { from: "var(--md-sys-color-primary)", to: "var(--md-sys-color-secondary)", ink: "var(--md-sys-color-on-primary)" },
  { from: "var(--md-sys-color-primary-container)", to: "color-mix(in oklab, var(--md-sys-color-primary-container) 78%, var(--md-sys-color-primary))", ink: "var(--md-sys-color-on-primary-container)" },
  { from: "var(--md-sys-color-secondary)", to: "var(--md-sys-color-primary)", ink: "var(--md-sys-color-on-secondary)" },
  { from: "var(--md-sys-color-secondary-container)", to: "color-mix(in oklab, var(--md-sys-color-secondary-container) 76%, var(--md-sys-color-secondary))", ink: "var(--md-sys-color-on-secondary-container)" },
  { from: "var(--md-sys-color-tertiary)", to: "color-mix(in oklab, var(--md-sys-color-tertiary) 72%, var(--md-sys-color-primary))", ink: "var(--md-sys-color-on-tertiary)" },
];

function useNearViewport(enabled: boolean, priority: boolean): {
  ref: (node: HTMLDivElement | null) => void;
  inView: boolean;
} {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(priority);

  const ref = useCallback((node: HTMLDivElement | null) => {
    nodeRef.current = node;
  }, []);

  useEffect(() => {
    if (priority || !enabled) {
      if (priority) setInView(true);
      return;
    }
    if (typeof IntersectionObserver === "undefined" || !nodeRef.current) {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: "500px 0px", threshold: 0.01 },
    );
    observer.observe(nodeRef.current);
    return () => observer.disconnect();
  }, [enabled, priority]);

  return { ref, inView };
}

function useImageLoader(
  coverArt: string | null | undefined,
  size: number,
  enabled: boolean,
  priority: boolean,
): {
  src: string | null;
  failed: boolean;
  isLoading: boolean;
  setFailed: (value: boolean) => void;
} {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!coverArt || !enabled) {
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);
    getCoverUrl(coverArt, size, priority)
      .then((url) => {
        if (active) {
          setSrc(url);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setFailed(true);
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [coverArt, size, enabled]);

  return { src, failed, isLoading, setFailed };
}

function getFallbackPalette(seed: number): { from: string; to: string; ink: string } {
  return PALETTES[seed % PALETTES.length];
}

export function CoverArt({
  id,
  name,
  kind: _kind = "album",
  round = false,
  className,
  coverArt,
  size = 256,
  priority = false,
  showFallback = true,
}: CoverArtProps) {
  const { ref: viewRef, inView } = useNearViewport(Boolean(coverArt), priority);
  const { src, failed, isLoading, setFailed } = useImageLoader(
    coverArt ?? null,
    size,
    priority || inView,
    priority,
  );
  const seed = hashSeed(id);
  const palette = getFallbackPalette(seed);
  const monogram = initials(name);

  const style: CSSProperties = {
    backgroundImage: `radial-gradient(120% 92% at 24% 12%, rgba(255, 255, 255, 0.3), transparent 58%), linear-gradient(148deg, ${palette.from}, ${palette.to})`,
    color: palette.ink,
  };

  // Blurred placeholder when loading
  const placeholderStyle = isLoading
    ? {
        background: `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
        transition: "background 0.3s ease",
      }
    : {};

  const useImage = Boolean(coverArt) && !failed && src;

  if (useImage) {
    return (
      <div
        ref={viewRef}
      className={[
          "relative isolate grid aspect-square place-items-center overflow-hidden bg-surface-container-high",
          round ? "rounded-full" : "rounded-md",
          className ?? "",
        ].join(" ")}
        style={style}
        aria-hidden="true"
      >
        <img
          src={src as string}
          alt=""
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
          style={{ opacity: failed ? 0 : 1 }}
        />
        {isLoading && !src && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-full"
            style={placeholderStyle}
          >
            <span className="text-on-surface/30 text-xs font-medium">{monogram}</span>
          </div>
        )}
      </div>
    );
  }

  // Fallback with initials + palette background
  return (
    <div
      ref={viewRef}
      className={[
        "relative isolate grid aspect-square place-items-center overflow-hidden bg-surface-container-high",
        round ? "rounded-full" : "rounded-md",
        className ?? "",
      ].join(" ")}
      style={style}
      aria-hidden="true"
    >
      {!src && !failed && showFallback && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-full"
          style={placeholderStyle}
        >
          <span className="text-on-surface/30 text-xs font-medium">{monogram}</span>
        </div>
      )}
      {src && (
        <img
          src={src as string}
          alt=""
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
          style={{ opacity: failed ? 0 : 1 }}
          />
      )}
      {failed && showFallback && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-full"
          style={placeholderStyle}
        >
          <span className="text-on-surface/60 text-xs font-medium">{monogram}</span>
        </div>
      )}
    </div>
  );
}

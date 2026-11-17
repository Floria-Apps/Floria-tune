import { useEffect } from "react";

import { listen } from "@tauri-apps/api/event";

import { usePlayer } from "../player/PlayerContext";

/**
 * Register system-tray event listeners so the Rust-side tray menu can drive
 * the React playback context without coupling the two layers directly.
 */
export function useTrayListeners(): void {
  const { next, prev, togglePlay } = usePlayer();

  useEffect(() => {
    let cancelled = false;

    async function register() {
      const unlistenPlay = await listen("tray:toggle_play", () => {
        if (!cancelled) {
          togglePlay();
        }
      });

      const unlistenNext = await listen<string>("tray:next", () => {
        if (!cancelled) {
          next();
        }
      });

      const unlistenPrev = await listen<string>("tray:prev", () => {
        if (!cancelled) {
          prev();
        }
      });

      return () => {
        cancelled = true;
        void unlistenPlay();
        void unlistenNext();
        void unlistenPrev();
      };
    }

    void register();
  }, [next, prev, togglePlay]);
}

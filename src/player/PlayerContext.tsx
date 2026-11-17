import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Song } from "../types/song";
import { playSong, stopPlayback, dbAddHistory, togglePause } from "../services/tauri";

export type RepeatMode = "off" | "all" | "one";

interface PlayerApi {
  current: Song | null;
  queue: Song[];
  index: number;
  shuffle: boolean;
  repeat: RepeatMode;
  select: (song: Song) => void;
  playQueue: (songs: Song[], startIndex?: number) => void;
  next: () => void;
  prev: () => void;
  togglePlay: () => void;
  clear: () => void;
  remove: (index: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  hasNext: boolean;
  hasPrev: boolean;
}

const PlayerContext = createContext<PlayerApi | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Song[]>([]);
  const [index, setIndex] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [played, setPlayed] = useState<number[]>([]);

  const current = queue[index] ?? null;

  const playAt = useCallback((songs: Song[], i: number) => {
    const song = songs[i];
    if (!song) {
      return;
    }
    setQueue(songs);
    setIndex(i);
    setPlayed((prev) => (prev.includes(i) ? prev : [...prev, i]));
    void playSong(song.id).catch(() => {
      // Keep selection even if playback fails.
    });
    void dbAddHistory(song.id).catch(() => {
      // History is best-effort.
    });
  }, []);

  const select = useCallback(
    (song: Song) => {
      playAt([song], 0);
    },
    [playAt],
  );

  const playQueue = useCallback(
    (songs: Song[], startIndex = 0) => {
      if (songs.length === 0) {
        return;
      }
      const i = Math.max(0, Math.min(startIndex, songs.length - 1));
      playAt(songs, i);
      setPlayed([i]);
    },
    [playAt],
  );

  const remove = useCallback((removeIndex: number) => {
    setQueue((prevQueue) => {
      if (removeIndex < 0 || removeIndex >= prevQueue.length) {
        return prevQueue;
      }
      const newQueue = prevQueue.filter((_, i) => i !== removeIndex);
      setIndex((prevIndex) => {
        if (removeIndex < prevIndex) {
          return Math.max(0, prevIndex - 1);
        }
        if (removeIndex === prevIndex && newQueue.length > 0) {
          return Math.min(prevIndex, newQueue.length - 1);
        }
        return prevIndex;
      });
      setPlayed((prevPlayed) =>
        prevPlayed
          .map((i) => (i > removeIndex ? i - 1 : i))
          .filter((i) => i !== removeIndex && i < newQueue.length),
      );
      return newQueue;
    });
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((prev) => !prev);
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeat((prev) =>
      prev === "off" ? "all" : prev === "all" ? "one" : "off",
    );
  }, []);

  const next = useCallback(() => {
    if (queue.length === 0) {
      return;
    }
    if (repeat === "one" && current) {
      void playSong(current.id).catch(() => {});
      return;
    }
    if (shuffle) {
      const unplayed = queue
        .map((_, i) => i)
        .filter((i) => !played.includes(i));
      if (unplayed.length > 0) {
        const pick = unplayed[Math.floor(Math.random() * unplayed.length)];
        playAt(queue, pick);
        return;
      }
      if (repeat === "all") {
        const pick = Math.floor(Math.random() * queue.length);
        setPlayed([pick]);
        playAt(queue, pick);
        return;
      }
      return;
    }
    const nextIndex = index + 1;
    if (nextIndex < queue.length) {
      playAt(queue, nextIndex);
    } else if (repeat === "all") {
      playAt(queue, 0);
      setPlayed([0]);
    }
  }, [queue, index, shuffle, repeat, played, current, playAt]);

  const prev = useCallback(() => {
    if (queue.length === 0) {
      return;
    }
    const prevIndex = index - 1;
    if (prevIndex >= 0) {
      playAt(queue, prevIndex);
    } else if (repeat === "all") {
      playAt(queue, queue.length - 1);
    }
  }, [queue, index, repeat, playAt]);

  const clear = useCallback(() => {
    setQueue([]);
    setIndex(0);
    setPlayed([]);
    void stopPlayback().catch(() => {});
  }, []);

  const togglePlay = useCallback(async () => {
    await togglePause().catch(() => {});
  }, []);

  const value = useMemo<PlayerApi>(
    () => ({
      current,
      queue,
      index,
      shuffle,
      repeat,
      select,
      playQueue,
      next,
      prev,
      togglePlay,
      clear,
      remove,
      toggleShuffle,
      cycleRepeat,
      hasNext:
        repeat !== "off" ||
        (shuffle ? played.length < queue.length : index + 1 < queue.length),
      hasPrev: index > 0 || repeat === "all",
    }),
    [
      current,
      queue,
      index,
      shuffle,
      repeat,
      select,
      playQueue,
      next,
      prev,
      togglePlay,
      clear,
      remove,
      toggleShuffle,
      cycleRepeat,
      played.length,
    ],
  );

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerApi {
  const context = useContext(PlayerContext);

  if (!context) {
    throw new Error("usePlayer precisa estar dentro de PlayerProvider.");
  }

  return context;
}
import { CSS } from "@dnd-kit/utilities";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useMemo, useState, type MouseEvent } from "react";

import { formatDuration } from "../lib/format";
import { usePlayer } from "../player/PlayerContext";
import { Button } from "./m3e/button";
import { CoverArt } from "./CoverArt";
import { Icon } from "./m3e/icon";
import type { Song } from "../types/song";

// ---------------------------------------------------------------------------
// Drag handle — six-dot grip, no external icon dependency needed
// ---------------------------------------------------------------------------
function DragHandle({
  listeners,
}: {
  listeners?: Record<string, unknown>;
}) {
  return (
    <button
      type="button"
      aria-label="Arrastar para reordenar"
      className={[
        "flex shrink-0 items-center justify-center",
        "rounded-sm p-1 opacity-0 group-hover:opacity-100",
        "transition-opacity cursor-grab active:cursor-grabbing",
        "hover:bg-secondary-container/40",
      ].join(" ")}
      {...listeners}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="text-on-surface-variant"
      >
        <circle cx="4" cy="3" r="1.5" />
        <circle cx="12" cy="3" r="1.5" />
        <circle cx="4" cy="8" r="1.5" />
        <circle cx="12" cy="8" r="1.5" />
        <circle cx="4" cy="13" r="1.5" />
        <circle cx="12" cy="13" r="1.5" />
      </svg>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Single queue row — supports both sortable and plain rendering
// ---------------------------------------------------------------------------
interface QueueRowBaseProps {
  song: Song;
  index: number;
  currentIndex: number;
  onPlay: () => void;
  onRemove: () => void;
}

interface SortableRowProps extends QueueRowBaseProps {
  setNodeRef: (el: HTMLElement | null) => void;
  style?: React.CSSProperties;
  isDragging: boolean;
  listeners?: Record<string, unknown>;
}

function SortableRow({
  song,
  index,
  currentIndex,
  onPlay,
  onRemove,
  setNodeRef,
  style,
  isDragging,
  listeners,
}: SortableRowProps) {
  const isActive = index === currentIndex;

  return (
    <li
      ref={setNodeRef}
      style={style}
      data-dnd-handle-target
      className={[
        "group flex items-center gap-3 px-4 py-2.5 min-h-0 transition-colors",
        isActive ? "bg-primary/10" : "hover:bg-surface-container",
        isDragging ? "opacity-40" : "",
      ].join(" ")}
      role="listitem"
      aria-current={isActive ? "true" : undefined}
    >
      {/* Drag handle */}
      <div className="w-7 flex-none">
        <DragHandle listeners={listeners} />
      </div>

      <CoverArt
        id={song.album_id ?? song.id}
        name={song.album ?? song.title}
        kind="song"
        coverArt={song.cover_art}
        size={96}
        className="w-10 h-10 flex-none rounded-sm object-cover"
      />

      <button
        type="button"
        onClick={onPlay}
        className="min-w-0 flex-1 text-left leading-tight bg-transparent border-none p-0 cursor-pointer"
      >
        <p
          className={[
            "truncate text-body-medium",
            isActive ? "text-primary" : "text-on-surface",
          ].join(" ")}
        >
          {song.title}
        </p>
        <p className="mt-0.5 truncate text-body-small text-on-surface-variant">
          {song.artist ?? "Artista desconhecido"}
        </p>
      </button>

      <span className="text-label-small tabular-nums text-on-surface-variant flex-none pr-1">
        {formatDuration(song.duration)}
      </span>

      {index !== currentIndex && (
        <Button
          variant="text"
          size="icon"
          onClick={(e: MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label="Remover da fila"
          className="opacity-0 group-hover:opacity-100 transition-opacity flex-none"
        >
          <Icon name="close" size={16} />
        </Button>
      )}
    </li>
  );
}

// Wrapper that attaches sortable hooks
function SortableQueueRow({
  song,
  index,
  currentIndex,
  onPlay,
  onRemove,
}: QueueRowBaseProps) {
  const { isDragging, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: `${song.id}-${index}`,
      disabled: index === currentIndex,
    });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <SortableRow
      song={song}
      index={index}
      currentIndex={currentIndex}
      onPlay={onPlay}
      onRemove={onRemove}
      setNodeRef={setNodeRef}
      style={style}
      isDragging={isDragging}
      listeners={listeners as Record<string, unknown>}
    />
  );
}

// ---------------------------------------------------------------------------
// Full sortable queue panel
// ---------------------------------------------------------------------------
export function QueueSection() {
  const { queue, index, remove, playQueue } = usePlayer();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // Build flat sorted ids for SortableContext (exclude current track)
  const sortableItems = useMemo(
    () =>
      queue
        .map((_: Song, i: number) => i)
        .filter((i: number) => i !== index)
        .map((i: number) => `${queue[i].id}-${i}`),
    [queue, index],
  );

  const activeSong = useMemo(
    () =>
      queue.find(
        (_: Song, i: number) => `${queue[i].id}-${i}` === activeId,
      ),
    [queue, activeId],
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldStr = active.id as string;
    const newStr = over.id as string;

    // Parse indices from ids
    const parseIdx = (s: string) => {
      const dash = s.lastIndexOf("-");
      return parseInt(s.slice(dash + 1), 10);
    };

    const oldIdx = parseIdx(oldStr);
    const newIdx = parseIdx(newStr);
    if (isNaN(oldIdx) || isNaN(newIdx)) return;

    // arrayMove works on a copy
    const newQueue = arrayMove(queue, oldIdx, newIdx);
    playQueue(newQueue, index);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleRemove = (i: number) => {
    if (i === index) return;
    remove(i);
  };

  if (queue.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-body-medium text-on-surface-variant text-center">
          Fila vazia. Adicione músicas para começar a reprodução.
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
        <ul
          className="flex-1 min-h-0 overflow-y-auto scroll-slim divide-y divide-outline-variant/60"
          role="list"
        >
          {queue.map((song: Song, i: number) => (
            <SortableQueueRow
              key={`${song.id}-${i}`}
              song={song}
              index={i}
              currentIndex={index}
              onPlay={() => playQueue(queue, i)}
              onRemove={() => handleRemove(i)}
            />
          ))}
        </ul>
      </SortableContext>

      <DragOverlay adjustScale>
        {activeSong ? (
          <li className="bg-surface-container-high shadow-xl rounded-lg mx-2 my-1 px-4 py-2.5 min-w-[200px] max-w-[380px]">
            <div className="flex items-center gap-3">
              <CoverArt
                id={activeSong.album_id ?? activeSong.id}
                name={activeSong.album ?? activeSong.title}
                kind="song"
                coverArt={activeSong.cover_art}
                size={96}
                className="w-10 h-10 rounded-sm object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-medium text-on-surface">
                  {activeSong.title}
                </p>
                <p className="mt-0.5 truncate text-body-small text-on-surface-variant">
                  {activeSong.artist ?? "Artista desconhecido"}
                </p>
              </div>
              <span className="text-label-small tabular-nums text-on-surface-variant flex-none">
                {formatDuration(activeSong.duration)}
              </span>
            </div>
          </li>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

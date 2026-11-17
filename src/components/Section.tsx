import type { ReactNode } from "react";

import { Button } from "./m3e/button";

interface SectionProps {
  title: string;
  description?: string;
  href?: string;
  actionLabel?: string;
  children: ReactNode;
  /**
   * `shelf` scrolls horizontally, `grid` lays covers out, `wide` is a grid of
   * list rows, `stack` renders full-width content (track lists, result rows).
   */
  layout?: "shelf" | "grid" | "wide" | "stack";
}

const LAYOUT_CLASS: Record<NonNullable<SectionProps["layout"]>, string> = {
  shelf:
    "scroll-slim grid snap-x snap-mandatory auto-cols-[clamp(8.5rem,14vw,11.5rem)] grid-flow-col gap-4 overflow-x-auto pb-2 [&>*]:snap-start",
  grid: "grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-x-4 gap-y-8",
  wide: "grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-2",
  stack: "block",
};

export function Section({
  title,
  description,
  href,
  actionLabel = "Ver todos",
  children,
  layout = "shelf",
}: SectionProps) {
  return (
    <section className="mt-10 first:mt-0 max-[760px]:mt-8" aria-labelledby={`section-${slug(title)}`}>
      <div className="mb-4 flex items-end justify-between gap-4 border-b border-outline-variant/60 pb-3">
        <div className="min-w-0">
          <h2
            className="text-title-large-emphasized"
            id={`section-${slug(title)}`}
          >
            {title}
          </h2>
          {description && (
            <p className="mt-1 max-w-[70ch] text-body-medium text-on-surface-variant">
              {description}
            </p>
          )}
        </div>

        {href && (
          <Button
            variant="text"
            size="sm"
            nativeButton={false}
            render={<a href={href} />}
          >
            {actionLabel}
          </Button>
        )}
      </div>

      <div className={LAYOUT_CLASS[layout]}>{children}</div>
    </section>
  );
}

function slug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
}

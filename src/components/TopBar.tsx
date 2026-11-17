import { useEffect, useRef, useState } from "react";

import { useMediaQuery } from "../hooks/useMediaQuery";
import { AppBar } from "./m3e/app-bar";
import { Button } from "./m3e/button";
import { Icon } from "./m3e/icon";
import { TextField } from "./m3e/text-field";
import { BrandMark } from "./BrandMark";
import { useTranslation } from "../lib/i18n";

interface TopBarProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  onSearch: (query: string) => void;
  showBrand?: boolean;
  scrolled?: boolean;
}

export function TopBar({
  title,
  subtitle,
  backHref,
  onSearch,
  showBrand = false,
  scrolled = false,
}: TopBarProps) {
  const [term, setTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const mobile = useMediaQuery("(max-width: 760px)");
  const t = useTranslation();

  // `/` focuses the global search, unless the user is already typing.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      if (event.key === "/" && !typing) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handler);

    return () => window.removeEventListener("keydown", handler);
  }, []);

  const searchForm = (
    <form
      role="search"
      className="w-full"
      onSubmit={(event) => {
        event.preventDefault();
        const query = term.trim();

        if (query) {
          onSearch(query);
        }
      }}
    >
      <TextField
        ref={inputRef}
        variant="outlined"
        label={t.search.placeholder}
        leadingIcon={<Icon name="search" />}
        type="search"
        value={term}
        autoComplete="off"
        aria-label={t.search.label}
        onChange={(event) => setTerm(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setTerm("");
            inputRef.current?.blur();
          }
        }}
      />
    </form>
  );

  return (
    <div className="flex-none border-b border-outline-variant/40 bg-transparent pt-[env(safe-area-inset-top)]">
      <AppBar
        className="bg-transparent px-3 max-[760px]:px-2"
        scrolled={scrolled}
        title={title}
        subtitle={subtitle}
        leading={
          backHref ? (
            <Button
              variant="text"
              size="icon"
              aria-label={t.common.back}
              nativeButton={false}
              render={<a href={backHref} />}
            >
              <Icon name="arrow_back" />
            </Button>
          ) : showBrand ? (
            <span className="grid size-10 place-items-center text-primary min-[761px]:hidden">
              <BrandMark />
            </span>
          ) : undefined
        }
        trailing={
          <>
            {!mobile && (
              <div className="mr-2 w-[clamp(12rem,26vw,22rem)]">
                {searchForm}
              </div>
            )}

            {/* Connection status indicator removed per user request */}
            {mobile && (
              <Button
                variant="text"
                size="icon"
                aria-label={t.common.settings}
                nativeButton={false}
                render={<a href="#/settings" />}
              >
                <Icon name="settings" />
              </Button>
            )}
          </>
        }
      />

      {mobile && <div className="px-4 pb-3">{searchForm}</div>}
    </div>
  );
}
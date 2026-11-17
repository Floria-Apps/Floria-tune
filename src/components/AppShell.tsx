import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { useMediaQuery } from "../hooks/useMediaQuery";
import { useScrolled } from "./m3e/app-bar";
import { PlayerDock } from "./PlayerDock";
import { RightPanel } from "./RightPanel";
import { Sidebar, MobileNavigation } from "./Sidebar";
import { useTrayListeners } from "../hooks/useTrayListeners";
import { TopBar } from "./TopBar";

export interface PageMeta {
  title: string;
  subtitle?: string;
  backHref?: string;
}

interface AppShellProps {
  meta: PageMeta;
  currentPath: string;
  scrollKey: string;
  onSearch: (query: string) => void;
  children: ReactNode;
}

export function AppShell({
  meta,
  currentPath,
  scrollKey,
  onSearch,
  children,
}: AppShellProps) {
  const mobile = useMediaQuery("(max-width: 760px)");
  useTrayListeners();
  const contentRef = useRef<HTMLDivElement>(null);
  const scrolled = useScrolled(contentRef);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [scrollKey]);

  const toggleRightPanel = useCallback(() => {
    setRightPanelOpen((prev) => !prev);
  }, []);

  return (
    <div className="relative flex h-dvh min-h-0 flex-col overflow-hidden bg-surface text-on-surface">
      <div
        aria-hidden="true"
        className="app-backdrop pointer-events-none absolute inset-0"
      />

      <div className="relative flex min-h-0 flex-1 flex-row overflow-hidden max-[760px]:flex-col">
        <Sidebar currentPath={currentPath} />

        <div className="app-surface relative mx-3 my-3 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden max-[760px]:mx-2 max-[760px]:my-2">
          <TopBar
            title={meta.title}
            subtitle={meta.subtitle}
            backHref={meta.backHref}
            onSearch={onSearch}
            showBrand={mobile}
            scrolled={scrolled}
          />

          <div
            className="scroll-slim min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth"
            ref={contentRef}
            id="main"
            tabIndex={-1}
          >
            <div className="mx-auto w-full max-w-[1500px] px-gutter pb-10 pt-6 max-[760px]:pb-8 max-[760px]:pt-4">
              {children}
            </div>
          </div>
        </div>

        {!mobile && (
          <RightPanel isOpen={rightPanelOpen} onClose={() => setRightPanelOpen(false)} />
        )}
      </div>

      <PlayerDock
        onToggleRightPanel={toggleRightPanel}
        rightPanelOpen={rightPanelOpen}
      />

      {mobile && <MobileNavigation currentPath={currentPath} />}
    </div>
  );
}

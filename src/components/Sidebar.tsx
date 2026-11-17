import { useMediaQuery } from "../hooks/useMediaQuery";
import { BrandMark } from "./BrandMark";
import {
  NavigationBar,
  NavigationBarItem,
  NavigationRail,
  NavigationRailItem,
} from "./m3e/navigation";
import { useTranslation, type Translation } from "../lib/i18n";

interface Destination {
  href: string;
  path: string;
  labelKey: keyof Translation["common"];
  icon: string;
}

const DESTINATIONS: Destination[] = [
  { href: "#/", path: "/", labelKey: "home", icon: "home" },
  { href: "#/artists", path: "/artists", labelKey: "artists", icon: "person" },
  { href: "#/albums", path: "/albums", labelKey: "albums", icon: "album" },
  {
    href: "#/songs",
    path: "/songs",
    labelKey: "songs",
    icon: "library_music",
  },
  {
    href: "#/playlists",
    path: "/playlists",
    labelKey: "playlists",
    icon: "queue_music",
  },
  {
    href: "#/settings",
    path: "/settings",
    labelKey: "settings",
    icon: "settings",
  },
];

interface SidebarProps {
  currentPath: string;
}

function isActive(destination: Destination, currentPath: string): boolean {
  if (destination.path === "/") {
    return currentPath === "/";
  }

  return (
    currentPath === destination.path ||
    currentPath.startsWith(`${destination.path}/`)
  );
}

/**
 * The bottom bar keeps the five library destinations. Settings lives in the
 * top app bar on phones, where a sixth item would squeeze the labels.
 */
const MOBILE_DESTINATIONS = DESTINATIONS.filter(
  (destination) => destination.path !== "/settings",
);

function MobileNavigationInner({
  currentPath,
  t,
}: {
  currentPath: string;
  t: ReturnType<typeof useTranslation>;
}) {
  return (
    <NavigationBar className="app-panel mx-2 mb-[max(0.75rem,env(safe-area-inset-bottom))] h-[68px] flex-none overflow-hidden bg-surface-container/85 backdrop-blur-2xl">
      {MOBILE_DESTINATIONS.map((destination) => (
        <NavigationBarItem
          key={destination.path}
          icon={destination.icon}
          label={t.common[destination.labelKey]}
          active={isActive(destination, currentPath)}
          render={<a href={destination.href} />}
        />
      ))}
    </NavigationBar>
  );
}

export function MobileNavigation({
  currentPath,
}: {
  currentPath: string;
}) {
  const t = useTranslation();
  return <MobileNavigationInner currentPath={currentPath} t={t} />;
}

function SidebarInner({
  currentPath,
  t,
}: { currentPath: string } & { t: ReturnType<typeof useTranslation> }) {
  const compact = useMediaQuery("(max-width: 1080px)");
  const mobile = useMediaQuery("(max-width: 760px)");

  if (mobile) {
    return null;
  }

  return (
    <aside
      className={[
        "app-panel my-3 ml-3 flex h-auto flex-none flex-col self-stretch overflow-hidden py-4",
        compact ? "w-24" : "w-[236px]",
      ].join(" ")}
    >
      <a
        className={[
          "flex min-h-11 items-center gap-2.5 rounded-full text-primary focus-ring",
          compact ? "mx-auto justify-center px-2" : "mx-6",
        ].join(" ")}
        href="#/"
        aria-label={t.sidebar.brand}
      >
        <span className="grid size-8 shrink-0 place-items-center">
          <BrandMark />
        </span>
        {!compact && (
          <span className="whitespace-nowrap text-title-large-emphasized tracking-[-0.02em] text-on-surface [font-stretch:82%]">
            floria<span className="text-primary">tune</span>
          </span>
        )}
      </a>

      <NavigationRail
        expanded={!compact}
        className="w-full flex-1 bg-transparent pt-2"
      >
        {DESTINATIONS.map((destination) => (
          <NavigationRailItem
            key={destination.path}
            icon={destination.icon}
            label={t.common[destination.labelKey]}
            active={isActive(destination, currentPath)}
            render={<a href={destination.href} />}
          />
        ))}
      </NavigationRail>

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-outline-variant/40 px-4 pt-3 max-[1080px]:justify-center max-[1080px]:px-0">
        {/* Connection status indicator removed per user request */}
      </div>
    </aside>
  );
}

export function Sidebar({
  currentPath,
}: SidebarProps) {
  const t = useTranslation();
  return <SidebarInner currentPath={currentPath} t={t} />;
}
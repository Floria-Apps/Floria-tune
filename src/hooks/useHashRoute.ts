import { useCallback, useEffect, useState } from "react";

export interface Route {
  /** Path without the leading `#`, e.g. `/albums/abc`. */
  path: string;
  segments: string[];
  query: URLSearchParams;
}

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  const [pathPart, queryPart = ""] = raw.split("?");
  const path = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;

  return {
    path,
    segments: path.split("/").filter(Boolean),
    query: new URLSearchParams(queryPart),
  };
}

interface NavigateOptions {
  replace?: boolean;
}

/** Minimal hash router: no dependency, works inside Tauri's custom protocol. */
export function useHashRoute() {
  const [route, setRoute] = useState<Route>(parseHash);

  useEffect(() => {
    const update = () => setRoute(parseHash());

    window.addEventListener("hashchange", update);

    return () => window.removeEventListener("hashchange", update);
  }, []);

  const navigate = useCallback(
    (to: string, options: NavigateOptions = {}) => {
      const target = `#${to.startsWith("/") ? to : `/${to}`}`;

      if (options.replace) {
        window.history.replaceState(null, "", target);
        setRoute(parseHash());
        return;
      }

      if (window.location.hash === target) {
        setRoute(parseHash());
        return;
      }

      window.location.hash = target;
    },
    [],
  );

  return { route, navigate };
}

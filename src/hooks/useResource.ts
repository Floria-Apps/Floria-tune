import { useEffect, useRef, useState } from "react";

interface ResourceState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/**
 * Loads an async resource and cancels the in-flight request when the key
 * changes or the component unmounts. `load` is kept in a ref so callers can
 * pass an inline closure without restarting the request on every render.
 */
export function useResource<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
) {
  const loadRef = useRef(load);
  loadRef.current = load;

  const [state, setState] = useState<ResourceState<T>>({
    data: null,
    error: null,
    loading: true,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setState((current) => ({ ...current, loading: true, error: null }));

    loadRef
      .current(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setState({ data, error: null, loading: false });
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setState({
          data: null,
          error: error instanceof Error ? error.message : "Erro inesperado.",
          loading: false,
        });
      });

    return () => controller.abort();
  }, [key, attempt]);

  return {
    ...state,
    reload: () => setAttempt((value) => value + 1),
  };
}

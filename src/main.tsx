import React, { Component, type ErrorInfo, type ReactNode } from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { M3eProvider } from "./components/m3e/m3e-provider";
import { I18nProvider } from "./lib/i18n";
import "./styles/app.css";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    document.title = "RENDER_ERROR: " + error.message;
    console.error("RENDER_ERROR", error, info);
  }
  render() {
    if (this.state.error) {
      return React.createElement(
        "pre",
        { style: { color: "red", padding: "2rem", whiteSpace: "pre-wrap", fontFamily: "monospace" } },
        (this.state.error as Error).stack || (this.state.error as Error).message,
      );
    }
    return this.props.children;
  }
}

const rootEl = document.getElementById("root") as HTMLElement;
try {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ErrorBoundary>
        <I18nProvider>
          <M3eProvider
            colorMode={{ storageKey: "floria-tune:scheme", toggleKey: false }}
            theme = {{
              defaultTheme: {
                source: { primary: "#E91E63" },
                variant: "tonalSpot",
                motion: "expressive",
              },
            }}
          >
            <App />
          </M3eProvider>
        </I18nProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
} catch (err) {
  const e = err as { message?: string; stack?: string };
  document.title = "RENDER_ERROR: " + (e.message ? e.message : String(err));
  rootEl.innerHTML = '<pre style="color:red;padding:2rem;white-space:pre-wrap">' + (e.stack ? e.stack : String(err)) + '</pre>';
}

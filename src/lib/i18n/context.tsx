import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { getSettings, updateSettings } from "../../services/tauri";
import { translations, type Locale, type Translation } from "./translations";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translation;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({
  children,
  initialLocale = "pt-BR",
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [ready, setReady] = useState(false);

  // Resolve a fallback when no stored preference exists yet — fall back to the
  // system language if it is one of the supported locales, otherwise use pt-BR.
  const systemFallback: Locale =
    typeof navigator !== "undefined" &&
    (navigator.language.startsWith("pt") || navigator.language === "en-US")
      ? (navigator.language === "en-US" ? "en-US" : "pt-BR")
      : "pt-BR";

  useEffect(() => {
    let cancelled = false;

    // Try to read the persisted locale from Tauri backend.
    getSettings()
      .then((settings) => {
        if (cancelled) return;
        const stored = settings.locale as Locale | null;
        const resolved = (stored && stored in translations ? stored : systemFallback) as Locale;
        setLocaleState(resolved);
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setLocaleState(systemFallback);
        setReady(true);
      });

    return () => { cancelled = true; };
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    updateSettings({ locale: newLocale }).catch(() => {
      // Silently ignore write errors — the UI already reflected the change.
    });
  };

  // Do not render content until the locale is known, avoiding a flash of wrong-language text.
  if (!ready) return null;

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

export function useLocale(): Locale {
  return useI18n().locale;
}

export function useTranslation(): Translation {
  return useI18n().t;
}

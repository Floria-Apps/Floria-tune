import { useEffect, useRef, useState } from "react";

import {
  getSettings,
  testConnection,
  updateSettings,
  clearCoverCacheBackend,
  type AuthMethod,
  type UrlMode,
} from "../services/tauri";
import { invoke } from "@tauri-apps/api/core";
import { clearCoverCache } from "../lib/cover-cache";
import { ErrorPanel, LoadingPanel } from "../components/Feedback";
import { Button } from "../components/m3e/button";
import { Card } from "../components/m3e/card";
import { Icon } from "../components/m3e/icon";
import { TextField } from "../components/m3e/text-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/m3e/select";
import { SegmentedButton, SegmentedButtonGroup } from "../components/m3e/segmented-button";
import { Tabs, TabsList, TabsTrigger } from "../components/m3e/tabs";
import { useColorMode } from "../components/m3e/color-mode-provider";
import { useM3Theme } from "../components/m3e/m3-theme-provider";
import { useLyricsSettings } from "../lib/lyrics-settings";
import type { M3Theme } from "../components/m3e/m3-theme-provider";
import { useResource } from "../hooks/useResource";
import { useTranslation, useLocale, useI18n } from "../lib/i18n";

type ColorMode = "light" | "dark" | "system";

function originOf(url: string): string {
  try {
    return new URL(url).host || url;
  } catch {
    return url;
  }
}

export type SettingsSection = "preferences" | "lyrics" | "connection" | "about" | "all";

function SettingsPageInner({
  t,
  locale,
  setLocale,
  section = "all",
}: {
  t: ReturnType<typeof useTranslation>;
  locale: ReturnType<typeof useLocale>;
  setLocale: ReturnType<typeof useI18n>["setLocale"];
  section?: SettingsSection;
}) {
  const { mode, setMode } = useColorMode();
  const { theme, updateTheme } = useM3Theme();
  const lyricsCtrl = useLyricsSettings();
  const settings = useResource("settings", () => getSettings());
  const [cacheStats, setCacheStats] = useState<{ entries: number; max_entries: number } | null>(null);

  const safeSettings = settings.data ?? {};
  const [localUrl, setLocalUrl] = useState("");
  const [urlMode, setUrlMode] = useState<UrlMode>("auto");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("password");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [apiKey, setApiKey] = useState("");

  const [seed, setSeed] = useState("#E91E63");

  const [savingConnection, setSavingConnection] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferencesMessage, setPreferencesMessage] = useState<string | null>(null);
  const [clearingCache, setClearingCache] = useState(false);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);

  // ListenBrainz state
  const [lbToken, setLbToken] = useState("");
  const [lbEnabled, setLbEnabled] = useState(false);
  const [lbTesting, setLbTesting] = useState(false);
  const [lbMessage, setLbMessage] = useState<string | null>(null);
  const [lbError, setLbError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadCacheStats() {
      try {
        const result = await invoke("get_cover_cache_stats") as {
          entries: number;
          max_entries: number;
        };
        if (mounted) {
          setCacheStats(result);
        }
      } catch (err) {
        console.error("Failed to load cache stats:", err);
      }
    }
    loadCacheStats();
    return () => {
      mounted = false;
    };
  }, []);

  const [externalUrl, setExternalUrl] = useState("");

  const connectionPayload = () => ({
    navidrome_local_url: localUrl.trim(),
    navidrome_external_url: externalUrl.trim(),
    navidrome_url_mode: urlMode,
    navidrome_auth_method: authMethod,
    navidrome_username: username.trim(),
    navidrome_password: password || undefined,
    navidrome_api_key: apiKey || undefined,
  });

  const handleTest = async () => {
    setTesting(true);
    setConnectionError(null);
    setConnectionMessage(null);

    try {
      const result = await testConnection(connectionPayload());
      setConnectionMessage(t.connection.connectionValidated.replace("{url}", originOf(result.url)));
    } catch (caught) {
      setConnectionError(
        caught instanceof Error ? caught.message : t.connection.connectionError,
      );
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConnection = async () => {
    setSavingConnection(true);
    setConnectionError(null);
    setConnectionMessage(null);

    try {
      const result = await updateSettings(connectionPayload());
      setConnectionMessage(
        result.status === "connected"
          ? t.connection.connectionValidatedAndSaved
          : t.connection.connectionSaved,
      );
      setPassword("");
      setApiKey("");
      settings.reload();
    } catch (caught) {
      setConnectionError(
        caught instanceof Error ? caught.message : t.connection.saveError,
      );
    } finally {
      setSavingConnection(false);
    }
  };

  const handleSavePreferences = async () => {
    setSavingPreferences(true);
    setPreferencesError(null);
    setPreferencesMessage(null);

    try {
      await updateSettings({
        theme_seed: seed,
        color_mode: mode,
        listenbrainz_token: lbToken || undefined,
        listenbrainz_enabled: lbEnabled,
      });
      setPreferencesMessage(t.settings.preferencesSaved);
      setLbToken("");
      settings.reload();
    } catch (caught) {
      setPreferencesError(
        caught instanceof Error ? caught.message : t.settings.preferencesSaveError,
      );
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleTestListenBrainz = async () => {
    if (!lbToken && !safeSettings.has_listenbrainz_token) {
      setLbError("Token é necessário para testar.");
      return;
    }
    setLbTesting(true);
    setLbError(null);
    setLbMessage(null);
    try {
      // If lbToken is empty, backend will use stored token
      const username = await invoke("listenbrainz_test_token", {
        token: lbToken || undefined,
      }) as string;
      setLbMessage(`Token válido! Conectado como ${username}.`);
    } catch (caught) {
      setLbError(caught instanceof Error ? caught.message : "Erro ao validar token.");
    } finally {
      setLbTesting(false);
    }
  };

  const URL_MODES: { value: UrlMode; label: string; icon: string }[] = [
    { value: "auto", label: t.settings.urlModeOptions.auto, icon: "refresh" },
    { value: "local", label: t.settings.urlModeOptions.local, icon: "devices" },
    { value: "external", label: t.settings.urlModeOptions.external, icon: "link" },
  ];

  const URL_MODE_HINT: Record<UrlMode, string> = {
    auto: t.settings.urlModeHints.auto,
    local: t.settings.urlModeHints.local,
    external: t.settings.urlModeHints.external,
  };

  // Helper: Card de configuração padrão
  const SettingCard = ({
    title,
    description,
    children,
    variant = "filled",
  }: {
    title: string;
    description?: string;
    children: React.ReactNode;
    variant?: "filled" | "outlined";
  }) => (
    <Card variant={variant} size="lg" className="max-w-3xl mx-auto">
      <h3 className="text-title-large-emphasized">{title}</h3>
      {description && (
        <p className="mt-1 text-body-medium text-on-surface-variant">
          {description}
        </p>
      )}
      {children}
    </Card>
  );

  // Helper: Cor de destaque com botões
  const ColorPalette = ({
    colors,
    onSelect,
    selected,
    description,
  }: {
    colors: string[];
    onSelect: (color: string) => void;
    selected: string;
    description: string;
  }) => (
    <div className="mt-4 flex flex-wrap gap-2">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onSelect(color)}
          className={[
            "size-9 rounded-full border-2 transition-transform hover:scale-110 focus-ring",
            selected.toLowerCase() === color.toLowerCase()
              ? "border-on-surface"
              : "border-transparent",
          ].join(" ")}
          style={{ backgroundColor: color }}
          aria-label={`${t.settings.customColor} ${color}`}
        />
      ))}
    </div>
  );

  // Helper: Seletor de esquema de tonalidade
  const SchemeVariantSelector = ({
    value,
    onChange,
    options,
    description,
  }: {
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    description: string;
  }) => (
    <Card>
      <h3 className="text-title-large-emphasized">{description}</h3>
      <p className="mt-1 text-body-medium text-on-surface-variant">
        {t.settings.schemeVariantDescription}
      </p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="max-w-xs">
          <SelectValue placeholder={t.settings.schemeVariant} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {t.settings[opt.label]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Card>
  );

  return (
    <div className="space-y-10">
      {/* Quick navigation */}
      <div className="sticky top-0 z-10 -mx-gutter px-gutter py-2">
        <nav className="mx-auto flex max-w-3xl items-center gap-1.5 overflow-x-auto rounded-full border border-outline-variant/40 bg-surface/85 px-2 py-1.5 shadow-elevation-2 backdrop-blur-md scroll-slim">
          <a
            href="#/settings"
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-label-medium transition-colors ${
              section === "preferences" || section === "all"
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            <Icon name="settings" size={16} />
            {t.settings.preferences}
          </a>
          <a
            href="#/settings/letras"
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-label-medium transition-colors ${
              section === "lyrics" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            <Icon name="lyrics" size={16} />
            {t.settings.lyrics}
          </a>
          <a
            href="#/settings/conexao"
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-label-medium transition-colors ${
              section === "connection" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            <Icon name="link" size={16} />
            {t.settings.connection}
          </a>
          <a
            href="#/settings/sobre"
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-label-medium transition-colors ${
              section === "about" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            <Icon name="info" size={16} />
            {t.settings.about}
          </a>
        </nav>
      </div>

      <section className={`space-y-6 ${section !== "all" && section !== "preferences" ? "hidden" : ""}`} id="preferencias">
        <header className="max-w-3xl mx-auto flex items-center gap-3">
          <span className="mt-1 grid size-10 shrink-0 place-items-center rounded-xl bg-primary-container text-on-primary-container">
            <Icon name="settings" size={20} />
          </span>
          <div className="min-w-0">
            <h2 className="text-headline-small">{t.settings.preferences}</h2>
            <p className="mt-1 text-body-medium text-on-surface-variant">
              {t.settings.appearanceDescription}
            </p>
          </div>
        </header>

        {/* Tema */}
        <SettingCard title="theme" description="themeDescription">
          <SegmentedButtonGroup
            value={mode}
            onChange={(v) => setMode(v as ColorMode)}
          >
            <SegmentedButton value="light" label={t.settings.themeOptions.light}>
              <Icon name="light_mode" />
            </SegmentedButton>
            <SegmentedButton value="dark" label={t.settings.themeOptions.dark}>
              <Icon name="dark_mode" />
            </SegmentedButton>
            <SegmentedButton value="system" label={t.settings.themeOptions.system}>
              <Icon name="devices" />
            </SegmentedButton>
          </SegmentedButtonGroup>
        </SettingCard>

        {/* Idioma */}
        <SettingCard title="language" description="">
          <Select
            value={locale}
            onValueChange={(v) => {
              const locale = v as "pt-BR" | "en-US";
              setLocale(locale);
            }}
          >
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder={t.language.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pt-BR">{t.language.ptBR}</SelectItem>
              <SelectItem value="en-US">{t.language.enUS}</SelectItem>
            </SelectContent>
          </Select>
        </SettingCard>

        {/* ListenBrainz Integration */}
        <SettingCard title="listenbrainz" description="">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="text-title-large-emphasized">ListenBrainz</h3>
              <p className="mt-1 text-body-medium text-on-surface-variant">
                Envia seu histórico de reprodução diretamente para o ListenBrainz.org.
              </p>
            </div>
            <div
              className={`flex h-8 w-12 shrink-0 cursor-pointer items-center rounded-full px-1 transition-colors ${
                lbEnabled ? "bg-primary" : "bg-outline"
              }`}
              onClick={() => setLbEnabled(!lbEnabled)}
            >
              <div
                className={`size-6 rounded-full bg-white transition-transform ${
                  lbEnabled ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <TextField
              label="User Token"
              type="password"
              placeholder={
                safeSettings.has_listenbrainz_token
                  ? "••••••••••••••••"
                  : "Seu token do ListenBrainz"
              }
              value={lbToken}
              onChange={(e) => setLbToken(e.target.value)}
              supportingText={
                <a
                  href="https://listenbrainz.org/settings/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  Obtenha seu token aqui
                </a>
              }
            />

            <div className="flex items-center gap-3">
              <Button
                variant="outlined"
                onClick={handleTestListenBrainz}
                disabled={lbTesting}
              >
                Testar Token
              </Button>
            </div>

            {lbMessage && (
              <p className="text-body-small text-primary">{lbMessage}</p>
            )}
            {lbError && (
              <p className="text-body-small text-error">{lbError}</p>
            )}
          </div>
        </SettingCard>

        <SettingCard title="cacheCapas" description="">
          <h3 className="text-title-large-emphasized">Cache de capas</h3>
          <p className="mt-1 text-body-medium text-on-surface-variant">
            Limpa as capas salvas no disco e na memória. Elas serão baixadas novamente conforme necessário.
          </p>

          <div className="mt-4">
            <Button
              variant="tonal"
              size="sm"
              disabled={clearingCache}
              onClick={async () => {
                setClearingCache(true);
                try {
                  await clearCoverCacheBackend();
                  await clearCoverCache();
                  setPreferencesMessage("Cache de capas limpo com sucesso.");
                } catch {
                  setPreferencesMessage("Não foi possível limpar o cache de capas.");
                } finally {
                  setClearingCache(false);
                }
              }}
            >
              <Icon name="delete" data-icon="inline-start" />
              {clearingCache ? "Limpando…" : "Limpar cache"}
            </Button>
          </div>
        </SettingCard>

        <SettingCard title="accentColor" description="">
          <h3 className="text-title-large-emphasized">Cor de destaque</h3>
          <p className="mt-1 text-body-medium text-on-surface-variant">
            {t.settings.accentColorDescription}
          </p>

          <ColorPalette
            colors={["#E91E63", "#FF5722", "#9C27B0", "#2196F3", "#00BCD4", "#4CAF50", "#FFC107", "#795548"]}
            onSelect={setSeed}
            selected={seed}
            description="customColor"
          />
        </SettingCard>

        <SchemeVariantSelector
          value={theme.variant}
          onChange={(v) => updateTheme({ variant: v as M3Theme["variant"] })}
          options={[
            { value: "tonalSpot", label: "variantOptions.tonalSpot" },
            { value: "vibrant", label: "variantOptions.vibrant" },
            { value: "expressive", label: "variantOptions.expressive" },
            { value: "neutral", label: "variantOptions.neutral" },
            { value: "fidelity", label: "variantOptions.fidelity" },
            { value: "content", label: "variantOptions.content" },
            { value: "rainbow", label: "variantOptions.rainbow" },
            { value: "fruitSalad", label: "variantOptions.fruitSalad" },
            { value: "monochrome", label: "variantOptions.monochrome" },
          ]}
          description="schemeVariant"
        />

        <SettingCard title="contrast" description="">
          <h3 className="text-title-large-emphasized">Contraste</h3>
          <p className="mt-1 text-body-medium text-on-surface-variant">
            {t.settings.contrastDescription}
          </p>

          <Select
            value={theme.contrast}
            onValueChange={(v) => updateTheme({ contrast: v as M3Theme["contrast"] })}
          >
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder={t.settings.contrast} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">{t.settings.contrastOptions.standard}</SelectItem>
              <SelectItem value="medium">{t.settings.contrastOptions.medium}</SelectItem>
              <SelectItem value="high">{t.settings.contrastOptions.high}</SelectItem>
            </SelectContent>
          </Select>
        </SettingCard>

        <SettingCard title="motion" description="">
          <h3 className="text-title-large-emphasized">Animação</h3>
          <p className="mt-1 text-body-medium text-on-surface-variant">
            {t.settings.motionDescription}
          </p>

          <Select
            value={theme.motion}
            onValueChange={(v) => updateTheme({ motion: v as M3Theme["motion"] })}
          >
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder={t.settings.motion} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expressive">{t.settings.motionOptions.expressive}</SelectItem>
              <SelectItem value="standard">{t.settings.motionOptions.standard}</SelectItem>
            </SelectContent>
          </Select>
        </SettingCard>

        <SettingCard title="shapeScale" description="">
          <h3 className="text-title-large-emphasized">Formato dos cantos</h3>
          <p className="mt-1 text-body-medium text-on-surface-variant">
            {t.settings.shapeScaleDescription}
          </p>

          <Select
            value={String(theme.shapeScale)}
            onValueChange={(v) => updateTheme({ shapeScale: parseFloat(v ?? "1") })}
          >
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder={t.settings.shapeScale} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.35">{t.settings.shapeOptions.square}</SelectItem>
              <SelectItem value="1">{t.settings.shapeOptions.m3}</SelectItem>
              <SelectItem value="1.6">{t.settings.shapeOptions.rounded}</SelectItem>
            </SelectContent>
          </Select>
        </SettingCard>

        <SettingCard title="themePreview" description="">
          <h3 className="text-title-large-emphasized">Prévia do tema</h3>
          <p className="mt-1 text-body-medium text-on-surface-variant">
            {t.settings.themePreviewDescription}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: t.settings.primary, var: "bg-primary", text: "text-on-primary" },
              { label: t.settings.secondary, var: "bg-secondary", text: "text-on-secondary" },
              { label: t.settings.tertiary, var: "bg-tertiary", text: "text-on-tertiary" },
              { label: t.settings.error, var: "bg-error", text: "text-on-error" },
            ].map((color) => (
              <div
                key={color.label}
                className={`${color.var} ${color.text} flex items-center justify-center rounded-lg p-4 text-label-medium`}
              >
                {color.label}
              </div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: t.settings.primaryContainer, var: "bg-primary-container", text: "text-on-primary-container" },
              { label: t.settings.secondaryContainer, var: "bg-secondary-container", text: "text-on-secondary-container" },
              { label: t.settings.tertiaryContainer, var: "bg-tertiary-container", text: "text-on-tertiary-container" },
              { label: t.settings.surface, var: "bg-surface", text: "text-on-surface" },
            ].map((color) => (
              <div
                key={color.label}
                className={`${color.var} ${color.text} flex items-center justify-center rounded-lg p-4 text-label-medium`}
              >
                {color.label}
              </div>
            ))}
          </div>
        </SettingCard>
      </section>

      <section className={`space-y-6 ${section !== "all" && section !== "lyrics" ? "hidden" : ""}`} id="letras">
        <header className="max-w-3xl mx-auto flex items-start gap-3">
          <span className="mt-1 grid size-10 shrink-0 place-items-center rounded-xl bg-secondary-container text-on-secondary-container">
            <Icon name="lyrics" size={20} />
          </span>
          <div className="min-w-0">
            <h2 className="text-headline-small">{t.settings.lyricsTypography}</h2>
            <p className="mt-1 text-body-medium text-on-surface-variant">
              {t.settings.lyricsTypographyDescription}
            </p>
          </div>
        </header>

        {/* Live preview */}
        <SettingCard title="lyricsPreview" description="">
          <h3 className="text-title-large-emphasized">{t.settings.lyricsPreview}</h3>
          <div
            className="mt-4 rounded-xl bg-surface-container p-6"
            style={{
              fontFamily: lyricsCtrl.settings.fontFamily,
              fontSize: `${lyricsCtrl.settings.fontSizeActive}rem`,
              lineHeight: lyricsCtrl.settings.lineHeight,
              letterSpacing: `${lyricsCtrl.settings.letterSpacing}em`,
              textAlign: lyricsCtrl.settings.alignment,
              fontWeight: lyricsCtrl.settings.fontWeightActive,
            }}
          >
            <p
              className="opacity-50 text-on-surface-variant"
              style={{
                fontSize: `${lyricsCtrl.settings.fontSizeInactive}rem`,
                fontWeight: lyricsCtrl.settings.fontWeightInactive,
                opacity: lyricsCtrl.settings.opacityInactive,
              }}
            >
              {t.settings.lyricsPreviewLines.previous}
            </p>
            <p className="mt-2 text-on-surface">
              {t.settings.lyricsPreviewLines.current}
            </p>
            <p
              className="mt-2 opacity-50 text-on-surface-variant"
              style={{
                fontSize: `${lyricsCtrl.settings.fontSizeInactive}rem`,
                fontWeight: lyricsCtrl.settings.fontWeightInactive,
                opacity: lyricsCtrl.settings.opacityInactive,
              }}
            >
              {t.settings.lyricsPreviewLines.next}
            </p>
          </div>
        </SettingCard>

        {/* Tipografia */}
        <SettingCard title="fontFamily" description="">
          <h3 className="text-title-large-emphasized">{t.settings.fontFamily}</h3>
          <Select
            value={lyricsCtrl.settings.fontFamily}
            onValueChange={(v) => lyricsCtrl.update({ fontFamily: v ?? "inherit" })}
          >
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder={t.settings.fontFamily} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inherit">{t.settings.fontFamilyDefault}</SelectItem>
              <SelectItem value="system-ui">{t.settings.fontFamilySystem}</SelectItem>
              <SelectItem value="serif">{t.settings.fontFamilySerif}</SelectItem>
              <SelectItem value="monospace">{t.settings.fontFamilyMonospace}</SelectItem>
            </SelectContent>
          </Select>
        </SettingCard>

        {/* Tamanho da fonte */}
        <SettingCard title="fontSize" description="">
          <h3 className="text-title-large-emphasized">{t.settings.fontSize}</h3>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-body-medium text-on-surface">{t.settings.currentLine}: {lyricsCtrl.settings.fontSizeActive}rem</label>
              <input
                type="range"
                min="0.75"
                max="2.5"
                step="0.05"
                value={lyricsCtrl.settings.fontSizeActive}
                onChange={(e) => lyricsCtrl.update({ fontSizeActive: parseFloat(e.target.value) })}
                className="mt-2 w-full accent-primary"
              />
            </div>
            <div>
              <label className="text-body-medium text-on-surface">{t.settings.inactiveLines}: {lyricsCtrl.settings.fontSizeInactive}rem</label>
              <input
                type="range"
                min="0.75"
                max="2.0"
                step="0.05"
                value={lyricsCtrl.settings.fontSizeInactive}
                onChange={(e) => lyricsCtrl.update({ fontSizeInactive: parseFloat(e.target.value) })}
                className="mt-2 w-full accent-primary"
              />
            </div>
            <div>
              <label className="text-body-medium text-on-surface">{t.settings.unsyncedLyrics}: {lyricsCtrl.settings.fontSizeUnsynced}rem</label>
              <input
                type="range"
                min="0.75"
                max="2.0"
                step="0.05"
                value={lyricsCtrl.settings.fontSizeUnsynced}
                onChange={(e) => lyricsCtrl.update({ fontSizeUnsynced: parseFloat(e.target.value) })}
                className="mt-2 w-full accent-primary"
              />
            </div>
          </div>
        </SettingCard>

        {/* Peso da fonte */}
        <SettingCard title="fontWeight" description="">
          <h3 className="text-title-large-emphasized">{t.settings.fontWeight}</h3>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="text-body-medium text-on-surface">{t.settings.currentLineWeight}</label>
              <div className="mt-2">
                <Select
                  value={lyricsCtrl.settings.fontWeightActive ?? undefined}
                  onValueChange={(v) => lyricsCtrl.update({ fontWeightActive: v ?? "400" })}
                >
                  <SelectTrigger className="max-w-xs">
                    <SelectValue placeholder={t.settings.fontWeight} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="400">{t.settings.regular}</SelectItem>
                    <SelectItem value="500">{t.settings.medium}</SelectItem>
                    <SelectItem value="600">{t.settings.semibold}</SelectItem>
                    <SelectItem value="700">{t.settings.bold}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-body-medium text-on-surface">{t.settings.inactiveLinesWeight}</label>
              <div className="mt-2">
                <Select
                  value={lyricsCtrl.settings.fontWeightInactive ?? undefined}
                  onValueChange={(v) => lyricsCtrl.update({ fontWeightInactive: v ?? "400" })}
                >
                  <SelectTrigger className="max-w-xs">
                    <SelectValue placeholder={t.settings.fontWeight} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="400">{t.settings.regular}</SelectItem>
                    <SelectItem value="500">{t.settings.medium}</SelectItem>
                    <SelectItem value="600">{t.settings.semibold}</SelectItem>
                    <SelectItem value="700">{t.settings.bold}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </SettingCard>

        {/* Espaçamento */}
        <SettingCard title="spacing" description="">
          <h3 className="text-title-large-emphasized">{t.settings.spacing}</h3>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-body-medium text-on-surface">{t.settings.lineHeight}: {lyricsCtrl.settings.lineHeight}</label>
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.1"
                value={lyricsCtrl.settings.lineHeight}
                onChange={(e) => lyricsCtrl.update({ lineHeight: parseFloat(e.target.value) })}
                className="mt-2 w-full accent-primary"
              />
            </div>
            <div>
              <label className="text-body-medium text-on-surface">{t.settings.letterSpacing}: {lyricsCtrl.settings.letterSpacing}em</label>
              <input
                type="range"
                min="-0.05"
                max="0.2"
                step="0.01"
                value={lyricsCtrl.settings.letterSpacing}
                onChange={(e) => lyricsCtrl.update({ letterSpacing: parseFloat(e.target.value) })}
                className="mt-2 w-full accent-primary"
              />
            </div>
            <div>
              <label className="text-body-medium text-on-surface">{t.settings.marginX}: {lyricsCtrl.settings.marginX}px</label>
              <input
                type="range"
                min="0"
                max="40"
                step="2"
                value={lyricsCtrl.settings.marginX}
                onChange={(e) => lyricsCtrl.update({ marginX: parseInt(e.target.value, 10) })}
                className="mt-2 w-full accent-primary"
              />
            </div>
          </div>
        </SettingCard>

        {/* Cores e opacidade */}
        <SettingCard title="colorsOpacity" description="">
          <h3 className="text-title-large-emphasized">{t.settings.colorsOpacity}</h3>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-body-medium text-on-surface">{t.settings.inactiveOpacity}: {Math.round(lyricsCtrl.settings.opacityInactive * 100)}%</label>
              <input
                type="range"
                min="0.2"
                max="0.9"
                step="0.05"
                value={lyricsCtrl.settings.opacityInactive}
                onChange={(e) => lyricsCtrl.update({ opacityInactive: parseFloat(e.target.value) })}
                className="mt-2 w-full accent-primary"
              />
            </div>
          </div>
        </SettingCard>

        {/* Alinhamento */}
        <SettingCard title="alignment" description="">
          <h3 className="text-title-large-emphasized">{t.settings.alignment}</h3>
          <Select
            value={lyricsCtrl.settings.alignment}
            onValueChange={(v) => lyricsCtrl.update({ alignment: v as "left" | "center" | "right" })}
          >
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder={t.settings.alignment} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">{t.settings.left}</SelectItem>
              <SelectItem value="center">{t.settings.center}</SelectItem>
              <SelectItem value="right">{t.settings.right}</SelectItem>
            </SelectContent>
          </Select>
        </SettingCard>

        {/* Velocidade da animação */}
        <SettingCard title="animation" description="">
          <h3 className="text-title-large-emphasized">{t.settings.animation}</h3>
          <div className="mt-4">
            <label className="text-body-medium text-on-surface">{t.settings.animationSpeed}: {lyricsCtrl.settings.animationSpeed}ms</label>
            <input
              type="range"
              min="100"
              max="800"
              step="50"
              value={lyricsCtrl.settings.animationSpeed}
              onChange={(e) => lyricsCtrl.update({ animationSpeed: parseInt(e.target.value, 10) })}
              className="mt-2 w-full accent-primary"
            />
          </div>
        </SettingCard>

        {/* Resetar padrões */}
        <div className="flex max-w-3xl flex-wrap items-center gap-3">
          <Button variant="tonal" size="md" onClick={lyricsCtrl.reset}>
            {t.settings.resetDefaults}
          </Button>
        </div>
      </section>

      <section className={`space-y-6 ${section !== "all" && section !== "connection" ? "hidden" : ""}`} id="conexao">
        <header className="max-w-3xl mx-auto flex items-start gap-3">
          <span className="mt-1 grid size-10 shrink-0 place-items-center rounded-xl bg-tertiary-container text-on-tertiary-container">
            <Icon name="link" size={20} />
          </span>
          <div className="min-w-0">
            <h2 className="text-headline-small">{t.settings.connection}</h2>
            <p className="mt-1 text-body-medium text-on-surface-variant">
              {t.connection.registerBothUrls}
            </p>
          </div>
        </header>

        <SettingCard title="authentication" description="">
          <h3 className="text-title-large-emphasized">{t.connection.authentication}</h3>
          <p className="mt-1 text-body-medium text-on-surface-variant">
            {t.connection.useCredentials}
          </p>

          <Tabs value={authMethod} onValueChange={(v) => setAuthMethod(v as AuthMethod)}>
            <TabsList>
              <TabsTrigger value="password">
                <Icon name="person" data-icon="inline-start" />
                {t.settings.authTabs.password}
              </TabsTrigger>
              <TabsTrigger value="api_key">
                <Icon name="lock" data-icon="inline-start" />
                {t.settings.authTabs.apiKey}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="mt-5 space-y-4">
            {authMethod === "password" ? (
              <>
                <TextField
                  variant="outlined"
                  label={t.connection.username}
                  leadingIcon={<Icon name="person" />}
                  value={username}
                  autoComplete="username"
                  onChange={(event) => setUsername(event.target.value)}
                />

                <TextField
                  variant="outlined"
                  label={t.connection.password}
                  leadingIcon={<Icon name="lock" />}
                  type="password"
                  value={password}
                  autoComplete="current-password"
                  placeholder={safeSettings.has_password ? "••••••••" : ""}
                  supportingText={
                    safeSettings.has_password
                      ? t.connection.passwordPlaceholder
                      : undefined
                  }
                  onChange={(event) => setPassword(event.target.value)}
                />
              </>
            ) : (
              <TextField
                variant="outlined"
                label={t.connection.apiKey}
                leadingIcon={<Icon name="lock" />}
                type="password"
                value={apiKey}
                autoComplete="off"
                placeholder={safeSettings.has_api_key ? "••••••••" : ""}
                supportingText={
                  safeSettings.has_api_key
                    ? t.connection.apiKeyPlaceholder
                    : t.connection.apiKeyHint
                }
                onChange={(event) => setApiKey(event.target.value)}
              />
            )}
          </div>

          <hr className="my-6 border-outline-variant/60" />

          <h3 className="text-title-large-emphasized">{t.connection.addresses}</h3>
          <p className="mt-1 text-body-medium text-on-surface-variant">
            {t.connection.registerBothUrls}
          </p>

          <div className="mt-4 space-y-4">
            <TextField
              variant="outlined"
              label={t.connection.localUrl}
              leadingIcon={<Icon name="devices" />}
              type="url"
              value={localUrl}
              autoComplete="off"
              placeholder={t.connection.localPlaceholder}
              supportingText={t.connection.localSupportingText}
              onChange={(event) => setLocalUrl(event.target.value)}
            />

            <TextField
              variant="outlined"
              label={t.connection.externalUrl}
              leadingIcon={<Icon name="link" />}
              type="url"
              value={externalUrl}
              autoComplete="off"
              placeholder={t.connection.externalPlaceholder}
              supportingText={t.connection.externalSupportingText}
              onChange={(event) => setExternalUrl(event.target.value)}
            />
          </div>

          <fieldset className="mt-6">
            <legend className="text-title-small-emphasized">
              {t.connection.networkPreference}
            </legend>
            <p className="mt-1 text-body-small text-on-surface-variant">
              {URL_MODE_HINT[urlMode]}
            </p>

            <div className="mt-3">
              <SegmentedButtonGroup
                value={urlMode}
                onChange={(v) => setUrlMode(v as UrlMode)}
              >
                {URL_MODES.map((option) => (
                  <SegmentedButton key={option.value} value={option.value} label={option.label}>
                    <Icon name={option.icon} />
                  </SegmentedButton>
                ))}
              </SegmentedButtonGroup>
            </div>
          </fieldset>
        </SettingCard>
      </section>

      <section className={`space-y-6 ${section !== "all" && section !== "about" ? "hidden" : ""}`} id="sobre">
        <Card variant="outlined" size="lg" className="max-w-3xl mx-auto">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-container-high text-on-surface">
              <Icon name="info" size={20} />
            </span>
            <div className="min-w-0">
              <h2 className="text-title-large-emphasized">{t.settings.aboutTitle}</h2>
              <p className="mt-1 text-body-medium text-on-surface-variant">
                {t.settings.aboutDescription}
              </p>
              <p className="mt-3 text-body-small text-on-surface-variant">
                {t.settings.configLocation}{" "}
                <code className="rounded bg-surface-container-high px-1.5 py-0.5 font-mono text-label-small">
                  ~/.config/floria-tune/settings.json
                </code>
              </p>
              {cacheStats ? (
                <p className="mt-2 text-body-small text-on-surface-variant">
                  Cache: {cacheStats.entries} de {cacheStats.max_entries} imagens
                </p>
              ) : null}
              <p className="mt-2 text-body-small text-on-surface-variant">
                Versão 0.1 · Floria Tune
              </p>
              <Button
                variant="tonal"
                size="md"
                onClick={() => window.location.reload()}
              >
                Recarregar
              </Button>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}

export function SettingsPage({ section }: { section?: SettingsSection } = {}) {
  const t = useTranslation();
  const locale = useLocale();
  const { setLocale } = useI18n();
  return <SettingsPageInner t={t} locale={locale} setLocale={setLocale} section={section} />;
}
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getSettings, updateSettings, type SettingsResponse } from "../services/tauri";

export interface LyricsTypographySettings {
  fontFamily: string;
  fontSizeActive: number;
  fontSizeInactive: number;
  fontSizeUnsynced: number;
  fontWeightActive: string;
  fontWeightInactive: string;
  lineHeight: number;
  letterSpacing: number;
  alignment: "left" | "center" | "right";
  colorActive: string;
  colorInactive: string;
  colorPassed: string;
  opacityInactive: number;
  marginX: number;
  scrollPosition: number;
  animationSpeed: number;
}

export const DEFAULT_LYRICS_SETTINGS: LyricsTypographySettings = {
  fontFamily: "inherit",
  fontSizeActive: 1.125,
  fontSizeInactive: 1.0,
  fontSizeUnsynced: 1.0,
  fontWeightActive: "600",
  fontWeightInactive: "400",
  lineHeight: 1.9,
  letterSpacing: 0,
  alignment: "center",
  colorActive: "on-surface",
  colorInactive: "on-surface-variant",
  colorPassed: "on-surface-variant",
  opacityInactive: 0.55,
  marginX: 0,
  scrollPosition: 0.5,
  animationSpeed: 300,
};

function settingsToLyrics(s: SettingsResponse): LyricsTypographySettings {
  return {
    fontFamily: s.lyrics_font_family ?? "inherit",
    fontSizeActive: s.lyrics_font_size_active ?? DEFAULT_LYRICS_SETTINGS.fontSizeActive,
    fontSizeInactive: s.lyrics_font_size_inactive ?? DEFAULT_LYRICS_SETTINGS.fontSizeInactive,
    fontSizeUnsynced: s.lyrics_font_size_unsynced ?? DEFAULT_LYRICS_SETTINGS.fontSizeUnsynced,
    fontWeightActive: s.lyrics_font_weight_active ?? DEFAULT_LYRICS_SETTINGS.fontWeightActive,
    fontWeightInactive: s.lyrics_font_weight_inactive ?? DEFAULT_LYRICS_SETTINGS.fontWeightInactive,
    lineHeight: s.lyrics_line_height ?? DEFAULT_LYRICS_SETTINGS.lineHeight,
    letterSpacing: s.lyrics_letter_spacing ?? DEFAULT_LYRICS_SETTINGS.letterSpacing,
    alignment: (s.lyrics_alignment as "left" | "center" | "right") ?? DEFAULT_LYRICS_SETTINGS.alignment,
    colorActive: s.lyrics_color_active ?? DEFAULT_LYRICS_SETTINGS.colorActive,
    colorInactive: s.lyrics_color_inactive ?? DEFAULT_LYRICS_SETTINGS.colorInactive,
    colorPassed: s.lyrics_color_passed ?? DEFAULT_LYRICS_SETTINGS.colorPassed,
    opacityInactive: s.lyrics_opacity_inactive ?? DEFAULT_LYRICS_SETTINGS.opacityInactive,
    marginX: s.lyrics_margin_x ?? DEFAULT_LYRICS_SETTINGS.marginX,
    scrollPosition: s.lyrics_scroll_position ?? DEFAULT_LYRICS_SETTINGS.scrollPosition,
    animationSpeed: s.lyrics_animation_speed ?? DEFAULT_LYRICS_SETTINGS.animationSpeed,
  };
}

interface LyricsSettingsContextValue {
  settings: LyricsTypographySettings;
  update: (patch: Partial<LyricsTypographySettings>) => void;
  reset: () => void;
}

const LyricsSettingsContext = createContext<LyricsSettingsContextValue | null>(null);

export function LyricsSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<LyricsTypographySettings>(DEFAULT_LYRICS_SETTINGS);

  useEffect(() => {
    getSettings()
      .then((s) => setSettings(settingsToLyrics(s)))
      .catch(() => {});
  }, []);

  const update = (patch: Partial<LyricsTypographySettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    const payload: Record<string, unknown> = {};
    if (patch.fontFamily !== undefined) payload.lyrics_font_family = patch.fontFamily;
    if (patch.fontSizeActive !== undefined) payload.lyrics_font_size_active = patch.fontSizeActive;
    if (patch.fontSizeInactive !== undefined) payload.lyrics_font_size_inactive = patch.fontSizeInactive;
    if (patch.fontSizeUnsynced !== undefined) payload.lyrics_font_size_unsynced = patch.fontSizeUnsynced;
    if (patch.fontWeightActive !== undefined) payload.lyrics_font_weight_active = patch.fontWeightActive;
    if (patch.fontWeightInactive !== undefined) payload.lyrics_font_weight_inactive = patch.fontWeightInactive;
    if (patch.lineHeight !== undefined) payload.lyrics_line_height = patch.lineHeight;
    if (patch.letterSpacing !== undefined) payload.lyrics_letter_spacing = patch.letterSpacing;
    if (patch.alignment !== undefined) payload.lyrics_alignment = patch.alignment;
    if (patch.colorActive !== undefined) payload.lyrics_color_active = patch.colorActive;
    if (patch.colorInactive !== undefined) payload.lyrics_color_inactive = patch.colorInactive;
    if (patch.colorPassed !== undefined) payload.lyrics_color_passed = patch.colorPassed;
    if (patch.opacityInactive !== undefined) payload.lyrics_opacity_inactive = patch.opacityInactive;
    if (patch.marginX !== undefined) payload.lyrics_margin_x = patch.marginX;
    if (patch.scrollPosition !== undefined) payload.lyrics_scroll_position = patch.scrollPosition;
    if (patch.animationSpeed !== undefined) payload.lyrics_animation_speed = patch.animationSpeed;
    updateSettings(payload as any).catch(() => {});
  };

  const reset = () => {
    setSettings(DEFAULT_LYRICS_SETTINGS);
    updateSettings({
      lyrics_font_family: "",
      lyrics_font_size_active: DEFAULT_LYRICS_SETTINGS.fontSizeActive,
      lyrics_font_size_inactive: DEFAULT_LYRICS_SETTINGS.fontSizeInactive,
      lyrics_font_size_unsynced: DEFAULT_LYRICS_SETTINGS.fontSizeUnsynced,
      lyrics_font_weight_active: DEFAULT_LYRICS_SETTINGS.fontWeightActive,
      lyrics_font_weight_inactive: DEFAULT_LYRICS_SETTINGS.fontWeightInactive,
      lyrics_line_height: DEFAULT_LYRICS_SETTINGS.lineHeight,
      lyrics_letter_spacing: DEFAULT_LYRICS_SETTINGS.letterSpacing,
      lyrics_alignment: DEFAULT_LYRICS_SETTINGS.alignment,
      lyrics_color_active: DEFAULT_LYRICS_SETTINGS.colorActive,
      lyrics_color_inactive: DEFAULT_LYRICS_SETTINGS.colorInactive,
      lyrics_color_passed: DEFAULT_LYRICS_SETTINGS.colorPassed,
      lyrics_opacity_inactive: DEFAULT_LYRICS_SETTINGS.opacityInactive,
      lyrics_margin_x: DEFAULT_LYRICS_SETTINGS.marginX,
      lyrics_scroll_position: DEFAULT_LYRICS_SETTINGS.scrollPosition,
      lyrics_animation_speed: DEFAULT_LYRICS_SETTINGS.animationSpeed,
    }).catch(() => {});
  };

  const Provider = LyricsSettingsContext.Provider;
  return (
    <Provider value={{ settings, update, reset }}>
      {children}
    </Provider>
  );
}

export function useLyricsSettings() {
  const ctx = useContext(LyricsSettingsContext);
  if (!ctx) {
    throw new Error("useLyricsSettings must be used within LyricsSettingsProvider");
  }
  return ctx;
}
import ptBR from "./pt-BR";
import enUS from "./en-US";

export type Translation = typeof ptBR;

export const translations = {
  "pt-BR": ptBR,
  "en-US": enUS,
} as const;

export type Locale = keyof typeof translations;
const numberFormat = new Intl.NumberFormat("pt-BR");

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

/** Track length: `4:07`, or `1:04:07` for long tracks. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) {
    return "—";
  }

  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

/** Album/library length: `58 min`, `1 h 12 min`. */
export function formatLongDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) {
    return "—";
  }

  const totalMinutes = Math.max(0, Math.round(seconds / 60));

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

export function pluralize(
  count: number,
  singular: string,
  plural: string,
): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}

/** Two-character monogram that works with punctuation-heavy artist names. */
export function initials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "♪";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toLocaleUpperCase("pt-BR");
  }

  return `${words[0][0]}${words[words.length - 1][0]}`.toLocaleUpperCase(
    "pt-BR",
  );
}

/** Stable 32-bit hash used to derive deterministic cover palettes. */
export function hashSeed(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

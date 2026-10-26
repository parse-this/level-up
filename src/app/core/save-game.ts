import { APP_KEY_PREFIX } from './storage.service';

/** A save file: every app storage key and its value. */
export interface SaveFile {
  app: 'level-up';
  version: 1;
  /** ISO time the save was made. */
  savedAt: string;
  /** Storage key → parsed value. */
  data: Record<string, unknown>;
}

/** Friendly names for known keys (used in the save summary). */
const KEY_LABELS: Record<string, [one: string, many: string]> = {
  [`${APP_KEY_PREFIX}training.entries`]: ['training entry', 'training entries'],
  [`${APP_KEY_PREFIX}quests.items`]: ['quest', 'quests'],
  [`${APP_KEY_PREFIX}quests.tags`]: ['tag', 'tags'],
};

export function makeSaveFile(data: Record<string, unknown>, now = new Date()): SaveFile {
  return { app: 'level-up', version: 1, savedAt: now.toISOString(), data };
}

/** `level-up-save-YYYY-MM-DD.json` (local date). */
export function saveFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `level-up-save-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

/** Parses and checks a save file's text. Throws a friendly Error if it isn't one. */
export function parseSaveFile(text: string): SaveFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file isn't a Level Up save (it's not valid JSON).");
  }
  const save = parsed as Partial<SaveFile>;
  if (
    !save ||
    save.app !== 'level-up' ||
    save.version !== 1 ||
    typeof save.savedAt !== 'string' ||
    !save.data ||
    typeof save.data !== 'object' ||
    Object.keys(save.data).some((k) => !k.startsWith(APP_KEY_PREFIX))
  ) {
    throw new Error("That file isn't a Level Up save.");
  }
  return save as SaveFile;
}

/** e.g. ["42 training entries", "18 quests", "5 tags"]. */
export function describeSave(save: SaveFile): string[] {
  return Object.entries(save.data).flatMap(([key, value]) => {
    if (!Array.isArray(value)) return [];
    const [one, many] = KEY_LABELS[key] ?? [key.slice(APP_KEY_PREFIX.length), key.slice(APP_KEY_PREFIX.length)];
    return [`${value.length} ${value.length === 1 ? one : many}`];
  });
}

const hasId = (x: unknown): x is { id: unknown } => !!x && typeof x === 'object' && 'id' in x;

/**
 * Merge: everything already here stays as is; anything only in the save is added.
 * Lists of items with `id`s are combined by id; other values are only filled in when missing here.
 */
export function mergeData(
  current: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...current };
  for (const [key, value] of Object.entries(incoming)) {
    const mine = current[key];
    if (mine === undefined) {
      result[key] = value;
    } else if (Array.isArray(mine) && Array.isArray(value)) {
      const ids = new Set(mine.filter(hasId).map((x) => x.id));
      result[key] = [...mine, ...value.filter((x) => hasId(x) && !ids.has(x.id))];
    }
  }
  return result;
}

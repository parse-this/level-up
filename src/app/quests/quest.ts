export const HORIZONS = ['inbox', 'now', 'soon', 'someday'] as const;
/** Where a quest sits: Inbox (unsorted) → Today (id `now`) / Soon / Someday. */
export type Horizon = (typeof HORIZONS)[number];
export const HORIZON_LABELS: Record<Horizon, string> = {
  inbox: 'Inbox',
  now: 'Today',
  soon: 'Soon',
  someday: 'Someday',
};

/** Sorted horizons (no Inbox): what the "When" toggles offer — Today · Soon · Someday. */
export type SortedHorizon = Exclude<Horizon, 'inbox'>;
export const SORTED_HORIZONS = HORIZONS.filter((h): h is SortedHorizon => h !== 'inbox');

export const IMPORTANCES =['normal', 'important', 'urgent'] as const;
export type Importance = (typeof IMPORTANCES)[number];
export const IMPORTANCE_LABELS: Record<Importance, string> = {
  normal: 'Normal',
  important: 'Important',
  urgent: 'Urgent',
};
/** Material Symbols icon per importance ('' = none). */
export const IMPORTANCE_ICONS: Record<Importance, string> = {
  normal: '',
  important: 'star',
  urgent: 'local_fire_department',
};

export interface Quest {
  id: string;
  /** Plain one-line title. */
  title: string;
  horizon: Horizon;
  importance: Importance;
  tagIds: string[];
  /** Rich notes as HTML (from the notes editor). Omitted when empty. */
  notes?: string;
  /** ISO time captured. */
  createdAt: string;
  /** ISO time closed; absent while open. Closing keeps everything else. */
  closedAt?: string;
}

export interface Tag {
  id: string;
  name: string;
}

/** Next importance when cycling: Normal → Important → Urgent → Normal. */
export function nextImportance(i: Importance): Importance {
  return IMPORTANCES[(IMPORTANCES.indexOf(i) + 1) % IMPORTANCES.length];
}

const IMPORTANCE_RANK: Record<Importance, number> = { urgent: 0, important: 1, normal: 2 };

/** Urgent first, then Important, then Normal; newest first within each. */
export function byImportanceThenNewest(a: Quest, b: Quest): number {
  return (
    IMPORTANCE_RANK[a.importance] - IMPORTANCE_RANK[b.importance] ||
    b.createdAt.localeCompare(a.createdAt)
  );
}

/** Notes HTML with no real text (e.g. "<p></p>") counts as empty. */
export function isBlankHtml(html: string | undefined): boolean {
  if (!html) return true;
  return !/<(img|li|a)\b/i.test(html) && html.replace(/<[^>]*>/g, '').trim() === '';
}

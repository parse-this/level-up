/** Highest rep button shown. TODO: make configurable on a Settings page. */
export const MAX_REPS = 15;

/** Rest length buttons, in minutes. */
export const REST_MINUTES = [1, 2, 3, 4, 5, 10, 15, 20, 25, 30] as const;

/** Highest machine setting button (buttons run 0..this). */
export const MAX_MACHINE_SETTING = 10;

// ---- Workout pieces ----

export interface ExerciseSet {
  type: 'set';
  reps: number;
  /** Pounds. */
  weight?: number;
  failure: boolean;
  easy: boolean;
}

export interface Rest {
  type: 'rest';
  minutes: number;
}

/** An exercise is an ordered list of sets and rests. A trailing rest = rest before the next exercise. */
export type Step = ExerciseSet | Rest;

export interface Exercise {
  id: string;
  name: string;
  /** 0..MAX_MACHINE_SETTING; omitted when not on a machine. */
  machineSetting?: number;
  steps: Step[];
  notes?: string;
  /** ISO time it was first added (for activity / records). Missing on older data. */
  loggedAt?: string;
}

export type ExerciseInput = Omit<Exercise, 'id' | 'loggedAt'>;

/** A logged exercise plus the date of the workout it was in. */
export interface PreviousExercise {
  exercise: Exercise;
  /** `YYYY-MM-DD` */
  date: string;
}

// ---- Entries ----

export const ACTIVITIES = ['walk', 'run', 'bike'] as const;
export type Activity = (typeof ACTIVITIES)[number];
export const ACTIVITY_LABELS: Record<Activity, string> = { walk: 'Walk', run: 'Run', bike: 'Bike' };

interface EntryBase {
  id: string;
  /** Local date, `YYYY-MM-DD`. */
  date: string;
  /** ISO timestamp of when the entry was created. */
  createdAt: string;
  /** Free-text notes about the whole entry (trimmed; omitted when empty). */
  notes?: string;
}

export interface WorkoutEntry extends EntryBase {
  type: 'workout';
  name?: string;
  /** In the order performed. */
  exercises: Exercise[];
}

/** "Get Moving": a walk, run or bike ride. */
export interface MoveEntry extends EntryBase {
  type: 'move';
  activity: Activity;
  location?: string;
  durationMinutes?: number;
  /** Miles. */
  distance?: number;
}

export interface WeighInEntry extends EntryBase {
  type: 'weigh-in';
  /** Pounds. Missing until entered. */
  weight?: number;
}

export const SPORTS = ['golf'] as const;
export type Sport = (typeof SPORTS)[number];
export const SPORT_LABELS: Record<Sport, string> = { golf: 'Golf' };
export const SPORT_ICONS: Record<Sport, string> = { golf: 'golf_course' };

export const GOLF_FORMATS = ['practice', '9-holes', '18-holes'] as const;
export type GolfFormat = (typeof GOLF_FORMATS)[number];
export const GOLF_FORMAT_LABELS: Record<GolfFormat, string> = {
  practice: 'Practice',
  '9-holes': '9 holes',
  '18-holes': '18 holes',
};

/** A sport session. Golf for now; more sports can add their own fields. */
export interface SportEntry extends EntryBase {
  type: 'sport';
  sport: Sport;
  /** Golf: missing until picked. */
  format?: GolfFormat;
  /** Golf: strokes for a 9- or 18-hole round (not kept for practice). */
  score?: number;
}

export type Entry = WorkoutEntry | MoveEntry | WeighInEntry | SportEntry;

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type NewEntry = DistributiveOmit<Entry, 'id' | 'createdAt'>;

// ---- Helpers ----

/** Display label for each step: "Set 1", "Rest 1", "Set 2"... */
export function stepLabels(steps: readonly { type: Step['type'] }[]): string[] {
  let set = 0;
  let rest = 0;
  return steps.map((s) => (s.type === 'set' ? `Set ${++set}` : `Rest ${++rest}`));
}

export function countSets(steps: readonly Step[]): number {
  return steps.filter((s) => s.type === 'set').length;
}

export function totalRest(steps: readonly Step[]): number {
  return steps.reduce((sum, s) => sum + (s.type === 'rest' ? s.minutes : 0), 0);
}

/** "45 min", "1 h", "1 h 5 min". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** "3.1 mi" (up to 2 decimals). */
export function formatDistance(miles: number): string {
  return `${Number(miles.toFixed(2))} mi`;
}

/** "Workout", "Run", "Weigh-in"... */
export function entryLabel(entry: Entry): string {
  switch (entry.type) {
    case 'workout':
      return 'Workout';
    case 'move':
      return ACTIVITY_LABELS[entry.activity];
    case 'weigh-in':
      return 'Weigh-in';
    case 'sport':
      return SPORT_LABELS[entry.sport];
  }
}

/** Material Symbols icon name for an entry. */
export function entryIcon(entry: Entry): string {
  switch (entry.type) {
    case 'workout':
      return 'fitness_center';
    case 'move':
      return `directions_${entry.activity}`;
    case 'weigh-in':
      return 'monitor_weight';
    case 'sport':
      return SPORT_ICONS[entry.sport];
  }
}

const words = (text: string) => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/**
 * Name suggestions (exercises, workouts). Every typed word must match the start of some word in
 * the name ("be pr" → "Bench Press"). Keeps the given order (most used first); skips an exact match.
 */
export function matchNames(names: readonly string[], query: string, limit = 8): string[] {
  const typed = words(query);
  const exact = query.trim().toLowerCase();
  return names
    .filter((name) => {
      if (name.toLowerCase() === exact) return false;
      const nameWords = words(name);
      return typed.every((t) => nameWords.some((w) => w.startsWith(t)));
    })
    .slice(0, limit);
}

/** Today's local date as `YYYY-MM-DD`. */
export function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

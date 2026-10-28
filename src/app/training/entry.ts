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

/** Fields every entry has. These are kept when an entry changes type. */
export interface EntryBase {
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

/** A type's "new and blank" fields, e.g. `{ type: 'sport', sport: 'golf' }`. */
export type EntryTypeInit = DistributiveOmit<Entry, keyof EntryBase>;

/** One choice in the New entry / Change type menus. */
export interface EntryTypeOption {
  label: string;
  icon: string;
  /** Muted heading shown before the first option of a group. */
  group?: string;
  init: EntryTypeInit;
}

/** Menu order: Workout | Get Moving: Walk, Run, Bike | Sport: Golf | Weigh-in. */
export const ENTRY_TYPE_OPTIONS: EntryTypeOption[] = [
  { label: 'Workout', icon: 'fitness_center', init: { type: 'workout', exercises: [] } },
  ...ACTIVITIES.map((activity) => ({
    label: ACTIVITY_LABELS[activity],
    icon: `directions_${activity}`,
    group: 'Get Moving',
    init: { type: 'move' as const, activity },
  })),
  ...SPORTS.map((sport) => ({
    label: SPORT_LABELS[sport],
    icon: SPORT_ICONS[sport],
    group: 'Sport',
    init: { type: 'sport' as const, sport },
  })),
  { label: 'Weigh-in', icon: 'monitor_weight', init: { type: 'weigh-in' } },
];

/** Same type (and same activity / sport): changing to it would do nothing. */
export function isSameKind(entry: Entry | EntryTypeInit, init: EntryTypeInit): boolean {
  if (entry.type !== init.type) return false;
  if (entry.type === 'move' && init.type === 'move') return entry.activity === init.activity;
  if (entry.type === 'sport' && init.type === 'sport') return entry.sport === init.sport;
  return true;
}

/** Label for a type choice ("Workout", "Run", "Golf", "Weigh-in"). */
export function typeLabel(init: EntryTypeInit): string {
  return ENTRY_TYPE_OPTIONS.find((o) => isSameKind(init, o.init))?.label ?? init.type;
}

const join = (parts: string[]) =>
  parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;

/**
 * What changing this entry to another type would remove, for the confirm message
 * (e.g. ["name", "3 exercises"]). Empty when nothing would be lost.
 * (Walk ↔ Run ↔ Bike keeps everything, so callers skip this for those.)
 */
export function droppedFields(entry: Entry): string[] {
  switch (entry.type) {
    case 'workout': {
      const n = entry.exercises.length;
      return [...(entry.name ? ['name'] : []), ...(n ? [`${n} ${n === 1 ? 'exercise' : 'exercises'}`] : [])];
    }
    case 'move':
      return [
        ...(entry.distance != null ? ['distance'] : []),
        ...(entry.durationMinutes != null ? ['time'] : []),
        ...(entry.location ? ['location'] : []),
      ];
    case 'weigh-in':
      return entry.weight != null ? ['weight'] : [];
    case 'sport':
      return [...(entry.format ? ['type'] : []), ...(entry.score != null ? ['score'] : [])];
  }
}

/** "name and 3 exercises", for messages. */
export function describeFields(fields: string[]): string {
  return join(fields);
}

/** One set as text: "10 × 135 lb", "12 reps", "8 × 145 lb (Failure)". */
function setText(s: ExerciseSet): string {
  const base = s.weight != null ? `${s.reps} × ${s.weight} lb` : `${s.reps} reps`;
  return base + (s.failure ? ' (Failure)' : s.easy ? ' (Easy)' : '');
}

/**
 * A note recording the details a type change removes, so nothing is truly lost,
 * e.g. "Changed from Workout: Push day. Bench Press (setting 4): 10 × 135 lb, 8 × 145 lb."
 * Null when there's nothing to keep.
 */
export function describeDropped(entry: Entry): string | null {
  if (!droppedFields(entry).length) return null;
  const from = `Changed from ${entryLabel(entry)}: `;
  switch (entry.type) {
    case 'workout': {
      const parts = [
        ...(entry.name ? [entry.name] : []),
        ...entry.exercises.map((x) => {
          const sets = x.steps.filter((s): s is ExerciseSet => s.type === 'set').map(setText);
          const setting = x.machineSetting != null ? ` (setting ${x.machineSetting})` : '';
          return `${x.name}${setting}${sets.length ? `: ${sets.join(', ')}` : ''}`;
        }),
      ];
      return from + parts.join('. ') + '.';
    }
    case 'move':
      return (
        from +
        [
          ...(entry.distance != null ? [formatDistance(entry.distance)] : []),
          ...(entry.durationMinutes != null ? [formatDuration(entry.durationMinutes)] : []),
          ...(entry.location ? [entry.location] : []),
        ].join(' · ')
      );
    case 'weigh-in':
      return `${from}${entry.weight} lb`;
    case 'sport':
      return (
        from +
        [
          ...(entry.format ? [GOLF_FORMAT_LABELS[entry.format]] : []),
          ...(entry.score != null ? [`Score ${entry.score}`] : []),
        ].join(' · ')
      );
  }
}

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

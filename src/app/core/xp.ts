import type { Entry, ExerciseSet } from '../training/entry';
import type { Quest } from '../quests/quest';

/** XP per action. */
export const XP = {
  captureQuest: 2,
  completeQuest: 10,
  /** Workout, Get Moving or sport, once anything is entered. */
  session: 10,
  weighIn: 5,
  personalRecord: 5,
} as const;

/** Max streak bonus (and max missed-day loss) per day. */
export const DAILY_CAP = 50;
/** Missed days in a row that cost nothing (a weekend away). */
export const FREE_MISSED_DAYS = 2;

/** Bonus on the n-th day of a streak: n + previous bonus → 1, 3, 6, 10, 15 … capped. */
export function streakBonus(day: number): number {
  return day < 1 ? 0 : Math.min(DAILY_CAP, (day * (day + 1)) / 2);
}

/** XP lost on the m-th missed day in a row: free for 2 days, then 1, 3, 6 … capped. */
export function missedLoss(missed: number): number {
  const k = missed - FREE_MISSED_DAYS;
  return k < 1 ? 0 : Math.min(DAILY_CAP, (k * (k + 1)) / 2);
}

/** XP needed to go from `level` to the next: 50, 75, 100, … */
export function xpToNext(level: number): number {
  return 50 + 25 * (level - 1);
}

export interface LevelInfo {
  level: number;
  /** XP earned within the current level. */
  intoLevel: number;
  /** XP the current level needs in total. */
  toNext: number;
}

export function levelFor(totalXp: number): LevelInfo {
  let level = 1;
  let rest = Math.max(0, totalXp);
  while (rest >= xpToNext(level)) {
    rest -= xpToNext(level);
    level++;
  }
  return { level, intoLevel: rest, toNext: xpToNext(level) };
}

// ---- Days ----

/** Local `YYYY-MM-DD` of an ISO time (or Date). */
export function localDay(time: string | Date): string {
  const d = typeof time === 'string' ? new Date(time) : time;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** `YYYY-MM-DD` shifted by whole days. */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return localDay(new Date(y, m - 1, d + n));
}

// ---- Progress (all derived from saved data) ----

export type XpSource = keyof typeof XP;

/** One day of the walk from first activity to today. */
export interface DayLog {
  day: string;
  active: boolean;
  /** XP from actions that day. */
  earned: number;
  /** Streak bonus (active days). */
  bonus: number;
  /** Missed-day loss (inactive past days). */
  loss: number;
  /** Streak after this day (0 if missed). */
  streak: number;
  /** Running total after this day. */
  total: number;
}

export interface Progress {
  totalXp: number;
  /** Current streak: includes today if active, else the streak still alive from yesterday. */
  streak: number;
  bestStreak: number;
  /** Personal records that earned XP. */
  prCount: number;
  /** XP and count per action type. */
  sources: Record<XpSource, { count: number; xp: number }>;
  streakBonusXp: number;
  missedLossXp: number;
  /** XP given back because the total can't go below 0. */
  floorXp: number;
  /** Every day from first activity to today, oldest first. */
  days: DayLog[];
}

/** Biggest weight lifted in an exercise record, and the most reps at that weight. */
function topSet(sets: ExerciseSet[]): { weight: number; reps: number } | null {
  if (!sets.length) return null;
  const weight = Math.max(...sets.map((s) => s.weight ?? 0));
  const reps = Math.max(...sets.filter((s) => (s.weight ?? 0) === weight).map((s) => s.reps));
  return { weight, reps };
}

/**
 * Totals XP, streak and PRs from saved entries and quests, as of `today` (`YYYY-MM-DD`).
 *
 * - An action counts on the day it was done in the app (local date of its timestamp); any action
 *   makes that day active.
 * - Body XP entries earn XP only if dated no earlier than the day before they were logged;
 *   a yesterday-dated one also makes yesterday active (backfill grace). Older backfills earn nothing.
 * - Each active day adds `streakBonus(streak)`; each missed past day subtracts `missedLoss(run)`.
 *   Today never costs anything while it's still today. The total never goes below 0.
 */
export function computeProgress(entries: readonly Entry[], quests: readonly Quest[], today: string): Progress {
  const dayXp = new Map<string, number>();
  const active = new Set<string>();
  const sources = Object.fromEntries(
    (Object.keys(XP) as XpSource[]).map((k) => [k, { count: 0, xp: 0 }]),
  ) as Progress['sources'];
  const earn = (day: string, source: XpSource) => {
    if (day > today) return;
    dayXp.set(day, (dayXp.get(day) ?? 0) + XP[source]);
    sources[source].count++;
    sources[source].xp += XP[source];
  };
  /** Entry dated today or yesterday relative to the day it was logged. */
  const eligible = (date: string, actionDay: string) => date >= addDays(actionDay, -1);
  let prCount = 0;

  for (const quest of quests) {
    const captured = localDay(quest.createdAt);
    active.add(captured);
    earn(captured, 'captureQuest');
    if (quest.closedAt) {
      const closed = localDay(quest.closedAt);
      active.add(closed);
      earn(closed, 'completeQuest');
    }
  }

  const records: { name: string; time: string; date: string; sets: ExerciseSet[] }[] = [];
  for (const entry of entries) {
    const day = localDay(entry.createdAt);
    active.add(day);
    const hasContent = (() => {
      switch (entry.type) {
        case 'workout':
          return !!entry.name || entry.exercises.length > 0;
        case 'move':
          return !!entry.location || entry.durationMinutes != null || entry.distance != null;
        case 'weigh-in':
          return entry.weight != null;
        case 'sport':
          return entry.format != null;
      }
    })();
    if (hasContent && eligible(entry.date, day)) {
      earn(day, entry.type === 'weigh-in' ? 'weighIn' : 'session');
      if (entry.date === addDays(day, -1)) active.add(entry.date);
    }
    if (entry.type === 'workout') {
      for (const ex of entry.exercises) {
        if (ex.loggedAt) active.add(localDay(ex.loggedAt));
        records.push({
          name: ex.name.toLowerCase(),
          time: ex.loggedAt ?? entry.createdAt,
          date: entry.date,
          sets: ex.steps.filter((s): s is ExerciseSet => s.type === 'set'),
        });
      }
    }
  }

  // Personal records: beat your best for that exercise (heavier, or same weight with more reps).
  records.sort((a, b) => a.time.localeCompare(b.time));
  const best = new Map<string, { weight: number; reps: number }>();
  for (const r of records) {
    const top = topSet(r.sets);
    if (!top) continue;
    const prev = best.get(r.name);
    if (!prev) {
      best.set(r.name, top); // first time is the baseline
      continue;
    }
    const isPr = top.weight > prev.weight || (top.weight === prev.weight && top.reps > prev.reps);
    if (!isPr) continue;
    best.set(r.name, top);
    const day = localDay(r.time);
    if (eligible(r.date, day) && day <= today) {
      earn(day, 'personalRecord');
      prCount++;
    }
  }

  // Walk every day from the first activity to today.
  const first = [...active, ...dayXp.keys()].filter((d) => d <= today).sort()[0];
  const log: DayLog[] = [];
  let total = 0;
  let streak = 0;
  let bestStreak = 0;
  let missed = 0;
  let streakBonusXp = 0;
  let missedLossXp = 0;
  let floorXp = 0;
  for (let d = first; d && d <= today; d = addDays(d, 1)) {
    const earned = dayXp.get(d) ?? 0;
    let bonus = 0;
    let loss = 0;
    if (active.has(d)) {
      streak++;
      missed = 0;
      bonus = streakBonus(streak);
      bestStreak = Math.max(bestStreak, streak);
    } else if (d < today) {
      streak = 0;
      missed++;
      loss = missedLoss(missed);
    }
    total += earned + bonus - loss;
    if (total < 0) {
      floorXp -= total;
      total = 0;
    }
    streakBonusXp += bonus;
    missedLossXp += loss;
    log.push({ day: d, active: active.has(d), earned, bonus, loss, streak, total });
  }

  return {
    totalXp: total,
    streak,
    bestStreak,
    prCount,
    sources,
    streakBonusXp,
    missedLossXp,
    floorXp,
    days: log,
  };
}

import type { Entry, Exercise } from '../training/entry';
import type { Quest } from '../quests/quest';
import {
  XP,
  addDays,
  computeProgress,
  levelFor,
  missedLoss,
  streakBonus,
  xpToNext,
} from './xp';

/** ISO time for a local day ("2026-10-01") at noon (avoids time-zone edge cases). */
const at = (day: string, hour = 12) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, hour).toISOString();
};

let n = 0;
const quest = (captured: string, closed?: string): Quest => ({
  id: `l${n++}`,
  title: 'x',
  horizon: 'inbox',
  importance: 'normal',
  tagIds: [],
  createdAt: at(captured),
  ...(closed ? { closedAt: at(closed) } : {}),
});
/** `weight: null` = weigh-in created but no weight entered yet. */
const weighIn = (loggedDay: string, date = loggedDay, weight: number | null = 180): Entry => ({
  id: `e${n++}`,
  type: 'weigh-in',
  date,
  createdAt: at(loggedDay),
  ...(weight != null ? { weight } : {}),
});
const run = (loggedDay: string, date = loggedDay, distance?: number): Entry => ({
  id: `e${n++}`,
  type: 'move',
  activity: 'run',
  date,
  createdAt: at(loggedDay),
  ...(distance != null ? { distance } : {}),
});
const ex = (name: string, loggedDay: string, sets: [reps: number, weight?: number][]): Exercise => ({
  id: `x${n++}`,
  name,
  loggedAt: at(loggedDay),
  steps: sets.map(([reps, weight]) => ({
    type: 'set' as const,
    reps,
    ...(weight != null ? { weight } : {}),
    failure: false,
    easy: false,
  })),
});
const workout = (loggedDay: string, exercises: Exercise[], date = loggedDay): Entry => ({
  id: `e${n++}`,
  type: 'workout',
  date,
  createdAt: at(loggedDay),
  exercises,
});

describe('XP rules', () => {
  it('streak bonus: n + previous bonus, capped at 50', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 30].map(streakBonus)).toEqual([
      1, 3, 6, 10, 15, 21, 28, 36, 45, 50, 50, 50,
    ]);
  });

  it('missed days: 2 free, then the same rule, capped at 50', () => {
    expect([1, 2, 3, 4, 5, 6, 11, 12, 40].map(missedLoss)).toEqual([0, 0, 1, 3, 6, 10, 45, 50, 50]);
  });

  it('levels need 50, 75, 100 … XP', () => {
    expect([1, 2, 3, 4].map(xpToNext)).toEqual([50, 75, 100, 125]);
    expect(levelFor(0)).toEqual({ level: 1, intoLevel: 0, toNext: 50 });
    expect(levelFor(49)).toEqual({ level: 1, intoLevel: 49, toNext: 50 });
    expect(levelFor(50)).toEqual({ level: 2, intoLevel: 0, toNext: 75 });
    expect(levelFor(130)).toEqual({ level: 3, intoLevel: 5, toNext: 100 });
  });

  it('adds days across month ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('computeProgress', () => {
  it('starts at zero', () => {
    expect(computeProgress([], [], '2026-10-25')).toMatchObject({ totalXp: 0, streak: 0, prCount: 0 });
  });

  it('earns action XP plus a growing streak bonus', () => {
    const quests = [quest('2026-10-01', '2026-10-02'), quest('2026-10-03')];
    const entries = [weighIn('2026-10-02'), run('2026-10-03', '2026-10-03', 3)];
    // Day 1: capture 2 + bonus 1; day 2: close 10 + weigh-in 5 + bonus 3; day 3: capture 2 + run 10 + bonus 6.
    expect(computeProgress(entries, quests, '2026-10-03')).toMatchObject({ totalXp: 39, streak: 3, prCount: 0 });
  });

  it("doesn't charge for today until it's over, and keeps yesterday's streak alive", () => {
    const quests = [quest('2026-10-01'), quest('2026-10-02')];
    expect(computeProgress([], quests, '2026-10-03')).toMatchObject({ totalXp: 2 + 1 + 2 + 3, streak: 2, prCount: 0 });
  });

  it('allows 2 missed days free, then loses XP the same way, and resets the streak', () => {
    const quests = [quest('2026-10-01'), quest('2026-10-02'), quest('2026-10-03'), quest('2026-10-04')];
    // Days 1–4 active: 4×2 + (1+3+6+10) = 28. Missed 5, 6 free; 7: −1; 8: −3. Back on day 9 (+2, streak 1 → +1).
    quests.push(quest('2026-10-09'));
    expect(computeProgress([], quests, '2026-10-09')).toMatchObject({ totalXp: 28 - 1 - 3 + 2 + 1, streak: 1, prCount: 0 });
  });

  it('never goes below 0, and levels can drop', () => {
    const quests = [quest('2026-01-01')]; // 3 XP, then a long break
    expect(computeProgress([], quests, '2026-03-01').totalXp).toBe(0);

    // Reach level 2, then lose enough to drop back.
    const busy = Array.from({ length: 6 }, (_, i) => quest(addDays('2026-05-01', i)));
    const peak = computeProgress([], busy, '2026-05-06').totalXp; // 12 + 1+3+6+10+15+21 = 68
    expect(levelFor(peak).level).toBe(2);
    const later = computeProgress([], busy, '2026-05-14').totalXp; // missed 7..13 → −(0+0+1+3+6+10+15)
    expect(later).toBe(68 - 35);
    expect(levelFor(later).level).toBe(1);
  });

  it('only earns for sessions with something entered', () => {
    const p = computeProgress([run('2026-10-01'), weighIn('2026-10-01', '2026-10-01', null)], [], '2026-10-01');
    expect(p.totalXp).toBe(1); // just the day-1 streak bonus: being in the app still counts as active
  });

  it('backfill: yesterday earns XP and repairs the streak; older earns nothing but keeps today active', () => {
    // Active Oct 1 and 2, nothing Oct 3, then on Oct 4 log a run dated Oct 3.
    const quests = [quest('2026-10-01'), quest('2026-10-02')];
    const repaired = computeProgress([run('2026-10-04', '2026-10-03', 2)], quests, '2026-10-04');
    // 2+1, 2+3, (Oct 3 now active) +6, Oct 4: run 10 + 10 = 34
    expect(repaired).toMatchObject({ totalXp: 34, streak: 4, prCount: 0 });

    const old = computeProgress([run('2026-10-04', '2026-09-20', 2)], quests, '2026-10-04');
    // Oct 3 missed (free), Oct 4 active again (streak 1): no run XP.
    expect(old).toMatchObject({ totalXp: 3 + 5 + 1, streak: 1, prCount: 0 });
  });

  it('awards PRs for heavier weight, or more reps at the same top weight (first time is the baseline)', () => {
    const entries = [
      workout('2026-10-01', [ex('Bench', '2026-10-01', [[10, 135]])]),
      workout('2026-10-02', [ex('bench', '2026-10-02', [[12, 135]])]), // more reps → PR
      workout('2026-10-03', [ex('Bench', '2026-10-03', [[8, 135], [5, 145]])]), // heavier → PR
      workout('2026-10-04', [ex('Bench', '2026-10-04', [[10, 140]])]), // lighter → no
      workout('2026-10-05', [ex('Pull-up', '2026-10-05', [[8]]), ex('Pull-up', '2026-10-05', [[9]])]), // bodyweight reps → PR
    ];
    const p = computeProgress(entries, [], '2026-10-05');
    expect(p.prCount).toBe(3);
    // 5 sessions ×10 + 3 PRs ×5 + bonuses 1+3+6+10+15
    expect(p.totalXp).toBe(50 + 15 + 35);
  });

  it('breaks the total down by source, bonuses, losses and the 0 floor, with a day log', () => {
    const quests = [quest('2026-01-01', '2026-01-01'), quest('2026-01-02')];
    const entries = [weighIn('2026-01-02')];
    const p = computeProgress(entries, quests, '2026-01-10'); // then 8 days away
    expect(p.sources).toEqual({
      captureQuest: { count: 2, xp: 4 },
      completeQuest: { count: 1, xp: 10 },
      session: { count: 0, xp: 0 },
      weighIn: { count: 1, xp: 5 },
      personalRecord: { count: 0, xp: 0 },
    });
    expect(p.streakBonusXp).toBe(1 + 3);
    expect(p.bestStreak).toBe(2);
    // Missed Jan 3–9 (today, Jan 10, isn't charged): 0,0,1,3,6,10,15 = 35, but only 23 to lose.
    expect(p.missedLossXp).toBe(35);
    expect(p.totalXp).toBe(0);
    expect(4 + 10 + 5 + p.streakBonusXp - p.missedLossXp + p.floorXp).toBe(p.totalXp);
    expect(p.days).toHaveLength(10);
    expect(p.days[0]).toEqual({ day: '2026-01-01', active: true, earned: 12, bonus: 1, loss: 0, streak: 1, total: 13 });
    expect(p.days.at(-1)).toMatchObject({ day: '2026-01-10', active: false, loss: 0, total: 0 });
  });

  it('closing a quest counts on the day it was closed; reopening (no closedAt) removes it', () => {
    const closed = computeProgress([], [quest('2026-10-01', '2026-10-01')], '2026-10-01');
    const reopened = computeProgress([], [quest('2026-10-01')], '2026-10-01');
    expect(closed.totalXp - reopened.totalXp).toBe(XP.completeQuest);
  });
});

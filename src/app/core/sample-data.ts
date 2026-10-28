import type { Entry, Exercise, Step } from '../training/entry';
import type { Quest, Tag } from '../quests/quest';
import { APP_KEY_PREFIX } from './app-keys';

/**
 * Sample data for Simulation mode: about 4 weeks ending today (workouts, Get Moving, golf,
 * weigh-ins, quests and tags). Rest days every few days keep streak bonuses small, so the
 * player lands around level 5–6 (always below 10; see the spec test).
 *
 * Returns storage key → value, like a save file's `data`. Loaded lazily (only when entering).
 */
export function makeSampleData(now = new Date()): Record<string, unknown> {
  // Deterministic "random" so every simulation looks alike.
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = <T>(a: readonly T[]): T => a[Math.floor(rand() * a.length)];

  const pad = (n: number) => String(n).padStart(2, '0');
  const dayStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const daysAgo = (n: number, hour = 18, min = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    d.setHours(hour, min, 0, 0);
    return d;
  };

  const set = (reps: number, weight?: number, failure = false, easy = false): Step => ({
    type: 'set',
    reps,
    ...(weight ? { weight } : {}),
    failure,
    easy,
  });
  const rest = (minutes: number): Step => ({ type: 'rest', minutes });

  // Exercise templates: [name, starting weight, machine setting]; weights rise over time (PRs).
  const plans: Record<string, [string, number, number | null][]> = {
    'Push Day': [
      ['Bench Press', 135, null],
      ['Incline Dumbbell Press', 45, null],
      ['Shoulder Press Machine', 70, 4],
      ['Tricep Pushdown', 40, 6],
    ],
    'Pull Day': [
      ['Lat Pulldown', 100, 5],
      ['Seated Cable Row', 90, 3],
      ['Dumbbell Curl', 25, null],
    ],
    'Leg Day': [
      ['Squat', 155, null],
      ['Leg Press', 230, 2],
      ['Leg Curl', 70, 4],
    ],
  };

  const TOTAL = 27;
  // Rest days (no activity): every few days, so streaks stay short. Never 3 in a row.
  const restDays = new Set([25, 21, 17, 16, 12, 8, 4]);

  const entries: Entry[] = [];
  const add = (n: number, hour: number, fields: Record<string, unknown>) => {
    const d = daysAgo(n, hour, Math.floor(rand() * 50));
    entries.push({ id: crypto.randomUUID(), date: dayStr(d), createdAt: d.toISOString(), ...fields } as Entry);
  };

  const rotation = Object.keys(plans);
  let r = 0;
  let weight = 188.6;

  for (let n = TOTAL; n >= 0; n--) {
    if (restDays.has(n)) continue;
    const progress = (TOTAL - n) / TOTAL;
    const dow = daysAgo(n).getDay();

    if (dow === 1 || dow === 3 || dow === 5) {
      const name = rotation[r++ % rotation.length];
      const start = daysAgo(n, 18, 10);
      const exercises: Exercise[] = plans[name].map(([exName, base, setting], i) => {
        const w = Math.round((base * (1 + progress * 0.1)) / 5) * 5;
        const steps = [set(10, w), rest(2), set(8, w), rest(2), set(rand() < 0.4 ? 6 : 8, w, rand() < 0.4), rest(3)];
        if (rand() < 0.3) steps[0] = set(12, w - 10, false, true);
        const loggedAt = new Date(start);
        loggedAt.setMinutes(loggedAt.getMinutes() + i * 12);
        return {
          id: crypto.randomUUID(),
          name: exName,
          ...(setting !== null ? { machineSetting: setting } : {}),
          steps,
          ...(rand() < 0.15 ? { notes: pick(['Felt strong today.', 'Left shoulder a bit tight.', 'Go up next time.']) } : {}),
          loggedAt: loggedAt.toISOString(),
        };
      });
      add(n, 18, { type: 'workout', name, exercises });
    } else if (dow === 6) {
      const round = n % 14 < 7;
      add(n, 8, {
        type: 'sport',
        sport: 'golf',
        format: round ? '18-holes' : '9-holes',
        score: round ? 96 - Math.round(progress * 6) : 47 + Math.floor(rand() * 4),
        ...(round ? { notes: 'Played with friends.' } : {}),
      });
    } else {
      const activity = pick(['walk', 'walk', 'run', 'bike'] as const);
      const dist = { walk: 2 + rand() * 1.5, run: 2.5 + rand() * 2, bike: 8 + rand() * 6 }[activity];
      const pace = { walk: 18, run: 10, bike: 4.5 }[activity];
      add(n, 7, {
        type: 'move',
        activity,
        distance: Math.round(dist * 10) / 10,
        durationMinutes: Math.round(dist * pace),
        location: pick(['Neighborhood loop', 'Riverside Trail', 'Park', 'Greenway']),
      });
    }
    // Weigh-ins on Mondays and Thursdays.
    if (dow === 1 || dow === 4) {
      weight -= 0.3 + rand() * 0.5;
      add(n, 6, { type: 'weigh-in', weight: Math.round(weight * 10) / 10 });
    }
  }
  // A golf entry not set up yet, to show that state.
  add(1, 12, { type: 'sport', sport: 'golf' });

  // ---- Quests ----
  const tags: Tag[] = ['Home', 'Work', 'Health', 'Errands', 'Learning', 'Finance'].map((name) => ({
    id: crypto.randomUUID(),
    name,
  }));
  const T = Object.fromEntries(tags.map((t) => [t.name, t.id]));

  type Def = [title: string, horizon: Quest['horizon'], importance: Quest['importance'], tags: string[], notes?: string, closedDaysAgo?: number, pinned?: boolean];
  const defs: Def[] = [
    ['Golf club distances', 'someday', 'normal', [], '<ul><li><p>Driver: 230 yd</p></li><li><p>5 iron: 175 yd</p></li><li><p>7 iron: 150 yd</p></li><li><p>9 iron: 125 yd</p></li><li><p>Pitching wedge: 105 yd</p></li></ul>', undefined, true],
    [
      'Birthdays',
      'someday',
      'normal',
      [],
      '<ul>' +
        [
          'Mom: January 14',
          'Dad: July 4',
          'Alex Rivera: February 3',
          'Grandpa Joe: March 22',
          'Priya Shah: April 9',
          'Sam (nephew): May 30',
          'Jordan Lee: June 17',
          'Maya Chen: August 26',
          'Chris Walker: September 12',
          'Aunt Linda: October 8',
          'Taylor Brooks: November 19',
          'Ben Ortiz: December 2',
        ]
          .map((b) => `<li><p>${b}</p></li>`)
          .join('') +
        '</ul>',
      undefined,
      true,
    ],
    ['Renew car registration', 'now', 'urgent', ['Errands'], '<p>Due end of the month.</p><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>Emissions test</p></li><li data-type="taskItem" data-checked="false"><p>Bring insurance card</p></li></ul>'],
    ['Fix the leaky kitchen faucet', 'now', 'important', ['Home'], '<p>Need a new cartridge. Model number is under the sink.</p>'],
    ['Finish quarterly report draft', 'now', 'normal', ['Work'], '<p>Sections left: <strong>budget</strong> and <strong>risks</strong>.</p>'],
    ['Book annual physical', 'soon', 'important', ['Health']],
    ['Set up automatic savings transfer', 'soon', 'normal', ['Finance']],
    ['Learn a new recipe', 'soon', 'normal', ['Learning', 'Home']],
    ['Clean out the garage', 'someday', 'normal', ['Home']],
    ['Try a new 5K route', 'someday', 'normal', ['Health']],
    ['Pick up dry cleaning', 'inbox', 'normal', ['Errands']],
    ['Call about the holiday plans', 'inbox', 'important', []],
    // Completed
    ['Replace smoke detector batteries', 'now', 'important', ['Home'], undefined, 2],
    ['Buy new running shoes', 'now', 'normal', ['Health', 'Errands'], '<p>Went with the cushioned ones.</p>', 6],
    ['Cancel unused streaming service', 'soon', 'normal', ['Finance'], undefined, 11],
    ['Submit expense report', 'now', 'urgent', ['Work'], undefined, 19],
  ];
  const quests: Quest[] = defs.map(([title, horizon, importance, tagNames, notes, closedDaysAgo, pinned], i) => {
    const capturedAgo = Math.min(TOTAL, (closedDaysAgo ?? 0) + 2 + Math.floor(rand() * 10));
    const q: Quest = {
      id: crypto.randomUUID(),
      title,
      horizon,
      importance,
      tagIds: tagNames.map((t) => T[t]),
      createdAt: daysAgo(capturedAgo, 9 + (i % 10), i * 3).toISOString(),
    };
    if (notes) q.notes = notes;
    if (closedDaysAgo !== undefined) q.closedAt = daysAgo(closedDaysAgo, 20).toISOString();
    if (pinned) q.pinned = true;
    return q;
  });
  // One captured today.
  quests.push({
    id: crypto.randomUUID(),
    title: 'Schedule oil change',
    horizon: 'inbox',
    importance: 'normal',
    tagIds: [T['Errands']],
    createdAt: daysAgo(0, 8, 15).toISOString(),
  });

  return {
    [`${APP_KEY_PREFIX}training.entries`]: entries,
    [`${APP_KEY_PREFIX}quests.items`]: quests,
    [`${APP_KEY_PREFIX}quests.tags`]: tags,
  };
}

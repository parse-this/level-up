// Generates a Level Up save file with ~6 weeks of sample data ending today.
// Usage: node tools/make-test-save.js [output.json]   (default: test-data.json)
// Then in the app: Settings → Save / Load → Load game.
const { randomUUID } = require('crypto');
const fs = require('fs');

const out = process.argv[2] || 'test-data.json';
const P = 'levelUpTracker.';
const now = new Date();
const dayStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysAgo = (n, hour = 18, min = 0) => {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  d.setHours(hour, min, 0, 0);
  return d;
};

// Simple deterministic random
let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = (a) => a[Math.floor(rand() * a.length)];

const set = (reps, weight, extra = {}) => ({
  type: 'set', reps, ...(weight ? { weight } : {}), failure: !!extra.failure, easy: !!extra.easy,
});
const rest = (minutes) => ({ type: 'rest', minutes });

// Exercise templates with a starting weight that grows over time
const PLANS = {
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
    ['Face Pull', 30, 7],
  ],
  'Leg Day': [
    ['Squat', 155, null],
    ['Leg Press', 230, 2],
    ['Leg Curl', 70, 4],
    ['Calf Raise', 90, null],
  ],
};

function makeExercise([name, base, setting], progress, date, i) {
  const w = Math.round((base * (1 + progress * 0.12)) / 5) * 5;
  const steps = [set(10, w), rest(2), set(8, w), rest(2), set(rand() < 0.4 ? 6 : 8, w, { failure: rand() < 0.4 })];
  if (rand() < 0.3) steps[0] = set(12, w - 10, { easy: true });
  steps.push(rest(3));
  const loggedAt = new Date(date);
  loggedAt.setMinutes(loggedAt.getMinutes() + i * 12);
  return {
    id: randomUUID(), name, ...(setting != null ? { machineSetting: setting } : {}), steps,
    ...(rand() < 0.15 ? { notes: pick(['Felt strong today.', 'Left shoulder a bit tight.', 'Try more weight next time.']) } : {}),
    loggedAt: loggedAt.toISOString(),
  };
}

const entries = [];
const add = (n, hour, fields) => {
  const d = daysAgo(n, hour, Math.floor(rand() * 50));
  entries.push({ id: randomUUID(), date: dayStr(d), createdAt: d.toISOString(), ...fields(d) });
};

const TOTAL = 42;
// Days with nothing logged (to show missed days / streak breaks)
const skip = new Set([33, 32, 25, 19, 18, 12]);
const rotation = ['Push Day', 'Pull Day', 'Leg Day'];
let r = 0;
let weight = 192.4;

for (let n = TOTAL; n >= 0; n--) {
  if (skip.has(n)) continue;
  const progress = (TOTAL - n) / TOTAL;
  const dow = daysAgo(n).getDay();

  if (dow === 1 || dow === 3 || dow === 5) {
    const name = rotation[r++ % 3];
    add(n, 18, (d) => ({
      type: 'workout', name,
      exercises: PLANS[name].map((p, i) => makeExercise(p, progress, d, i)),
      ...(rand() < 0.2 ? { notes: 'Gym was busy, had to wait for the rack.' } : {}),
    }));
  } else if (dow === 6 && n % 14 < 7) {
    add(n, 8, () => ({ type: 'sport', sport: 'golf', format: '18-holes', score: 98 - Math.round(progress * 8 + rand() * 4), notes: 'Pebble Creek with friends.' }));
  } else if (dow === 6) {
    add(n, 9, () => ({ type: 'sport', sport: 'golf', format: pick(['practice', '9-holes']), ...(rand() < 0.5 ? {} : {}) }));
  } else {
    const activity = pick(['walk', 'walk', 'run', 'bike']);
    const dist = { walk: 2 + rand() * 1.5, run: 2.5 + rand() * 2, bike: 8 + rand() * 6 }[activity];
    const pace = { walk: 18, run: 10, bike: 4.5 }[activity];
    add(n, 7, () => ({
      type: 'move', activity,
      distance: Math.round(dist * 10) / 10,
      durationMinutes: Math.round(dist * pace),
      location: pick(['Neighborhood loop', 'Riverside Trail', 'Park', 'Greenway']),
    }));
  }
  // Weigh-in every Monday and Thursday morning
  if (dow === 1 || dow === 4) {
    weight -= 0.3 + rand() * 0.5;
    add(n, 6, () => ({ type: 'weigh-in', weight: Math.round(weight * 10) / 10 }));
  }
}
// Fix the 9-hole golf rounds to have scores
for (const e of entries) if (e.type === 'sport' && e.format === '9-holes') e.score = 46 + Math.floor(rand() * 6);
// One blank golf entry and one empty weigh-in today-ish to show "not set up yet" states
add(1, 12, () => ({ type: 'sport', sport: 'golf' }));
add(0, 6, () => ({ type: 'weigh-in' }));

// Tags and quests
const tagNames = ['Home', 'Work', 'Health', 'Errands', 'Learning', 'Finance'];
const tags = tagNames.map((name) => ({ id: randomUUID(), name }));
const T = Object.fromEntries(tags.map((t) => [t.name, t.id]));

const questDefs = [
  ['Fix the leaky kitchen faucet', 'now', 'important', ['Home'], '<p>Need a new cartridge. Model is on the underside.</p>'],
  ['Renew car registration', 'now', 'urgent', ['Errands'], '<p>Due end of the month.</p><ul><li><p>Emissions test first</p></li><li><p>Bring insurance card</p></li></ul>'],
  ['Book annual physical', 'soon', 'important', ['Health'], null],
  ['Finish quarterly report draft', 'now', 'urgent', ['Work'], '<p>Sections left: <strong>budget</strong> and <strong>risks</strong>.</p>'],
  ['Learn Angular signals deeply', 'soon', 'normal', ['Learning', 'Work'], '<p>Read the docs on <code>computed</code> and <code>effect</code>.</p>'],
  ['Set up automatic savings transfer', 'soon', 'important', ['Finance'], null],
  ['Clean out the garage', 'someday', 'normal', ['Home'], null],
  ['Try a new 5K route', 'someday', 'normal', ['Health'], null],
  ['Pick up dry cleaning', 'inbox', 'normal', ['Errands'], null],
  ['Call Mom about the holiday plans', 'inbox', 'important', [], null],
  ['Research a better golf driver', 'someday', 'normal', [], '<p>Look at reviews for adjustable drivers.</p>'],
  ['Review 401k allocation', 'soon', 'normal', ['Finance'], null],
  ['Write unit tests for the XP rules', 'now', 'normal', ['Work', 'Learning'], null],
  ['Plan meal prep for next week', 'inbox', 'normal', ['Health', 'Home'], null],
  // Completed
  ['Replace smoke detector batteries', 'now', 'important', ['Home'], null, 3],
  ['Cancel unused streaming service', 'soon', 'normal', ['Finance'], null, 8],
  ['Buy new running shoes', 'now', 'normal', ['Health', 'Errands'], '<p>Went with the cushioned ones.</p>', 15],
  ['Submit expense report', 'now', 'urgent', ['Work'], null, 22],
  ['Read "Atomic Habits"', 'someday', 'normal', ['Learning'], null, 30],
];

const quests = questDefs.map(([title, horizon, importance, tagList, notes, closedDaysAgo], i) => {
  const created = daysAgo(Math.max(closedDaysAgo ?? 0, 0) + 2 + Math.floor(rand() * 20), 9 + (i % 10), i * 3);
  const q = { id: randomUUID(), title, horizon, importance, tagIds: tagList.map((t) => T[t]), createdAt: created.toISOString() };
  if (notes) q.notes = notes;
  if (closedDaysAgo != null) q.closedAt = daysAgo(closedDaysAgo, 20).toISOString();
  return q;
});
// A couple captured today
quests.push({ id: randomUUID(), title: 'Schedule oil change', horizon: 'inbox', importance: 'normal', tagIds: [T.Errands], createdAt: daysAgo(0, 8, 15).toISOString() });

const save = {
  app: 'level-up', version: 1, savedAt: now.toISOString(),
  data: { [P + 'training.entries']: entries, [P + 'quests.items']: quests, [P + 'quests.tags']: tags },
};
fs.writeFileSync(out, JSON.stringify(save, null, 2));
console.log(`${entries.length} entries, ${quests.length} quests, ${tags.length} tags → ${out}`);

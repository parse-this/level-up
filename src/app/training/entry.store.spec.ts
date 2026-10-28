import { TestBed } from '@angular/core/testing';
import {
  Entry,
  ExerciseInput,
  WorkoutEntry,
  ENTRY_TYPE_OPTIONS,
  describeDropped,
  droppedFields,
  formatDistance,
  formatDuration,
  matchNames,
  stepLabels,
} from './entry';
import { ENTRIES_KEY, EntryStore, OLD_ENTRIES_KEY } from './entry.store';

const bench: ExerciseInput = {
  name: 'Bench Press',
  steps: [
    { type: 'set', reps: 10, weight: 135, failure: false, easy: false },
    { type: 'rest', minutes: 2 },
  ],
};

const saved = (): Entry[] => JSON.parse(localStorage.getItem(ENTRIES_KEY) ?? '[]');

describe('EntryStore', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.useRealTimers());

  const create = () => TestBed.inject(EntryStore);

  it('creates entries of each type with an id and creation time, and saves them', () => {
    vi.useFakeTimers({ now: new Date('2026-10-25T07:42:00Z'), toFake: ['Date'] });
    const store = create();
    const w = store.create({ type: 'workout', date: '2026-10-25', exercises: [] });
    const m = store.create({ type: 'move', date: '2026-10-25', activity: 'run' });
    const i = store.create({ type: 'weigh-in', date: '2026-10-25' });

    expect(w).toEqual({
      id: w.id,
      createdAt: '2026-10-25T07:42:00.000Z',
      type: 'workout',
      date: '2026-10-25',
      exercises: [],
    });
    expect(m).toMatchObject({ type: 'move', activity: 'run' });
    expect(i).toMatchObject({ type: 'weigh-in' });
    expect(saved()).toEqual([w, m, i]);
  });

  it('sorts newest date first, then newest created first', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const store = create();
    const at = (iso: string) => vi.setSystemTime(new Date(iso));

    at('2026-10-01T08:00:00Z');
    store.create({ type: 'weigh-in', date: '2026-10-01', weight: 1 });
    at('2026-10-01T09:00:00Z');
    store.create({ type: 'weigh-in', date: '2026-10-03', weight: 2 });
    at('2026-10-01T10:00:00Z');
    store.create({ type: 'weigh-in', date: '2026-10-01', weight: 3 });

    expect(store.entries().map((e) => e.type === 'weigh-in' && e.weight)).toEqual([2, 3, 1]);
  });

  it('replaces and removes entries', () => {
    const store = create();
    const m = store.create({ type: 'move', date: '2026-10-01', activity: 'walk' });
    store.replace({ ...m, activity: 'bike', distance: 12.5, durationMinutes: 65 } as Entry);
    expect(store.byId(m.id)).toMatchObject({ activity: 'bike', distance: 12.5, durationMinutes: 65 });

    store.remove(m.id);
    expect(store.entries()).toEqual([]);
    expect(saved()).toEqual([]);
  });

  it('adds exercises in order (stamping loggedAt), and updates and removes them', () => {
    vi.useFakeTimers({ now: new Date('2026-10-25T09:00:00Z'), toFake: ['Date'] });
    const store = create();
    const { id } = store.create({ type: 'workout', date: '2026-10-25', exercises: [] });
    const workout = () => store.byId(id) as WorkoutEntry;

    store.addExercise(id, bench);
    store.addExercise(id, { ...bench, name: 'Row' });
    expect(workout().exercises.map((e) => e.name)).toEqual(['Bench Press', 'Row']);
    expect(workout().exercises[0].loggedAt).toBe('2026-10-25T09:00:00.000Z');

    const [first] = workout().exercises;
    vi.setSystemTime(new Date('2026-10-25T10:00:00Z'));
    store.updateExercise(id, first.id, { ...bench, notes: 'Felt strong' });
    expect(workout().exercises[0]).toEqual({
      ...bench,
      notes: 'Felt strong',
      id: first.id,
      loggedAt: '2026-10-25T09:00:00.000Z', // kept from when it was first added
    });

    store.removeExercise(id, first.id);
    expect(workout().exercises.map((e) => e.name)).toEqual(['Row']);
  });

  it('ranks workout names, leaving out the one being edited, and finds the last workout by name', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const store = create();
    const workout = (iso: string, name?: string) => {
      vi.setSystemTime(new Date(iso));
      return store.create({ type: 'workout', date: iso.slice(0, 10), ...(name ? { name } : {}), exercises: [] });
    };
    const pushOld = workout('2026-10-01T08:00:00Z', 'push day');
    workout('2026-10-02T08:00:00Z', 'Leg day');
    const pushNew = workout('2026-10-03T08:00:00Z', 'Push Day');
    workout('2026-10-04T08:00:00Z');
    const current = workout('2026-10-05T08:00:00Z', 'Pu'); // half-typed, autosaved

    expect(store.workoutNamesExcept(current.id)).toEqual(['Push Day', 'Leg day']);
    expect(store.lastWorkoutNamed(' push DAY ', current.id)?.id).toBe(pushNew.id);
    expect(store.lastWorkoutNamed('Push Day', pushNew.id)?.id).toBe(pushOld.id);
    expect(store.lastWorkoutNamed('', current.id)).toBeUndefined();
    expect(store.lastWorkoutNamed('Pu', current.id)).toBeUndefined();
  });

  it('lists exercise names, most used first, merging case and keeping the latest spelling', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const store = create();
    const workout = (iso: string, names: string[]) => {
      vi.setSystemTime(new Date(iso));
      const { id } = store.create({ type: 'workout', date: iso.slice(0, 10), exercises: [] });
      names.forEach((name) => store.addExercise(id, { ...bench, name }));
    };
    workout('2026-10-01T08:00:00Z', ['bench press', 'Squat', 'Row']);
    workout('2026-10-02T08:00:00Z', ['Bench Press', 'Squat']);
    workout('2026-10-03T08:00:00Z', ['Bench Press', 'Curl']);
    store.create({ type: 'weigh-in', date: '2026-10-03', weight: 180 });

    expect(store.exerciseNames()).toEqual(['Bench Press', 'Squat', 'Curl', 'Row']);
  });

  it('finds the latest logged exercise by name (case-insensitive)', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const store = create();
    vi.setSystemTime(new Date('2026-10-01T08:00:00Z'));
    const older = store.create({ type: 'workout', date: '2026-10-01', exercises: [] });
    store.addExercise(older.id, { ...bench, notes: 'old' });
    vi.setSystemTime(new Date('2026-10-02T08:00:00Z'));
    const newer = store.create({ type: 'workout', date: '2026-10-02', exercises: [] });
    store.addExercise(newer.id, { ...bench, notes: 'first today' });
    store.addExercise(newer.id, { ...bench, notes: 'second today' });

    expect(store.latestExercise(' BENCH press ')).toMatchObject({
      date: '2026-10-02',
      exercise: { notes: 'second today' },
    });
    expect(store.latestExercise('Squat')).toBeUndefined();
  });

  it('loads saved entries on start', () => {
    const existing: Entry[] = [
      { id: 'a', type: 'weigh-in', date: '2026-10-01', createdAt: '2026-10-01T07:00:00Z', weight: 180 },
    ];
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(existing));
    expect(create().entries()).toEqual(existing);
  });

  it('moves entries saved under the old (Body XP) key to the new key, once', () => {
    const existing: Entry[] = [
      { id: 'a', type: 'weigh-in', date: '2026-10-01', createdAt: '2026-10-01T07:00:00Z', weight: 180 },
    ];
    localStorage.setItem(OLD_ENTRIES_KEY, JSON.stringify(existing));
    expect(create().entries()).toEqual(existing);
    expect(JSON.parse(localStorage.getItem(ENTRIES_KEY)!)).toEqual(existing);
    expect(localStorage.getItem(OLD_ENTRIES_KEY)).toBeNull();
  });

  it("doesn't overwrite newer data if both old and new keys exist", () => {
    localStorage.setItem(OLD_ENTRIES_KEY, '[]');
    localStorage.setItem(ENTRIES_KEY, JSON.stringify([{ id: 'new', type: 'weigh-in', date: '2026-10-02', createdAt: '2026-10-02T07:00:00Z' }]));
    expect(create().entries().map((e) => e.id)).toEqual(['new']);
    expect(localStorage.getItem(OLD_ENTRIES_KEY)).toBeNull();
  });

  it('starts empty if saved data is corrupt', () => {
    localStorage.setItem(ENTRIES_KEY, '{not json');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(create().entries()).toEqual([]);
  });
});

describe('changing entry type', () => {
  beforeEach(() => localStorage.clear());

  it('keeps id, date, createdAt and notes, drops the old type, and appends the given note', () => {
    const store = TestBed.inject(EntryStore);
    const w = store.create({ type: 'workout', date: '2026-10-20', name: 'Range', exercises: [], notes: 'Sunny' });
    store.changeType(w.id, { type: 'sport', sport: 'golf' }, 'Changed from Workout: Range.');
    expect(store.byId(w.id)).toEqual({
      id: w.id,
      date: '2026-10-20',
      createdAt: w.createdAt,
      type: 'sport',
      sport: 'golf',
      notes: 'Sunny\n\nChanged from Workout: Range.',
    });
  });

  it('lists what a change would remove', () => {
    const base = { id: 'x', date: '2026-10-01', createdAt: '2026-10-01T12:00:00Z' };
    expect(droppedFields({ ...base, type: 'workout', exercises: [] })).toEqual([]);
    expect(
      droppedFields({ ...base, type: 'workout', name: 'Push', exercises: [{ ...bench, id: 'e' }, { ...bench, id: 'f' }] }),
    ).toEqual(['name', '2 exercises']);
    expect(droppedFields({ ...base, type: 'move', activity: 'run', distance: 3, location: 'Park' })).toEqual([
      'distance',
      'location',
    ]);
    expect(droppedFields({ ...base, type: 'weigh-in' })).toEqual([]);
    expect(droppedFields({ ...base, type: 'sport', sport: 'golf', format: '18-holes', score: 90 })).toEqual([
      'type',
      'score',
    ]);
  });

  it('describes removed details as a note', () => {
    const base = { id: 'x', date: '2026-10-01', createdAt: '2026-10-01T12:00:00Z' };
    expect(
      describeDropped({
        ...base,
        type: 'workout',
        name: 'Range day',
        exercises: [
          {
            id: 'e',
            name: 'Driver',
            machineSetting: 4,
            steps: [
              { type: 'set', reps: 10, weight: 135, failure: false, easy: false },
              { type: 'rest', minutes: 2 },
              { type: 'set', reps: 8, failure: true, easy: false },
            ],
          },
        ],
      }),
    ).toBe('Changed from Workout: Range day. Driver (setting 4): 10 × 135 lb, 8 reps (Failure).');
    expect(describeDropped({ ...base, type: 'move', activity: 'run', distance: 3.1, durationMinutes: 28 })).toBe(
      'Changed from Run: 3.1 mi · 28 min',
    );
    expect(describeDropped({ ...base, type: 'weigh-in', weight: 181 })).toBe('Changed from Weigh-in: 181 lb');
    expect(describeDropped({ ...base, type: 'sport', sport: 'golf', format: '9-holes', score: 45 })).toBe(
      'Changed from Golf: 9 holes · Score 45',
    );
    expect(describeDropped({ ...base, type: 'weigh-in' })).toBeNull();
  });

  it('offers the same menu for New entry and Change type', () => {
    expect(ENTRY_TYPE_OPTIONS.map((o) => [o.group ?? '', o.label])).toEqual([
      ['', 'Workout'],
      ['Get Moving', 'Walk'],
      ['Get Moving', 'Run'],
      ['Get Moving', 'Bike'],
      ['Sport', 'Golf'],
      ['', 'Weigh-in'],
    ]);
  });
});

describe('entry helpers', () => {
  it('stepLabels numbers sets and rests separately, in order', () => {
    expect(
      stepLabels([{ type: 'set' }, { type: 'rest' }, { type: 'set' }, { type: 'rest' }]),
    ).toEqual(['Set 1', 'Rest 1', 'Set 2', 'Rest 2']);
  });

  it('matches exercise names when every typed word starts some word in the name', () => {
    const names = ['Bench Press', 'Leg Press', 'Incline Bench Press', 'Pull-up', 'Squat'];
    expect(matchNames(names, 'pre')).toEqual(['Bench Press', 'Leg Press', 'Incline Bench Press']);
    expect(matchNames(names, 'be pr')).toEqual(['Bench Press', 'Incline Bench Press']);
    expect(matchNames(names, 'UP')).toEqual(['Pull-up']);
    expect(matchNames(names, 'ress')).toEqual([]); // not a word start
    expect(matchNames(names, '')).toEqual(names);
    expect(matchNames(names, '  ', 2)).toEqual(['Bench Press', 'Leg Press']);
    expect(matchNames(names, 'squat')).toEqual([]); // exact match isn't suggested
  });

  it('formats duration and distance', () => {
    expect([0, 45, 60, 65, 130].map(formatDuration)).toEqual([
      '0 min',
      '45 min',
      '1 h',
      '1 h 5 min',
      '2 h 10 min',
    ]);
    expect([3, 3.1, 3.14159].map(formatDistance)).toEqual(['3 mi', '3.1 mi', '3.14 mi']);
  });
});

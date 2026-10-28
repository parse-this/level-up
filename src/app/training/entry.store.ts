import { Injectable, computed, inject, signal } from '@angular/core';
import { StorageService } from '../core/storage.service';
import {
  Entry,
  EntryTypeInit,
  Exercise,
  ExerciseInput,
  NewEntry,
  PreviousExercise,
  WorkoutEntry,
} from './entry';

export const ENTRIES_KEY = 'levelUpTracker.training.entries';

/**
 * Key name before the feature was renamed to Training Ground. Data is moved to the new key once.
 * TODO: remove (and use `load`) once every browser in use has opened the app since the rename.
 */
export const OLD_ENTRIES_KEY = 'levelUpTracker.bodyXp.entries';

/**
 * Dedupes names case-insensitively (the latest spelling wins) and ranks them
 * most used first, ties alphabetical. `names` must be oldest first.
 */
function rankNames(names: string[]): string[] {
  const byKey = new Map<string, { name: string; count: number }>();
  for (const name of names) {
    const key = name.toLowerCase();
    byKey.set(key, { name, count: (byKey.get(key)?.count ?? 0) + 1 });
  }
  return [...byKey.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .map((n) => n.name);
}

/** The Training Ground log: workouts, Get Moving entries and weigh-ins. */
@Injectable({ providedIn: 'root' })
export class EntryStore {
  private readonly storage = inject(StorageService);
  private readonly all = signal<Entry[]>(this.load());

  /** Newest date first; same date, newest created first. */
  readonly entries = computed(() =>
    [...this.all()].sort(
      (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    ),
  );

  /** Every exercise name logged, ranked (see `rankNames`). */
  readonly exerciseNames = computed(() =>
    rankNames(this.workoutsOldestFirst().flatMap((w) => w.exercises.map((e) => e.name))),
  );

  /**
   * Workout names, ranked, leaving out one workout — the one being edited, whose name
   * autosaves while typing and would otherwise suggest its own half-typed name.
   */
  workoutNamesExcept(id: string): string[] {
    return rankNames(
      this.workoutsOldestFirst()
        .filter((w) => w.id !== id && w.name)
        .map((w) => w.name!),
    );
  }

  /** The most recent other workout with this name (trimmed, case-insensitive). */
  lastWorkoutNamed(name: string, excludeId: string): WorkoutEntry | undefined {
    const key = name.trim().toLowerCase();
    if (!key) return undefined;
    return this.entries().find(
      (e): e is WorkoutEntry =>
        e.type === 'workout' && e.id !== excludeId && e.name?.toLowerCase() === key,
    );
  }

  /** The most recent logged exercise with this name (case-insensitive), with its workout date. */
  latestExercise(name: string): PreviousExercise | undefined {
    const key = name.trim().toLowerCase();
    for (const entry of this.entries()) {
      if (entry.type !== 'workout') continue;
      // Within a workout, the later exercise is the more recent one.
      const match = [...entry.exercises].reverse().find((e) => e.name.toLowerCase() === key);
      if (match) return { exercise: match, date: entry.date };
    }
    return undefined;
  }

  byId(id: string): Entry | undefined {
    return this.all().find((e) => e.id === id);
  }

  create(init: NewEntry): Entry {
    const entry = { ...init, id: crypto.randomUUID(), createdAt: new Date().toISOString() } as Entry;
    this.commit([...this.all(), entry]);
    return entry;
  }

  /** Saves a changed entry (matched by id). */
  replace(entry: Entry): void {
    this.commit(this.all().map((e) => (e.id === entry.id ? entry : e)));
  }

  remove(id: string): void {
    this.commit(this.all().filter((e) => e.id !== id));
  }

  /**
   * Same entry, new type. Keeps the shared fields (id, date, createdAt, notes), so its
   * place in the log and its XP timing stay; the old type's own fields are dropped.
   * `extraNote` (e.g. a summary of what was dropped) is added to the notes.
   */
  changeType(id: string, next: EntryTypeInit, extraNote?: string): void {
    const old = this.byId(id);
    if (!old) return;
    const { date, createdAt, notes } = old;
    const merged = [notes, extraNote].filter(Boolean).join('\n\n');
    this.replace({ ...next, id, date, createdAt, ...(merged ? { notes: merged } : {}) } as Entry);
  }

  addExercise(workoutId: string, input: ExerciseInput): void {
    const exercise: Exercise = {
      ...input,
      id: crypto.randomUUID(),
      loggedAt: new Date().toISOString(),
    };
    this.updateWorkout(workoutId, (w) => ({ ...w, exercises: [...w.exercises, exercise] }));
  }

  updateExercise(workoutId: string, exerciseId: string, input: ExerciseInput): void {
    this.updateWorkout(workoutId, (w) => ({
      ...w,
      exercises: w.exercises.map((e) =>
        e.id === exerciseId
          ? { ...input, id: exerciseId, ...(e.loggedAt ? { loggedAt: e.loggedAt } : {}) }
          : e,
      ),
    }));
  }

  private workoutsOldestFirst(): WorkoutEntry[] {
    return [...this.entries()]
      .reverse()
      .filter((e): e is WorkoutEntry => e.type === 'workout');
  }

  removeExercise(workoutId: string, exerciseId: string): void {
    this.updateWorkout(workoutId, (w) => ({
      ...w,
      exercises: w.exercises.filter((e) => e.id !== exerciseId),
    }));
  }

  private updateWorkout(id: string, change: (w: WorkoutEntry) => WorkoutEntry): void {
    this.commit(this.all().map((e) => (e.id === id && e.type === 'workout' ? change(e) : e)));
  }

  private commit(entries: Entry[]): void {
    this.all.set(entries);
    this.storage.save(ENTRIES_KEY, entries);
  }

  private load(): Entry[] {
    return this.storage.loadRenamed<Entry[]>(OLD_ENTRIES_KEY, ENTRIES_KEY, []);
  }
}

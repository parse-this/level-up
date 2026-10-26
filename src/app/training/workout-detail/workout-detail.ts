import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChildren,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { HasUnsavedChanges } from '../../core/unsaved-changes.guard';
import { ExerciseCard } from '../exercise-card/exercise-card';
import { ExerciseForm } from '../exercise-form/exercise-form';
import { Exercise, ExerciseInput, WorkoutEntry, matchNames } from '../entry';
import { EntryStore } from '../entry.store';

/** A new exercise form that hasn't been saved yet. */
interface Draft {
  key: string;
  /** Started from the "Last time" panel with this name; null = blank. */
  name: string | null;
}

@Component({
  selector: 'app-workout-detail',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    ExerciseCard,
    ExerciseForm,
  ],
  templateUrl: './workout-detail.html',
  styleUrl: './workout-detail.scss',
})
export class WorkoutDetail implements HasUnsavedChanges {
  readonly entry = input.required<WorkoutEntry>();

  private readonly store = inject(EntryStore);
  private readonly forms = viewChildren(ExerciseForm);
  private readonly entryId = computed(() => this.entry().id);

  /** Exercises currently open for editing in place. */
  protected readonly editingIds = signal<ReadonlySet<string>>(new Set());
  /** New exercise forms, shown after the list. */
  protected readonly drafts = signal<Draft[]>([]);

  protected readonly exerciseNames = this.store.exerciseNames;
  protected readonly latestExercise = (name: string) => this.store.latestExercise(name);

  /** Date and name, saved as you type. */
  protected readonly details = new FormGroup({
    date: new FormControl('', { nonNullable: true, validators: Validators.required }),
    name: new FormControl('', { nonNullable: true }),
  });

  private readonly nameText = toSignal(this.details.controls.name.valueChanges, {
    initialValue: '',
  });

  /** Past workout names matching what's typed (this workout left out). */
  protected readonly nameSuggestions = computed(() =>
    matchNames(this.store.workoutNamesExcept(this.entryId()), this.nameText()),
  );

  /** The most recent other workout with this workout's name, for the "Last time" panel. */
  protected readonly lastWorkout = computed(() =>
    this.store.lastWorkoutNamed(this.entry().name ?? '', this.entryId()),
  );

  constructor() {
    // Load the form once per entry, so saving doesn't overwrite what's being typed.
    effect(() => {
      this.entryId();
      const e = untracked(this.entry);
      this.details.setValue({ date: e.date, name: e.name ?? '' }, { emitEvent: false });
    });

    this.details.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      const { date: typedDate, name } = this.details.getRawValue();
      const { name: _old, ...rest } = this.entry();
      // A blank date keeps the saved one, so the name still saves.
      const date = this.details.controls.date.valid ? typedDate : rest.date;
      const trimmed = name.trim();
      this.store.replace({ ...rest, date, ...(trimmed ? { name: trimmed } : {}) });
    });
  }

  hasUnsavedChanges(): boolean {
    return this.forms().some((f) => f.hasChanges());
  }

  /** Already logged in this workout (by name, ignoring case). */
  protected isLogged(name: string): boolean {
    const key = name.toLowerCase();
    return this.entry().exercises.some((e) => e.name.toLowerCase() === key);
  }

  /** A new form for this name is already open. */
  protected isStarted(name: string): boolean {
    const key = name.toLowerCase();
    return this.drafts().some((d) => d.name?.toLowerCase() === key);
  }

  protected isEditing(id: string): boolean {
    return this.editingIds().has(id);
  }

  /** Opens a new exercise form, optionally started from a past exercise's name. */
  protected newDraft(name: string | null): void {
    this.drafts.update((list) => [...list, { key: crypto.randomUUID(), name }]);
  }

  protected saveDraft(key: string, input: ExerciseInput): void {
    this.store.addExercise(this.entryId(), input);
    this.removeDraft(key);
  }

  protected removeDraft(key: string): void {
    this.drafts.update((list) => list.filter((d) => d.key !== key));
  }

  protected edit(exercise: Exercise): void {
    this.editingIds.update((ids) => new Set(ids).add(exercise.id));
  }

  protected saveEdit(id: string, input: ExerciseInput): void {
    this.store.updateExercise(this.entryId(), id, input);
    this.closeEdit(id);
  }

  protected closeEdit(id: string): void {
    this.editingIds.update((ids) => {
      const next = new Set(ids);
      next.delete(id);
      return next;
    });
  }

  protected removeExercise(exercise: Exercise): void {
    this.store.removeExercise(this.entryId(), exercise.id);
    this.closeEdit(exercise.id);
  }
}

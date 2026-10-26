import {
  Component,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { first } from 'rxjs';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  FormGroupDirective,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import {
  Exercise,
  ExerciseInput,
  ExerciseSet,
  MAX_MACHINE_SETTING,
  MAX_REPS,
  PreviousExercise,
  REST_MINUTES,
  Rest,
  Step,
  matchNames,
  stepLabels,
} from '../entry';

interface AutoFillNote {
  name: string;
  /** `YYYY-MM-DD` of the record the values came from. */
  date: string;
  /** e.g. "setting 6, 10 reps @ 200 lb" */
  summary: string;
}

function setGroup(set?: Partial<ExerciseSet>) {
  return new FormGroup({
    type: new FormControl('set' as const, { nonNullable: true }),
    reps: new FormControl<number | null>(set?.reps ?? null, [
      Validators.required,
      Validators.min(0),
      Validators.max(MAX_REPS),
    ]),
    weight: new FormControl<number | null>(set?.weight ?? null, Validators.min(0)),
    failure: new FormControl(set?.failure ?? false, { nonNullable: true }),
    easy: new FormControl(set?.easy ?? false, { nonNullable: true }),
  });
}

function restGroup(rest?: Partial<Rest>) {
  return new FormGroup({
    type: new FormControl('rest' as const, { nonNullable: true }),
    minutes: new FormControl<number | null>(rest?.minutes ?? null, Validators.required),
  });
}

type SetGroup = ReturnType<typeof setGroup>;
type RestGroup = ReturnType<typeof restGroup>;
type StepGroup = SetGroup | RestGroup;

function stepGroup(step: Step): StepGroup {
  return step.type === 'set' ? setGroup(step) : restGroup(step);
}

/** Form value â†’ saved step. Empty optional weight is omitted. */
function toStep(s: ReturnType<StepGroup['getRawValue']>): Step {
  if (s.type === 'rest') return { type: 'rest', minutes: s.minutes! };
  return {
    type: 'set',
    reps: s.reps!,
    ...(s.weight != null ? { weight: s.weight } : {}),
    failure: s.failure,
    easy: s.easy,
  };
}

/** Add/edit one exercise. Pass `exercise` to edit it; null means add. */
@Component({
  selector: 'app-exercise-form',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSlideToggleModule,
  ],
  templateUrl: './exercise-form.html',
  styleUrl: './exercise-form.scss',
})
export class ExerciseForm {
  readonly exercise = input<Exercise | null>(null);
  /** New exercise only: start with this name and auto-fill from its latest record. */
  readonly startWith = input<string | null>(null);
  /** Known exercise names for suggestions, most used first. */
  readonly knownNames = input<readonly string[]>([]);
  /** Looks up the most recent logged exercise by name, for auto-fill. */
  readonly previous = input<(name: string) => PreviousExercise | undefined>(() => undefined);
  readonly saved = output<ExerciseInput>();
  readonly cancelled = output<void>();

  protected readonly repOptions = Array.from({ length: MAX_REPS + 1 }, (_, i) => i);
  protected readonly restOptions = REST_MINUTES;
  protected readonly machineOptions = Array.from({ length: MAX_MACHINE_SETTING + 1 }, (_, i) => i);
  protected readonly stepLabels = stepLabels;
  private readonly formDir = viewChild.required(FormGroupDirective);

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/)],
    }),
    machineSetting: new FormControl<number | null>(null, [
      Validators.min(0),
      Validators.max(MAX_MACHINE_SETTING),
    ]),
    steps: new FormArray<StepGroup>([setGroup()]),
    notes: new FormControl('', { nonNullable: true }),
  });

  private readonly nameText = toSignal(this.form.controls.name.valueChanges, {
    initialValue: this.form.controls.name.value,
  });

  /** Names matching what's typed (any word, by prefix). */
  protected readonly nameSuggestions = computed(() =>
    matchNames(this.knownNames(), this.nameText()),
  );

  /** Shown under the name after an auto-fill: where the values came from. */
  protected readonly autoFillNote = signal<AutoFillNote | null>(null);

  /** Controls still holding an auto-filled value; each drops out once its value changes. */
  private readonly autoFilled = signal<ReadonlySet<AbstractControl>>(new Set());

  /** Whether the form currently holds an exercise being edited. */
  private loaded = false;
  /** `startWith` is applied once. */
  private started = false;

  /** Reload only when a different exercise is passed, not when the same one re-renders. */
  private readonly exerciseId = computed(() => this.exercise()?.id ?? null);

  constructor() {
    // Forms open on user action (edit, add, start), so bring each into view.
    // (scrollIntoView is missing in some test environments.)
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    afterNextRender(() => host.scrollIntoView?.({ behavior: 'smooth', block: 'start' }));

    // Load the exercise being edited, or reset when switching from edit back to add.
    // (The form starts blank, so there's nothing to reset on the first run.)
    effect(() => {
      this.exerciseId();
      const exercise = untracked(this.exercise);
      if (exercise) {
        this.clearAutoFill();
        this.steps.clear();
        exercise.steps.forEach((s) => this.steps.push(stepGroup(s)));
        this.form.patchValue({
          name: exercise.name,
          machineSetting: exercise.machineSetting ?? null,
          notes: exercise.notes ?? '',
        });
        this.loaded = true;
      } else if (this.loaded) {
        this.reset();
        this.loaded = false;
      }
    });

    effect(() => {
      const name = this.startWith();
      if (!name || this.started || untracked(this.exercise)) return;
      this.started = true;
      untracked(() => {
        this.form.controls.name.setValue(name);
        this.applyName(name);
      });
    });
  }

  /**
   * Unsaved changes worth warning about. Editing: anything changed.
   * New: anything typed, or a name filled in (e.g. started from a suggestion).
   */
  hasChanges(): boolean {
    if (this.exercise()) return this.form.dirty;
    return this.form.dirty || this.form.controls.name.value.trim() !== '';
  }

  protected get steps(): FormArray<StepGroup> {
    return this.form.controls.steps;
  }

  protected asSet(step: StepGroup): SetGroup | null {
    return step.controls.type.value === 'set' ? (step as SetGroup) : null;
  }

  protected asRest(step: StepGroup): RestGroup | null {
    return step.controls.type.value === 'rest' ? (step as RestGroup) : null;
  }

  /** Always keep at least one set; rests can always be removed. */
  protected canRemove(step: StepGroup): boolean {
    return !!this.asRest(step) || this.steps.controls.filter((s) => this.asSet(s)).length > 1;
  }

  /** New set copies the most recent set's weight. */
  protected addSet(): void {
    const lastSet = this.steps.controls.map((s) => this.asSet(s)).filter((s) => !!s).at(-1);
    this.steps.push(setGroup({ weight: lastSet?.controls.weight.value ?? undefined }));
  }

  protected addRest(): void {
    this.steps.push(restGroup());
  }

  protected removeStep(index: number): void {
    this.steps.removeAt(index);
  }

  /**
   * Picking a known exercise (when adding) fills blanks from its latest record:
   * machine setting, and reps + weight from its last set into every still-blank set.
   * Never overwrites what's already entered. Picking another name first undoes the last fill.
   */
  protected nameSelected(name: string): void {
    if (this.exercise()) return; // editing: picking a name just renames
    this.applyName(name);
  }

  private applyName(name: string): void {
    this.undoAutoFill();
    const prev = this.previous()(name);
    if (!prev) return;
    const { exercise, date } = prev;
    const filled: AbstractControl[] = [];

    const setting = this.form.controls.machineSetting;
    const settingFilled = setting.value == null && exercise.machineSetting != null;
    if (settingFilled) {
      setting.setValue(exercise.machineSetting!);
      filled.push(setting);
    }

    const lastSet = exercise.steps.filter((s) => s.type === 'set').at(-1);
    let setsFilled = false;
    if (lastSet) {
      for (const step of this.steps.controls) {
        const set = this.asSet(step);
        if (set && set.controls.reps.value == null && set.controls.weight.value == null) {
          set.patchValue({ reps: lastSet.reps, weight: lastSet.weight ?? null });
          filled.push(set.controls.reps);
          if (lastSet.weight != null) filled.push(set.controls.weight);
          setsFilled = true;
        }
      }
    }
    if (!filled.length) return;

    this.trackAutoFilled(filled);
    const parts: string[] = [];
    if (settingFilled) parts.push(`setting ${exercise.machineSetting}`);
    if (setsFilled && lastSet) {
      parts.push(`${lastSet.reps} reps` + (lastSet.weight != null ? ` @ ${lastSet.weight} lb` : ''));
    }
    this.autoFillNote.set({ name: exercise.name, date, summary: parts.join(', ') });
  }

  protected isAutoFilled(control: AbstractControl): boolean {
    return this.autoFilled().has(control);
  }

  protected setIsAutoFilled(set: SetGroup): boolean {
    return this.isAutoFilled(set.controls.reps) || this.isAutoFilled(set.controls.weight);
  }

  /** Puts every still-auto-filled value back to blank and hides the note. */
  protected undoAutoFill(): void {
    const controls = [...this.autoFilled()];
    this.clearAutoFill();
    controls.forEach((c) => c.setValue(null));
  }

  private trackAutoFilled(controls: AbstractControl[]): void {
    this.autoFilled.set(new Set(controls));
    for (const control of controls) {
      // The first change after filling (by the user, undo or reset) un-highlights it.
      control.valueChanges.pipe(first()).subscribe(() =>
        this.autoFilled.update((set) => {
          const next = new Set(set);
          next.delete(control);
          return next;
        }),
      );
    }
  }

  private clearAutoFill(): void {
    this.autoFilled.set(new Set());
    this.autoFillNote.set(null);
  }

  /** Toggle groups can't be un-selected by clicking, so this clears the setting. */
  protected clearMachineSetting(): void {
    this.form.controls.machineSetting.setValue(null);
  }

  /** Failure and Easy can't both be on. */
  protected toggled(set: SetGroup, which: 'failure' | 'easy', checked: boolean): void {
    if (checked) set.controls[which === 'failure' ? 'easy' : 'failure'].setValue(false);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const notes = v.notes.trim();
    this.saved.emit({
      name: v.name.trim(),
      ...(v.machineSetting != null ? { machineSetting: v.machineSetting } : {}),
      steps: v.steps.map(toStep),
      ...(notes ? { notes } : {}),
    });
    if (!this.exercise()) this.reset();
  }

  protected cancel(): void {
    this.cancelled.emit();
  }

  private reset(): void {
    this.clearAutoFill();
    this.steps.clear();
    this.steps.push(setGroup());
    // Resetting through the directive also clears the "submitted" state, so no errors show.
    this.formDir().resetForm({ name: '', machineSetting: null, notes: '' });
  }
}

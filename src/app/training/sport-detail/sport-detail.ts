import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { GOLF_FORMATS, GOLF_FORMAT_LABELS, GolfFormat, SportEntry } from '../entry';
import { EntryStore } from '../entry.store';

const wholeNumber = Validators.pattern(/^\d+$/);

/** Sport entry (golf): date, Practice / 9 holes / 18 holes, optional score. Saved as you go. */
@Component({
  selector: 'app-sport-detail',
  imports: [
    ReactiveFormsModule,
    MatButtonToggleModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <mat-card appearance="outlined" class="details-card">
      <mat-card-content>
        <form [formGroup]="form" novalidate>
          <div class="field-label" id="format-label">Type</div>
          <mat-button-toggle-group
            class="choices"
            formControlName="format"
            hideSingleSelectionIndicator
            aria-labelledby="format-label"
          >
            @for (f of formats; track f) {
              <mat-button-toggle [value]="f">{{ formatLabels[f] }}</mat-button-toggle>
            }
          </mat-button-toggle-group>

          <div class="details">
            <mat-form-field class="date-field">
              <mat-label>Date</mat-label>
              <input matInput type="date" formControlName="date" />
              <mat-error>Date is required.</mat-error>
            </mat-form-field>
            @if (showScore()) {
              <mat-form-field class="small-field">
                <mat-label>Score (optional)</mat-label>
                <input
                  matInput
                  type="number"
                  inputmode="numeric"
                  min="1"
                  step="1"
                  formControlName="score"
                />
                <mat-error>Whole number, 1 or more.</mat-error>
              </mat-form-field>
            }
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    form {
      padding-top: 16px;
    }
  `,
})
export class SportDetail {
  readonly entry = input.required<SportEntry>();

  private readonly store = inject(EntryStore);
  private readonly entryId = computed(() => this.entry().id);

  protected readonly formats = GOLF_FORMATS;
  protected readonly formatLabels = GOLF_FORMAT_LABELS;

  protected readonly form = new FormGroup({
    format: new FormControl<GolfFormat | null>(null),
    date: new FormControl('', { nonNullable: true, validators: Validators.required }),
    score: new FormControl<number | null>(null, [Validators.min(1), wholeNumber]),
  });

  /** Selected type, as a signal (drives whether the score field shows). */
  private readonly format = signal<GolfFormat | null>(null);

  /** Score only applies to a round (9 or 18 holes), not practice. */
  protected readonly showScore = computed(() => {
    const f = this.format();
    return f === '9-holes' || f === '18-holes';
  });

  constructor() {
    // Load once per entry, so saving doesn't overwrite what's being typed.
    effect(() => {
      this.entryId();
      const e = untracked(this.entry);
      this.form.setValue(
        { format: e.format ?? null, date: e.date, score: e.score ?? null },
        { emitEvent: false },
      );
      this.format.set(e.format ?? null);
    });

    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.format.set(this.form.controls.format.value);
      this.save();
    });
  }

  private save(): void {
    const { format, date, score } = this.form.controls;
    // An invalid score isn't saved; a blank date keeps the saved one so other fields still save.
    if (this.showScore() && score.invalid) return;
    const { id, createdAt, notes, sport, date: savedDate } = this.entry();
    const keepScore = this.showScore() && score.value != null;
    // Rebuild so cleared optional fields are dropped.
    this.store.replace({
      id,
      createdAt,
      ...(notes ? { notes } : {}), // entry notes are edited separately; keep them
      type: 'sport',
      sport,
      date: date.valid ? date.value : savedDate,
      ...(format.value ? { format: format.value } : {}),
      ...(keepScore ? { score: score.value! } : {}),
    });
  }
}

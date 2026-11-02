import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { WeighInEntry } from '../entry';
import { EntryStore } from '../entry.store';

/**
 * Weigh-in entry: date and weight. Saved as you type. A weigh-in with no weight yet starts
 * from the last earlier weigh-in's weight (highlighted until changed, with Undo).
 */
@Component({
  selector: 'app-weigh-in-detail',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  template: `
    <mat-card appearance="outlined" class="details-card">
      <mat-card-content>
        <form class="details" [formGroup]="form" novalidate>
          <mat-form-field class="date-field">
            <mat-label>Date</mat-label>
            <input matInput type="date" formControlName="date" />
            <mat-error>Date is required.</mat-error>
          </mat-form-field>
          <mat-form-field class="small-field weight-field" [class.auto-filled]="autoFilledFrom()">
            <mat-label>Weight (lb)</mat-label>
            <input
              matInput
              type="number"
              inputmode="decimal"
              min="0"
              step="0.1"
              formControlName="weight"
            />
            <mat-error>Can't be negative.</mat-error>
          </mat-form-field>
        </form>
        @if (autoFilledFrom(); as from) {
          <div class="autofill-note" role="status">
            <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">auto_awesome</mat-icon>
            <span class="autofill-text"
              >Filled from your last weigh-in ({{ from | date: 'EEE, MMM d' }}). Change it to
              today's weight.</span
            >
            <button matButton type="button" class="undo-autofill" (click)="undoAutoFill()">
              Undo
            </button>
          </div>
        }
        <p class="entered">Entered {{ entry().createdAt | date: 'MMM d, y, h:mm a' }}</p>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    :host {
      --autofill: #f8da92;
      --autofill-tint: color-mix(in srgb, var(--autofill) 12%, transparent);
      --autofill-border: color-mix(in srgb, var(--autofill) 35%, transparent);
    }
    .weight-field.auto-filled {
      --mat-form-field-filled-container-color: var(--autofill-tint);
      --mat-form-field-filled-input-text-color: var(--autofill);
      --mat-form-field-outlined-input-text-color: var(--autofill);
    }
    .autofill-note {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 12px;
      padding: 2px 4px 2px 12px;
      border: 1px solid var(--autofill-border);
      border-radius: 8px;
      background-color: var(--autofill-tint);
      color: var(--mat-sys-on-surface);
      font: var(--mat-sys-body-medium);
      mat-icon {
        flex-shrink: 0;
        color: var(--autofill);
      }
      .autofill-text {
        flex: 1;
        min-width: 0;
      }
      .undo-autofill {
        flex-shrink: 0;
        --mat-button-text-label-text-color: var(--autofill);
      }
    }
    .entered {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class WeighInDetail {
  readonly entry = input.required<WeighInEntry>();

  private readonly store = inject(EntryStore);
  private readonly entryId = computed(() => this.entry().id);

  protected readonly form = new FormGroup({
    date: new FormControl('', { nonNullable: true, validators: Validators.required }),
    weight: new FormControl<number | null>(null, Validators.min(0)),
  });

  /** Date of the weigh-in the weight was copied from, while that copied weight is untouched. */
  protected readonly autoFilledFrom = signal<string | null>(null);

  constructor() {
    // Load the form once per entry, so saving doesn't overwrite what's being typed.
    effect(() => {
      this.entryId();
      untracked(() => this.load(this.entry()));
    });

    // Any change to the weight (typing, clearing, Undo) ends the highlight.
    this.form.controls.weight.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.autoFilledFrom.set(null));

    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.save());
  }

  protected undoAutoFill(): void {
    this.form.controls.weight.setValue(null);
  }

  private load(e: WeighInEntry): void {
    this.form.setValue({ date: e.date, weight: e.weight ?? null }, { emitEvent: false });
    this.autoFilledFrom.set(null);
    if (e.weight != null) return;
    const last = this.store.lastWeighIn(e.date, e.id);
    if (!last) return;
    this.form.controls.weight.setValue(last.weight!, { emitEvent: false });
    this.autoFilledFrom.set(last.date);
    this.save();
  }

  private save(): void {
    // An invalid weight isn't saved; a blank date keeps the saved one so the weight still saves.
    if (this.form.controls.weight.invalid) return;
    const { date, weight } = this.form.getRawValue();
    const { id, createdAt, notes, date: savedDate } = this.entry();
    this.store.replace({
      id,
      createdAt,
      ...(notes ? { notes } : {}), // entry notes are edited separately; keep them
      type: 'weigh-in',
      date: this.form.controls.date.valid ? date : savedDate,
      ...(weight != null ? { weight } : {}),
    });
  }
}

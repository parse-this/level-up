import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { WeighInEntry } from '../entry';
import { EntryStore } from '../entry.store';

/** Weigh-in entry: date and weight. Saved as you type. */
@Component({
  selector: 'app-weigh-in-detail',
  imports: [DatePipe, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule],
  template: `
    <mat-card appearance="outlined" class="details-card">
      <mat-card-content>
        <form class="details" [formGroup]="form" novalidate>
          <mat-form-field class="date-field">
            <mat-label>Date</mat-label>
            <input matInput type="date" formControlName="date" />
            <mat-error>Date is required.</mat-error>
          </mat-form-field>
          <mat-form-field class="small-field">
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
        <p class="entered">Entered {{ entry().createdAt | date: 'MMM d, y, h:mm a' }}</p>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
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

  constructor() {
    // Load the form once per entry, so saving doesn't overwrite what's being typed.
    effect(() => {
      this.entryId();
      const e = untracked(this.entry);
      this.form.setValue({ date: e.date, weight: e.weight ?? null }, { emitEvent: false });
    });

    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      // An invalid weight isn't saved; a blank date keeps the saved one so the weight still saves.
      if (this.form.controls.weight.invalid) return;
      const { date, weight } = this.form.getRawValue();
      const { id, createdAt, date: savedDate } = this.entry();
      this.store.replace({
        id,
        createdAt,
        type: 'weigh-in',
        date: this.form.controls.date.valid ? date : savedDate,
        ...(weight != null ? { weight } : {}),
      });
    });
  }
}

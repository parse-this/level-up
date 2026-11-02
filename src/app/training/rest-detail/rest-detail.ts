import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RestEntry } from '../entry';
import { EntryStore } from '../entry.store';

/** Rest day entry: just the date (notes are on the shared frame). Saved as you change it. */
@Component({
  selector: 'app-rest-detail',
  imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule],
  template: `
    <mat-card appearance="outlined" class="details-card">
      <mat-card-content>
        <form class="details" [formGroup]="form" novalidate>
          <mat-form-field class="date-field">
            <mat-label>Date</mat-label>
            <input matInput type="date" formControlName="date" />
            <mat-error>Date is required.</mat-error>
          </mat-form-field>
        </form>
        <p class="explain">
          Recovery is part of training. A rest day keeps your streak going (and its bonus), with no
          XP lost. Like other entries, it counts for today or yesterday.
        </p>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .explain {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class RestDetail {
  readonly entry = input.required<RestEntry>();

  private readonly store = inject(EntryStore);
  private readonly entryId = computed(() => this.entry().id);

  protected readonly form = new FormGroup({
    date: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });

  constructor() {
    // Load once per entry, so saving doesn't overwrite what's being typed.
    effect(() => {
      this.entryId();
      this.form.setValue({ date: untracked(this.entry).date }, { emitEvent: false });
    });

    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.form.controls.date.invalid) return; // a blank date keeps the saved one
      const { id, createdAt, notes } = this.entry();
      this.store.replace({
        id,
        createdAt,
        ...(notes ? { notes } : {}), // entry notes are edited separately; keep them
        type: 'rest',
        date: this.form.controls.date.value,
      });
    });
  }
}

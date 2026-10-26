import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ACTIVITIES, ACTIVITY_LABELS, Activity, MoveEntry } from '../entry';
import { EntryStore } from '../entry.store';

const whole = Validators.pattern(/^\d+$/);

/** Get Moving entry: activity, location, duration, distance. Saved as you type. */
@Component({
  selector: 'app-move-detail',
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
          <div class="field-label" id="activity-label">Activity</div>
          <mat-button-toggle-group
            class="choices"
            formControlName="activity"
            hideSingleSelectionIndicator
            aria-labelledby="activity-label"
          >
            @for (a of activities; track a) {
              <mat-button-toggle [value]="a">{{ labels[a] }}</mat-button-toggle>
            }
          </mat-button-toggle-group>

          <div class="details">
            <mat-form-field class="date-field">
              <mat-label>Date</mat-label>
              <input matInput type="date" formControlName="date" />
              <mat-error>Date is required.</mat-error>
            </mat-form-field>
            <mat-form-field class="grow">
              <mat-label>Location</mat-label>
              <input matInput formControlName="location" autocomplete="off" />
            </mat-form-field>
          </div>

          <div class="details no-pad">
            <mat-form-field class="small-field">
              <mat-label>Hours</mat-label>
              <input matInput type="number" inputmode="numeric" min="0" step="1" formControlName="hours" />
              <mat-error>Whole number.</mat-error>
            </mat-form-field>
            <mat-form-field class="small-field">
              <mat-label>Minutes</mat-label>
              <input
                matInput
                type="number"
                inputmode="numeric"
                min="0"
                max="59"
                step="1"
                formControlName="minutes"
              />
              <mat-error>0 to 59.</mat-error>
            </mat-form-field>
            <mat-form-field class="small-field">
              <mat-label>Distance (mi)</mat-label>
              <input
                matInput
                type="number"
                inputmode="decimal"
                min="0"
                step="0.01"
                formControlName="distance"
              />
              <mat-error>Can't be negative.</mat-error>
            </mat-form-field>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    form {
      padding-top: 16px;
    }
    .no-pad {
      padding-top: 0;
    }
  `,
})
export class MoveDetail {
  readonly entry = input.required<MoveEntry>();

  private readonly store = inject(EntryStore);
  private readonly entryId = computed(() => this.entry().id);

  protected readonly activities = ACTIVITIES;
  protected readonly labels = ACTIVITY_LABELS;

  protected readonly form = new FormGroup({
    activity: new FormControl<Activity>('walk', { nonNullable: true, validators: Validators.required }),
    date: new FormControl('', { nonNullable: true, validators: Validators.required }),
    location: new FormControl('', { nonNullable: true }),
    hours: new FormControl<number | null>(null, [Validators.min(0), whole]),
    minutes: new FormControl<number | null>(null, [Validators.min(0), Validators.max(59), whole]),
    distance: new FormControl<number | null>(null, Validators.min(0)),
  });

  constructor() {
    // Load the form once per entry, so saving doesn't overwrite what's being typed.
    effect(() => {
      this.entryId();
      const e = untracked(this.entry);
      const d = e.durationMinutes;
      this.form.setValue(
        {
          activity: e.activity,
          date: e.date,
          location: e.location ?? '',
          hours: d != null ? Math.floor(d / 60) : null,
          minutes: d != null ? d % 60 : null,
          distance: e.distance ?? null,
        },
        { emitEvent: false },
      );
    });

    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      // Invalid numbers aren't saved; a blank date keeps the saved one so other fields still save.
      const { date: dateControl, ...others } = this.form.controls;
      if (Object.values(others).some((c) => c.invalid)) return;
      const v = this.form.getRawValue();
      const location = v.location.trim();
      const hasDuration = v.hours != null || v.minutes != null;
      const { id, createdAt, date: savedDate } = this.entry();
      // Rebuild so cleared optional fields are dropped.
      this.store.replace({
        id,
        createdAt,
        type: 'move',
        date: dateControl.valid ? v.date : savedDate,
        activity: v.activity,
        ...(location ? { location } : {}),
        ...(hasDuration ? { durationMinutes: (v.hours ?? 0) * 60 + (v.minutes ?? 0) } : {}),
        ...(v.distance != null ? { distance: v.distance } : {}),
      });
    });
  }
}

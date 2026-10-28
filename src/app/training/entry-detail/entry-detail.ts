import { Component, computed, effect, inject, input, untracked, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TextFieldModule } from '@angular/cdk/text-field';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BackRail } from '../../core/back-rail';
import { ConfirmService } from '../../core/confirm-dialog';
import { HasUnsavedChanges } from '../../core/unsaved-changes.guard';
import {
  Entry,
  MoveEntry,
  SportEntry,
  WeighInEntry,
  WorkoutEntry,
  entryIcon,
  entryLabel,
} from '../entry';
import { SportDetail } from '../sport-detail/sport-detail';
import { EntryStore } from '../entry.store';
import { MoveDetail } from '../move-detail/move-detail';
import { WeighInDetail } from '../weigh-in-detail/weigh-in-detail';
import { WorkoutDetail } from '../workout-detail/workout-detail';

/**
 * Shared frame for any entry: a full-height "All entries" rail on the left,
 * then heading + delete and the type-specific body.
 */
@Component({
  selector: 'app-entry-detail',
  imports: [
    BackRail,
    ReactiveFormsModule,
    TextFieldModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    WorkoutDetail,
    MoveDetail,
    WeighInDetail,
    SportDetail,
  ],
  template: `
    <div class="layout">
      <app-back-rail link="/training" label="All entries" />

      <div class="content">
        @if (entry(); as e) {
          <div class="heading-row">
            <h2 class="entry-heading">
              <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">{{ icon(e) }}</mat-icon>
              {{ label(e) }}
            </h2>
            <button matIconButton type="button" (click)="remove()" aria-label="Delete entry">
              <mat-icon fontSet="material-symbols-outlined">delete</mat-icon>
            </button>
          </div>
          @if (asWorkout(e); as w) {
            <app-workout-detail [entry]="w" />
          }
          @if (asMove(e); as m) {
            <app-move-detail [entry]="m" />
          }
          @if (asWeighIn(e); as w) {
            <app-weigh-in-detail [entry]="w" />
          }
          @if (asSport(e); as s) {
            <app-sport-detail [entry]="s" />
          }

          <mat-form-field class="entry-notes">
            <mat-label>Notes</mat-label>
            <textarea matInput rows="3" [formControl]="notes" cdkTextareaAutosize></textarea>
          </mat-form-field>

          <div class="footer">
            <span class="autosave">
              <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">cloud_done</mat-icon>
              Saves automatically
            </span>
            <button matButton="filled" type="button" class="done" (click)="done()">
              <mat-icon fontSet="material-symbols-outlined">check</mat-icon>
              Done
            </button>
          </div>
        } @else {
          <p class="empty">Entry not found.</p>
        }
      </div>
    </div>
  `,
  styles: `
    .layout {
      display: grid;
      grid-template-columns: 56px minmax(0, 1fr);
      gap: 16px;
      align-items: stretch;
    }

    @media (max-width: 599.98px) {
      .layout {
        grid-template-columns: 40px minmax(0, 1fr);
        gap: 12px;
      }
    }

    .heading-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 16px;
    }

    .entry-heading {
      display: flex;
      align-items: center;
      gap: 8px;
      font: var(--mat-sys-headline-small);
      margin: 0;
    }

    .empty {
      color: var(--mat-sys-on-surface-variant);
      text-align: center;
    }

    .entry-notes {
      display: block;
      margin-top: 24px;
    }

    .footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      margin-bottom: 8px;
    }

    .autosave {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);

      mat-icon {
        width: 18px;
        height: 18px;
        font-size: 18px;
      }
    }
  `,
})
export class EntryDetail implements HasUnsavedChanges {
  /** From the `:entryId` route param. */
  readonly entryId = input.required<string>();

  private readonly store = inject(EntryStore);
  private readonly workout = viewChild(WorkoutDetail);
  /** Set once the entry is deleted, so leaving doesn't also ask about unsaved forms. */
  private deleted = false;
  private readonly router = inject(Router);
  private readonly confirmService = inject(ConfirmService);

  protected readonly entry = computed(() => this.store.byId(this.entryId()));
  protected readonly icon = entryIcon;
  protected readonly label = entryLabel;

  /** Notes about the whole entry; saved as you type. */
  protected readonly notes = new FormControl('', { nonNullable: true });

  constructor() {
    // Load once per entry, so saving doesn't overwrite what's being typed.
    effect(() => {
      this.entryId();
      const e = untracked(this.entry);
      this.notes.setValue(e?.notes ?? '', { emitEvent: false });
    });

    this.notes.valueChanges.pipe(takeUntilDestroyed()).subscribe((text) => {
      const e = this.entry();
      if (!e) return;
      const { notes: _old, ...rest } = e;
      const trimmed = text.trim();
      this.store.replace({ ...rest, ...(trimmed ? { notes: trimmed } : {}) } as Entry);
    });
  }

  /** Back to the log (everything is already saved; unsaved exercise forms still ask first). */
  protected done(): void {
    this.router.navigate(['/training']);
  }

  hasUnsavedChanges(): boolean {
    return !this.deleted && (this.workout()?.hasUnsavedChanges() ?? false);
  }

  protected asWorkout(e: Entry): WorkoutEntry | null {
    return e.type === 'workout' ? e : null;
  }

  protected asMove(e: Entry): MoveEntry | null {
    return e.type === 'move' ? e : null;
  }

  protected asSport(e: Entry): SportEntry | null {
    return e.type === 'sport' ? e : null;
  }

  protected asWeighIn(e: Entry): WeighInEntry | null {
    return e.type === 'weigh-in' ? e : null;
  }

  protected async remove(): Promise<void> {
    const e = this.entry();
    if (!e) return;
    const count = e.type === 'workout' ? e.exercises.length : 0;
    const confirmed = await this.confirmService.confirm({
      title: `Delete ${entryLabel(e).toLowerCase()}?`,
      message: count
        ? `Its ${count} ${count === 1 ? 'exercise' : 'exercises'} will be deleted too. This can't be undone.`
        : "This can't be undone.",
    });
    if (!confirmed) return;
    this.deleted = true;
    this.store.remove(e.id);
    this.router.navigate(['/training']);
  }
}

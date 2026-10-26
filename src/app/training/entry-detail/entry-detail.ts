import { Component, computed, inject, input, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BackRail } from '../../core/back-rail';
import { ConfirmService } from '../../core/confirm-dialog';
import { HasUnsavedChanges } from '../../core/unsaved-changes.guard';
import { Entry, MoveEntry, WeighInEntry, WorkoutEntry, entryIcon, entryLabel } from '../entry';
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
    MatButtonModule,
    MatIconModule,
    WorkoutDetail,
    MoveDetail,
    WeighInDetail,
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

  hasUnsavedChanges(): boolean {
    return !this.deleted && (this.workout()?.hasUnsavedChanges() ?? false);
  }

  protected asWorkout(e: Entry): WorkoutEntry | null {
    return e.type === 'workout' ? e : null;
  }

  protected asMove(e: Entry): MoveEntry | null {
    return e.type === 'move' ? e : null;
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

import { Component, input, output, viewChild } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenu, MatMenuModule } from '@angular/material/menu';
import { ENTRY_TYPE_OPTIONS, Entry, EntryTypeInit, isSameKind } from '../entry';

/**
 * The entry-type menu (Workout | Get Moving: Walk, Run, Bike | Sport: Golf | Weigh-in), shared by
 * "New entry" and "Change type". Open it with `[matMenuTriggerFor]="picker.menu()"`.
 */
@Component({
  selector: 'app-entry-type-menu',
  imports: [MatDividerModule, MatIconModule, MatMenuModule],
  template: `
    <mat-menu #menu="matMenu">
      @for (o of options; track o.label; let first = $first) {
        @let startsGroup = o.group !== options[$index - 1]?.group;
        @if (!first && startsGroup) {
          <mat-divider />
        }
        @if (o.group && startsGroup) {
          <div class="menu-heading" aria-hidden="true">{{ o.group }}</div>
        }
        <button
          mat-menu-item
          type="button"
          class="type-option"
          [class.current]="isCurrent(o.init)"
          [attr.aria-current]="isCurrent(o.init) ? 'true' : null"
          (click)="picked.emit(o.init)"
        >
          <mat-icon fontSet="material-symbols-outlined">{{ o.icon }}</mat-icon>
          <span>{{ o.label }}</span>
          @if (isCurrent(o.init)) {
            <mat-icon class="check" fontSet="material-symbols-outlined" aria-hidden="true">check</mat-icon>
          }
        </button>
      }
    </mat-menu>
  `,
  styles: `
    .menu-heading {
      font: var(--mat-sys-label-medium);
      color: var(--mat-sys-on-surface-variant);
      padding: 8px 16px 0;
    }

    .current {
      color: var(--mat-sys-primary);
    }

    .check {
      margin: 0 0 0 auto;
    }
  `,
})
export class EntryTypeMenu {
  /** The entry being changed (marks its type as current); omit for "New entry". */
  readonly current = input<Entry | null>(null);
  readonly picked = output<EntryTypeInit>();

  readonly menu = viewChild.required<MatMenu>('menu');
  protected readonly options = ENTRY_TYPE_OPTIONS;

  protected isCurrent(init: EntryTypeInit): boolean {
    const c = this.current();
    return !!c && isSameKind(c, init);
  }
}

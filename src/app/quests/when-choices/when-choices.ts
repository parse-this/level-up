import { Component, booleanAttribute, input, model } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { HORIZON_LABELS, SORTED_HORIZONS } from '../quest';

/** An extra choice shown before Today · Soon · Someday (e.g. "All" on the tabs, "Inbox" on a quest). */
export interface WhenFirstChoice {
  value: string;
  label: string;
}

/**
 * The "When" toggles used across the Quest Log: Today · Soon · Someday, with an optional first
 * choice and optional counts. `value` is a horizon id (or the first choice's value), or null for
 * none picked (only when `clearable`: tapping the picked one again clears it).
 */
@Component({
  selector: 'app-when-choices',
  imports: [MatButtonToggleModule],
  template: `
    <mat-button-toggle-group
      class="choices"
      [value]="value()"
      (change)="changed($event.value)"
      hideSingleSelectionIndicator
      [attr.aria-label]="ariaLabelledby() ? null : ariaLabel()"
      [attr.aria-labelledby]="ariaLabelledby()"
    >
      @if (first(); as f) {
        <mat-button-toggle [value]="f.value" (click)="pick(f.value)">
          {{ f.label }}
          @if (counts(); as c) {
            <span class="count">{{ c[f.value] ?? 0 }}</span>
          }
        </mat-button-toggle>
      }
      @for (h of horizons; track h) {
        <mat-button-toggle [value]="h" (click)="pick(h)">
          {{ labels[h] }}
          @if (counts(); as c) {
            <span class="count">{{ c[h] ?? 0 }}</span>
          }
        </mat-button-toggle>
      }
    </mat-button-toggle-group>
  `,
  styles: `
    :host {
      display: block;
    }
    // Full width, equal buttons (same as the global .choices; set here so Material's own
    // inline-flex doesn't win now that the group lives in this component).
    mat-button-toggle-group.choices {
      display: flex;
      flex-wrap: wrap;
    }
    mat-button-toggle {
      flex: 1 0 40px;
    }
    .count {
      margin-left: 4px;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-label-small);
    }
  `,
})
export class WhenChoices {
  readonly value = model<string | null>(null);
  readonly first = input<WhenFirstChoice | null>(null);
  readonly counts = input<Record<string, number> | null>(null);
  readonly clearable = input(false, { transform: booleanAttribute });
  readonly ariaLabel = input('When');
  readonly ariaLabelledby = input<string | null>(null);

  protected readonly horizons = SORTED_HORIZONS;
  protected readonly labels = HORIZON_LABELS;

  /** Set when a click just picked a new choice, so the same click doesn't also clear it. */
  private justChanged = false;

  /** New choice (click, or arrow keys). */
  protected changed(v: string): void {
    this.justChanged = true;
    // Reset after this event (arrow keys fire no click to reset it).
    setTimeout(() => (this.justChanged = false));
    this.value.set(v);
  }

  /** Tapping the picked choice again clears it (when clearable). */
  protected pick(v: string): void {
    if (this.justChanged) {
      this.justChanged = false;
      return;
    }
    if (this.clearable() && this.value() === v) this.value.set(null);
  }
}

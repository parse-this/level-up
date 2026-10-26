import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatRippleModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Full-height "back" rail for detail pages. Place it as the first column of a grid
 * (e.g. `grid-template-columns: 56px 1fr`, 40px on phones). The arrow + label stick
 * near the top while scrolling. Phones show the arrow only.
 */
@Component({
  selector: 'app-back-rail',
  imports: [RouterLink, MatRippleModule, MatIconModule],
  template: `
    <a class="back-rail" [routerLink]="link()" matRipple [attr.aria-label]="label()">
      <span class="back-inner">
        <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">arrow_back</mat-icon>
        <span class="back-text" aria-hidden="true">
          @for (word of words(); track $index) {
            {{ word }}<br />
          }
        </span>
      </span>
    </a>
  `,
  styles: `
    :host {
      display: block;
    }

    .back-rail {
      display: block;
      height: 100%;
      box-sizing: border-box;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 12px;
      background-color: var(--mat-sys-surface-container-low);
      color: var(--mat-sys-on-surface-variant);
      text-decoration: none;
      // Clips the ripple to the rounded corners. Unlike overflow: hidden, clip doesn't
      // create a scroll container, so the sticky label inside still follows the page.
      overflow: clip;

      &:hover {
        background-color: var(--mat-sys-surface-container-high);
        color: var(--mat-sys-primary);
      }

      &:focus-visible {
        outline: 2px solid var(--mat-sys-primary);
        outline-offset: 2px;
      }
    }

    .back-inner {
      position: sticky;
      top: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 12px 2px;
    }

    .back-text {
      font: var(--mat-sys-label-medium);
      text-align: center;
    }

    @media (max-width: 599.98px) {
      .back-text {
        display: none;
      }
    }
  `,
})
export class BackRail {
  readonly link = input.required<string>();
  /** e.g. "All entries"; each word on its own line. */
  readonly label = input.required<string>();

  protected readonly words = computed(() => this.label().split(' '));
}

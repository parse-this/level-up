import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FeatureInfo } from '../core/feature-info';

/** Training Ground shell: page header (with ⓘ info) + entry list or entry detail. */
@Component({
  selector: 'app-training',
  imports: [RouterOutlet, MatButtonModule, MatIconModule, FeatureInfo],
  template: `
    <div class="header-row">
      <h1 class="page-title">
        Training Ground
        <span class="page-subtitle"
          >— Raise your stats<sup class="xp-pops"
            >@for (s of statPops; track s) {<span class="xp-pop pixel">{{ s }}</span>}</sup
          ></span
        >
      </h1>
      <button
        matIconButton
        type="button"
        class="info-toggle"
        [attr.aria-expanded]="infoOpen()"
        aria-label="What is the Training Ground?"
        (click)="infoOpen.set(!infoOpen())"
      >
        <mat-icon fontSet="material-symbols-outlined">info</mat-icon>
      </button>
    </div>
    @if (infoOpen()) {
      <app-feature-info feature="training" [closable]="true" (closed)="infoOpen.set(false)" />
    }
    <router-outlet />
  `,
  styles: `
    .header-row {
      display: flex;
      align-items: flex-start;
      gap: 4px;

      .page-title {
        flex: 1;
      }
    }

    .info-toggle {
      flex-shrink: 0;
      color: var(--mat-sys-on-surface-variant);
    }

    // Game-style score popup, in the app's XP green (#21aa52).
    // Dark text: white on this green is too low-contrast to read.
    .xp-pops {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-left: 6px;
    }

    .xp-pop {
      padding: 3px 6px;
      border-radius: 999px;
      background-color: #21aa52;
      color: #04210f;
      font-size: 8px;
      line-height: 1.2;
    }
  `,
})
export class Training {
  /** Stat gains shown beside the subtitle (standard RPG abbreviations). */
  protected readonly statPops = ['+50 VIT', '+5 AGI', '+5 STR'];
  protected readonly infoOpen = signal(false);
}

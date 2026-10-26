import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { XpService } from './xp.service';

/** Banner status: "Lv N", 🔥 streak and a filling XP bar. Tap for the Player breakdown page. */
@Component({
  selector: 'app-player-status',
  imports: [RouterLink, MatProgressBarModule],
  template: `
    <a class="status" routerLink="/player" [attr.aria-label]="summary() + '. View breakdown.'">
      <span class="lv pixel" aria-hidden="true">Lv {{ xp.level() }}</span>
      @if (xp.streak()) {
        <span class="streak" aria-hidden="true">🔥{{ xp.streak() }}</span>
      }
      <mat-progress-bar class="xp-bar" mode="determinate" [value]="percent()" aria-hidden="true" />
    </a>
  `,
  styles: `
    .status {
      display: grid;
      grid-template-columns: auto auto;
      grid-template-rows: auto 6px;
      align-items: center;
      column-gap: 8px;
      row-gap: 4px;
      padding: 4px 8px;
      border-radius: 8px;
      color: inherit;
      text-decoration: none;

      &:hover {
        background-color: var(--mat-sys-surface-container-high);
      }

      &:focus-visible {
        outline: 2px solid var(--mat-sys-primary);
      }
    }

    .lv {
      font-size: 11px;
      color: #21aa52; // 1-Up green
    }

    .streak {
      font: var(--mat-sys-label-large);
      color: #ffb74d;
    }

    .xp-bar {
      grid-column: 1 / -1;
      width: 120px;
      height: 6px;
      border-radius: 3px;
      --mat-progress-bar-active-indicator-color: #21aa52;
      --mat-progress-bar-track-color: var(--mat-sys-surface-container-highest);
      --mat-progress-bar-active-indicator-height: 6px;
      --mat-progress-bar-track-height: 6px;
    }

    // Phones: same filling bar under the badge, a bit narrower.
    @media (max-width: 599.98px) {
      .xp-bar {
        width: 88px;
        height: 5px;
        --mat-progress-bar-active-indicator-height: 5px;
        --mat-progress-bar-track-height: 5px;
      }
    }
  `,
})
export class PlayerStatus {
  protected readonly xp = inject(XpService);

  protected readonly percent = computed(() => {
    const { intoLevel, toNext } = this.xp.levelInfo();
    return Math.round((intoLevel / toNext) * 100);
  });

  protected readonly summary = computed(() => {
    const { level, intoLevel, toNext } = this.xp.levelInfo();
    const streak = this.xp.streak();
    return (
      `Level ${level}, ${intoLevel} of ${toNext} XP to level ${level + 1}` +
      (streak ? `, ${streak}-day streak` : '')
    );
  });
}

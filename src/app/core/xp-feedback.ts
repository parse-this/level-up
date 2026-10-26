import { Component, effect, inject, signal, untracked } from '@angular/core';
import { XpService } from './xp.service';

type PopKind = 'xp' | 'pr' | 'level-up' | 'level-down';

interface Pop {
  id: number;
  kind: PopKind;
  text: string;
}

/** How long each kind of pop stays on screen (ms). */
const DURATION: Record<PopKind, number> = { xp: 1600, pr: 2200, 'level-up': 3200, 'level-down': 2600 };

/**
 * Floating feedback when progress changes: "+N XP", "New PR!", "LEVEL UP! Lv N" (with the 1-Up
 * mushroom), "Level down: Lv N". Nothing on first load; XP decreases don't pop.
 */
@Component({
  selector: 'app-xp-feedback',
  template: `
    <div class="pops" aria-live="polite">
      @for (p of pops(); track p.id) {
        <div class="pop pixel" [class]="'pop pixel ' + p.kind">
          @if (p.kind === 'level-up') {
            <img src="images/mushroom-green.png" alt="" class="mushroom" />
          }
          {{ p.text }}
        </div>
      }
    </div>
  `,
  styles: `
    .pops {
      position: fixed;
      top: calc(72px + env(safe-area-inset-top));
      right: 16px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
      pointer-events: none;
    }

    .pop {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 11px;
      line-height: 1.4;
      background-color: #21aa52; // 1-Up green
      color: #04210f;
      animation: float-up 1.6s ease-out forwards;
    }

    .pr {
      background-color: #f8da92; // 1-Up yellow
      color: #2b2105;
      animation-duration: 2.2s;
    }

    .level-up {
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 13px;
      animation: level-up 3.2s ease-out forwards;
    }

    .level-down {
      background-color: var(--mat-sys-surface-container-highest);
      color: var(--mat-sys-on-surface);
      animation-duration: 2.6s;
    }

    .mushroom {
      width: 28px;
      height: auto;
    }

    @keyframes float-up {
      0% {
        opacity: 0;
        transform: translateY(8px);
      }
      15% {
        opacity: 1;
        transform: translateY(0);
      }
      75% {
        opacity: 1;
      }
      100% {
        opacity: 0;
        transform: translateY(-16px);
      }
    }

    @keyframes level-up {
      0% {
        opacity: 0;
        transform: scale(0.6);
      }
      12% {
        opacity: 1;
        transform: scale(1.1);
      }
      20% {
        transform: scale(1);
      }
      85% {
        opacity: 1;
      }
      100% {
        opacity: 0;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .pop {
        animation-name: none;
      }
    }

    @media (max-width: 599.98px) {
      .pops {
        top: calc(64px + env(safe-area-inset-top));
        right: 8px;
      }
    }
  `,
})
export class XpFeedback {
  private readonly xp = inject(XpService);
  protected readonly pops = signal<Pop[]>([]);
  private nextId = 0;

  constructor() {
    let prev: { xp: number; level: number; pr: number } | null = null;
    effect(() => {
      const now = { xp: this.xp.totalXp(), level: this.xp.level(), pr: this.xp.prCount() };
      const before = prev;
      prev = now;
      if (!before) return; // first load: no pops
      untracked(() => {
        if (now.pr > before.pr) this.show('pr', 'New PR!');
        if (now.xp > before.xp) this.show('xp', `+${now.xp - before.xp} XP`);
        if (now.level > before.level) this.show('level-up', `LEVEL UP! Lv ${now.level}`);
        else if (now.level < before.level) this.show('level-down', `Level down: Lv ${now.level}`);
      });
    });
  }

  private show(kind: PopKind, text: string): void {
    const pop: Pop = { id: this.nextId++, kind, text };
    this.pops.update((list) => [...list, pop]);
    setTimeout(() => this.pops.update((list) => list.filter((p) => p.id !== pop.id)), DURATION[kind]);
  }
}

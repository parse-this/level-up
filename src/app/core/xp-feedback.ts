import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { XpService } from './xp.service';

type PopKind = 'xp' | 'pr' | 'level-up' | 'level-down';

interface Pop {
  id: number;
  kind: PopKind;
  text: string;
  /** Second line for level changes, e.g. "Lv 3". */
  sub?: string;
}

/** How long each kind of pop stays on screen (ms). */
const DURATION: Record<PopKind, number> = { xp: 1600, pr: 2200, 'level-up': 3600, 'level-down': 3600 };

const isLevel = (p: Pop) => p.kind === 'level-up' || p.kind === 'level-down';

/**
 * Feedback when progress changes. Small pops in the top-right corner: "+N XP", "New PR!".
 * A big banner in the middle of the screen for level changes: "LEVEL UP! / Lv N" (with the 1-Up
 * mushroom) and "LEVEL DOWN… / Lv N" (red, drained mushroom). Nothing on first load; XP decreases
 * don't pop.
 */
@Component({
  selector: 'app-xp-feedback',
  template: `
    <div class="pops" aria-live="polite">
      @for (p of smallPops(); track p.id) {
        <div [class]="'pop pixel ' + p.kind">{{ p.text }}</div>
      }
    </div>
    <div class="level-stage" aria-live="assertive">
      @for (p of levelPops(); track p.id) {
        <div [class]="'level-pop pixel ' + p.kind">
          <img src="images/mushroom-pixel.png" alt="" class="mushroom pixel-art" />
          <div class="headline">{{ p.text }}</div>
          <div class="sub">{{ p.sub }}</div>
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

    // Level changes: a big banner in the middle of the screen. Taps pass straight through.
    .level-stage {
      position: fixed;
      inset: 0;
      z-index: 1001;
      display: grid;
      place-items: center;
      padding: 16px;
      pointer-events: none;
    }

    .level-pop {
      grid-area: 1 / 1; // stack if two land at once
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 28px 40px 24px;
      border: 4px solid #04210f;
      border-radius: 20px;
      background-color: #21aa52; // 1-Up green
      color: #04210f;
      text-align: center;
      box-shadow:
        0 0 0 4px #f8da92,
        0 0 60px 20px rgb(33 170 82 / 55%),
        0 12px 40px rgb(0 0 0 / 45%);
      animation: level-up 3.6s ease-out forwards;
    }

    .mushroom {
      width: clamp(80px, 22vw, 120px);
      height: auto;
    }

    .level-up .mushroom {
      animation: mushroom-bounce 0.6s ease-in-out 0.4s 3;
    }

    .headline {
      font-size: clamp(24px, 8vw, 44px);
      line-height: 1.1;
      white-space: nowrap;
    }

    .sub {
      font-size: clamp(18px, 5vw, 26px);
      line-height: 1.2;
    }

    // The dark mirror of LEVEL UP: red, a drained (grey, upside-down) mushroom, drops in, shakes, sinks.
    .level-pop.level-down {
      border-color: #ff5449;
      background-color: #690005;
      color: #ffdad6;
      box-shadow:
        0 0 60px 20px rgb(255 59 48 / 45%),
        0 12px 40px rgb(0 0 0 / 45%);
      animation: level-down 3.6s ease-in forwards;

      .mushroom {
        transform: rotate(180deg);
        filter: grayscale(1) brightness(0.75);
      }
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
        transform: scale(0.3);
      }
      10% {
        opacity: 1;
        transform: scale(1.15);
      }
      16% {
        transform: scale(0.95);
      }
      22% {
        transform: scale(1);
      }
      85% {
        opacity: 1;
        transform: scale(1);
      }
      100% {
        opacity: 0;
        transform: scale(1.08);
      }
    }

    @keyframes mushroom-bounce {
      0%,
      100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-14px);
      }
    }

    @keyframes level-down {
      0% {
        opacity: 0;
        transform: translateY(-40px);
      }
      10% {
        opacity: 1;
        transform: translateY(0);
      }
      14% {
        transform: translateX(-12px);
      }
      18% {
        transform: translateX(12px);
      }
      22% {
        transform: translateX(-8px);
      }
      26% {
        transform: translateX(8px);
      }
      30% {
        transform: translateX(0);
      }
      80% {
        opacity: 1;
        transform: translateY(0);
      }
      100% {
        opacity: 0;
        transform: translateY(40px);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .pop,
      .level-pop,
      .level-up .mushroom {
        animation-name: none;
      }
    }

    @media (max-width: 599.98px) {
      .pops {
        top: calc(64px + env(safe-area-inset-top));
        right: 8px;
      }

      // Near the top on phones: the on-screen keyboard can cover the middle while typing.
      .level-stage {
        place-items: start center;
        padding-top: calc(72px + env(safe-area-inset-top));
      }

      .level-pop {
        gap: 8px;
        padding: 16px 24px 14px;
      }

      .mushroom {
        width: 64px;
      }
    }
  `,
})
export class XpFeedback {
  private readonly xp = inject(XpService);
  private readonly pops = signal<Pop[]>([]);
  protected readonly smallPops = computed(() => this.pops().filter((p) => !isLevel(p)));
  protected readonly levelPops = computed(() => this.pops().filter(isLevel));
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
        if (now.level > before.level) this.show('level-up', 'LEVEL UP!', `Lv ${now.level}`);
        else if (now.level < before.level) this.show('level-down', 'LEVEL DOWN…', `Lv ${now.level}`);
      });
    });
  }

  private show(kind: PopKind, text: string, sub?: string): void {
    const pop: Pop = { id: this.nextId++, kind, text, sub };
    this.pops.update((list) => [...list, pop]);
    setTimeout(() => this.pops.update((list) => list.filter((p) => p.id !== pop.id)), DURATION[kind]);
  }
}

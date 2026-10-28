import { Component, Injector, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PAGE_RELOAD } from './page-reload';
import { SimulationService } from './simulation.service';

/**
 * Shown while in Simulation mode: "Simulation mode" + Exit button, always. After an automatic
 * start (first visit) it also explains why, how to use it and how to leave; that part closes.
 */
@Component({
  selector: 'app-simulation-banner',
  imports: [MatButtonModule, MatIconModule],
  template: `
    @if (simulation.active()) {
      <section class="banner" [class.attention]="simulation.showExplanation()" aria-labelledby="sim-title">
        <div class="bar">
          <mat-icon class="sim-icon" fontSet="material-symbols-outlined" aria-hidden="true">science</mat-icon>
          <div class="bar-text">
            <span class="title" id="sim-title">Simulation mode</span>
            <span class="subtitle">Playing with sample data</span>
          </div>
          <button matButton="outlined" type="button" class="exit" (click)="exit()" aria-label="Exit simulation">
            <span class="desktop-label">Exit simulation</span><span class="phone-label">Exit</span>
          </button>
          @if (simulation.showExplanation()) {
            <button
              matIconButton
              type="button"
              class="dismiss"
              (click)="simulation.dismissExplanation()"
              aria-label="Close explanation"
            >
              <mat-icon fontSet="material-symbols-outlined">close</mat-icon>
            </button>
          }
        </div>
        @if (simulation.showExplanation()) {
          <div class="explanation">
            <p>
              <strong>Why am I here?</strong> To show you the app as it looks after a few weeks of use. It's
              filled with sample workouts, quests and XP so you can see what each feature does and learn how
              to use it before you start for real.
            </p>
            <p>
              <strong>How to use it:</strong> look around and try anything: log a workout, complete a quest,
              watch your level change. It's all practice, kept separate from your own data, and
              the sample data starts fresh each time you open the app.
            </p>
            <p>
              <strong>Ready for real?</strong> Tap <em>Exit</em>. The sample data is cleared and you're
              back to your own data and level (a fresh start if you haven't added anything yet). You can come
              back any time from Settings → Simulation mode.
            </p>
          </div>
        }
      </section>
    }
  `,
  styles: `
    :host {
      display: block;
      // Keeps the attention glow (z-index -1) behind the banner but in front of the page.
      isolation: isolate;
    }
    .banner {
      position: relative;
      margin-bottom: 16px;
      border: 1px solid color-mix(in srgb, var(--mat-sys-tertiary) 45%, transparent);
      border-radius: 12px;
      background-color: color-mix(in srgb, var(--mat-sys-tertiary) 8%, var(--mat-sys-surface-container-low));
      color: var(--mat-sys-on-surface);
    }
    .bar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 8px 8px 16px;
    }
    .sim-icon {
      color: var(--mat-sys-tertiary);
      flex-shrink: 0;
    }
    .bar-text {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    .title {
      font: var(--mat-sys-title-small);
    }
    .subtitle {
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
    }
    .exit {
      flex-shrink: 0;
    }
    .explanation {
      padding: 0 16px 12px 52px;
      font: var(--mat-sys-body-medium);

      p {
        margin: 0 0 8px;
      }
      p:last-child {
        margin-bottom: 0;
      }
    }
    // Eye-catcher while the explanation shows: the Urgent quest's rotating red → orange border and
    // glow, two laps (~5s), then it fades back to the normal border.
    .attention {
      --glow-dim: color-mix(in srgb, #ff3b30 30%, transparent);
      --glow-ring: conic-gradient(
        from var(--quest-glow-angle),
        var(--glow-dim) 0deg,
        #ff3b30 60deg,
        #ff6a3d 100deg,
        #ff8a65 130deg,
        var(--glow-dim) 180deg,
        var(--glow-dim) 360deg
      );

      &::before,
      &::after {
        content: '';
        position: absolute;
        border-radius: inherit;
        background: var(--glow-ring);
        pointer-events: none;
        opacity: 0;
        animation:
          sim-glow-spin 2.5s linear 2,
          sim-glow-fade 5.6s ease-out forwards;
      }
      // Ring drawn over the border (only the 2px band shows).
      &::after {
        inset: -1px;
        padding: 2px;
        mask:
          linear-gradient(#000 0 0) content-box,
          linear-gradient(#000 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
      }
      // Soft outer glow.
      &::before {
        inset: -3px;
        z-index: -1;
        filter: blur(8px);
      }
    }
    @keyframes sim-glow-spin {
      from {
        --quest-glow-angle: 0deg;
      }
      to {
        --quest-glow-angle: 360deg;
      }
    }
    @keyframes sim-glow-fade {
      0%,
      85% {
        opacity: 1;
      }
      100% {
        opacity: 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .attention::before,
      .attention::after {
        animation: none;
      }
    }
    .phone-label {
      display: none;
    }
    @media (max-width: 599.98px) {
      .bar {
        gap: 8px;
        padding-left: 12px;
      }
      .explanation {
        padding-left: 12px;
      }
      .desktop-label {
        display: none;
      }
      .phone-label {
        display: inline;
      }
    }
  `,
})
export class SimulationBanner {
  protected readonly simulation = inject(SimulationService);
  private readonly injector = inject(Injector);
  private readonly reload = inject(PAGE_RELOAD);

  protected async exit(): Promise<void> {
    // Loaded on demand: keeps the dialog code out of the initial bundle.
    const { ConfirmService } = await import('./confirm-dialog');
    const ok = await this.injector.get(ConfirmService).confirm({
      title: 'Exit Simulation mode?',
      message:
        "The sample data will be cleared and you'll be back to your own data and level. You can come back any time from Settings → Simulation mode.",
      confirmLabel: 'Exit simulation',
    });
    if (!ok) return;
    this.simulation.exit();
    this.reload();
  }
}

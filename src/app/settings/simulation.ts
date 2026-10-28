import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ConfirmService } from '../core/confirm-dialog';
import { PAGE_RELOAD } from '../core/page-reload';
import { SimulationService } from '../core/simulation.service';

/** Settings → Simulation mode: try the app with sample data, or leave it. */
@Component({
  selector: 'app-simulation-settings',
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <a matButton routerLink="/settings" class="back">
      <mat-icon fontSet="material-symbols-outlined">arrow_back</mat-icon>
      Settings
    </a>

    <h2 class="title">Simulation mode</h2>
    <p>
      Try the app with about four weeks of sample workouts, quests and XP. Everything you do in Simulation
      mode is practice: it's kept in its own place, so your own data is never changed or overwritten.
    </p>
    <p>
      The sample data is made fresh each time the app opens, dated up to today, so it always looks like a
      few weeks of use. Changes you make in the simulation reset then too. Exiting clears it and brings back
      your own data.
    </p>

    @if (simulation.active()) {
      <p class="status"><mat-icon fontSet="material-symbols-outlined" aria-hidden="true">science</mat-icon> You're in Simulation mode now.</p>
      <button matButton="filled" type="button" class="exit" (click)="exit()">
        <mat-icon fontSet="material-symbols-outlined">logout</mat-icon>
        Exit simulation
      </button>
    } @else {
      <button matButton="filled" type="button" class="enter" [disabled]="busy()" (click)="enter()">
        <mat-icon fontSet="material-symbols-outlined">science</mat-icon>
        Start simulation
      </button>
    }
  `,
  styles: `
    .back {
      margin: -8px 0 8px -12px;
    }
    .title {
      font: var(--mat-sys-headline-small);
      margin: 0 0 8px;
    }
    p {
      max-width: 60ch;
      margin: 0 0 12px;
      color: var(--mat-sys-on-surface-variant);
    }
    .status {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--mat-sys-tertiary);
    }
  `,
})
export class SimulationSettings {
  protected readonly simulation = inject(SimulationService);
  private readonly confirmService = inject(ConfirmService);
  private readonly reload = inject(PAGE_RELOAD);
  private readonly router = inject(Router);
  protected readonly busy = signal(false);

  /** Starts it, then opens the home page fresh, where the banner explains everything. */
  protected async enter(): Promise<void> {
    this.busy.set(true);
    await this.simulation.enter();
    await this.router.navigateByUrl('/');
    this.reload();
  }

  protected async exit(): Promise<void> {
    const ok = await this.confirmService.confirm({
      title: 'Exit Simulation mode?',
      message: "The sample data will be cleared and you'll be back to your own data.",
      confirmLabel: 'Exit simulation',
    });
    if (!ok) return;
    this.simulation.exit();
    this.reload();
  }
}

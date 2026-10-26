import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FeatureInfo } from '../core/feature-info';

/** Quest Log shell: page header (with ⓘ info) + quest list or a quest's page. */
@Component({
  selector: 'app-quests',
  imports: [RouterOutlet, MatButtonModule, MatIconModule, FeatureInfo],
  template: `
    <div class="header-row">
      <h1 class="page-title">Quest Log <span class="page-subtitle">— Free your mind</span></h1>
      <button
        matIconButton
        type="button"
        class="info-toggle"
        [attr.aria-expanded]="infoOpen()"
        aria-label="What is the Quest Log?"
        (click)="infoOpen.set(!infoOpen())"
      >
        <mat-icon fontSet="material-symbols-outlined">info</mat-icon>
      </button>
    </div>
    @if (infoOpen()) {
      <app-feature-info feature="quests" [closable]="true" (closed)="infoOpen.set(false)" />
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
  `,
})
export class Quests {
  protected readonly infoOpen = signal(false);
}

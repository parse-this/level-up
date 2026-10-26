import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

interface SettingsSection {
  path: string;
  icon: string;
  title: string;
  description: string;
}

/** List of settings sections. */
@Component({
  selector: 'app-settings-home',
  imports: [RouterLink, MatIconModule],
  template: `
    <nav class="sections" aria-label="Settings">
      @for (s of sections; track s.path) {
        <a class="section" [routerLink]="s.path">
          <mat-icon class="section-icon" fontSet="material-symbols-outlined" aria-hidden="true">{{
            s.icon
          }}</mat-icon>
          <div class="section-main">
            <div class="section-title">{{ s.title }}</div>
            <div class="section-description">{{ s.description }}</div>
          </div>
          <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">chevron_right</mat-icon>
        </a>
      }
    </nav>
  `,
  styles: `
    .sections {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .section {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 12px 12px 16px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 12px;
      background-color: var(--mat-sys-surface-container-low);
      color: inherit;
      text-decoration: none;

      &:hover,
      &:focus-visible {
        background-color: var(--mat-sys-surface-container);
      }
    }
    .section-icon {
      color: var(--mat-sys-primary);
      flex-shrink: 0;
    }
    .section-main {
      flex: 1;
      min-width: 0;
    }
    .section-title {
      font: var(--mat-sys-title-medium);
    }
    .section-description {
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class SettingsHome {
  protected readonly sections: SettingsSection[] = [
    {
      path: 'about',
      icon: 'info',
      title: 'About',
      description: 'What the Training Ground and Quest Log are for.',
    },
    {
      path: 'save-load',
      icon: 'save',
      title: 'Save & load game',
      description: 'Back up your progress to a file, or restore it.',
    },
    {
      path: 'data',
      icon: 'database',
      title: 'View data',
      description: 'See everything saved in this browser.',
    },
    {
      path: 'credits',
      icon: 'favorite',
      title: 'Credits',
      description: 'Artwork and libraries used in the app.',
    },
  ];
}

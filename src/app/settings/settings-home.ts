import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { FontStyleService } from '../core/font-style.service';

interface SettingsSection {
  path: string;
  icon: string;
  title: string;
  description: string;
}

/** List of settings sections. */
@Component({
  selector: 'app-settings-home',
  imports: [RouterLink, MatIconModule, MatRadioModule],
  template: `
    <section class="font-style">
      <div class="font-style-header">
        <mat-icon class="section-icon" fontSet="material-symbols-outlined" aria-hidden="true">text_fields</mat-icon>
        <div class="section-main">
          <h2 class="section-title" id="font-style-label">Font style</h2>
          <div class="section-description">Changes the whole app right away. Pick what reads best.</div>
        </div>
      </div>
      <mat-radio-group
        class="font-options"
        aria-labelledby="font-style-label"
        [value]="fontStyle.current()"
        (change)="fontStyle.set($event.value)"
      >
        @for (f of fontStyle.styles; track f.id) {
          <mat-radio-button class="font-option" [value]="f.id" [class.selected]="fontStyle.current() === f.id">
            <span class="font-sample-heading" [style.font-family]="f.headingFont">{{ f.label }}</span>
            <span class="font-sample-body" [style.font-family]="f.bodyFont">{{ f.description }}</span>
          </mat-radio-button>
        }
      </mat-radio-group>
    </section>

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
    .font-style {
      margin-bottom: 16px;
      padding: 12px 16px 16px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 12px;
      background-color: var(--mat-sys-surface-container-low);
    }
    .font-style-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    h2.section-title {
      margin: 0;
    }
    .font-options {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 8px;
    }
    .font-option {
      display: block;
      padding: 4px 8px 8px 0;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 8px;

      &.selected {
        border-color: var(--mat-sys-primary);
        background-color: var(--mat-sys-surface-container);
      }

      // Label column: sample heading over sample body text.
      ::ng-deep label {
        display: flex;
        flex-direction: column;
        gap: 2px;
        cursor: pointer;
      }
    }
    .font-sample-heading {
      font-size: 18px;
      line-height: 1.3;
    }
    .font-sample-body {
      font-size: 14px;
      line-height: 1.35;
      color: var(--mat-sys-on-surface-variant);
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
  protected readonly fontStyle = inject(FontStyleService);

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

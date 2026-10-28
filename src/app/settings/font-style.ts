import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { FontStyleService } from '../core/font-style.service';

/** Settings → Font style: pick the app's fonts; each option is shown in its own fonts. */
@Component({
  selector: 'app-font-style',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatRadioModule],
  template: `
    <a matButton routerLink="/settings" class="back">
      <mat-icon fontSet="material-symbols-outlined">arrow_back</mat-icon>
      Settings
    </a>

    <h2 class="title" id="font-style-label">Font style</h2>
    <p class="intro">Changes the whole app right away. Pick what reads best.</p>

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
  `,
  styles: `
    .back {
      margin: -8px 0 8px -12px;
    }
    .title {
      font: var(--mat-sys-headline-small);
      margin: 0 0 4px;
    }
    .intro {
      margin: 0 0 16px;
      color: var(--mat-sys-on-surface-variant);
    }
    .font-options {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 8px;
    }
    .font-option {
      display: block;
      padding: 4px 8px 8px 0;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 12px;
      background-color: var(--mat-sys-surface-container-low);

      &.selected {
        border-color: var(--mat-sys-primary);
        background-color: var(--mat-sys-surface-container);
      }

      // Radio on the left, label filling the rest (Material's wrapper would otherwise wrap it below).
      ::ng-deep .mdc-form-field {
        display: flex;
        flex-wrap: nowrap;
        align-items: center;
        width: 100%;
      }
      ::ng-deep label {
        flex: 1;
        min-width: 0;
        cursor: pointer;
      }
    }
    // Sample heading over sample body text.
    .font-sample-heading {
      display: block;
      font-size: 18px;
      line-height: 1.3;
    }
    .font-sample-body {
      display: block;
      margin-top: 2px;
      font-size: 14px;
      line-height: 1.35;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class FontStyle {
  protected readonly fontStyle = inject(FontStyleService);
}

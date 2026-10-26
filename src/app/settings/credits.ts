import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/** Attributions required by asset licenses (e.g. CC-BY), plus libraries used. */
@Component({
  selector: 'app-credits',
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <a matButton routerLink="/settings" class="back">
      <mat-icon fontSet="material-symbols-outlined">arrow_back</mat-icon>
      Settings
    </a>

    <h2 class="title">Credits</h2>

    <section class="credit">
      <img src="images/mushroom-green.png" alt="" class="thumb" />
      <div>
        <div class="what">Mushroom artwork</div>
        <div class="who">
          "<a href="https://opengameart.org/content/mushrooms-set-01" target="_blank" rel="noopener"
            >Mushrooms Set 01</a
          >" by
          <a href="https://opengameart.org/users/gameartforge" target="_blank" rel="noopener">GameArtForge</a>,
          licensed
          <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC BY 3.0</a>.
          Scaled; the app icons place it on a dark background.
        </div>
      </div>
    </section>

    <section class="credit">
      <mat-icon class="thumb-icon" fontSet="material-symbols-outlined" aria-hidden="true">code</mat-icon>
      <div>
        <div class="what">Built with</div>
        <div class="who">
          Angular, Angular Material, Material Symbols, Tiptap, and the "Press Start 2P" font (SIL Open Font
          License).
        </div>
      </div>
    </section>
  `,
  styles: `
    .back {
      margin: -8px 0 8px -12px;
    }
    .title {
      font: var(--mat-sys-headline-small);
      margin: 0 0 16px;
    }
    .credit {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 12px 16px;
      margin-bottom: 8px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 12px;
      background-color: var(--mat-sys-surface-container-low);
    }
    .thumb {
      width: 48px;
      height: auto;
      flex-shrink: 0;
    }
    .thumb-icon {
      width: 48px;
      height: 48px;
      font-size: 40px;
      flex-shrink: 0;
      color: var(--mat-sys-primary);
    }
    .what {
      font: var(--mat-sys-title-medium);
    }
    .who {
      color: var(--mat-sys-on-surface-variant);

      a {
        color: var(--mat-sys-primary);
      }
    }
  `,
})
export class Credits {}

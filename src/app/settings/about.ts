import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FeatureInfo } from '../core/feature-info';

/** What the app and each feature are for (same text as the ⓘ cards). */
@Component({
  selector: 'app-about',
  imports: [RouterLink, MatButtonModule, MatIconModule, FeatureInfo],
  template: `
    <a matButton routerLink="/settings" class="back">
      <mat-icon fontSet="material-symbols-outlined">arrow_back</mat-icon>
      Settings
    </a>

    <h2 class="title">About Level Up</h2>
    <p class="intro">
      Level Up turns looking after yourself into a game. Train your body, clear your mind, and earn XP
      for showing up every day.
    </p>

    <app-feature-info feature="training" />
    <app-feature-info feature="quests" />

    <p class="more">
      See your level, streaks and how XP works on the
      <a routerLink="/player">Player page</a> (tap your level in the banner).
    </p>
  `,
  styles: `
    .back {
      margin: -8px 0 8px -12px;
    }
    .title {
      font: var(--mat-sys-headline-small);
      margin: 0 0 8px;
    }
    .intro,
    .more {
      color: var(--mat-sys-on-surface-variant);
      margin: 0 0 16px;
    }
    a {
      color: var(--mat-sys-primary);
    }
  `,
})
export class About {}

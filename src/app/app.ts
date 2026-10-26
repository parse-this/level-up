import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { PlayerStatus } from './core/player-status';
import { XpFeedback } from './core/xp-feedback';

@Component({
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatTabsModule,
    PlayerStatus,
    XpFeedback,
  ],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  /** Desktop tabs (Settings is the toolbar gear). */
  protected readonly tabs = [
    { path: '/training', label: 'Training Ground' },
    { path: '/quests', label: 'Quest Log' },
  ];

  /** Phone bottom nav. */
  protected readonly bottomNav = [
    { path: '/training', label: 'Training Ground', icon: 'fitness_center' },
    { path: '/quests', label: 'Quest Log', icon: 'menu_book' },
    { path: '/settings', label: 'Settings', icon: 'settings' },
  ];

  constructor() {
    // Ask the browser not to clear our data to free up space (phones especially).
    // It may say no; installed apps are usually granted it. Clearing site data still erases it.
    navigator.storage?.persist?.().catch(() => {});
  }
}

import { Routes } from '@angular/router';
import { unsavedChangesGuard } from './core/unsaved-changes.guard';

// Feature pages are lazy-loaded to keep the initial download small.
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'training' },
  {
    path: 'training',
    title: 'Training Ground | Level Up Tracker',
    loadComponent: () => import('./training/training').then((m) => m.Training),
    children: [
      {
        path: '',
        loadComponent: () => import('./training/entry-list/entry-list').then((m) => m.EntryList),
      },
      {
        path: ':entryId',
        loadComponent: () =>
          import('./training/entry-detail/entry-detail').then((m) => m.EntryDetail),
        canDeactivate: [unsavedChangesGuard],
      },
    ],
  },
  {
    path: 'quests',
    title: 'Quest Log | Level Up Tracker',
    loadComponent: () => import('./quests/quests').then((m) => m.Quests),
    children: [
      {
        path: '',
        loadComponent: () => import('./quests/quest-list/quest-list').then((m) => m.QuestList),
      },
      {
        path: ':questId',
        loadComponent: () =>
          import('./quests/quest-detail/quest-detail').then((m) => m.QuestDetail),
      },
    ],
  },
  {
    path: 'settings',
    title: 'Settings | Level Up Tracker',
    loadComponent: () => import('./settings/settings').then((m) => m.Settings),
    children: [
      {
        path: '',
        loadComponent: () => import('./settings/settings-home').then((m) => m.SettingsHome),
      },
      {
        path: 'font-style',
        title: 'Font style | Level Up Tracker',
        loadComponent: () => import('./settings/font-style').then((m) => m.FontStyle),
      },
      {
        path: 'about',
        title: 'About | Level Up Tracker',
        loadComponent: () => import('./settings/about').then((m) => m.About),
      },
      {
        path: 'save-load',
        title: 'Save & Load | Level Up Tracker',
        loadComponent: () => import('./settings/save-load').then((m) => m.SaveLoad),
      },
      {
        path: 'data',
        title: 'View data | Level Up Tracker',
        loadComponent: () => import('./settings/data-viewer').then((m) => m.DataViewer),
      },
      {
        path: 'credits',
        title: 'Credits | Level Up Tracker',
        loadComponent: () => import('./settings/credits').then((m) => m.Credits),
      },
    ],
  },
  {
    path: 'player',
    title: 'Player | Level Up Tracker',
    loadComponent: () => import('./player/player').then((m) => m.Player),
  },
  // Addresses from before the features were renamed still work.
  { path: 'body-xp', redirectTo: 'training' },
  { path: 'body-xp/:entryId', redirectTo: 'training/:entryId' },
  { path: 'open-loops', redirectTo: 'quests' },
  { path: 'open-loops/:questId', redirectTo: 'quests/:questId' },
  { path: '**', redirectTo: 'training' },
];

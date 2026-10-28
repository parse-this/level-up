import { Component, LOCALE_ID, inject } from '@angular/core';
import { formatDate } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import {
  ACTIVITIES,
  ACTIVITY_LABELS,
  Activity,
  Entry,
  GOLF_FORMAT_LABELS,
  NewEntry,
  SPORTS,
  SPORT_ICONS,
  SPORT_LABELS,
  Sport,
  countSets,
  entryIcon,
  entryLabel,
  formatDistance,
  formatDuration,
  today,
} from '../entry';
import { EntryStore } from '../entry.store';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** The Training Ground log: all entries, newest first, plus "New entry". */
@Component({
  selector: 'app-entry-list',
  imports: [RouterLink, MatButtonModule, MatDividerModule, MatIconModule, MatMenuModule],
  templateUrl: './entry-list.html',
  styleUrl: './entry-list.scss',
})
export class EntryList {
  protected readonly store = inject(EntryStore);
  private readonly router = inject(Router);
  private readonly locale = inject(LOCALE_ID);

  protected readonly activities = ACTIVITIES;
  protected readonly activityLabels = ACTIVITY_LABELS;
  protected readonly sports = SPORTS;
  protected readonly sportLabels = SPORT_LABELS;
  protected readonly sportIcons = SPORT_ICONS;
  protected readonly icon = entryIcon;
  protected readonly label = entryLabel;

  protected newWorkout(): void {
    this.open({ type: 'workout', date: today(), exercises: [] });
  }

  protected newMove(activity: Activity): void {
    this.open({ type: 'move', date: today(), activity });
  }

  protected newWeighIn(): void {
    this.open({ type: 'weigh-in', date: today() });
  }

  protected newSport(sport: Sport): void {
    this.open({ type: 'sport', date: today(), sport });
  }

  /** Workout title is its name if set; otherwise the type label. */
  protected title(e: Entry): string {
    return (e.type === 'workout' && e.name) || entryLabel(e);
  }

  /** "Sat, Oct 25, 2026 · 3.1 mi · 28 min" etc. */
  protected meta(e: Entry): string {
    const parts = [formatDate(e.date, 'EEE, MMM d, y', this.locale)];
    switch (e.type) {
      case 'workout': {
        const sets = e.exercises.reduce((sum, x) => sum + countSets(x.steps), 0);
        parts.push(plural(e.exercises.length, 'exercise'), plural(sets, 'set'));
        break;
      }
      case 'move':
        if (e.distance != null) parts.push(formatDistance(e.distance));
        if (e.durationMinutes != null) parts.push(formatDuration(e.durationMinutes));
        if (e.location) parts.push(e.location);
        break;
      case 'weigh-in':
        parts.push(e.weight != null ? `${e.weight} lb` : 'No weight yet');
        break;
      case 'sport':
        parts.push(e.format ? GOLF_FORMAT_LABELS[e.format] : 'Not set up yet');
        if (e.score != null) parts.push(`Score ${e.score}`);
        break;
    }
    return parts.join(' · ');
  }

  protected exerciseNames(e: Entry): string {
    return e.type === 'workout' ? e.exercises.map((x) => x.name).join(', ') : '';
  }

  private open(init: NewEntry): void {
    const entry = this.store.create(init);
    this.router.navigate(['/training', entry.id]);
  }
}

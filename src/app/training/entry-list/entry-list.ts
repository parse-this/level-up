import { Component, LOCALE_ID, inject } from '@angular/core';
import { formatDate } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import {
  Entry,
  EntryTypeInit,
  GOLF_FORMAT_LABELS,
  NewEntry,
  countSets,
  entryIcon,
  entryLabel,
  formatDistance,
  formatDuration,
  today,
} from '../entry';
import { EntryStore } from '../entry.store';
import { EntryTypeMenu } from '../entry-type-menu/entry-type-menu';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** The Training Ground log: all entries, newest first, plus "New entry". */
@Component({
  selector: 'app-entry-list',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatMenuModule, EntryTypeMenu],
  templateUrl: './entry-list.html',
  styleUrl: './entry-list.scss',
})
export class EntryList {
  protected readonly store = inject(EntryStore);
  private readonly router = inject(Router);
  private readonly locale = inject(LOCALE_ID);

  protected readonly icon = entryIcon;
  protected readonly label = entryLabel;

  /** Creates an entry of the picked type, dated today, and opens it. */
  protected newEntry(init: EntryTypeInit): void {
    this.open({ ...init, date: today() } as NewEntry);
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

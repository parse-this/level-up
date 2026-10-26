import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { EntryStore } from '../training/entry.store';
import { QuestStore } from '../quests/quest.store';
import { computeProgress, levelFor, localDay } from './xp';

/** Player progress (XP, level, streak, PRs), always recalculated from saved data. */
@Injectable({ providedIn: 'root' })
export class XpService {
  private readonly entries = inject(EntryStore);
  private readonly quests = inject(QuestStore);

  /** Today's local date; re-checked every minute so a new day is picked up. */
  private readonly today = signal(localDay(new Date()));

  /** Full breakdown (sources, streak bonuses, losses, day log). */
  readonly progress = computed(() =>
    computeProgress(this.entries.entries(), this.quests.quests(), this.today()),
  );

  readonly totalXp = computed(() => this.progress().totalXp);
  readonly streak = computed(() => this.progress().streak);
  readonly prCount = computed(() => this.progress().prCount);
  readonly levelInfo = computed(() => levelFor(this.totalXp()));
  readonly level = computed(() => this.levelInfo().level);

  constructor() {
    const timer = setInterval(() => this.today.set(localDay(new Date())), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
}

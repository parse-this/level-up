import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { DAILY_CAP, FREE_MISSED_DAYS, XP, XpSource } from '../core/xp';
import { XpService } from '../core/xp.service';

const SOURCE_LABELS: Record<XpSource, string> = {
  captureQuest: 'Quests captured',
  completeQuest: 'Quests completed',
  session: 'Sessions (workouts, Get Moving, sports)',
  weighIn: 'Weigh-ins',
  personalRecord: 'Personal records',
};

/** Player page: level, XP to next, streaks, where XP came from, and the last 14 days. */
@Component({
  selector: 'app-player',
  imports: [DatePipe, MatCardModule, MatExpansionModule, MatProgressBarModule],
  templateUrl: './player.html',
  styleUrl: './player.scss',
})
export class Player {
  protected readonly xp = inject(XpService);
  protected readonly xpValues = XP;
  protected readonly dailyCap = DAILY_CAP;
  protected readonly freeDays = FREE_MISSED_DAYS;

  protected readonly percent = computed(() => {
    const { intoLevel, toNext } = this.xp.levelInfo();
    return Math.round((intoLevel / toNext) * 100);
  });

  /** Rows for "Where your XP came from" (sources with activity only). */
  protected readonly sourceRows = computed(() => {
    const { sources } = this.xp.progress();
    return (Object.keys(SOURCE_LABELS) as XpSource[])
      .filter((k) => sources[k].count)
      .map((k) => ({ label: SOURCE_LABELS[k], count: sources[k].count, each: XP[k], xp: sources[k].xp }));
  });

  /** Last 14 days, newest first. */
  protected readonly recentDays = computed(() => this.xp.progress().days.slice(-14).reverse());
}

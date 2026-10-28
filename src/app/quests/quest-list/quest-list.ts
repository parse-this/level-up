import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { ConfirmService } from '../../core/confirm-dialog';
import { localDay } from '../../core/xp';
import { groupByDay, today } from '../../training/entry';
import {
  HORIZONS,
  HORIZON_LABELS,
  Horizon,
  IMPORTANCE_ICONS,
  IMPORTANCE_LABELS,
  Importance,
  Quest,
  isBlankHtml,
  nextImportance,
} from '../quest';
import { QuestStore } from '../quest.store';
import { ManageTags } from '../manage-tags/manage-tags';
import { TagPicker } from '../tag-picker/tag-picker';

/** Filter tabs: All (default; includes unsorted Inbox quests), then the sorted horizons. */
type HorizonFilter = 'all' | Exclude<Horizon, 'inbox'>;
const SORTED_HORIZONS = HORIZONS.filter((h): h is Exclude<Horizon, 'inbox'> => h !== 'inbox');

@Component({
  selector: 'app-quest-list',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatExpansionModule,
    MatIconModule,
    TagPicker,
  ],
  templateUrl: './quest-list.html',
  styleUrl: './quest-list.scss',
})
export class QuestList {
  protected readonly store = inject(QuestStore);
  private readonly dialog = inject(MatDialog);
  private readonly confirmService = inject(ConfirmService);
  private readonly captureInput = viewChild.required<ElementRef<HTMLInputElement>>('captureInput');

  protected readonly horizonOptions: HorizonFilter[] = ['all', ...SORTED_HORIZONS];
  protected readonly horizonLabels: Record<HorizonFilter, string> = { ...HORIZON_LABELS, all: 'All' };
  protected readonly importanceLabels = IMPORTANCE_LABELS;
  protected readonly importanceIcons = IMPORTANCE_ICONS;

  // ---- Capture ----
  protected readonly title = new FormControl('', { nonNullable: true });
  protected readonly captureTags = signal<string[]>([]);
  protected readonly captureImportance = signal<Importance>('normal');

  // ---- Filters ----
  protected readonly horizon = signal<HorizonFilter>('all');
  protected readonly tagFilter = signal<string | null>(null);

  private readonly inHorizon = (l: Quest, h: HorizonFilter) => h === 'all' || l.horizon === h;
  private readonly hasTag = (l: Quest, t: string | null) => !t || l.tagIds.includes(t);

  protected readonly visible = computed(() =>
    this.store.open().filter((l) => this.inHorizon(l, this.horizon()) && this.hasTag(l, this.tagFilter())),
  );

  protected readonly closedVisible = computed(() =>
    this.store.closed().filter((l) => this.inHorizon(l, this.horizon()) && this.hasTag(l, this.tagFilter())),
  );

  /** Completed quests in Today / Yesterday / Earlier groups by the day they were completed (like the Training Ground log). */
  protected readonly closedGroups = computed(() =>
    groupByDay(
      this.closedVisible().map((quest) => ({ date: localDay(quest.closedAt!), quest })),
      today(),
    ),
  );

  /** Open quests per horizon, within the current tag filter. */
  protected readonly horizonCounts = computed(() => {
    const open = this.store.open().filter((l) => this.hasTag(l, this.tagFilter()));
    const counts = { all: open.length } as Record<HorizonFilter, number>;
    for (const h of SORTED_HORIZONS) counts[h] = open.filter((l) => l.horizon === h).length;
    return counts;
  });

  /** Open quests per tag, within the current horizon. */
  protected readonly tagCounts = computed(() => {
    const counts = new Map<string, number>();
    for (const l of this.store.open()) {
      if (!this.inHorizon(l, this.horizon())) continue;
      for (const t of l.tagIds) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return counts;
  });

  protected readonly emptyMessage = computed(() => {
    const tag = this.tagFilter() && this.store.tagById(this.tagFilter()!);
    if (tag) return `No open quests tagged ${tag.name}.`;
    switch (this.horizon()) {
      case 'all':
        return 'No open quests. Mind clear!';
      default:
        return `Nothing in ${HORIZON_LABELS[this.horizon() as Horizon]} yet.`;
    }
  });

  protected capture(): void {
    const title = this.title.value.trim();
    if (!title) return;
    this.store.add(title, { tagIds: this.captureTags(), importance: this.captureImportance() });
    this.title.setValue('');
    this.captureTags.set([]);
    this.captureImportance.set('normal');
    this.captureInput().nativeElement.focus();
  }

  protected cycleImportance(): void {
    this.captureImportance.update(nextImportance);
  }

  protected setHorizon(h: HorizonFilter): void {
    this.horizon.set(h);
  }

  protected setTagFilter(id: string | null): void {
    this.tagFilter.set(this.tagFilter() === id ? null : id);
  }

  protected tagName(id: string): string {
    return this.store.tagById(id)?.name ?? '';
  }

  protected hasNotes(l: Quest): boolean {
    return !isBlankHtml(l.notes);
  }

  protected close(l: Quest): void {
    this.store.close(l.id);
  }

  protected reopen(l: Quest): void {
    this.store.reopen(l.id);
  }

  protected async remove(l: Quest): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title: 'Delete quest?',
      message: `"${l.title}" will be gone for good. This can't be undone.`,
    });
    if (confirmed) this.store.remove(l.id);
  }

  protected manageTags(): void {
    this.dialog.open(ManageTags, { width: '400px', maxWidth: 'calc(100vw - 32px)' });
  }
}

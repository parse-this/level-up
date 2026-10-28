import { Component, ElementRef, computed, inject, linkedSignal, signal, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDragPlaceholder, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { ConfirmService } from '../../core/confirm-dialog';
import { localDay } from '../../core/xp';
import { groupByDay, today } from '../../training/entry';
import {
  HORIZON_LABELS,
  Horizon,
  IMPORTANCE_ICONS,
  IMPORTANCE_LABELS,
  Importance,
  Quest,
  SORTED_HORIZONS,
  SortedHorizon,
  isBlankHtml,
  nextImportance,
} from '../quest';
import { QuestStore } from '../quest.store';
import { ManageTags } from '../manage-tags/manage-tags';
import { TagPicker } from '../tag-picker/tag-picker';
import { WhenChoices, WhenFirstChoice } from '../when-choices/when-choices';

/** Filter tabs: All (default; includes unsorted Inbox quests), then the sorted horizons. */
type HorizonFilter = 'all' | SortedHorizon;

@Component({
  selector: 'app-quest-list',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatExpansionModule,
    MatIconModule,
    TagPicker,
    WhenChoices,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    CdkDragPlaceholder,
    NgTemplateOutlet,
  ],
  templateUrl: './quest-list.html',
  styleUrl: './quest-list.scss',
})
export class QuestList {
  protected readonly store = inject(QuestStore);
  private readonly dialog = inject(MatDialog);
  private readonly confirmService = inject(ConfirmService);
  private readonly captureInput = viewChild.required<ElementRef<HTMLInputElement>>('captureInput');

  protected readonly allChoice: WhenFirstChoice = { value: 'all', label: 'All' };
  protected readonly importanceLabels = IMPORTANCE_LABELS;
  protected readonly importanceIcons = IMPORTANCE_ICONS;

  // ---- Capture ----
  protected readonly title = new FormControl('', { nonNullable: true });
  protected readonly captureTags = signal<string[]>([]);
  protected readonly captureImportance = signal<Importance>('normal');
  protected readonly capturePinned = signal(false);

  // ---- Filters ----
  protected readonly horizon = signal<HorizonFilter>('all');

  /**
   * Capture's "When" (null = none picked → unsorted Inbox). Starts on the tab being viewed
   * (All → none), so new quests stay in view.
   */
  protected readonly captureHorizon = linkedSignal<SortedHorizon | null>(() => this.defaultCaptureHorizon());
  private defaultCaptureHorizon(): SortedHorizon | null {
    const h = this.horizon();
    return h === 'all' ? null : h;
  }
  protected readonly tagFilter = signal<string | null>(null);

  private readonly inHorizon = (l: Quest, h: HorizonFilter) => h === 'all' || l.horizon === h;
  private readonly hasTag = (l: Quest, t: string | null) => !t || l.tagIds.includes(t);

  /** Open, unpinned quests in the current When tab and tag. */
  protected readonly visible = computed(() =>
    this.store
      .open()
      .filter((l) => !l.pinned && this.inHorizon(l, this.horizon()) && this.hasTag(l, this.tagFilter())),
  );

  /** Pinned quests: on top in every When tab (tag filter still applies). */
  protected readonly pinnedVisible = computed(() =>
    this.store.open().filter((l) => l.pinned && this.hasTag(l, this.tagFilter())),
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

  /** Open, unpinned quests per horizon, within the current tag filter (pinned show on every tab). */
  protected readonly horizonCounts = computed(() => {
    const open = this.store.open().filter((l) => !l.pinned && this.hasTag(l, this.tagFilter()));
    const counts = { all: open.length } as Record<HorizonFilter, number>;
    for (const h of SORTED_HORIZONS) counts[h] = open.filter((l) => l.horizon === h).length;
    return counts;
  });

  /** Open quests per tag that the current When tab shows (pinned always count). */
  protected readonly tagCounts = computed(() => {
    const counts = new Map<string, number>();
    for (const l of this.store.open()) {
      if (!l.pinned && !this.inHorizon(l, this.horizon())) continue;
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
    this.store.add(title, {
      tagIds: this.captureTags(),
      importance: this.captureImportance(),
      horizon: this.captureHorizon() ?? 'inbox',
      pinned: this.capturePinned(),
    });
    this.title.setValue('');
    this.captureTags.set([]);
    this.captureImportance.set('normal');
    this.capturePinned.set(false);
    this.captureHorizon.set(this.defaultCaptureHorizon());
    this.captureInput().nativeElement.focus();
  }

  protected cycleImportance(): void {
    this.captureImportance.update(nextImportance);
  }

  protected setHorizon(h: string | null): void {
    this.horizon.set((h ?? 'all') as HorizonFilter);
  }

  protected setCaptureHorizon(h: string | null): void {
    this.captureHorizon.set(h as SortedHorizon | null);
  }

  protected setTagFilter(id: string | null): void {
    this.tagFilter.set(this.tagFilter() === id ? null : id);
  }

  protected tagName(id: string): string {
    return this.store.tagById(id)?.name ?? '';
  }

  protected importanceIcon(l: Quest): string {
    return IMPORTANCE_ICONS[l.importance];
  }

  protected importanceLabel(l: Quest): string {
    return IMPORTANCE_LABELS[l.importance];
  }

  protected hasNotes(l: Quest): boolean {
    return !isBlankHtml(l.notes);
  }

  protected close(l: Quest): void {
    this.store.close(l.id);
  }

  /** Drag-and-drop within a list (pinned or open); saves the new order. */
  protected dropped(list: Quest[], event: CdkDragDrop<Quest[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const ids = list.map((l) => l.id);
    moveItemInArray(ids, event.previousIndex, event.currentIndex);
    this.store.reorder(ids);
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

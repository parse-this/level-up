import { Injectable, computed, inject, signal } from '@angular/core';
import { StorageService } from '../core/storage.service';
import { HORIZONS, Horizon, Importance, Quest, Tag, byImportanceThenNewest } from './quest';

export const QUESTS_KEY = 'levelUpTracker.quests.items';
export const TAGS_KEY = 'levelUpTracker.quests.tags';

/**
 * Key names before the feature was renamed to Quest Log. Data is moved to the new keys once.
 * TODO: remove (and use `load`) once every browser in use has opened the app since the rename.
 */
export const OLD_QUESTS_KEY = 'levelUpTracker.openLoops.loops';
export const OLD_TAGS_KEY = 'levelUpTracker.openLoops.tags';

/** Quest Log: quests and the tags used to organize them. */
@Injectable({ providedIn: 'root' })
export class QuestStore {
  private readonly storage = inject(StorageService);
  private readonly allQuests = signal<Quest[]>(
    this.storage.loadRenamed<Quest[]>(OLD_QUESTS_KEY, QUESTS_KEY, []),
  );
  private readonly allTags = signal<Tag[]>(this.storage.loadRenamed<Tag[]>(OLD_TAGS_KEY, TAGS_KEY, []));

  readonly quests = this.allQuests.asReadonly();

  /** Tags, alphabetical. */
  readonly tags = computed(() =>
    [...this.allTags()].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
  );

  /** Open quests: Urgent → Important → Normal, newest first within each. */
  readonly open = computed(() => this.allQuests().filter((l) => !l.closedAt).sort(byImportanceThenNewest));

  /** Closed quests, most recently closed first. */
  readonly closed = computed(() =>
    this.allQuests()
      .filter((l) => l.closedAt)
      .sort((a, b) => b.closedAt!.localeCompare(a.closedAt!)),
  );

  /** Open quest count per horizon. */
  readonly horizonCounts = computed(() => {
    const counts = Object.fromEntries(HORIZONS.map((h) => [h, 0])) as Record<Horizon, number>;
    for (const l of this.open()) counts[l.horizon]++;
    return counts;
  });

  byId(id: string): Quest | undefined {
    return this.allQuests().find((l) => l.id === id);
  }

  tagById(id: string): Tag | undefined {
    return this.allTags().find((t) => t.id === id);
  }

  /** Captures a quest into the Inbox. */
  add(title: string, options: { tagIds?: string[]; importance?: Importance; horizon?: Horizon } = {}): Quest {
    const quest: Quest = {
      id: crypto.randomUUID(),
      title: title.trim(),
      horizon: options.horizon ?? 'inbox',
      importance: options.importance ?? 'normal',
      tagIds: options.tagIds ?? [],
      createdAt: new Date().toISOString(),
    };
    this.commitQuests([...this.allQuests(), quest]);
    return quest;
  }

  /** Saves a changed quest (matched by id). */
  update(quest: Quest): void {
    this.commitQuests(this.allQuests().map((l) => (l.id === quest.id ? quest : l)));
  }

  /** Hides it from open lists; keeps horizon, importance, tags and notes. */
  close(id: string): void {
    this.patch(id, (l) => ({ ...l, closedAt: new Date().toISOString() }));
  }

  reopen(id: string): void {
    this.patch(id, ({ closedAt: _closed, ...l }) => l);
  }

  remove(id: string): void {
    this.commitQuests(this.allQuests().filter((l) => l.id !== id));
  }

  /** Returns the existing tag if the name matches (ignoring case), else creates one. */
  createTag(name: string): Tag {
    const trimmed = name.trim();
    const existing = this.allTags().find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;
    const tag: Tag = { id: crypto.randomUUID(), name: trimmed };
    this.commitTags([...this.allTags(), tag]);
    return tag;
  }

  renameTag(id: string, name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    this.commitTags(this.allTags().map((t) => (t.id === id ? { ...t, name: trimmed } : t)));
  }

  /** Deletes the tag and removes it from every quest. */
  deleteTag(id: string): void {
    this.commitTags(this.allTags().filter((t) => t.id !== id));
    this.commitQuests(
      this.allQuests().map((l) =>
        l.tagIds.includes(id) ? { ...l, tagIds: l.tagIds.filter((t) => t !== id) } : l,
      ),
    );
  }

  private patch(id: string, change: (l: Quest) => Quest): void {
    this.commitQuests(this.allQuests().map((l) => (l.id === id ? change(l) : l)));
  }

  private commitQuests(quests: Quest[]): void {
    this.allQuests.set(quests);
    this.storage.save(QUESTS_KEY, quests);
  }

  private commitTags(tags: Tag[]): void {
    this.allTags.set(tags);
    this.storage.save(TAGS_KEY, tags);
  }
}

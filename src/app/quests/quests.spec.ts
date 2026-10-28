import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { routes } from '../app.routes';
import { Quest } from './quest';
import { QuestStore } from './quest.store';

/** Quest Log pages through the real routes. */
describe('Quest Log', { timeout: 15_000 }, () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      ],
    });
  });

  const store = () => TestBed.inject(QuestStore);
  const url = () => TestBed.inject(Router).url;

  const open = async (path: string) => {
    const harness = await RouterTestingHarness.create(path);
    const el = () => harness.routeNativeElement as HTMLElement;
    const stable = () => harness.fixture.whenStable();
    const text = (selector: string, root: ParentNode = el()) =>
      Array.from(root.querySelectorAll(selector)).map((n) => n.textContent?.replace(/\s+/g, ' ').trim());
    const click = async (selector: string, root: ParentNode = el()) => {
      root.querySelector<HTMLElement>(selector)!.click();
      await stable();
    };
    const type = async (selector: string, value: string) => {
      const input = el().querySelector<HTMLInputElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await stable();
    };
    /** Click a toggle button (horizon/importance) by its visible text. */
    /** On the list page this defaults to the filter tabs (Capture has its own When toggles). */
    const toggle = async (label: string, root: ParentNode = el().querySelector('.filters') ?? el()) => {
      Array.from(root.querySelectorAll('mat-button-toggle'))
        // Text may start with an icon name, e.g. "local_fire_department Urgent".
        .find((t) => t.textContent?.replace(/\s+/g, ' ').trim().split(' ').includes(label))!
        .querySelector('button')!
        .click();
      await stable();
    };
    return { harness, el, stable, text, click, type, toggle };
  };

  /** The newest confirm dialog (an earlier one may still be closing). */
  const dialog = () => {
    const root = Array.from(document.querySelectorAll('mat-dialog-container')).at(-1);
    const button = (label: string) =>
      Array.from(root?.querySelectorAll<HTMLButtonElement>('button') ?? []).find(
        (b) => b.textContent?.trim() === label,
      )!;
    return { root, title: root?.querySelector('[mat-dialog-title]')?.textContent?.trim(), button };
  };

  it('shows the "Quest Log — Free your mind" header with an ⓘ that explains it', async () => {
    const { el, text, click } = await open('/quests');
    expect(text('h1')).toEqual(['Quest Log — Free your mind']);
    expect(el().querySelector('app-feature-info')).toBeNull();

    await click('[aria-label="What is the Quest Log?"]');
    const info = text('app-feature-info')[0]!;
    for (const phrase of ['goals, to-dos, lists', 'get things done', 'unburden your mind']) {
      expect(info).toContain(phrase);
    }
    await click('app-feature-info [aria-label="Close"]');
    expect(el().querySelector('app-feature-info')).toBeNull();
  });

  it('redirects old /open-loops addresses', async () => {
    const l = store().add('Old link');
    await open(`/open-${'loops'}/${l.id}`); // old address from before the rename
    expect(url()).toBe(`/quests/${l.id}`);
  });

  describe('list', () => {
    it('captures with Enter (unsorted, shown under All), then resets', async () => {
      const { el, text, type, stable } = await open('/quests');
      expect(text('.empty')).toEqual(['No open quests. Mind clear!']);

      await type('.capture-input', 'Call dentist');
      el().querySelector('form.capture')!.dispatchEvent(new Event('submit'));
      await stable();

      expect(store().open().map((l) => [l.title, l.horizon, l.importance])).toEqual([
        ['Call dentist', 'inbox', 'normal'],
      ]);
      expect(text('.quest-title')).toEqual(['Call dentist']);
      expect(el().querySelector<HTMLInputElement>('.capture-input')!.value).toBe('');
      expect(document.activeElement).toBe(el().querySelector('.capture-input'));
    });

    it('captures into the chosen When (same choices as the tabs, optional); starts on the viewed tab and resets after', async () => {
      const { el, text, type, toggle, stable } = await open('/quests');
      const capture = el().querySelector('.capture')!;
      const selectedWhen = () => text('.capture-when .mat-button-toggle-checked');
      const add = async (title: string) => {
        await type('.capture-input', title);
        el().querySelector('form.capture')!.dispatchEvent(new Event('submit'));
        await stable();
      };
      const horizonOf = (title: string) => store().quests().find((q) => q.title === title)!.horizon;

      expect(text('.capture-when mat-button-toggle')).toEqual(['Today', 'Soon', 'Someday']);
      expect(selectedWhen()).toEqual([]);
      await add('Unsorted thing');
      expect(horizonOf('Unsorted thing')).toBe('inbox');

      await toggle('Today', capture);
      expect(selectedWhen()).toEqual(['Today']);
      // Tapping it again clears it.
      await toggle('Today', capture);
      expect(selectedWhen()).toEqual([]);

      await toggle('Today', capture);
      await add('Call the bank');
      expect(horizonOf('Call the bank')).toBe('now');
      expect(selectedWhen()).toEqual([]);

      await toggle('Soon');
      expect(selectedWhen()).toEqual(['Soon']);
      await add('Plan trip');
      expect(horizonOf('Plan trip')).toBe('soon');
      expect(selectedWhen()).toEqual(['Soon']);
      expect(text('.quest-title')).toEqual(['Plan trip']);
    });

    it('sets importance (cycling) and tags with buttons when capturing; both reset after', async () => {
      store().createTag('Errands');
      const { el, text, click, type, stable } = await open('/quests');

      await click('.importance-toggle');
      expect(text('.importance-toggle')).toEqual(['star Important']);
      await click('.importance-toggle');
      expect(text('.importance-toggle')).toEqual(['local_fire_department Urgent']);

      await click('.capture .tag-picker-trigger');
      document.querySelector<HTMLElement>('.tag-option input')!.click();
      await stable();
      // New tag from the picker is created and selected.
      const newTag = document.querySelector<HTMLInputElement>('.new-tag-input')!;
      newTag.value = 'Home';
      document.querySelector('.new-tag')!.dispatchEvent(new Event('submit'));
      await stable();
      expect(text('.capture .tag-picker-trigger')).toEqual(['sell Tags (2)']);

      await type('.capture-input', 'Buy batteries');
      el().querySelector('form.capture')!.dispatchEvent(new Event('submit'));
      await stable();

      const [quest] = store().open();
      expect(quest.importance).toBe('urgent');
      expect(quest.tagIds.map((id) => store().tagById(id)?.name)).toEqual(['Errands', 'Home']);
      expect(text('.importance-toggle')).toEqual(['label_important Normal']);
      expect(text('.capture .tag-picker-trigger')).toEqual(['sell Tags']);
      expect(el().querySelector('.quest.urgent')).toBeTruthy();
      expect(text('.quest .mini-tag')).toEqual(['Errands', 'Home']);
    });

    it('filters by horizon and tag, with counts', async () => {
      const tag = store().createTag('Work');
      // Distinct capture times so newest-first order is certain.
      vi.useFakeTimers({ now: new Date('2026-10-25T08:00:00Z'), toFake: ['Date'] });
      store().add('Inbox thing');
      vi.setSystemTime(new Date('2026-10-25T08:01:00Z'));
      const b = store().add('Now work', { tagIds: [tag.id] });
      store().update({ ...b, horizon: 'now' });
      vi.setSystemTime(new Date('2026-10-25T08:02:00Z'));
      store().add('Inbox work', { tagIds: [tag.id] });
      vi.useRealTimers();
      const { text, toggle, click } = await open('/quests');

      // All comes first and is selected by default; there's no separate Inbox tab.
      expect(text('.horizons mat-button-toggle')).toEqual(['All 3', 'Today 1', 'Soon 0', 'Someday 0']);
      expect(text('.horizons .mat-button-toggle-checked')).toEqual(['All 3']);
      expect(text('.quest-title')).toEqual(['Inbox work', 'Now work', 'Inbox thing']);

      await toggle('Today');
      expect(text('.quest-title')).toEqual(['Now work']);

      await toggle('All');
      await click('.tag-chip');
      expect(text('.quest-title')).toEqual(['Inbox work', 'Now work']);
      expect(text('.horizons mat-button-toggle')).toEqual(['All 2', 'Today 1', 'Soon 0', 'Someday 0']);

      await toggle('Soon');
      expect(text('.empty')).toEqual(['No open quests tagged Work.']);
    });

    it('groups completed quests by the day they were completed', async () => {
      const old = store().add('Old one');
      const recent = store().add('Recent one');
      const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
      store().update({ ...store().byId(old.id)!, closedAt: daysAgo(5) });
      store().update({ ...store().byId(recent.id)!, closedAt: new Date().toISOString() });
      const { el, text } = await open('/quests');

      expect(text('.closed .group-title')).toEqual(['Today', 'Earlier']);
      const groups = Array.from(el().querySelectorAll('.closed .day-group'));
      expect(groups.map((g) => text('.quest-title', g))).toEqual([['Recent one'], ['Old one']]);
    });

    it('closes into a collapsed Closed section, reopens, and deletes after confirming', async () => {
      store().add('Renew registration');
      const { el, text, click, stable } = await open('/quests');

      await click('[aria-label="Complete Renew registration"]');
      expect(text('.quests:not(.closed-list) .quest-title')).toEqual([]);
      expect(text('.closed mat-panel-title')).toEqual(['Completed (1)']);

      await click('[aria-label="Reopen Renew registration"]');
      expect(store().open()).toHaveLength(1);
      expect(el().querySelector('.closed')).toBeNull();

      await click('[aria-label="Complete Renew registration"]');
      await click('[aria-label="Delete Renew registration"]');
      expect(dialog().title).toBe('Delete quest?');
      dialog().button('Delete').click();
      await stable();
      expect(store().quests()).toEqual([]);
    });

    it('manages tags: rename and delete', async () => {
      const tag = store().createTag('Wrok');
      store().add('Report', { tagIds: [tag.id] });
      const { click, stable } = await open('/quests');

      await click('.manage-tags');
      const input = document.querySelector<HTMLInputElement>('app-manage-tags input')!;
      input.value = 'Work';
      input.dispatchEvent(new Event('blur'));
      await stable();
      expect(store().tagById(tag.id)?.name).toBe('Work');

      document.querySelector<HTMLElement>('app-manage-tags [aria-label="Delete Work"]')!.click();
      await vi.waitFor(() => expect(dialog().title).toBe('Delete tag "Work"?'));
      dialog().button('Delete').click();
      await stable();
      expect(store().tags()).toEqual([]);
      expect(store().open()[0].tagIds).toEqual([]);
    });
  });

  describe('quest page', () => {
    const quest = (): Quest => store().quests()[0];

    it('opens from the list and saves title, horizon, importance and tags as you go', async () => {
      store().createTag('Home');
      const l = store().add('Fix sink');
      const { el, text, type, toggle, stable } = await open(`/quests/${l.id}`);

      expect(text('.quest-heading')).toEqual(['radio_button_unchecked Quest']);
      expect(el().querySelector('.back-rail')?.getAttribute('aria-label')).toBe('All quests');

      await type('[formControlName="title"]', ' Fix kitchen sink ');
      expect(quest().title).toBe('Fix kitchen sink');
      await type('[formControlName="title"]', '   ');
      expect(quest().title).toBe('Fix kitchen sink'); // blank isn't saved

      await toggle('Today');
      await toggle('Urgent', el().querySelector('.importance')!);
      expect([quest().horizon, quest().importance]).toEqual(['now', 'urgent']);

      el().querySelector<HTMLElement>('.tags .tag-picker-trigger')!.click();
      await stable();
      document.querySelector<HTMLElement>('.tag-option input')!.click();
      await stable();
      expect(text('.tags .tag').map((t) => t?.replace('close', '').trim())).toEqual(['Home']);
      el().querySelector<HTMLElement>('[aria-label="Remove tag Home"]')!.click();
      await stable();
      expect(quest().tagIds).toEqual([]);
    });

    it('closes / reopens, and deletes after confirming', async () => {
      const l = store().add('Return library book');
      const { text, click, stable } = await open(`/quests/${l.id}`);

      await click('.toggle-closed');
      expect(quest().closedAt).toBeTruthy();
      expect(text('.quest-heading')).toEqual(['check_circle Completed quest']);
      expect(text('.toggle-closed')).toEqual(['undo Reopen']);
      await click('.toggle-closed');
      expect(quest().closedAt).toBeUndefined();

      await click('[aria-label="Delete quest"]');
      dialog().button('Delete').click();
      await stable();
      expect(store().quests()).toEqual([]);
      expect(url()).toBe('/quests');
    });

    it('Done goes back to the quest list', async () => {
      const l = store().add('Water the plants');
      const { click } = await open(`/quests/${l.id}`);
      await click('.done');
      expect(url()).toBe('/quests');
    });

    it('edits notes with the rich editor (lists, checklists, bold) and saves HTML', async () => {
      // jsdom has no layout; the editor scrolls the cursor into view, so stub the measuring APIs.
      const rect = { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 };
      for (const proto of [Range.prototype, Text.prototype] as any[]) {
        proto.getClientRects ??= () => [];
        proto.getBoundingClientRect ??= () => rect;
      }
      const l = store().add('Plan trip');
      const { harness, el } = await open(`/quests/${l.id}`);
      expect(el().querySelector('.notes-editor .ProseMirror')).toBeTruthy();

      const editor = harness.fixture.debugElement
        .query((d) => d.name === 'app-notes-editor')
        .componentInstance.editor;
      vi.useFakeTimers();
      editor.chain().focus().toggleTaskList().insertContent('Book flights').run();
      vi.advanceTimersByTime(400);
      vi.useRealTimers();

      expect(quest().notes).toContain('data-type="taskList"');
      expect(quest().notes).toContain('Book flights');

      editor.commands.clearContent(true);
      await new Promise((r) => setTimeout(r, 400));
      expect('notes' in quest()).toBe(false);
    });

    it('shows "Quest not found." for an unknown id', async () => {
      const { text } = await open('/quests/nope');
      expect(text('.empty')).toEqual(['Quest not found.']);
    });
  });
});

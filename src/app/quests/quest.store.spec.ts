import { TestBed } from '@angular/core/testing';
import { Quest, isBlankHtml, nextImportance } from './quest';
import { OLD_QUESTS_KEY, OLD_TAGS_KEY, QUESTS_KEY, QuestStore, TAGS_KEY } from './quest.store';

describe('QuestStore', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.useRealTimers());

  const create = () => TestBed.inject(QuestStore);
  const saved = (): Quest[] => JSON.parse(localStorage.getItem(QUESTS_KEY) ?? '[]');

  it('moves data saved under the old (Open Loops) keys to the new keys, once', () => {
    const quest: Quest = {
      id: 'q1',
      title: 'Old quest',
      horizon: 'now',
      importance: 'normal',
      tagIds: ['t1'],
      createdAt: '2026-10-20T08:00:00.000Z',
    };
    localStorage.setItem(OLD_QUESTS_KEY, JSON.stringify([quest]));
    localStorage.setItem(OLD_TAGS_KEY, JSON.stringify([{ id: 't1', name: 'Home' }]));

    const store = create();
    expect(store.quests()).toEqual([quest]);
    expect(store.tags()).toEqual([{ id: 't1', name: 'Home' }]);
    expect(saved()).toEqual([quest]);
    expect(localStorage.getItem(OLD_QUESTS_KEY)).toBeNull();
    expect(localStorage.getItem(OLD_TAGS_KEY)).toBeNull();
  });

  it('captures into the Inbox with trimmed title, tags and importance, and saves', () => {
    vi.useFakeTimers({ now: new Date('2026-10-25T07:00:00Z'), toFake: ['Date'] });
    const store = create();
    const tag = store.createTag('Errands');
    const quest = store.add('  Buy batteries ', { tagIds: [tag.id], importance: 'important' });

    expect(quest).toEqual({
      id: quest.id,
      title: 'Buy batteries',
      horizon: 'inbox',
      importance: 'important',
      tagIds: [tag.id],
      createdAt: '2026-10-25T07:00:00.000Z',
    });
    expect(saved()).toEqual([quest]);
    expect(store.horizonCounts()).toEqual({ inbox: 1, now: 0, soon: 0, someday: 0 });
  });

  it('sorts open quests Urgent → Important → Normal, newest first within each', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const store = create();
    const at = (iso: string, title: string, importance: Quest['importance'] = 'normal') => {
      vi.setSystemTime(new Date(iso));
      store.add(title, { importance });
    };
    at('2026-10-01T01:00:00Z', 'old normal');
    at('2026-10-01T02:00:00Z', 'old urgent', 'urgent');
    at('2026-10-01T03:00:00Z', 'important', 'important');
    at('2026-10-01T04:00:00Z', 'new normal');
    at('2026-10-01T05:00:00Z', 'new urgent', 'urgent');

    expect(store.open().map((l) => l.title)).toEqual([
      'new urgent',
      'old urgent',
      'important',
      'new normal',
      'old normal',
    ]);
  });

  it('closing keeps everything and only hides the quest; reopening restores it', () => {
    vi.useFakeTimers({ now: new Date('2026-10-25T08:00:00Z'), toFake: ['Date'] });
    const store = create();
    const tag = store.createTag('Home');
    const quest = store.add('Fix sink', { tagIds: [tag.id], importance: 'urgent' });
    store.update({ ...quest, horizon: 'now', notes: '<p>Call plumber</p>' });

    vi.setSystemTime(new Date('2026-10-25T09:00:00Z'));
    store.close(quest.id);
    expect(store.open()).toEqual([]);
    expect(store.closed()).toEqual([
      { ...quest, horizon: 'now', notes: '<p>Call plumber</p>', closedAt: '2026-10-25T09:00:00.000Z' },
    ]);
    expect(store.horizonCounts().now).toBe(0);

    store.reopen(quest.id);
    expect(store.byId(quest.id)).toEqual({ ...quest, horizon: 'now', notes: '<p>Call plumber</p>' });
    expect(store.horizonCounts().now).toBe(1);

    store.remove(quest.id);
    expect(store.quests()).toEqual([]);
  });

  it('creates tags once per name (ignoring case), renames, and deletes them from quests', () => {
    const store = create();
    const work = store.createTag(' Work ');
    expect(store.createTag('work')).toEqual(work);
    const home = store.createTag('home');
    expect(store.tags().map((t) => t.name)).toEqual(['home', 'Work']);

    store.renameTag(work.id, 'Job');
    store.renameTag(work.id, '   '); // ignored
    expect(store.tagById(work.id)?.name).toBe('Job');

    const quest = store.add('Email boss', { tagIds: [work.id, home.id] });
    store.deleteTag(work.id);
    expect(store.tags().map((t) => t.name)).toEqual(['home']);
    expect(store.byId(quest.id)?.tagIds).toEqual([home.id]);
    expect(JSON.parse(localStorage.getItem(TAGS_KEY)!)).toEqual([home]);
  });
});

describe('quest helpers', () => {
  it('cycles importance Normal → Important → Urgent → Normal', () => {
    expect([nextImportance('normal'), nextImportance('important'), nextImportance('urgent')]).toEqual([
      'important',
      'urgent',
      'normal',
    ]);
  });

  it('treats markup without text as blank', () => {
    expect(isBlankHtml(undefined)).toBe(true);
    expect(isBlankHtml('<p></p>')).toBe(true);
    expect(isBlankHtml('<p>  </p>')).toBe(true);
    expect(isBlankHtml('<p>Hi</p>')).toBe(false);
    expect(isBlankHtml('<ul data-type="taskList"><li><p></p></li></ul>')).toBe(false);
  });
});

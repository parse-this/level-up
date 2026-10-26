import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { QuestStore } from '../quests/quest.store';
import { PlayerStatus } from './player-status';
import { XpFeedback } from './xp-feedback';

describe('Player status, XP feedback & Player page', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  });

  it('shows level, streak and XP progress, and links to the Player page', async () => {
    const fixture = TestBed.createComponent(PlayerStatus);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.lv')?.textContent?.trim()).toBe('Lv 1');
    expect(el.querySelector('.streak')).toBeNull();
    expect(el.querySelector('a.status')?.getAttribute('href')).toBe('/player');

    TestBed.inject(QuestStore).add('Something'); // +2 capture, +1 day-1 streak
    await fixture.whenStable();
    expect(el.querySelector('.streak')?.textContent?.trim()).toBe('🔥1');
    expect(el.querySelector('a.status')?.getAttribute('aria-label')).toBe(
      'Level 1, 3 of 50 XP to level 2, 1-day streak. View breakdown.',
    );
  });

  it('pops "+N XP" on gains only, and "LEVEL UP!" when a level is reached', async () => {
    const fixture = TestBed.createComponent(XpFeedback);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const pops = () => Array.from(el.querySelectorAll('.pop')).map((p) => p.textContent?.trim());
    expect(pops()).toEqual([]); // nothing on first load

    const store = TestBed.inject(QuestStore);
    const first = store.add('One'); // +2 capture +1 streak
    await fixture.whenStable();
    expect(pops()).toEqual(['+3 XP']);

    store.close(first.id); // +10
    await fixture.whenStable();
    expect(pops()).toContain('+10 XP');

    store.reopen(first.id); // −10: no pop
    await fixture.whenStable();
    expect(pops().filter((p) => p === '+10 XP')).toHaveLength(1);

    for (let i = 0; i < 4; i++) store.close(store.add(`Quest ${i}`).id); // 4 × 12 → level 2
    await fixture.whenStable();
    expect(pops()).toContain('LEVEL UP! Lv 2');
  });

  it('Player page shows level, streaks, where XP came from, and recent days', async () => {
    const store = TestBed.inject(QuestStore);
    store.close(store.add('One').id);
    store.add('Two');
    const harness = await RouterTestingHarness.create('/player');
    const el = harness.routeNativeElement as HTMLElement;
    const text = (s: string) =>
      Array.from(el.querySelectorAll(s)).map((n) => n.textContent?.replace(/\s+/g, ' ').trim());

    expect(TestBed.inject(Router).url).toBe('/player');
    expect(text('.level')).toEqual(['Lv 1']);
    expect(text('.to-next')).toEqual(['15 / 50 XP to Lv 2 · 15 XP total']);
    expect(text('.stat-label')).toEqual(['Current streak', 'Best streak', 'Personal records']);
    const rows = (s: string) =>
      Array.from(el.querySelectorAll(s)).map((tr) =>
        Array.from(tr.children).map((c) => c.textContent?.trim()),
      );
    expect(rows('.breakdown tbody tr')).toEqual([
      ['Quests captured', '2 × 2', '+4'],
      ['Quests completed', '1 × 10', '+10'],
      ['Streak bonuses', '', '+1'],
    ]);
    expect(rows('.breakdown tfoot tr')).toEqual([['Total', '', '15']]);
    expect(text('.day .day-what')).toEqual(['🔥 1 · +14 actions · +1 streak']);
  });
});

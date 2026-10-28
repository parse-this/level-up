import { TestBed } from '@angular/core/testing';
import type { Entry } from '../training/entry';
import type { Quest } from '../quests/quest';
import { makeSampleData } from './sample-data';
import { SIM_META_KEY, SimulationService } from './simulation.service';
import { StorageService } from './storage.service';
import { computeProgress, levelFor, localDay } from './xp';

describe('Simulation mode', () => {
  const ENTRIES = 'levelUpTracker.training.entries';
  const QUESTS = 'levelUpTracker.quests.items';
  const FONT = 'levelUpTracker.settings.fontStyle';

  beforeEach(() => localStorage.clear());

  const sim = () => TestBed.inject(SimulationService);
  const storage = () => TestBed.inject(StorageService);

  it('starts automatically on a first visit, with sample data in its own storage location', async () => {
    await sim().init();
    expect(sim().active()).toBe(true);
    expect(sim().showExplanation()).toBe(true);

    // Sample data lives under levelUpSim.*; nothing is written to the real keys.
    expect(localStorage.getItem('levelUpSim.training.entries')).not.toBeNull();
    expect(localStorage.getItem(ENTRIES)).toBeNull();
    // Features still see it through the normal keys.
    expect(storage().load<Entry[]>(ENTRIES, []).length).toBeGreaterThan(10);
    expect(storage().keys()).toEqual([QUESTS, 'levelUpTracker.quests.tags', ENTRIES].sort());
  });

  it("doesn't start when there's data of your own", async () => {
    localStorage.setItem(QUESTS, '[]');
    await sim().init();
    expect(sim().active()).toBe(false);
    expect(JSON.parse(localStorage.getItem(SIM_META_KEY)!).active).toBe(false);
  });

  it('never changes or overwrites real data: entering, changing sample data and exiting', async () => {
    const mine = [{ id: 'mine', title: 'My real quest' }];
    localStorage.setItem(QUESTS, JSON.stringify(mine));
    await sim().init();

    await sim().enter();
    expect(sim().active()).toBe(true);
    expect(sim().showExplanation()).toBe(true); // the full explanation every time you enter
    expect(storage().load<Quest[]>(QUESTS, []).some((q) => q.title === 'Golf club distances')).toBe(true);
    storage().save(QUESTS, []); // e.g. delete every sample quest
    expect(JSON.parse(localStorage.getItem(QUESTS)!)).toEqual(mine);

    sim().exit();
    expect(sim().active()).toBe(false);
    expect(Object.keys(localStorage).filter((k) => k.startsWith('levelUpSim.'))).toEqual([]);
    expect(storage().load(QUESTS, [])).toEqual(mine);
  });

  it('makes fresh sample data (dated from today) every time the app opens while on', async () => {
    await sim().init();
    storage().save(QUESTS, []); // a change made in the simulation
    localStorage.setItem('levelUpSim.training.entries', JSON.stringify([{ id: 'old', date: '2020-01-01' }]));

    TestBed.resetTestingModule(); // next app open
    await TestBed.inject(SimulationService).init();
    const entries = TestBed.inject(StorageService).load<Entry[]>(ENTRIES, []);
    expect(TestBed.inject(StorageService).load<Quest[]>(QUESTS, []).length).toBeGreaterThan(10);
    expect(entries.some((e) => e.id === 'old')).toBe(false);
    expect(entries.some((e) => e.date === localDay(new Date()))).toBe(true);
  });

  it("doesn't start again by itself after exiting", async () => {
    await sim().init();
    sim().exit();
    TestBed.resetTestingModule();
    await TestBed.inject(SimulationService).init();
    expect(TestBed.inject(SimulationService).active()).toBe(false);
  });

  it('settings (font style) are shared by both modes', async () => {
    await sim().init();
    storage().save(FONT, 'pixel');
    expect(localStorage.getItem(FONT)).toBe('"pixel"');
    sim().exit();
    expect(storage().load(FONT, 'exo')).toBe('pixel');
  });

  it('closing the explanation keeps Simulation mode on', async () => {
    await sim().init();
    sim().dismissExplanation();
    expect(sim().showExplanation()).toBe(false);
    expect(sim().active()).toBe(true);
    expect(JSON.parse(localStorage.getItem(SIM_META_KEY)!).bannerDismissed).toBe(true);
  });

  it('sample data puts the player below level 10 (but well past level 1)', () => {
    for (const now of [new Date(), new Date(2026, 0, 5, 12), new Date(2026, 6, 18, 12)]) {
      const data = makeSampleData(now);
      const progress = computeProgress(
        data[ENTRIES] as Entry[],
        data[QUESTS] as Quest[],
        localDay(now),
      );
      const { level } = levelFor(progress.totalXp);
      expect(level).toBeLessThan(10);
      expect(level).toBeGreaterThanOrEqual(3);
    }
  });
});

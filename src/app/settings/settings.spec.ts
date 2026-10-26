import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { StorageService } from '../core/storage.service';
import { PAGE_RELOAD } from './save-load';

describe('Settings', { timeout: 15_000 }, () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter(routes, withComponentInputBinding())],
    });
  });

  const open = async (path: string) => {
    const harness = await RouterTestingHarness.create(path);
    const el = () => harness.routeNativeElement as HTMLElement;
    const text = (selector: string) =>
      Array.from(el().querySelectorAll(selector)).map((n) =>
        n.textContent?.replace(/\s+/g, ' ').trim(),
      );
    return { harness, el, text };
  };

  it('lists sections: About, Save & load game, View data, Credits', async () => {
    const { el, text, harness } = await open('/settings');
    expect(text('h1')).toEqual(['Settings — Options menu']);
    expect(text('.section-title')).toEqual(['About', 'Save & load game', 'View data', 'Credits']);

    el().querySelectorAll<HTMLElement>('.section')[2].click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/settings/data');
  });

  describe('Save & load game', () => {
    const E = 'levelUpTracker.training.entries';
    const Q = 'levelUpTracker.quests.items';
    let reload: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      reload = vi.fn();
      TestBed.overrideProvider(PAGE_RELOAD, { useValue: reload });
      TestBed.overrideProvider(MATERIAL_ANIMATIONS, { useValue: { animationsDisabled: true } });
    });

    /** Picks a file in the hidden input, as the "Load game" button would. */
    const pickFile = async (el: HTMLElement, stable: () => Promise<unknown>, content: string) => {
      const input = el.querySelector<HTMLInputElement>('input[type="file"]')!;
      const file = new File([content], 'save.json', { type: 'application/json' });
      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      input.dispatchEvent(new Event('change'));
      await vi.waitFor(() => expect(el.querySelector('.summary, .error')).toBeTruthy());
      await stable();
    };
    const saveText = (data: Record<string, unknown>) =>
      JSON.stringify({ app: 'level-up', version: 1, savedAt: '2026-10-26T19:14:00.000Z', data });

    it('Save game downloads everything as a dated file', async () => {
      localStorage.setItem(E, JSON.stringify([{ id: 'e1' }]));
      localStorage.setItem('unrelated', 'x');
      let blob: Blob | undefined;
      URL.createObjectURL = vi.fn((b: Blob) => ((blob = b), 'blob:save'));
      URL.revokeObjectURL = vi.fn();
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
        this: HTMLAnchorElement,
      ) {
        expect(this.download).toMatch(/^level-up-save-\d{4}-\d{2}-\d{2}\.json$/);
      });
      const { el, harness } = await open('/settings/save-load');

      el().querySelector<HTMLElement>('button.save')!.click();
      await harness.fixture.whenStable();
      expect(click).toHaveBeenCalled();
      const save = JSON.parse(await blob!.text());
      expect(save).toMatchObject({ app: 'level-up', version: 1, data: { [E]: [{ id: 'e1' }] } });
      expect(Object.keys(save.data)).toEqual([E]);
      click.mockRestore();
    });

    it('Load game shows what is in the save, then merges and reloads', async () => {
      localStorage.setItem(Q, JSON.stringify([{ id: 'a', title: 'mine' }]));
      const { el, text, harness } = await open('/settings/save-load');
      const stable = () => harness.fixture.whenStable();

      await pickFile(el(), stable, saveText({ [Q]: [{ id: 'a', title: 'theirs' }, { id: 'b' }], [E]: [{ id: 'e1' }] }));
      expect(text('.summary-detail')).toEqual(['2 quests · 1 training entry']);

      el().querySelector<HTMLElement>('button.merge')!.click();
      expect(JSON.parse(localStorage.getItem(Q)!)).toEqual([{ id: 'a', title: 'mine' }, { id: 'b' }]);
      expect(JSON.parse(localStorage.getItem(E)!)).toEqual([{ id: 'e1' }]);
      expect(reload).toHaveBeenCalled();
    });

    it('Replace asks first, then makes this device match the save exactly', async () => {
      localStorage.setItem(Q, JSON.stringify([{ id: 'a' }]));
      localStorage.setItem(E, JSON.stringify([{ id: 'e-old' }]));
      const { el, harness } = await open('/settings/save-load');
      const stable = () => harness.fixture.whenStable();
      await pickFile(el(), stable, saveText({ [Q]: [{ id: 'b' }] }));

      el().querySelector<HTMLElement>('button.replace')!.click();
      const confirmButton = () =>
        Array.from(document.querySelectorAll<HTMLButtonElement>('mat-dialog-container button')).find(
          (b) => b.textContent?.trim() === 'Replace',
        );
      await vi.waitFor(() => expect(confirmButton()).toBeTruthy());
      expect(document.querySelector('mat-dialog-container [mat-dialog-title]')?.textContent?.trim()).toBe(
        'Replace your progress?',
      );
      confirmButton()!.click();
      await vi.waitFor(() => expect(reload).toHaveBeenCalled());
      expect(JSON.parse(localStorage.getItem(Q)!)).toEqual([{ id: 'b' }]);
      expect(localStorage.getItem(E)).toBeNull();
    });

    it('rejects files that are not Level Up saves', async () => {
      const { el, text, harness } = await open('/settings/save-load');
      await pickFile(el(), () => harness.fixture.whenStable(), '{"hello": "world"}');
      expect(text('.error')).toEqual(["That file isn't a Level Up save."]);
      expect(el().querySelector('button.merge')).toBeNull();
    });
  });

  it('About page explains both features (no close buttons)', async () => {
    const { el, text } = await open('/settings/about');
    expect(text('app-feature-info .info-title')).toEqual([
      'Training Ground — Raise your stats',
      'Quest Log — Free your mind',
    ]);
    expect(el().querySelector('app-feature-info [aria-label="Close"]')).toBeNull();
  });

  it('Credits page attributes the mushroom art (CC BY 3.0)', async () => {
    const { el, text } = await open('/settings/credits');
    expect(text('.credit .what')).toEqual(['Mushroom artwork', 'Built with']);
    const links = Array.from(el().querySelectorAll<HTMLAnchorElement>('.credit a')).map((a) => a.href);
    expect(links).toEqual([
      'https://opengameart.org/content/mushrooms-set-01',
      'https://opengameart.org/users/gameartforge',
      'https://creativecommons.org/licenses/by/3.0/',
    ]);
  });

  describe('View data', () => {
    it('shows each saved data set as pretty JSON with a summary', async () => {
      localStorage.setItem('levelUpTracker.training.entries', JSON.stringify([{ a: 1 }, { b: 2 }]));
      localStorage.setItem('levelUpTracker.zzz.settings', JSON.stringify({ maxReps: 15 }));
      localStorage.setItem('someOtherApp', '"not ours"');
      const { el, text } = await open('/settings/data');

      expect(text('mat-card-title')).toEqual(['training.entries', 'zzz.settings']);
      expect(text('mat-card-subtitle')[0]).toMatch(/^2 items · \d+ B$/);
      expect(text('mat-card-subtitle')[1]).toMatch(/^\d+ B$/);
      expect(el().querySelector('.json')!.textContent).toBe(
        JSON.stringify([{ a: 1 }, { b: 2 }], null, 2),
      );
    });

    it('shows invalid JSON as-is', async () => {
      localStorage.setItem('levelUpTracker.broken', '{oops');
      const { el, text } = await open('/settings/data');
      expect(text('mat-card-subtitle')[0]).toMatch(/^Not valid JSON · /);
      expect(el().querySelector('.json')!.textContent).toBe('{oops');
    });

    it('shows an empty state', async () => {
      const { text } = await open('/settings/data');
      expect(text('.empty')).toEqual(['No save data yet.']);
    });

    it('copies a data set to the clipboard', async () => {
      localStorage.setItem('levelUpTracker.training.entries', '[1]');
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
      const { el, text, harness } = await open('/settings/data');

      el().querySelector<HTMLButtonElement>('mat-card-actions button')!.click();
      await harness.fixture.whenStable();
      expect(writeText).toHaveBeenCalledWith('[\n  1\n]');
      expect(text('mat-card-actions button')).toEqual(['check Copied']);
    });
  });
});

describe('StorageService.keys', () => {
  it("lists only this app's keys, sorted", () => {
    localStorage.clear();
    localStorage.setItem('levelUpTracker.b', '1');
    localStorage.setItem('other', '1');
    localStorage.setItem('levelUpTracker.a', '1');
    expect(TestBed.inject(StorageService).keys()).toEqual(['levelUpTracker.a', 'levelUpTracker.b']);
  });
});

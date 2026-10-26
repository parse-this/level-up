import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { routes } from '../app.routes';
import { ExerciseInput, MoveEntry, WeighInEntry, WorkoutEntry } from './entry';
import { EntryStore } from './entry.store';

const squat: ExerciseInput = {
  name: 'Squat',
  steps: [
    { type: 'set', reps: 5, weight: 225, failure: false, easy: false },
    { type: 'rest', minutes: 3 },
    { type: 'set', reps: 5, weight: 225, failure: true, easy: false },
  ],
};

/** Log list + entry detail pages, through the real routes. */
// Pages lazy-load through the real routes; allow for slow first loads when all files run in parallel.
describe('Training Ground pages', { timeout: 15_000 }, () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        // jsdom never fires animation-end events, so dialogs would never finish closing.
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      ],
    });
  });

  const store = () => TestBed.inject(EntryStore);
  const url = () => TestBed.inject(Router).url;

  const open = async (path: string) => {
    const harness = await RouterTestingHarness.create(path);
    const el = () => harness.routeNativeElement as HTMLElement;
    const stable = () => harness.fixture.whenStable();
    const text = (selector: string, root: ParentNode = el()) =>
      Array.from(root.querySelectorAll(selector)).map((n) =>
        n.textContent?.replace(/\s+/g, ' ').trim(),
      );
    const click = async (selector: string) => {
      el().querySelector<HTMLElement>(selector)!.click();
      await stable();
    };
    const type = async (selector: string, value: string) => {
      const input = el().querySelector<HTMLInputElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await stable();
    };
    return { harness, el, stable, text, click, type };
  };

  describe('log list', () => {
    it('has an ⓘ that explains the Training Ground, and old /body-xp links redirect', async () => {
      const { el, text, click } = await open('/body-xp');
      expect(url()).toBe('/training');
      expect(text('h1')[0]).toMatch(/^Training Ground — Raise your stats/);
      await click('[aria-label="What is the Training Ground?"]');
      const info = text('app-feature-info')[0]!;
      for (const phrase of ['Workouts', 'Get Moving', 'Weigh-ins']) expect(info).toContain(phrase);
      expect(el().querySelector('app-feature-info [aria-label="Close"]')).toBeTruthy();
    });

    it('shows the header and empty state', async () => {
      const { text } = await open('/training');
      expect(text('h1 .page-subtitle')[0]).toMatch(/^— Raise your stats/);
      expect(text('h1 sup .xp-pop')).toEqual(['+50 VIT', '+5 AGI', '+5 STR']);
      expect(text('.empty')[0]).toContain('Nothing logged yet');
    });

    it('lists every entry type with a summary', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      const at = (iso: string) => vi.setSystemTime(new Date(iso));
      at('2026-10-01T08:00:00Z');
      const w = store().create({ type: 'workout', date: '2026-10-01', exercises: [] });
      store().addExercise(w.id, squat);
      store().addExercise(w.id, { ...squat, name: 'Lunge' });
      at('2026-10-02T08:00:00Z');
      store().create({ type: 'workout', date: '2026-10-02', name: 'Leg day', exercises: [] });
      at('2026-10-03T08:00:00Z');
      store().create({
        type: 'move',
        date: '2026-10-03',
        activity: 'run',
        distance: 3.1,
        durationMinutes: 28,
        location: 'Park',
      });
      at('2026-10-04T08:00:00Z');
      store().create({ type: 'weigh-in', date: '2026-10-04', weight: 182.4 });
      at('2026-10-05T08:00:00Z');
      store().create({ type: 'weigh-in', date: '2026-10-05' });
      vi.useRealTimers();

      const { text } = await open('/training');
      expect(text('.entry-title')).toEqual(['Weigh-in', 'Weigh-in', 'Run', 'Leg day', 'Workout']);
      expect(text('.entry-meta')).toEqual([
        'Mon, Oct 5, 2026 · No weight yet',
        'Sun, Oct 4, 2026 · 182.4 lb',
        'Sat, Oct 3, 2026 · 3.1 mi · 28 min · Park',
        'Fri, Oct 2, 2026 · 0 exercises · 0 sets',
        'Thu, Oct 1, 2026 · 2 exercises · 4 sets',
      ]);
      expect(text('.entry-exercises')).toEqual(['Squat, Lunge']);
      expect(text('.entry-icon')).toEqual([
        'monitor_weight',
        'monitor_weight',
        'directions_run',
        'fitness_center',
        'fitness_center',
      ]);
    });

    it('"New entry" menu creates each type for today and opens it', async () => {
      const { harness, click } = await open('/training');
      await click('.new-entry');
      const items = Array.from(document.querySelectorAll<HTMLElement>('[mat-menu-item]'));
      expect(items.map((i) => i.querySelector('span')?.textContent?.trim())).toEqual([
        'Workout',
        'Walk',
        'Run',
        'Bike',
        'Weigh-in',
      ]);

      items[3].click(); // Bike
      await harness.fixture.whenStable();
      const [entry] = store().entries();
      expect(entry).toMatchObject({ type: 'move', activity: 'bike' });
      expect(url()).toBe(`/training/${entry.id}`);
    });
  });

  describe('entry detail', () => {
    it('has an "All entries" rail that goes back to the log', async () => {
      const i = store().create({ type: 'weigh-in', date: '2026-10-01' });
      const { el, text, click, stable } = await open(`/training/${i.id}`);
      expect(text('.back-rail .back-text')).toEqual(['All entries']);
      expect(el().querySelector('.back-rail')?.getAttribute('aria-label')).toBe('All entries');
      await click('.back-rail');
      await stable();
      expect(url()).toBe('/training');
      expect(el().querySelector('.entry-list')).toBeTruthy();
    });

    it('shows "Entry not found" for an unknown id', async () => {
      const { text, el } = await open('/training/nope');
      expect(text('.empty')).toEqual(['Entry not found.']);
      expect(el().querySelector('[aria-label="Delete entry"]')).toBeNull();
    });

    /** The newest confirm dialog's title, message and buttons (an earlier one may still be closing). */
    const dialog = () => {
      const root = Array.from(document.querySelectorAll('mat-dialog-container')).at(-1);
      const txt = (s: string) => root?.querySelector(s)?.textContent?.replace(/\s+/g, ' ').trim();
      const button = (label: string) =>
        Array.from(root?.querySelectorAll<HTMLButtonElement>('button') ?? []).find(
          (b) => b.textContent?.trim() === label,
        )!;
      return { open: !!root, title: txt('[mat-dialog-title]'), message: txt('mat-dialog-content'), button };
    };

    it('deletes after confirming in the dialog, and goes back to the log', async () => {
      const w = store().create({ type: 'workout', date: '2026-10-01', exercises: [] });
      store().addExercise(w.id, squat);
      const { click, stable } = await open(`/training/${w.id}`);

      await click('[aria-label="Delete entry"]');
      expect(dialog().title).toBe('Delete workout?');
      expect(dialog().message).toBe("Its 1 exercise will be deleted too. This can't be undone.");
      dialog().button('Cancel').click();
      await stable();
      expect(store().byId(w.id)).toBeDefined();

      await click('[aria-label="Delete entry"]');
      dialog().button('Delete').click();
      await stable();
      expect(store().byId(w.id)).toBeUndefined();
      expect(url()).toBe('/training');
    });

    it('names the entry type in the dialog', async () => {
      const m = store().create({ type: 'move', date: '2026-10-01', activity: 'run' });
      const { click, stable } = await open(`/training/${m.id}`);
      await click('[aria-label="Delete entry"]');
      expect(dialog().title).toBe('Delete run?');
      expect(dialog().message).toBe("This can't be undone.");
      dialog().button('Cancel').click();
      await stable();
    });

    describe('workout', () => {
      it('saves date and name as you type', async () => {
        const w = store().create({ type: 'workout', date: '2026-10-01', exercises: [] });
        const { text, type } = await open(`/training/${w.id}`);
        expect(text('.entry-heading')).toEqual(['fitness_center Workout']);

        await type('[formControlName="name"]', ' Leg day ');
        expect(store().byId(w.id)).toMatchObject({ date: '2026-10-01', name: 'Leg day' });
        await type('[formControlName="name"]', '');
        expect('name' in store().byId(w.id)!).toBe(false);

        await type('[formControlName="date"]', '');
        expect(store().byId(w.id)!.date).toBe('2026-10-01'); // blank date isn't saved
        await type('[formControlName="name"]', 'Arm day');
        expect(store().byId(w.id)).toMatchObject({ date: '2026-10-01', name: 'Arm day' }); // name still saves
      });

      it('lists, edits and deletes exercises', async () => {
        const w = store().create({ type: 'workout', date: '2026-10-01', exercises: [] });
        store().addExercise(w.id, squat);
        const { el, text, click, type, stable } = await open(`/training/${w.id}`);
        const exercises = () => (store().byId(w.id) as WorkoutEntry).exercises;

        expect(text('.exercise-meta')).toEqual(['2 sets · 3 min rest']);
        store().updateExercise(w.id, exercises()[0].id, { ...squat, machineSetting: 6 });
        await stable();
        expect(text('.exercise-meta')).toEqual(['Setting 6 · 2 sets · 3 min rest']);
        expect(text('.exercise-steps li')).toEqual([
          'Set 1: 5 reps @ 225 lb',
          'Rest 3 min',
          'Set 2: 5 reps @ 225 lb Failure',
        ]);

        // Edit happens in place: the card turns into a form, then back.
        expect(el().querySelector('app-exercise-form')).toBeNull();
        await click('[aria-label="Edit Squat"]');
        expect(el().querySelectorAll('.exercise-list app-exercise-card')).toHaveLength(0);
        expect(text('mat-card-title')).toEqual(['Edit exercise']);
        await type('app-exercise-form [formControlName="name"]', 'Front Squat');
        el().querySelector('app-exercise-form form')!.dispatchEvent(new Event('submit'));
        await stable();
        expect(exercises().map((e) => e.name)).toEqual(['Front Squat']);
        expect(el().querySelector('app-exercise-form')).toBeNull();

        await click('[aria-label="Delete Front Squat"]');
        expect(exercises()).toEqual([]);
        expect(text('.empty')[0]).toContain('No exercises yet');
      });

      it('allows several exercise forms open at once, each saved or cancelled on its own', async () => {
        const w = store().create({ type: 'workout', date: '2026-10-01', exercises: [] });
        store().addExercise(w.id, squat);
        const { el, text, click, stable } = await open(`/training/${w.id}`);
        const exercises = () => (store().byId(w.id) as WorkoutEntry).exercises;

        await click('.add-exercise');
        await click('.add-exercise');
        await click('[aria-label="Edit Squat"]');
        expect(text('mat-card-title')).toEqual(['Edit exercise', 'New exercise', 'New exercise']);

        // Save the first new one, cancel the second, cancel the edit.
        const drafts = () => el().querySelectorAll<HTMLElement>('app-exercise-form.draft');
        const draft = drafts()[0];
        const name = draft.querySelector<HTMLInputElement>('[formControlName="name"]')!;
        name.value = 'Lunge';
        name.dispatchEvent(new Event('input'));
        draft.querySelector<HTMLElement>('.step mat-button-toggle button')!.click(); // 0 reps
        await stable();
        draft.querySelector('form')!.dispatchEvent(new Event('submit'));
        await stable();
        expect(exercises().map((e) => e.name)).toEqual(['Squat', 'Lunge']);
        expect(drafts()).toHaveLength(1);

        drafts()[0].querySelector<HTMLElement>('button.cancel')!.click();
        await stable();
        el().querySelector<HTMLElement>('app-exercise-form button.cancel')!.click();
        await stable();
        expect(el().querySelector('app-exercise-form')).toBeNull();
        expect(exercises()).toHaveLength(2);
      });

      describe('suggestions from past workouts', () => {
        const pastPushDay = () => {
          vi.useFakeTimers({ toFake: ['Date'] });
          vi.setSystemTime(new Date(2026, 9, 20, 8));
          const past = store().create({ type: 'workout', date: '2026-10-20', name: 'Push Day', exercises: [] });
          store().addExercise(past.id, { name: 'Bench Press', machineSetting: 4, steps: [
            { type: 'set', reps: 10, weight: 135, failure: false, easy: false },
            { type: 'set', reps: 8, weight: 145, failure: true, easy: false },
          ] });
          store().addExercise(past.id, { name: 'Dips', steps: [{ type: 'set', reps: 12, failure: false, easy: false }] });
          vi.setSystemTime(new Date(2026, 9, 21, 8));
          const other = store().create({ type: 'workout', date: '2026-10-21', name: 'Arms', exercises: [] });
          store().addExercise(other.id, { name: 'Bench Press', steps: [
            { type: 'set', reps: 6, weight: 155, failure: false, easy: false },
          ] });
          vi.setSystemTime(new Date(2026, 9, 25, 8));
          const today = store().create({ type: 'workout', date: '2026-10-25', exercises: [] });
          vi.useRealTimers();
          return today;
        };

        it('suggests past workout names, leaving out this one', async () => {
          const today = pastPushDay();
          const { type } = await open(`/training/${today.id}`);
          const input = document.querySelector<HTMLInputElement>('[formControlName="name"]')!;
          input.dispatchEvent(new Event('focusin'));
          await type('[formControlName="name"]', 'pu');
          const options = Array.from(document.querySelectorAll('.workout-suggestions mat-option')).map(
            (o) => o.textContent?.trim(),
          );
          expect(options).toEqual(['Push Day']);
        });

        it('shows the last workout with this name in full once the name matches', async () => {
          const today = pastPushDay();
          const { el, text, type } = await open(`/training/${today.id}`);
          expect(el().querySelector('.last-time')).toBeNull();

          await type('[formControlName="name"]', 'push day');
          expect(text('.last-time mat-panel-title')).toEqual(['Last Push Day']);
          expect(text('.last-time mat-panel-description')).toEqual(['Tue, Oct 20 · 2 exercises']);
          expect(text('.last-time .exercise-name')).toEqual(['Bench Press', 'Dips']);
          expect(text('.last-time .exercise-steps li')).toEqual([
            'Set 1: 10 reps @ 135 lb',
            'Set 2: 8 reps @ 145 lb Failure',
            'Set 1: 12 reps',
          ]);
        });

        it('+ starts an exercise with one set from its most recent record anywhere; logged ones get a check', async () => {
          const today = pastPushDay();
          const { el, type, click, stable } = await open(`/training/${today.id}`);
          await type('[formControlName="name"]', 'Push Day');

          await click('[aria-label="Start Bench Press"]');
          const draft = el().querySelector<HTMLElement>('app-exercise-form.draft')!;
          expect(draft.querySelector<HTMLInputElement>('[formControlName="name"]')!.value).toBe('Bench Press');
          expect(draft.querySelectorAll('.step')).toHaveLength(1);
          // Most recent Bench Press anywhere is from "Arms" (6 × 155), not Push Day.
          expect(draft.querySelector('.step .mat-button-toggle-checked')?.textContent?.trim()).toBe('6');
          expect(draft.querySelector<HTMLInputElement>('[formControlName="weight"]')!.value).toBe('155');
          expect(el().querySelector<HTMLButtonElement>('[aria-label="Start Bench Press"]')!.disabled).toBe(true);

          draft.querySelector('form')!.dispatchEvent(new Event('submit'));
          await stable();
          expect(el().querySelector('[aria-label="Start Bench Press"]')).toBeNull();
          expect(el().querySelectorAll('.last-time .logged')).toHaveLength(1);
          expect(el().querySelector('[aria-label="Start Dips"]')).toBeTruthy();
        });
      });

      describe('leaving with unsaved exercises', () => {
        const startDraft = async () => {
          const w = store().create({ type: 'workout', date: '2026-10-01', exercises: [] });
          const page = await open(`/training/${w.id}`);
          await page.click('.add-exercise');
          await page.type('app-exercise-form [formControlName="name"]', 'Curl');
          return { ...page, w };
        };
        const leave = () => TestBed.inject(Router).navigateByUrl('/training');

        it('asks first: Cancel stays, Discard leaves', async () => {
          const { stable, w } = await startDraft();

          const stay = leave();
          await vi.waitFor(() => expect(dialog().title).toBe('Discard unsaved exercises?'));
          dialog().button('Cancel').click();
          expect(await stay).toBe(false);
          expect(url()).toBe(`/training/${w.id}`);

          const go = leave();
          await vi.waitFor(() => expect(dialog().title).toBe('Discard unsaved exercises?'));
          dialog().button('Discard').click();
          expect(await go).toBe(true);
          await stable();
          expect(url()).toBe('/training');
        });

        it("doesn't ask when nothing is unsaved", async () => {
          const w = store().create({ type: 'workout', date: '2026-10-01', exercises: [] });
          const { click } = await open(`/training/${w.id}`);
          await click('.add-exercise'); // blank form: nothing to lose
          expect(await leave()).toBe(true);
        });

        it("doesn't ask again after deleting the workout", async () => {
          const { click, w } = await startDraft();
          await click('[aria-label="Delete entry"]');
          dialog().button('Delete').click();
          await vi.waitFor(() => expect(url()).toBe('/training'));
          expect(store().byId(w.id)).toBeUndefined();
        });
      });
    });

    describe('get moving', () => {
      it('saves activity, location, duration and distance as you type', async () => {
        const m = store().create({ type: 'move', date: '2026-10-01', activity: 'walk' });
        const { el, text, type, stable } = await open(`/training/${m.id}`);
        const saved = () => store().byId(m.id) as MoveEntry;
        expect(text('.entry-heading')).toEqual(['directions_walk Walk']);
        expect(el().querySelector('.mat-button-toggle-checked')?.textContent?.trim()).toBe('Walk');

        const run = Array.from(el().querySelectorAll('mat-button-toggle')).find(
          (t) => t.textContent?.trim() === 'Run',
        )!;
        run.querySelector('button')!.click();
        await stable();
        expect(saved().activity).toBe('run');
        expect(text('.entry-heading')).toEqual(['directions_run Run']);

        await type('[formControlName="location"]', ' River trail ');
        await type('[formControlName="hours"]', '1');
        await type('[formControlName="minutes"]', '5');
        await type('[formControlName="distance"]', '6.2');
        expect(saved()).toMatchObject({
          location: 'River trail',
          durationMinutes: 65,
          distance: 6.2,
        });

        await type('[formControlName="minutes"]', '75'); // invalid: not saved
        expect(saved().durationMinutes).toBe(65);

        await type('[formControlName="minutes"]', '');
        expect(saved().durationMinutes).toBe(60);
        await type('[formControlName="hours"]', '');
        await type('[formControlName="location"]', '');
        expect('durationMinutes' in saved()).toBe(false);
        expect('location' in saved()).toBe(false);
      });

      it('loads saved values into the form', async () => {
        const m = store().create({
          type: 'move',
          date: '2026-10-01',
          activity: 'bike',
          durationMinutes: 95,
          distance: 20,
        });
        const { el } = await open(`/training/${m.id}`);
        const value = (name: string) =>
          el().querySelector<HTMLInputElement>(`[formControlName="${name}"]`)!.value;
        expect([value('hours'), value('minutes'), value('distance')]).toEqual(['1', '35', '20']);
      });
    });

    describe('weigh-in', () => {
      it('saves weight as you type and shows when it was entered', async () => {
        vi.useFakeTimers({ now: new Date(2026, 9, 25, 7, 42), toFake: ['Date'] });
        const i = store().create({ type: 'weigh-in', date: '2026-10-25' });
        vi.useRealTimers();
        const { text, type } = await open(`/training/${i.id}`);
        const saved = () => store().byId(i.id) as WeighInEntry;

        expect(text('.entry-heading')).toEqual(['monitor_weight Weigh-in']);
        expect(text('.entered')).toEqual(['Entered Oct 25, 2026, 7:42 AM']);

        await type('[formControlName="weight"]', '181.6');
        expect(saved().weight).toBe(181.6);
        await type('[formControlName="date"]', '');
        await type('[formControlName="weight"]', '180.2');
        expect(saved()).toMatchObject({ date: '2026-10-25', weight: 180.2 }); // blank date doesn't block
        await type('[formControlName="weight"]', '');
        expect('weight' in saved()).toBe(false);
      });
    });
  });
});

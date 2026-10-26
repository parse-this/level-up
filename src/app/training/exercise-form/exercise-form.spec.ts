import { TestBed } from '@angular/core/testing';
import { ExerciseForm } from './exercise-form';
import { Exercise, ExerciseInput, MAX_MACHINE_SETTING, MAX_REPS, REST_MINUTES } from '../entry';

describe('ExerciseForm', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ExerciseForm] }).compileComponents();
  });

  const setup = async (exercise: Exercise | null = null) => {
    const fixture = TestBed.createComponent(ExerciseForm);
    fixture.componentRef.setInput('exercise', exercise);
    const saved: ExerciseInput[] = [];
    let cancelled = 0;
    fixture.componentInstance.saved.subscribe((v) => saved.push(v));
    fixture.componentInstance.cancelled.subscribe(() => cancelled++);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const stable = () => fixture.whenStable();
    const stepEl = (i: number) => el.querySelectorAll<HTMLElement>('.step')[i];
    const type = (field: HTMLInputElement | HTMLTextAreaElement, value: string) => {
      field.value = value;
      field.dispatchEvent(new Event('input'));
    };
    const typeName = (value: string) => type(el.querySelector('[formControlName="name"]')!, value);
    const toggleLabels = (i: number) =>
      Array.from(stepEl(i).querySelectorAll('mat-button-toggle')).map((t) => t.textContent?.trim());
    /** Click a rep or rest-minute button in step i. */
    const pick = async (i: number, value: number) => {
      const toggle = Array.from(stepEl(i).querySelectorAll('mat-button-toggle')).find(
        (t) => t.textContent?.trim() === String(value),
      )!;
      toggle.querySelector('button')!.click();
      await stable();
    };
    const typeWeight = (i: number, value: string) =>
      type(stepEl(i).querySelector('[formControlName="weight"]')!, value);
    const flip = async (i: number, label: 'Failure?' | 'Easy?') => {
      const toggle = Array.from(stepEl(i).querySelectorAll('mat-slide-toggle')).find((t) =>
        t.textContent?.includes(label),
      )!;
      toggle.querySelector('button')!.click();
      await stable();
    };
    const click = async (selector: string) => {
      el.querySelector<HTMLButtonElement>(selector)!.click();
      await stable();
    };
    const submit = async () => {
      el.querySelector('form')!.dispatchEvent(new Event('submit'));
      await stable();
    };
    return {
      fixture,
      el,
      saved,
      cancelled: () => cancelled,
      stepEl,
      toggleLabels,
      typeName,
      pick,
      typeWeight,
      flip,
      click,
      submit,
    };
  };

  it('starts as "New exercise" with one set of rep buttons 0 to MAX_REPS', async () => {
    const { el, toggleLabels } = await setup();
    expect(el.querySelector('mat-card-title')?.textContent).toContain('New exercise');
    expect(el.querySelectorAll('.step')).toHaveLength(1);
    expect(toggleLabels(0)).toEqual(Array.from({ length: MAX_REPS + 1 }, (_, i) => String(i)));
  });

  it('can be cancelled when new, and reports unsaved changes', async () => {
    const { fixture, cancelled, typeName, pick, click } = await setup();
    const form = fixture.componentInstance;
    expect(form.hasChanges()).toBe(false);
    typeName('Curl');
    await pick(0, 8);
    expect(form.hasChanges()).toBe(true);
    await click('button.cancel');
    expect(cancelled()).toBe(1);
  });

  it('when editing, has changes only after something changes', async () => {
    const { fixture, pick } = await setup({
      id: 'e1',
      name: 'Row',
      steps: [{ type: 'set', reps: 8, failure: false, easy: false }],
    });
    expect(fixture.componentInstance.hasChanges()).toBe(false);
    await pick(0, 10);
    expect(fixture.componentInstance.hasChanges()).toBe(true);
  });

  it('startWith fills the name and one set from the latest record', async () => {
    const fixture = TestBed.createComponent(ExerciseForm);
    fixture.componentRef.setInput('startWith', 'Leg Press');
    fixture.componentRef.setInput('previous', () => ({
      date: '2026-10-20',
      exercise: {
        id: 'old',
        name: 'Leg Press',
        machineSetting: 6,
        steps: [
          { type: 'set', reps: 12, weight: 180, failure: false, easy: false },
          { type: 'set', reps: 10, weight: 200, failure: false, easy: false },
        ],
      },
    }));
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector<HTMLInputElement>('[formControlName="name"]')!.value).toBe('Leg Press');
    expect(el.querySelectorAll('.step')).toHaveLength(1); // one set, not all of them
    expect(el.querySelector('.step .mat-button-toggle-checked')?.textContent?.trim()).toBe('10');
    expect(el.querySelector<HTMLInputElement>('.step [formControlName="weight"]')!.value).toBe('200');
    expect(el.querySelector('.autofill-note')).toBeTruthy();
    expect(fixture.componentInstance.hasChanges()).toBe(true);
  });

  it('requires a name, reps for every set, and minutes for every rest', async () => {
    const { el, saved, typeName, click, submit } = await setup();
    typeName('   ');
    await click('.add-rest');
    await submit();
    expect(saved).toEqual([]);
    const errors = Array.from(el.querySelectorAll('.step .error')).map((e) => e.textContent?.trim());
    expect(errors).toEqual(['Pick the number of reps.', 'Pick the rest length.']);
  });

  it('emits sets and rests in order, copying weight into new sets, then resets', async () => {
    const { el, saved, stepEl, toggleLabels, typeName, pick, typeWeight, flip, click, submit } =
      await setup();
    typeName('  Bench Press ');
    await pick(0, 10);
    typeWeight(0, '135');

    await click('.add-rest');
    expect(toggleLabels(1)).toEqual(REST_MINUTES.map(String));
    await pick(1, 2);

    await click('.add-set');
    expect((stepEl(2).querySelector('[formControlName="weight"]') as HTMLInputElement).value).toBe(
      '135',
    );
    await pick(2, 0);
    await flip(2, 'Failure?');
    await submit();

    expect(saved).toEqual([
      {
        name: 'Bench Press',
        steps: [
          { type: 'set', reps: 10, weight: 135, failure: false, easy: false },
          { type: 'rest', minutes: 2 },
          { type: 'set', reps: 0, weight: 135, failure: true, easy: false },
        ],
      },
    ]);
    expect(el.querySelectorAll('.step')).toHaveLength(1);
    expect((el.querySelector('[formControlName="name"]') as HTMLInputElement).value).toBe('');
  });

  it('keeps Failure and Easy from both being on', async () => {
    const { saved, typeName, pick, flip, submit } = await setup();
    typeName('Curl');
    await pick(0, 12);
    await flip(0, 'Failure?');
    await flip(0, 'Easy?');
    await submit();
    expect(saved[0].steps[0]).toMatchObject({ failure: false, easy: true });
  });

  it('removes sets and rests, but always keeps one set', async () => {
    const { el, click } = await setup();
    expect(el.querySelector('[aria-label="Remove set 1"]')).toBeNull();
    await click('.add-rest');
    await click('.add-set');
    expect(el.querySelectorAll('.step')).toHaveLength(3);
    await click('[aria-label="Remove rest 1"]');
    await click('[aria-label="Remove set 2"]');
    expect(el.querySelectorAll('.step')).toHaveLength(1);
    expect(el.querySelector('[aria-label="Remove set 1"]')).toBeNull();
  });

  it('loads an exercise for editing, and can cancel', async () => {
    const exercise: Exercise = {
      id: 'e1',
      name: 'Row',
      steps: [
        { type: 'set', reps: 8, failure: false, easy: false },
        { type: 'rest', minutes: 3 },
      ],
      notes: 'Slow',
    };
    const { el, saved, cancelled, stepEl, typeWeight, click, submit } = await setup(exercise);
    expect(el.querySelector('mat-card-title')?.textContent).toContain('Edit exercise');
    expect(stepEl(1).querySelector('.mat-button-toggle-checked')?.textContent?.trim()).toBe('3');

    typeWeight(0, '95');
    await submit();
    expect(saved).toEqual([
      {
        name: 'Row',
        steps: [
          { type: 'set', reps: 8, weight: 95, failure: false, easy: false },
          { type: 'rest', minutes: 3 },
        ],
        notes: 'Slow',
      },
    ]);

    await click('.actions button[type="button"]');
    expect(cancelled()).toBe(1);
  });

  describe('name suggestions', () => {
    it('suggests known names matching any word, and fills the field when picked', async () => {
      const { fixture, el, saved, typeName, pick, submit } = await setup();
      fixture.componentRef.setInput('knownNames', ['Bench Press', 'Leg Press', 'Squat']);
      const input = el.querySelector<HTMLInputElement>('[formControlName="name"]')!;
      const options = () =>
        Array.from(document.querySelectorAll<HTMLElement>('mat-option')).map((o) =>
          o.textContent?.trim(),
        );

      input.dispatchEvent(new Event('focusin'));
      typeName('pr');
      await fixture.whenStable();
      expect(options()).toEqual(['Bench Press', 'Leg Press']);

      typeName('sq');
      await fixture.whenStable();
      expect(options()).toEqual(['Squat']);

      document.querySelector<HTMLElement>('mat-option')!.click();
      await fixture.whenStable();
      expect(input.value).toBe('Squat');

      await pick(0, 5);
      await submit();
      expect(saved[0].name).toBe('Squat');
    });

    describe('auto-fill from the latest record', () => {
      const legPress: Exercise = {
        id: 'old',
        name: 'Leg Press',
        machineSetting: 6,
        steps: [
          { type: 'set', reps: 12, weight: 180, failure: false, easy: false },
          { type: 'rest', minutes: 2 },
          { type: 'set', reps: 10, weight: 200, failure: true, easy: false },
        ],
      };
      const prevLegPress = { exercise: legPress, date: '2026-10-20' };
      const squat: Exercise = {
        id: 'sq',
        name: 'Squat',
        steps: [{ type: 'set', reps: 5, weight: 225, failure: false, easy: false }],
      };
      const lookup = (n: string) =>
        n === 'Leg Press' ? prevLegPress : n === 'Squat' ? { exercise: squat, date: '2026-10-18' } : undefined;

      const choose = async (fixture: { whenStable(): Promise<unknown> }, el: HTMLElement, name: string) => {
        const input = el.querySelector<HTMLInputElement>('[formControlName="name"]')!;
        input.dispatchEvent(new Event('focusin'));
        input.value = name.slice(0, 3);
        input.dispatchEvent(new Event('input'));
        await fixture.whenStable();
        Array.from(document.querySelectorAll<HTMLElement>('mat-option'))
          .find((o) => o.textContent?.trim() === name)!
          .click();
        await fixture.whenStable();
      };
      const checked = (root: Element) =>
        root.querySelector('.mat-button-toggle-checked')?.textContent?.trim();

      it('fills machine setting and blank sets from the last set', async () => {
        const { fixture, el, stepEl, click, pick, saved, submit } = await setup();
        fixture.componentRef.setInput('knownNames', ['Leg Press']);
        fixture.componentRef.setInput('previous', lookup);
        await click('.add-rest');
        await click('.add-set');

        await choose(fixture, el, 'Leg Press');

        expect(checked(el.querySelector('.machine-setting')!)).toBe('6');
        for (const i of [0, 2]) {
          expect(checked(stepEl(i))).toBe('10');
          expect(stepEl(i).querySelector<HTMLInputElement>('[formControlName="weight"]')!.value).toBe('200');
        }

        await pick(1, 2); // rest length, so the form can submit
        await submit();
        expect(saved[0].steps[0]).toEqual({ type: 'set', reps: 10, weight: 200, failure: false, easy: false });
      });

      it("doesn't overwrite values already entered", async () => {
        const { fixture, el, stepEl, pick, typeWeight } = await setup();
        fixture.componentRef.setInput('knownNames', ['Leg Press']);
        fixture.componentRef.setInput('previous', lookup);
        await pick(0, 8);
        typeWeight(0, '150');

        await choose(fixture, el, 'Leg Press');

        expect(checked(stepEl(0))).toBe('8');
        expect(stepEl(0).querySelector<HTMLInputElement>('[formControlName="weight"]')!.value).toBe('150');
        expect(checked(el.querySelector('.machine-setting')!)).toBe('6'); // was blank, so filled
      });

      it("doesn't auto-fill while editing", async () => {
        const editing: Exercise = {
          id: 'e1',
          name: 'Squat',
          steps: [{ type: 'set', reps: 5, failure: false, easy: false }],
        };
        const { fixture, el, stepEl } = await setup(editing);
        fixture.componentRef.setInput('knownNames', ['Leg Press']);
        fixture.componentRef.setInput('previous', lookup);

        await choose(fixture, el, 'Leg Press');

        expect(checked(stepEl(0))).toBe('5');
        expect(el.querySelector('.machine-setting .mat-button-toggle-checked')).toBeNull();
        expect(el.querySelector('.autofill-note')).toBeNull();
      });

      describe('making it obvious', () => {
        const ready = async () => {
          const s = await setup();
          s.fixture.componentRef.setInput('knownNames', ['Leg Press', 'Squat']);
          s.fixture.componentRef.setInput('previous', lookup);
          return s;
        };
        const note = (el: HTMLElement) =>
          el.querySelector('.autofill-note .autofill-text')?.textContent?.replace(/\s+/g, ' ').trim();
        const highlighted = (el: HTMLElement) => ({
          setting: !!el.querySelector('.machine-setting .choices.auto-filled'),
          reps: el.querySelectorAll('.step .choices.auto-filled').length,
          weight: el.querySelectorAll('.weight-field.auto-filled').length,
          icons: el.querySelectorAll('.step .auto-icon').length,
        });

        it('shows where values came from and highlights them', async () => {
          const { fixture, el } = await ready();
          await choose(fixture, el, 'Leg Press');
          expect(note(el)).toBe('Filled from your last Leg Press (Tue, Oct 20): setting 6, 10 reps @ 200 lb');
          expect(highlighted(el)).toEqual({ setting: true, reps: 1, weight: 1, icons: 1 });
        });

        it('un-highlights a value once you change it', async () => {
          const { fixture, el, pick, typeWeight } = await ready();
          await choose(fixture, el, 'Leg Press');
          await pick(0, 8);
          expect(highlighted(el)).toEqual({ setting: true, reps: 0, weight: 1, icons: 1 });
          typeWeight(0, '190');
          await fixture.whenStable();
          expect(highlighted(el)).toEqual({ setting: true, reps: 0, weight: 0, icons: 0 });
          expect(note(el)).toBeTruthy(); // note stays until save/undo
        });

        it('Undo blanks the still-auto-filled values and hides the note', async () => {
          const { fixture, el, stepEl, pick, click } = await ready();
          await choose(fixture, el, 'Leg Press');
          await pick(0, 8); // user-changed: kept by undo
          await click('.undo-autofill');

          expect(note(el)).toBeUndefined();
          expect(checked(stepEl(0))).toBe('8');
          expect(stepEl(0).querySelector<HTMLInputElement>('[formControlName="weight"]')!.value).toBe('');
          expect(el.querySelector('.machine-setting .mat-button-toggle-checked')).toBeNull();
          expect(highlighted(el)).toEqual({ setting: false, reps: 0, weight: 0, icons: 0 });
        });

        it('picking another exercise replaces the previous fill', async () => {
          const { fixture, el, stepEl } = await ready();
          await choose(fixture, el, 'Leg Press');
          await choose(fixture, el, 'Squat');

          expect(note(el)).toBe('Filled from your last Squat (Sun, Oct 18): 5 reps @ 225 lb');
          expect(checked(stepEl(0))).toBe('5');
          expect(el.querySelector('.machine-setting .mat-button-toggle-checked')).toBeNull();
          expect(highlighted(el)).toEqual({ setting: false, reps: 1, weight: 1, icons: 1 });
        });

        it('clears after adding', async () => {
          const { fixture, el, submit } = await ready();
          await choose(fixture, el, 'Leg Press');
          await submit();
          expect(note(el)).toBeUndefined();
          expect(highlighted(el)).toEqual({ setting: false, reps: 0, weight: 0, icons: 0 });
        });
      });
    });
  });

  describe('machine setting', () => {
    const settingToggles = (el: HTMLElement) =>
      Array.from(el.querySelectorAll<HTMLElement>('.machine-setting mat-button-toggle'));
    const pickSetting = async (el: HTMLElement, value: number, stable: () => Promise<unknown>) => {
      settingToggles(el)
        .find((t) => t.textContent?.trim() === String(value))!
        .querySelector('button')!
        .click();
      await stable();
    };

    it('offers buttons 0 to MAX_MACHINE_SETTING and is optional', async () => {
      const { el, saved, typeName, pick, submit } = await setup();
      expect(settingToggles(el).map((t) => t.textContent?.trim())).toEqual(
        Array.from({ length: MAX_MACHINE_SETTING + 1 }, (_, i) => String(i)),
      );
      expect(el.querySelector('.clear-setting')).toBeNull();

      typeName('Curl');
      await pick(0, 10);
      await submit();
      expect('machineSetting' in saved[0]).toBe(false);
    });

    it('saves the picked setting (including 0), can be cleared, and resets after add', async () => {
      const { fixture, el, saved, typeName, pick, click, submit } = await setup();
      const stable = () => fixture.whenStable();

      typeName('Leg Press');
      await pickSetting(el, 7, stable);
      await click('.clear-setting');
      expect(el.querySelector('.machine-setting .mat-button-toggle-checked')).toBeNull();

      await pickSetting(el, 0, stable);
      await pick(0, 12);
      await submit();
      expect(saved[0]).toMatchObject({ name: 'Leg Press', machineSetting: 0 });
      expect(el.querySelector('.machine-setting .mat-button-toggle-checked')).toBeNull();
    });

    it('loads the setting when editing', async () => {
      const { el } = await setup({
        id: 'e1',
        name: 'Leg Press',
        machineSetting: 4,
        steps: [{ type: 'set', reps: 10, failure: false, easy: false }],
      });
      expect(
        el.querySelector('.machine-setting .mat-button-toggle-checked')?.textContent?.trim(),
      ).toBe('4');
    });
  });
});

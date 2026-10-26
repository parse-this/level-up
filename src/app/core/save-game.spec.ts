import { describeSave, makeSaveFile, mergeData, parseSaveFile, saveFileName } from './save-game';

const E = 'levelUpTracker.training.entries';
const Q = 'levelUpTracker.quests.items';
const T = 'levelUpTracker.quests.tags';

describe('save files', () => {
  it('makes a dated, named save', () => {
    const now = new Date(2026, 9, 26, 15, 14);
    expect(makeSaveFile({ [E]: [] }, now)).toEqual({
      app: 'level-up',
      version: 1,
      savedAt: now.toISOString(),
      data: { [E]: [] },
    });
    expect(saveFileName(now)).toBe('level-up-save-2026-10-26.json');
  });

  it('accepts only Level Up saves', () => {
    const good = JSON.stringify(makeSaveFile({ [Q]: [] }));
    expect(parseSaveFile(good).data).toEqual({ [Q]: [] });
    expect(() => parseSaveFile('{nope')).toThrow("That file isn't a Level Up save (it's not valid JSON).");
    expect(() => parseSaveFile('{"app":"other"}')).toThrow("That file isn't a Level Up save.");
    expect(() =>
      parseSaveFile(JSON.stringify({ ...makeSaveFile({}), data: { someOtherKey: 1 } })),
    ).toThrow("That file isn't a Level Up save.");
  });

  it('describes what is in a save', () => {
    const save = makeSaveFile({ [E]: [{}, {}], [Q]: [{}], [T]: [] });
    expect(describeSave(save)).toEqual(['2 training entries', '1 quest', '0 tags']);
  });

  it('merges by id: keeps everything here, adds what only the save has', () => {
    const current = { [Q]: [{ id: 'a', title: 'mine' }], [T]: [{ id: 't1' }] };
    const incoming = {
      [Q]: [{ id: 'a', title: 'theirs' }, { id: 'b', title: 'new' }],
      [E]: [{ id: 'e1' }],
    };
    expect(mergeData(current, incoming)).toEqual({
      [Q]: [{ id: 'a', title: 'mine' }, { id: 'b', title: 'new' }],
      [T]: [{ id: 't1' }],
      [E]: [{ id: 'e1' }],
    });
  });
});

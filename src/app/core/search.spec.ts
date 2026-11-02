import { htmlToText, matchesSearch, searchText, searchWords } from './search';

describe('search', () => {
  const matches = (query: string, ...fields: (string | undefined)[]) =>
    matchesSearch(searchWords(query), searchText(fields));

  it('matches every word, in any field and any order, partial words, any case', () => {
    expect(matches('ben', 'Push day', 'Bench press')).toBe(true);
    expect(matches('BENCH push', 'Push day', 'Bench press')).toBe(true);
    expect(matches('push squat', 'Push day', 'Bench press')).toBe(false);
  });

  it('a blank search matches everything', () => {
    expect(searchWords('   ')).toEqual([]);
    expect(matches('  ', 'anything')).toBe(true);
  });

  it('skips missing fields', () => {
    expect(searchText(['A', undefined, null, '', 'B'])).toBe('a\nb');
  });

  it('turns notes into plain text without running paragraphs together', () => {
    const text = htmlToText('<p>Driver <b>250</b></p><ul><li>Tom &amp; Ann</li></ul><p>end</p>');
    expect(text.replace(/\s+/g, ' ').trim()).toBe('Driver 250 Tom & Ann end');
    expect(matches('250', htmlToText('<p>Driver<b>250</b></p>'))).toBe(true);
    expect(matches('driver250', htmlToText('<p>Driver</p><p>250</p>'))).toBe(false);
    expect(htmlToText(undefined)).toBe('');
  });
});

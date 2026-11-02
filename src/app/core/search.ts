/** The words of a search, lowercased. Blank search → no words (everything matches). */
export function searchWords(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

/**
 * True when every word appears somewhere in the text (any order, partial words count,
 * case ignored). `text` should already be lowercased (see `searchText`).
 */
export function matchesSearch(words: readonly string[], text: string): boolean {
  return words.every((w) => text.includes(w));
}

/** The fields to search, joined and lowercased. Blank / missing fields are skipped. */
export function searchText(fields: readonly (string | null | undefined)[]): string {
  return fields.filter(Boolean).join('\n').toLowerCase();
}

/** Plain text of rich-text notes (tags dropped, entities like &amp; decoded). */
export function htmlToText(html: string | undefined): string {
  if (!html) return '';
  // Space out block/line breaks so words in neighboring paragraphs don't run together.
  const spaced = html.replace(/<(br|\/p|\/li|\/h\d|\/div)\b[^>]*>/gi, ' $&');
  return new DOMParser().parseFromString(spaced, 'text/html').body.textContent ?? '';
}

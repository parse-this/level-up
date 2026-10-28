import { InjectionToken } from '@angular/core';

/** Reloads the page so every feature re-reads storage. Replaceable in tests. */
export const PAGE_RELOAD = new InjectionToken<() => void>('PAGE_RELOAD', {
  providedIn: 'root',
  factory: () => () => location.reload(),
});

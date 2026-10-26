import { Injectable } from '@angular/core';

/** Every key this app saves starts with this, so its data can be found and listed. */
export const APP_KEY_PREFIX = 'levelUpTracker.';

/**
 * The only place the app touches browser storage.
 * Swap this out for a backend later without changing features.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  load<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch (error) {
      console.error(`Could not load "${key}" from storage.`, error);
      return fallback;
    }
  }

  /**
   * Like `load`, but first moves data saved under an older key name to `key` (once; the old
   * key is then removed). For renaming keys without losing anyone's data.
   */
  loadRenamed<T>(oldKey: string, key: string, fallback: T): T {
    try {
      const old = localStorage.getItem(oldKey);
      if (old !== null && localStorage.getItem(key) === null) localStorage.setItem(key, old);
      if (old !== null) localStorage.removeItem(oldKey);
    } catch (error) {
      console.error(`Could not move "${oldKey}" to "${key}".`, error);
    }
    return this.load(key, fallback);
  }

  save<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Could not save "${key}" to storage.`, error);
    }
  }

  /** All of this app's keys, sorted. */
  keys(): string[] {
    try {
      return Object.keys(localStorage)
        .filter((k) => k.startsWith(APP_KEY_PREFIX))
        .sort();
    } catch (error) {
      console.error('Could not list storage keys.', error);
      return [];
    }
  }

  /** Stores already-serialized JSON text as is (used by Load game). */
  saveRaw(key: string, raw: string): void {
    try {
      localStorage.setItem(key, raw);
    } catch (error) {
      console.error(`Could not save "${key}" to storage.`, error);
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Could not remove "${key}" from storage.`, error);
    }
  }

  /** The stored text for a key, exactly as saved (null if missing). */
  raw(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`Could not read "${key}" from storage.`, error);
      return null;
    }
  }
}

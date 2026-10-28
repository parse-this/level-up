import { Injectable, inject } from '@angular/core';
import { APP_KEY_PREFIX } from './app-keys';
import { SHARED_KEY_PREFIX, SIM_KEY_PREFIX, SimulationService } from './simulation.service';

export { APP_KEY_PREFIX };

/**
 * The only place the app touches browser storage.
 * Swap this out for a backend later without changing features.
 *
 * Features always use app keys (`levelUpTracker.*`). In Simulation mode those are stored under
 * `levelUpSim.*` instead (settings excepted), so sample data never touches real data.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly simulation = inject(SimulationService);

  /** Where an app key is really stored right now. */
  private where(key: string): string {
    if (this.simulation.active() && key.startsWith(APP_KEY_PREFIX) && !key.startsWith(SHARED_KEY_PREFIX)) {
      return SIM_KEY_PREFIX + key.slice(APP_KEY_PREFIX.length);
    }
    return key;
  }

  load<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(this.where(key));
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
      const from = this.where(oldKey);
      const to = this.where(key);
      const old = localStorage.getItem(from);
      if (old !== null && localStorage.getItem(to) === null) localStorage.setItem(to, old);
      if (old !== null) localStorage.removeItem(from);
    } catch (error) {
      console.error(`Could not move "${oldKey}" to "${key}".`, error);
    }
    return this.load(key, fallback);
  }

  save<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.where(key), JSON.stringify(value));
    } catch (error) {
      console.error(`Could not save "${key}" to storage.`, error);
    }
  }

  /** All of this app's keys (as app keys), sorted. In Simulation mode: the sample data + settings. */
  keys(): string[] {
    try {
      const all = Object.keys(localStorage);
      const keys = this.simulation.active()
        ? [
            ...all.filter((k) => k.startsWith(SIM_KEY_PREFIX)).map((k) => APP_KEY_PREFIX + k.slice(SIM_KEY_PREFIX.length)),
            ...all.filter((k) => k.startsWith(SHARED_KEY_PREFIX)),
          ]
        : all.filter((k) => k.startsWith(APP_KEY_PREFIX));
      return keys.sort();
    } catch (error) {
      console.error('Could not list storage keys.', error);
      return [];
    }
  }

  /** Stores already-serialized JSON text as is (used by Load game). */
  saveRaw(key: string, raw: string): void {
    try {
      localStorage.setItem(this.where(key), raw);
    } catch (error) {
      console.error(`Could not save "${key}" to storage.`, error);
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(this.where(key));
    } catch (error) {
      console.error(`Could not remove "${key}" from storage.`, error);
    }
  }

  /** The stored text for a key, exactly as saved (null if missing). */
  raw(key: string): string | null {
    try {
      return localStorage.getItem(this.where(key));
    } catch (error) {
      console.error(`Could not read "${key}" from storage.`, error);
      return null;
    }
  }
}

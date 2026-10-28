import { Injectable, signal } from '@angular/core';
import { APP_KEY_PREFIX } from './app-keys';

/**
 * Simulation mode: the app runs on sample data kept in its own storage location, so real data is
 * never read, changed or overwritten while it's on.
 *
 * - App keys (`levelUpTracker.*`) map to `levelUpSim.*` while active (see `StorageService`).
 *   Settings (`levelUpTracker.settings.*`, e.g. font style) are shared by both modes.
 * - Starts automatically on a first visit (no saved state and no data of your own).
 * - Sample data is made fresh (dated from today) on entering and on every app open while active;
 *   exiting deletes it.
 * - Changing mode reloads the page (callers use `PAGE_RELOAD`) so every feature re-reads storage.
 */
export const SIM_KEY_PREFIX = 'levelUpSim.';
/** Simulation state; outside both prefixes so it's never in save files or sample data. */
export const SIM_META_KEY = 'levelUp.simulation';
/** App keys shared by both modes (not redirected). */
export const SHARED_KEY_PREFIX = `${APP_KEY_PREFIX}settings.`;

export interface SimulationMeta {
  active: boolean;
  /** The explanation was closed (the Exit bar stays). */
  bannerDismissed: boolean;
}

@Injectable({ providedIn: 'root' })
export class SimulationService {
  private readonly meta = signal<SimulationMeta>({ active: false, bannerDismissed: false });

  /** On while the app runs on sample data. */
  readonly active = () => this.meta().active;
  /** Show the "why you're here / how to use it / how to exit" explanation (every entry, until closed). */
  readonly showExplanation = () => this.meta().active && !this.meta().bannerDismissed;

  /** Runs once before the app starts (app initializer). Starts Simulation mode on a first visit. */
  async init(): Promise<void> {
    const saved = readMeta();
    if (saved) {
      this.meta.set(saved);
      // Fresh sample data on every open, dated from today, so it always looks like a few weeks
      // of use up to now (changes made in the simulation reset).
      if (saved.active) {
        clearSimKeys();
        await seedSampleData();
      }
      return;
    }
    if (hasOwnData()) {
      this.write({ active: false, bannerDismissed: false });
    } else {
      await this.enter();
    }
  }

  /** Starts Simulation mode with fresh sample data. Reload the page afterwards. */
  async enter(): Promise<void> {
    clearSimKeys();
    await seedSampleData();
    this.write({ active: true, bannerDismissed: false });
  }

  /** Leaves Simulation mode and deletes the sample data. Reload the page afterwards. */
  exit(): void {
    clearSimKeys();
    this.write({ active: false, bannerDismissed: false });
  }

  dismissExplanation(): void {
    this.write({ ...this.meta(), bannerDismissed: true });
  }

  private write(meta: SimulationMeta): void {
    this.meta.set(meta);
    try {
      localStorage.setItem(SIM_META_KEY, JSON.stringify(meta));
    } catch (error) {
      console.error('Could not save Simulation mode state.', error);
    }
  }
}

function readMeta(): SimulationMeta | null {
  try {
    const raw = localStorage.getItem(SIM_META_KEY);
    return raw ? { active: false, bannerDismissed: false, ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}

/** Any real app data saved (settings don't count). */
function hasOwnData(): boolean {
  try {
    return Object.keys(localStorage).some(
      (k) => k.startsWith(APP_KEY_PREFIX) && !k.startsWith(SHARED_KEY_PREFIX),
    );
  } catch {
    return false;
  }
}

function simKeys(): string[] {
  try {
    return Object.keys(localStorage).filter((k) => k.startsWith(SIM_KEY_PREFIX));
  } catch {
    return [];
  }
}

function clearSimKeys(): void {
  for (const k of simKeys()) localStorage.removeItem(k);
}

/** Writes sample data into the simulation keys (sample code loads only when needed). */
async function seedSampleData(): Promise<void> {
  const { makeSampleData } = await import('./sample-data');
  try {
    for (const [key, value] of Object.entries(makeSampleData())) {
      localStorage.setItem(SIM_KEY_PREFIX + key.slice(APP_KEY_PREFIX.length), JSON.stringify(value));
    }
  } catch (error) {
    console.error('Could not create sample data.', error);
  }
}

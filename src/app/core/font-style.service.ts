import { DOCUMENT, Injectable, effect, inject, signal } from '@angular/core';
import { APP_KEY_PREFIX, StorageService } from './storage.service';

export const FONT_STYLE_KEY = `${APP_KEY_PREFIX}settings.fontStyle`;
/** Replaced by FONT_STYLE_KEY; removed on load. */
const OLD_GAME_FONT_KEY = `${APP_KEY_PREFIX}settings.gameFont`;

export interface FontStyle {
  id: string;
  label: string;
  description: string;
  /** CSS font-family for the heading sample in the picker. */
  headingFont: string;
  /** CSS font-family for the body sample in the picker. */
  bodyFont: string;
}

/**
 * Font styles to choose from (Settings), in picker order. Each is `html.font-<id>` in `styles.scss`,
 * which sets the theme's heading (brand) and body (plain) fonts. Keep both lists in sync.
 */
export const FONT_STYLES: readonly FontStyle[] = [
  {
    id: 'exo',
    label: 'Exo 2',
    description: 'Smooth sci-fi text everywhere.',
    headingFont: '"Exo 2", sans-serif',
    bodyFont: '"Exo 2", sans-serif',
  },
  {
    id: 'orbitron',
    label: 'Orbitron + Roboto',
    description: 'Arcade-style headings, plain body text.',
    headingFont: 'Orbitron, sans-serif',
    bodyFont: 'Roboto, sans-serif',
  },
  {
    id: 'pixel-chakra',
    label: 'Pixel + Chakra Petch',
    description: 'Pixel headings, techy body text.',
    headingFont: '"Pixelify Sans", sans-serif',
    bodyFont: '"Chakra Petch", sans-serif',
  },
  {
    id: 'pixel',
    label: 'Pixel',
    description: 'Pixelify Sans everywhere. Most retro, hardest to read.',
    headingFont: '"Pixelify Sans", sans-serif',
    bodyFont: '"Pixelify Sans", sans-serif',
  },
];

export const DEFAULT_FONT_STYLE = 'exo';
/** On `<html>` with every style (logo font, plain inputs inherit). */
export const GAME_FONT_CLASS = 'game-font';

/** Chosen font style (Settings). Saved; applied right away as classes on `<html>`. */
@Injectable({ providedIn: 'root' })
export class FontStyleService {
  private readonly storage = inject(StorageService);
  private readonly document = inject(DOCUMENT);

  readonly styles = FONT_STYLES;
  readonly current = signal(this.loadStyle());

  constructor() {
    effect(() => {
      const id = this.current();
      const classes = this.document.documentElement.classList;
      for (const s of FONT_STYLES) classes.toggle(`font-${s.id}`, s.id === id);
      classes.add(GAME_FONT_CLASS);
    });
  }

  set(id: string): void {
    if (!FONT_STYLES.some((s) => s.id === id)) return;
    this.current.set(id);
    this.storage.save(FONT_STYLE_KEY, id);
  }

  private loadStyle(): string {
    // Clean up the old on/off switch's setting.
    if (this.storage.raw(OLD_GAME_FONT_KEY) !== null) this.storage.remove(OLD_GAME_FONT_KEY);
    // Removed styles (e.g. Classic, Chakra Petch) fall back to the default.
    const id = this.storage.load<string>(FONT_STYLE_KEY, DEFAULT_FONT_STYLE);
    return FONT_STYLES.some((s) => s.id === id) ? id : DEFAULT_FONT_STYLE;
  }
}

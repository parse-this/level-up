# Level Up

Level Up turns looking after yourself into a game: train your body, clear your mind, and earn XP for showing up every day.

**Use it:** https://parse-this.github.io/level-up/ — on Android, open it in Chrome and choose **Install app** / **Add to Home screen**. It works offline, and your data stays on your device (back it up with **Settings → Save & load game**).

## Features

- **Training Ground**: workouts (exercises, sets, reps, weights, machine settings, rests), Get Moving (walks, runs, rides) and weigh-ins, with suggestions and auto-fill from past sessions.
- **Quest Log**: capture goals, to-dos and lists in seconds; sort into Today / Soon / Someday, tag them, mark them important or urgent, add notes and checklists.
- **XP and levels**: XP for actions, daily streak bonuses, personal records, and a breakdown on the Player page.

See [SPEC.md](SPEC.md) for the full, detailed specification.

## Development

Requires Node 24.

```bash
npm install
ng serve          # http://localhost:4200
ng test           # unit tests (Vitest)
ng build          # production build into dist/
```

Pushing to `main` runs the tests, builds with `--base-href /level-up/` and publishes to GitHub Pages ([workflow](.github/workflows/deploy.yml)).

## Credits

- Mushroom artwork: "[Mushrooms Set 01](https://opengameart.org/content/mushrooms-set-01)" by [GameArtForge](https://opengameart.org/users/gameartforge), licensed [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Used for the banner and app icons (icons place it on a dark background).
- "Press Start 2P" font (SIL Open Font License), Material Symbols, Angular, Angular Material, Tiptap.

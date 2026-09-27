# Hakla Hunt

A small browser shooting-range game. Tap the targets before they vanish, keep the score climbing until the 45 second round ends. Installable as a PWA and fully playable offline.

## Run it

The game needs to be served over HTTP (service workers do not run from `file://`):

```bash
cd games/game-hakla-hunt
python3 -m http.server 8080
# open http://127.0.0.1:8080
```

Any static server works (`npx serve`, nginx, GitHub Pages, Netlify, ...).

## How to play

| Action | Input |
| --- | --- |
| Shoot | Click / tap a target |
| Aim | Move the pointer (custom crosshair) |
| Start / restart | `Start round` button or `Enter` |
| Custom target image | `Target img` button in the top bar |

Rules: 45 seconds per round, each target needs 3 hits, up to 3 targets on the range at once. Every kill is worth 1 point.

## Features

- **Installable PWA** — `manifest.webmanifest` + icons (192/512, maskable, apple-touch-icon). Add to home screen / install from the browser and it opens standalone.
- **Offline** — `sw.js` caches the whole app shell (HTML, CSS, JS, images, sounds) with a cache-first strategy, so the game runs with no connection.
- **Custom target image** — upload any PNG/JPG from the `Target img` panel. The image is downscaled to 512px, previewed instantly, applied to every target on the range, and persisted in `localStorage`. `Use default` restores `assets/enemy.png`. Only the file you pick leaves your device — nothing is uploaded anywhere.
- Sound pool for gunshots/hits/deaths plus looping background music, screen-flash and blood-splat hit feedback, keyboard accessible targets.

## Project layout

```
game-hakla-hunt/
├── index.html            # markup + PWA meta tags
├── style.css             # all styling (design tokens at the top)
├── game.js               # game loop, audio, image upload, SW registration
├── sw.js                 # service worker (cache-first offline support)
├── manifest.webmanifest  # install manifest
├── icons/                # generated PWA icons
└── assets/               # background, enemy, blood, sounds, music
```

## Notes

- The custom image is stored under the `hakla-hunt-target-image` key in `localStorage`; clear site data to remove it.
- Bump the `CACHE` version string in `sw.js` when you ship changes so clients pick up new files.
- Browsers only register service workers on `https:` or `localhost`/`127.0.0.1`.

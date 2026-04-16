# Sudoku Fighting — Development Guide

## Project Overview

Real-time competitive puzzle-fighting game. Two players solve Sudoku grids; correct inputs deal damage, wipes punish mistakes. Built as a pnpm monorepo.

## Repository Layout

```
sudoku-fighting/
├── packages/
│   ├── shared/      # Pure TS — game logic, puzzle gen, AI, combat engine, types
│   └── web/         # React/TypeScript frontend (Vite) — the active frontend
├── backend/         # Node.js/WS server
├── frontend/        # Legacy vanilla JS frontend — DO NOT MODIFY
│                    # Also serves as Vite publicDir for static assets
└── CLAUDE.md        # This file
```

**Never touch `frontend/` JS/HTML source files** — that is the legacy vanilla frontend and is no longer actively developed. The active frontend is `packages/web/`. Exception: `frontend/style-guide.html` and `frontend/css/tokens.css` may be edited.

## Running the App

Two terminal windows are required:

```bash
# Terminal 1 — backend (from repo root)
cd backend && node server.js

# Terminal 2 — React frontend (from repo root)
cd packages/web && pnpm dev
```

App runs at `http://localhost:5173`. Style guide at `http://localhost:5173/style-guide.html`.

## Design System

### Token usage
All visual values (colors, spacing, type scale, radii) live in `packages/web/src/styles/tokens.css` as CSS custom properties. **Never hardcode a color, font size, or radius in a component or stylesheet** — always reference a token. If a token doesn't exist, add it to `tokens.css`.

The style guide imports tokens via a symlink (`frontend/css/tokens.css → packages/web/src/styles/tokens.css`). Changing a token automatically updates both the app and the style guide.

### Naming principle — pattern, not use case
**Name components and CSS classes for the pattern they implement, not the specific context they appear in.** The instance detail belongs to the consuming parent, not the component itself.

| Wrong — named for use case | Right — named for pattern |
|---|---|
| `SettingsPanel` | `ContextualMenu` |
| `.join-combo` | `.combo-input` |
| `.lobby-status` | `.status-pill` |
| `LobbyPlayerSlot` | `PlayerSlot` |

When you find yourself naming something after where it lives (GameButton, LobbyHeader, SettingsPanel), stop and ask: *what is the shape of this thing?* Name that instead.

### Atomic Design hierarchy
Components follow Foundations → Atoms → Molecules → Organisms → Templates:

- **Foundations**: `tokens.css` — CSS custom properties only, no selectors
- **Atoms**: single-element UI primitives — buttons (`.btn`, `.btn-utility`), inputs, toggles
- **Molecules**: composites of atoms — `.combo-input`, `ArenaCarousel`, character card
- **Organisms**: full UI regions — `SudokuGrid`, `HUD`, `ContextualMenu`, `GameOverlay`
- **Templates**: screen-level compositions — `StartScreen`, `LobbyScreen`, `GameplayScreen`

Each level introduces no new visual primitives beyond what exists below it.

### CSS conventions
- **No CSS Modules** — all styles are global, matching the battle-tested ID/class structure from the vanilla frontend
- **IDs for unique game elements** (`#p1-grid`, `#lobby-p1-portrait`); classes for reusable patterns
- **No `display: none` for transient feedback** — use `visibility: hidden/visible` or in-place text swaps to prevent layout jumping
- **No layout shift from dynamic content** — any element whose text or content changes at runtime (labels, scores, names, arena titles) must have a fixed `width` or `min-width` so surrounding layout never shifts. Use `white-space: nowrap` + `text-overflow: ellipsis` on variable-length labels. Never let changing content push or reflow neighbouring interactive elements. Example: `.track-title` has `width: 130px` so arena name changes don't shift the prev/next buttons.
- **No text wrapping in interactive elements** — buttons, labels, and pill text must never wrap to a second line. If text is too long for default padding, reduce horizontal padding (`padding-left`/`padding-right`) before reducing font size. Add `white-space: nowrap` as a safety net. Example: `.overlay-btn-row .btn` uses reduced horizontal padding to fit longer labels.
- **Text over arena backgrounds** always uses white/high-chroma color + hard pixel shadow (`text-shadow: 2px 2px 0 var(--accent)`) for legibility regardless of backdrop
- **SVG icons** in `<img>` tags use `filter: brightness(0) invert(1)` to force white

### Button system
| Class | Use |
|---|---|
| `.btn` | Primary CTA — orange fill, black text, pixel shadow |
| `.btn.btn-secondary` | Secondary option — outlined, accent text |
| `.btn.btn-alt` | Alternate/highlighted action |
| `.btn.btn-sm` | Smaller variant, combinable with above |
| `.btn-utility` | Controls over arena/complex backgrounds — semi-transparent dark pill, no shadow |

### Contextual Menu
The floating control panel (`ContextualMenu`) uses `.ctx-menu`, `.ctx-menu-item`, `.ctx-label`, `.ctx-menu-divider`. These are generic — the pattern can host any contextual controls, not just game settings.

## State Management

Zustand store (`packages/web/src/store/gameStore.ts`) is the single source of truth. `applyServerMessage(msg)` is the central dispatcher for all WebSocket events — add new server event handling there, not scattered across components.

## WebSocket

`packages/web/src/hooks/useGameSocket.ts` — module-level singleton. WS URL must include `/ws` path (`ws://host/ws`) to match Vite's proxy rule. VS AI mode never opens a WebSocket.

## Art Pipeline — Blocky SVG Conversion

Source art lives in `art/wip/`. The output convention is `<name>_blocky.svg` in the same directory.

The goal is a pixelated/retro look: horizontal bands of solid color on a fixed grid (4px for high fidelity, 20px for coarse). Each output SVG is full-width `<rect>` strips — no gradients, no paths, just rects.

### Toolchain available
- **Python 3** with **Pillow** (`from PIL import Image`) — rasterize PNGs, sample pixels
- **Node.js** — analytical gradient math for simple SVGs
- **Playwright** (installed at `/tmp/pw_render/`, chromium cached) — render complex SVGs (blend modes, radial gradients, clip-paths) to PNG first, then pixelate

### Decision tree
1. **PNG source** → sample directly with Pillow at grid interval
2. **Simple SVG** (only linear gradients + basic shapes, no blend modes) → compute analytically in Node.js
3. **Complex SVG** (mix-blend-mode, radial gradients, clip-paths, many paths) → render with Playwright to RGBA PNG first, then sample with Pillow

### Playwright render setup
```bash
# Already installed — just use it:
cd /tmp/pw_render && node render.js
```
`/tmp/pw_render/` has `node_modules/playwright` installed. Always use `omitBackground: true` on `page.screenshot()` to get a transparent RGBA PNG when the SVG has a transparent background. Set viewport to match the SVG's `width`/`height`.

### Sampling approach
- Sample the **center** of each grid cell (`x + GRID/2`, `y + GRID/2`)
- **Merge adjacent same-color rects** within each row to keep file size down
- For **transparent** pixels (alpha < 8): skip (emit no rect) — preserves compositing
- For **partial alpha** (8–247): emit `rgba(r,g,b,a)` fill
- For **opaque** (alpha ≥ 248): emit `#rrggbb` hex fill
- When the source is a pure vertical gradient (no horizontal variation), sample the **center column only** — one full-width rect per row

### Quantization for complex files
If the output has >5000 rects (e.g. lights/glow effects with continuous alpha), quantize colors before merging to reduce file size:
```python
Q = 8   # color channel step
QA = 16 # alpha step (gives ~16 alpha levels)
r = round(r / Q) * Q  # etc.
```

### Analytical gradient helper (Node.js)
For SVGs with only linear gradients, interpolate stops directly:
```js
const stops = [{ t: 0, r, g, b }, ...];
function evalGrad(t) { /* lerp between bracketing stops */ }
// sample at (y + GRID/2) / H for each row
```

## Style Guide

`frontend/style-guide.html` — served at `/style-guide.html` in dev. Update it when:
- Adding a new reusable component pattern
- Changing a token value
- Renaming a CSS class

The token block is live (linked, not copied) — token changes reflect immediately on hard refresh.

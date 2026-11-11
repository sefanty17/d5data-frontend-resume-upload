# Finish! Upload Your Resume

A pixel-accurate implementation of the Figma artboard **`1:20 · 上传简历` (1920 × 1080)**
built with **React 19 + Vite + TypeScript**. No UI kit, no CSS framework, no runtime
network requests — every asset, icon and font file is bundled locally.

The reference frame lives in `设计稿/` together with its @2x render
(`设计稿/renders/frame-1-20@2x.png`, 3840 × 2160). Those files were treated as
read-only input; the app only *reads* copies of the illustration and icons placed in
`src/assets/`.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 5173 (strict port) |
| `npm run build` | `tsc --noEmit` + `vite build` → `dist/` |
| `npm run preview` | Serve the production build |
| `npm run verify:layout` | Playwright gate: 12 container boxes on x/y/w/h + 2 text nodes on x/y/h at 1920 × 1080, the exact 1920 × 1080 no-scroll box, and the 800 × 900 stacked layout; exit code 1 on any mismatch |
| `npm run screenshot` | Playwright: writes all screenshots in `screenshots/` |
| `npm run verify:smoke` | Playwright gate: click / Enter / Space / drag-and-drop / validation (type, 10 MB boundary, invalid Replace) / aria-live / focus / error layout (desktop + mobile) / overflow / console; exit code 1 if any check fails |
| `npm run verify:compare` | Playwright + canvas gate: both PNGs must be 3840 × 2160 and global pixel diff must be ≤ 2 %; writes diff/crops to the OS temp dir |

The verification scripts expect a running server (`npm run dev`,
`http://localhost:5173`; override with `BASE_URL=...`) and drive the Chromium-based
browser already installed on the machine (Edge/Chrome, resolved by `playwright-core`),
so no browser binary is downloaded.

---

## Screenshots

| File | State |
| --- | --- |
| `screenshots/desktop-1920x1080.png` | Default state at the design size |
| `screenshots/desktop-1920x1080@2x.png` | Same page at DPR 2 — directly comparable with the @2x design render |
| `screenshots/desktop-1920x1080-dropzone-hover.png` | Drop area hover (solid blue border, lighter fill) |
| `screenshots/desktop-1920x1080-dropzone-pressed.png` | Drop area pressed / `:active` |
| `screenshots/desktop-1920x1080-dropzone-dragging.png` | File dragged over the drop area |
| `screenshots/desktop-1920x1080-file-selected.png` | Result of a real `DataTransfer` drop: file name, type and size |
| `screenshots/desktop-1920x1080-focus.png` | Keyboard focus ring on the drop area |
| `screenshots/desktop-1920x1080-button-hover.png` | "Finish" button hover |
| `screenshots/desktop-1920x1080-button-pressed.png` | "Finish" button pressed |
| `screenshots/desktop-1280x800.png` | Desktop composition below the artboard width |
| `screenshots/tablet-1024x900.png` | Breakpoint edge: stacked layout |
| `screenshots/mobile-800x900.png` | Stacked layout |
| `screenshots/mobile-390x844.png` | Small phone |
| `screenshots/design-vs-implementation.png` | Design (top) vs implementation (bottom); historical artifact |
| `screenshots/design-compare-*.png` | 2× crops of the same regions, design above / implementation below; historical artifacts |
| `screenshots/design-diff-2x.png` | Per-pixel diff map (red = channel delta > 24); historical artifact |

`verify:compare` regenerates the diff and crop images in
`%TEMP%\finish-upload-compare` by default (override with `COMPARE_OUT_DIR`), so
running it no longer rewrites tracked files.

---

## Project structure

```text
.
├── index.html
├── public/favicon.svg          # copy of the provided cloud icon (tab icon)
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.tsx                 # entry, font + global style imports
│   ├── App.tsx                  # page shell + file state
│   ├── App.css                  # grid, page paddings, responsive shell
│   ├── assets/
│   │   ├── illustration@2x.png  # copied from 设计稿/renders (1526 × 1138 → 763 × 569)
│   │   ├── icon-upload-cloud.svg
│   │   └── icon-check.svg
│   ├── components/
│   │   ├── Hero.tsx / Hero.css          # headline, lead, bottom-left illustration
│   │   ├── UploadCard.tsx / UploadCard.css
│   │   ├── Dropzone.tsx / Dropzone.css  # dashed area, drag & drop, file states
│   │   ├── Stepper.tsx / Stepper.css    # 343 × 4 bar + three 32px dots
│   │   └── Button.tsx / Button.css      # the two 272 × 67 buttons
│   ├── lib/file.ts              # accepted types, 10 MB limit, size formatting
│   ├── styles/tokens.css        # every value measured from the frame
│   └── styles/global.css        # reset, sr-only, reduced-motion
├── scripts/                     # verification tooling (not shipped in the bundle)
│   ├── browser.mjs              # launches local Edge/Chrome via playwright-core
│   ├── verify-layout.mjs        # layout gate: boxes + scroll + stacked layout
│   ├── screenshot.mjs           # all screenshots above
│   ├── smoke.mjs                # interaction / a11y / overflow smoke gate
│   └── compare.mjs              # pixel-diff gate + side-by-side crops vs @2x
├── screenshots/
└── docs/task-brief.md           # the original task brief, moved out of README.md
```

---

## How the design is reproduced

### Layout

The artboard is a two-column composition. Measured from the Figma node JSON:

| Element | x | y | w | h |
| --- | ---: | ---: | ---: | ---: |
| Hero headline | 102 | 124 | 394 | 110 (40/55) |
| Hero lead | 102 | 254 | 696 | 70 (20/35) |
| Illustration | 0 | 511 | 763 | 569 |
| Card | 875 | 103 | 943 | 922 (r32, `0 2px 20px rgba(19,67,112,.15)`) |
| Card title | 1004 | 133 | — | 35 (36/35, `letter-spacing: 2.88px`) |
| Drop area | 1004 | 221 | 685 | 420 (r15, 1px dashed `#0538BB`, dash 10/10) |
| Cloud icon | centred | 381 | 58 | 39 |
| Drop hint | 1097 | 434 | 499 | 64 (16/32) |
| Buttons | 1060 / 1361 | 739 | 272 × 2 | 67 (r8, gap 29) |
| Stepper | 1175 | 907 | 343 | 32 (bar 4px at y+14, dots 32px at x 28 / centre / right 27) |

The coordinates above are frame-relative: the raw `absoluteBoundingBox` values
first have the frame origin `(0, -0.2890625)` subtracted and are then rounded
(e.g. 123.71 → 124, 102.71 → 103, 220.71 → 221). This is why the measured CSS
values are 124/103/221/511/739/907 rather than 123/102/220/510/738/906.

The two **TEXT** nodes are auto-width in Figma (headline 394 px, card title
214 px), while a browser lays each one out as a block box (measured 773 px /
685 px). `verify:layout` therefore compares **12 container boxes on x/y/w/h and
2 text nodes on x/y/h only**. Their text-line boxes are 396.16 px / 217.1 px,
so even a Range-based line-box measure would not be within the 1 px box claim.

`page padding: 103px 102px 55px`, card padding `30px 129px 86px` and the vertical
gaps `53 / 98 / 101 / 86` add up to exactly **922 px** for the card and **1080 px**
for the page — so at 1920 × 1080 the page neither scrolls nor leaves a gap.

Everything is expressed as CSS custom properties in `src/styles/tokens.css`
(colour, radius, shadow, type scale, spacing), so the values are traceable to
the frame rather than sprinkled through the components.

The illustration is absolutely positioned against the page box
(`left: 0; bottom: 0`) and its width is `min(39.74%, 100% - pad - card - 10px)`,
i.e. 763 px at 1920 and always 10 px clear of the card.

### Upload: click, keyboard and drag-and-drop

`Dropzone` renders three layers inside the dashed box:

1. a visually hidden `<input type="file">` (the real picker),
2. a transparent `<button>` covering the whole surface (the accessible control —
   mouse click, <kbd>Enter</kbd> and <kbd>Space</kbd> all open the picker),
3. the visual content (`pointer-events: none`), so clicks always reach the button.

Drag and drop is handled on the wrapper: `dragenter`/`dragover` call
`preventDefault()` and set a nesting counter plus `data-dragging="true"`
(fill `#E3F2FF`, solid `#1B5AFF` border), `dragleave` decrements the counter so
moving over child nodes does not flicker, and `drop` reads
`event.dataTransfer.files[0]`. `dragend` and a window-level `drop` reset the
counter, so leaving the window mid-drag cannot leave the zone stuck highlighted.

The selected file is validated (PDF/DOC/DOCX, ≤ 10 MB = 10,485,760 bytes; the
exact limit is accepted), then rendered with its name, uppercase extension and
human-readable size; **Replace file** re-opens the picker and **Remove** clears
the state. An `aria-live` status region announces the selected file, or the
validation error when one occurs.

An invalid file renders an inline `role="alert"` message in both the empty and
the filled state. When a replacement is rejected the previous file stays
visible, but the error and the live region are updated, so the failure is never
silent. In the filled state on desktop the message is positioned absolutely
within the fixed-height 420 px drop area, so the name/actions block does not
shift; at ≤ 1024 px the 280 px (220 px ≤ 640 px) box grows to fit the message
instead, keeping it clear of the actions.

### Interaction states

The frame only draws the resting state; the states follow the interaction notes in
`设计稿/设计说明.md` and are listed here so they are reviewable:

| State | Drop area | Buttons |
| --- | --- | --- |
| Hover | fill `#EAF6FF`, solid `#1B5AFF` border | primary `#0F4CE0`, secondary `#5E9BFF` |
| Pressed | fill `#E3F2FF`, solid border | darken + 1px down |
| Dragging over | fill `#E3F2FF`, solid border | — |
| Focus-visible | 2 px `#1B5AFF` outline, 2 px offset | same |

The pressed state is scoped to the hit area: `pointerdown` is handled by the
hit `<button>` rather than the wrapper, so clicking **Replace file** or
**Remove** does not flash the whole drop area.

All transitions are ≤ 0.18 s and disabled by `prefers-reduced-motion`.

### Responsive strategy

| Range | Behaviour |
| --- | --- |
| ≥ 1920 | Fixed 1920 composition, centred, page background fills the rest |
| 1440 – 1919 | Same two-column composition; side padding and card width scale with `vw` (`--pad-x`, `--card-w`, `--card-pad-x`), vertical rhythm unchanged |
| 1025 – 1439 | Same composition, card shrinks to `min(560px, 49.1vw)`; hero type scales with `clamp()`, illustration capped so it can never touch the card |
| ≤ 1024 | **Stacked**: hero (headline + lead) on top, card below, full width; illustration hidden |
| ≤ 640 | Card padding 20 px, drop area 220 px, the two buttons become full-width stacked, stepper 240 px |

No breakpoint produces a horizontal scrollbar (verified at 1920/1440/1280/1024/800/390).

The illustration is dropped below 1024 px because at that width it would either be
unreadably small or push the card below the fold; the headline keeps the visual
weight instead.

### Accessibility

* Semantic landmarks: `<main>`, `<section aria-labelledby>`, `h1` → `h2`, `<ol>` stepper.
* The drop area is a real `<button>` with a descriptive `aria-label` that changes
  between the empty and filled states; the `<input type="file">` is reachable for
  automation (`tabindex="-1"`, visually hidden).
* Every interactive element has a visible `:focus-visible` ring; Tab order is
  drop area → "Last step" → "Finish".
* `role="status" aria-live="polite"` announces the selected file, or the
  validation error that rejected a replacement; `role="alert"` announces
  validation errors visibly in both the empty and filled states.
* Decorative images use `alt=""`; the illustration has a short descriptive alternative.
* Stepper steps expose "Step n of 3: completed / current step" to screen readers.

### Fonts

The design uses **Inter** 400/500. Instead of a CDN we self-host it with
`@fontsource/inter` (latin subset, weights 400 and 500, SIL Open Font License) and
import it in `src/main.tsx`; Vite fingerprints and bundles the `woff2` files.
`--font-sans` keeps the original fallback chain
(`"Helvetica Neue", Helvetica, Arial, "PingFang SC", "Microsoft YaHei", sans-serif`).

### The dashed border

CSS `border: 1px dashed` cannot reproduce Figma's 10/10 dash rhythm, so the border
is drawn by an inline SVG `<rect>` whose size is driven by CSS geometry properties
(`width: calc(100% - 1px)`, `rx: 14.5px`). The stroke sits inside the box like
Figma's `strokeAlign: INSIDE`; small sub-pixel nudges (`x`, `y`, `stroke-dashoffset`)
align the stroke and the dash phase with the exported render at both DPR 1 and 2.

---

## Design fidelity / verification

* `npm run verify:layout` is a gate, not a printout. It asserts **12 container
  boxes on x/y/w/h + 2 text nodes on x/y/h** against the Figma frame (≤ 1 px),
  plus `scrollWidth/scrollHeight = 1920/1080`, plus the 800 × 900 stacked result
  (hero above card, 736 px card, no horizontal overflow, illustration hidden).
  Any mismatch sets exit code 1. Current run: 14/14 selectors OK,
  `LAYOUT VERIFICATION PASSED`.
* `npm run verify:smoke` covers click-to-upload, Replace (valid and invalid),
  Remove, synthetic `DataTransfer` drop, dragend reset, Tab + Enter + Space,
  focus ring, invalid type, the exact 10 MB limit and 10 MB + 1 B, visible
  `role="alert"`, `aria-live` content, layout after an error (desktop and
  390 px mobile), horizontal overflow at six widths and a clean console —
  **51/51 checks pass**. Any failed check sets exit code 1.
* `npm run verify:compare` asserts both inputs are exactly 3840 × 2160 (it
  aborts instead of silently scaling one to the other) and fails when more than
  **2 %** of pixels differ by more than 24/255. Current run: **1.64 %**,
  `PIXEL COMPARISON PASSED`. The residual is concentrated in the primary button
  (colour-profile difference, see below) and in glyph anti-aliasing. The script
  writes its diff/crops to the OS temp directory, not into the repo.

## Known differences

1. **Colour profile of the reference PNG.** `frame-1-20@2x.png` embeds a *Display P3*
   ICC profile, so a colour-managed browser draws it slightly more saturated than the
   sRGB hex values in `tokens.css`: the primary button appears as `#005CFF` instead of
   `#1B5AFF`, the secondary as `#63AEFF` instead of `#75ACFF`. The implementation uses
   the Figma/sRGB tokens (the documented source of truth) rather than the profile-shifted
   values; this is the main reason the buttons region shows ~48 % differing pixels in
   the diff map. The comparison canvas decodes the P3 PNG through its ICC profile
   into sRGB, so the **1.64 %** global figure is an sRGB comparison. Swapping those
   two tokens is the only change needed if the PNG appearance is preferred.
2. **States that the frame does not define.** Selected-file, error, hover, pressed,
   drag-over and focus visuals are additions; they reuse the palette and the geometry
   of the frame but are not pixel-referenced.
3. **Buttons do not navigate.** The design is a single frame with no target screens, so
   "Last step" and "Finish" are real buttons with full interactive states but no routing.
4. **Mid-range desktop widths (1025–1439 px)** are an interpretation: the card narrows,
   the hero type scales and the illustration shrinks; the vertical rhythm stays identical
   to the 1920 frame. Below 1024 px the layout is stacked as requested.
5. **`:has()`** is used for the focus ring on the drop area (Chrome 105+, Safari 15.4+,
   Firefox 121+). Older browsers simply show no ring on that one element.
6. The illustration is the only raster asset and is **downscaled** from its 2×
   export (1526 × 1138 → 763 × 569). The cloud icon keeps its 58 × 39 size. The
   check icon is a 10 × 8 SVG displayed at 22 × 16 in the selected-file badge
   (vector scaling, no raster loss) and at 10 × 7 in the stepper; nothing is
   upscaled beyond its source pixels.

## Assets & licensing

| Asset | Source | Notes |
| --- | --- | --- |
| `illustration@2x.png` | `设计稿/renders/` (task material) | 1526 × 1138 exported at 2×, displayed at 763 × 569 |
| `icon-upload-cloud.svg` | `设计稿/renders/` | 58 × 39, `#1849D6`, unchanged |
| `icon-check.svg` | `设计稿/renders/` | 10 × 8, `#2A4CFE`, unchanged |
| Inter 400/500 | `@fontsource/inter` npm package | SIL Open Font License 1.1 |

The provided inputs under `设计稿/raw/` and `设计稿/renders/` were not modified;
`设计说明.md` is our own analysis note. The app imports its own copies from
`src/assets/`. The original task brief (previously `README.md`) is preserved in
`docs/task-brief.md`.

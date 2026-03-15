# Golden Gai Map — UI & Style Guide

> Visual design reference: Win2000 aesthetic, GaiChan dialogue system, CRT terminal, sprites, and mobile layout.
> For architecture, API, and deployment, see **PROJECT_GUIDE.md**.

---

## 1. Win2000 Design System

CSS variables in `src/styles/win2000.css` drive the entire palette:

| Variable | Value | Purpose |
|----------|-------|---------|
| `--win-bg` | `#c0c0c0` | Main grey background |
| `--win-border-light` | `#ffffff` | Top-left highlight (3D raised look) |
| `--win-border-dark` | `#808080` | Bottom-right shadow |
| `--win-border-mid` | `#dfdfdf` | Inner highlight |
| `--win-border-darkest` | `#404040` | Inner deep shadow |
| `--win-title-active` | `#000080` | Active title bar blue |
| `--win-title-text-active` | `#ffffff` | Title bar text |
| `--win-text` | `#000000` | Normal text |
| `--win-text-disabled` | `#808080` | Disabled text |
| `--win-font` | `'W95FA'` | Pixel font (woff/woff2 loaded) |
| `--valhalla-orange` | `#e8a040` | Accent orange for highlights |
| `--taskbar-height` | `max(32px, calc(32px + env(safe-area-inset-bottom)))` | Taskbar + iOS home bar |

Mobile override (`max-width: 768px`): `--taskbar-height: max(52px, calc(52px + env(safe-area-inset-bottom)))`

**Button styling pattern:** Always use 4-layer inset box-shadow (light top-left, dark bottom-right, mid inner, darkest inner). See `WinButton.vue` for the canonical example.

**Font smoothing:** Disabled globally in win2000.css for pixel-crisp rendering:
```css
*, *::before, *::after {
  -webkit-font-smoothing: none;
  font-smooth: never;
}
```

**Image rendering:**
- Pixel-art sprites/icons: `image-rendering: pixelated`
- Photos and natural images: `image-rendering: auto`

---

## 2. CRT / Terminal Aesthetic

Used in `GaiChanDialogue.vue` and the chat terminal:

- **Font:** `'Courier New', monospace`
- **Colors:** `#ff8800` (orange glow), `#ffe4a0` / `#ffcc44` (warm text)
- **Text shadow:** `0 0 4px rgba(255, 136, 0, 0.5)`
- **Scanlines:** `repeating-linear-gradient` with moving `background-position-y` animation
- **Monochrome filter for images:** `grayscale(1) sepia(1) saturate(5) hue-rotate(5deg) brightness(0.85) contrast(1.2)`

---

## 3. GaiChanDialogue.vue — Complete Reference

### Purpose
Two modes in one component:
1. **Rules walkthrough** — VN-style 20-step dialogue with Gai-chan sprite, CRT terminal for rule images, typewriter text. Shown on first visit.
2. **Interactive help mode** — After rules (or if `rulesAccepted=true`), user taps the tucked panel to open a choice-based dialogue tree.

### Props
```js
lang: String ('en' | 'jp')
rulesAccepted: Boolean   // true → start tucked (skip rules)
bars: Array              // bar data for recommendation engine
```

### Emits
```js
'accepted'                      // rules done/skipped → App saves localStorage
'tour-mode', Boolean            // enter/exit guided tour
'tour-navigate', String         // navigate to a view ('map', 'directory')
'tour-highlight', String|null   // highlight a UI element by name
'open-bar', Number              // open a specific bar by ID
```

### Layout Architecture

**Panel dimensions:** `min(820px, 98vw)` wide, aspect-ratio `2155/693` (from gaichanwindow.png)

**Image masking pattern (critical):**
- `gaichanwindow.png` — full decorative panel image with opaque frame + dark screen area
- `gaichanwindowtp.png` — TRANSPARENT MASK: transparent=screen area, opaque=frame/panels
- CSS `mask-image: url(gaichanwindowtp.png)` on `.layer--window` hides gaichanwindow where mask is transparent, revealing layers beneath

**Layer stack (bottom → top inside `.dialogue-body`):**
1. `.screen-content` (z=1) — Gai-chan sprite or `gaichanicon.png` on black when tucked
2. `.layer--window` (z=2) — gaichanwindow.png masked by gaichanwindowtp.png (shows only frame)
3. `.text-panel` (z=3) — dialogue text, skip button (top-right), next button (bottom-right)
4. `.speaker-name` (z=4) — "Gai-chan" label in small top window area

**CSS variables:**
```css
--screen-l: 6.59%;  --screen-t: 20.15%;
--screen-w: 18.41%; --screen-h: 53.61%;
--pw: 30%;  /* portrait zone width for tuck animation */
```

### Tuck Behavior
- Active: `left: 50%; transform: translateX(-50%)` — centered
- Tucked: `left: 100%; transform: translateX(calc(-1 * var(--pw)))` — right edge, portrait zone visible
- When tucked: monitor shows black + `gaichanicon.png` bouncing; text panel hidden via `v-if="!isTucked"`

**Tapping a tucked panel on mobile:** handled by `@touchend="handleTouchEnd"` which calls `e.preventDefault()` (suppresses the 300ms synthetic click) then `openInteractiveDialogue()`.

### Mobile Layout (≤768px)
```css
.gaichan-dialogue {
  width: calc(100vw * 2155 / 1434);   /* ~150% viewport width */
  left: 0;
  transform: translateX(calc(-100vw * 642 / 1434));  /* shift left ~45vw */
}
```
This positions the text panel (~33% from panel left) at approximately x=5vw — visible on screen. Monitor/screen-content area is at ~6.59% of panel width (~-35vw, off-screen left).

**On mobile:** `.screen-content:not(.screen-content--tucked) { display: none; }` hides the monitor in non-tucked state. The Gai-chan sprite lives inside the **CRT terminal** on mobile.

Tucked state on mobile: same rule as desktop (`left: 100%; translateX(-30%)`).

### Interactive Mode
- `openInteractiveDialogue()` — untuces panel, sets `interactiveMode = true`, loads 'menu' node
- `loadInteractiveNode(nodeId)` — loads a dialogue node; tour nodes trigger `tour-*` emits
- `selectChoice(choiceId)` — handles user choice buttons
- `closeInteractiveDialogue()` — re-tucks panel, clears tour state

On mobile during interactive mode, dialogue text appears in `.crt-dialogue-overlay` (overlay on terminal screen) rather than the text panel.

### CRT Terminal
- Desktop: slides down from above via Vue `<Transition name="crt">`; stays open once opened
- Mobile: always open after first dialogue step; no slide animation; Gai-chan sprite inside screen
- Images scan in via `clip-path: inset(0 0 100% 0)` → `inset(0 0 0% 0)`

### Sprite Sets
```js
SPRITE_SETS = {
  regular:   { closed: 'gaichanmouthclosed.png',        open: 'gaichanmouthopen.png' },
  thinking:  { closed: 'gaichanthinking.png',            open: 'gaichanthinkingmouthopen.png' },
  surprised: { closed: 'gaichansurprised.png',           open: 'gaichansurprisedmouthopen.png' },
}
```
`mouthOpen` ref toggles at 140ms intervals while typewriter is active.

---

## 4. GaiChan.vue — Corner Window

Shows in bottom-right corner, separate from GaiChanDialogue.

- Hidden when `hidden` prop is true (`showRules || firstVisit === true` in App.vue)
- Shows lang picker modal and first-time modal
- Sprites: `windowsprite.png` (idle), `windowspritethink.png` (thinking), `windowspritehappy.png` (happy)
- Position: `fixed; bottom: calc(var(--taskbar-height) + 8px); right: 8px`

---

## 5. Public Assets — Gaichan Folder

All in `public/gaichan/`:

| File | Purpose |
|------|---------|
| `gaichanwindow.png` | Full panel image (decorative frame) |
| `gaichanwindowtp.png` | Mask for panel (transparent=screen+text areas) |
| `gaichanbackground.png` | Background scene behind sprite |
| `gaichanmouthclosed.png` | Regular sprite, mouth closed |
| `gaichanmouthopen.png` | Regular sprite, mouth open |
| `gaichanthinking.png` | Thinking sprite, mouth closed |
| `gaichanthinkingmouthopen.png` | Thinking sprite, mouth open |
| `gaichansurprised.png` | Surprised sprite, mouth closed |
| `gaichansurprisedmouthopen.png` | Surprised sprite, mouth open |
| `gaichanicon.png` | Small icon shown in tucked monitor |
| `gaichanidle.png` | Rule image: private streets |
| `terminal.png` | CRT terminal frame |
| `terminaltp.png` | CRT terminal mask (transparent=screen area) |
| `windowsprite.png` | GaiChan corner sprite (idle) |
| `windowspritethink.png` | GaiChan corner sprite (thinking) |
| `windowspritehappy.png` | GaiChan corner sprite (happy) |
| `camera.png`, `smoking.png`, `yen.png`, etc. | Rule images |

**IMPORTANT:** Source assets live in `media/gaichan/`. When new sprites are provided, copy to `public/gaichan/`:
```bash
cp media/gaichan/FILENAME.png public/gaichan/FILENAME.png
```

---

## 6. CSS Gotchas & Lessons Learned

### CSS Specificity — Mobile vs Desktop Tucked State
`.gaichan-dialogue.tucked` has higher specificity than the mobile media query's `.gaichan-dialogue`. Always explicitly override `.gaichan-dialogue.tucked` inside `@media (max-width: 768px)` when you need different mobile tucked behavior.

### Vue Transitions with CSS transforms
When a `<Transition>` sets `transform` on enter/leave AND the element has a base `transform`, the enter/leave must include the base:
```css
/* Desktop: base transform is translateX(-50%) */
.crt-enter-from { transform: translateX(-50%) translateY(-160%); }
/* Mobile: no centering transform */
.crt-enter-from { transform: translateY(-160%); }
```

### Image Analysis for Pixel-Perfect Positioning
When `gaichanwindowtp.png` is updated with new transparent windows, use Python PIL:
```python
from PIL import Image
import numpy as np
img = Image.open('public/gaichan/gaichanwindowtp.png').convert('RGBA')
arr = np.array(img)
alpha = arr[:,:,3]
rows = np.any(alpha < 10, axis=1)
cols = np.any(alpha < 10, axis=0)
print(np.where(rows)[0][[0,-1]], np.where(cols)[0][[0,-1]])
```

---

## 7. Known Visual Issues (not yet fixed)

- **Touch rotation and label counter-rotation** — when `userRotation` is non-zero, building labels don't counter-rotate user's touch angle; they tilt with the map.
- **Mobile text panel right overflow** — right side of the dialogue panel extends ~5-10px past viewport. Intentional aesthetic, monitor for horizontal scroll issues.
- **Terminal on mobile has no rule text lines** — `crt-lines` hidden on mobile; only rule image shows.
- **Speaker name label on mobile** — renders very small (~9px font); would need sprite at larger size to fix.
- **Global label mode toggle** — `labelMode` prop is wired but no UI toggle exposed. Per-building `tate` option in admin is current entry point.
- **CRT readability on small screens** — orange-on-dark color scheme can be hard to read at very small font sizes.

See **KNOWN_ISSUES.md** for full deferred issue list.

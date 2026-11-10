# P01: Image diet (24 MB → ~3 MB)

**Phase 1** · Size **S–M** · Agent ~2h · Review ~20 min · Depends on: none · Touches: `public/gaichan/*`, `public/*.png|jpg`, references in `BiosScreen.vue`, `GaiChan.vue`, `GaiChanDialogue.vue`, `DesktopView.vue`, CSS backgrounds; new `scripts/optimize-images.mjs`

## Why
`public/gaichan` is 24 MB. `gaichanicon.png` is 3.9 MB at 2816×1536 and displayed at 72–96 px tall; the BIOS **preloads** it along with `gaichanwindow.png` (1.8 MB) before the app appears. Rule images are 0.6–1.3 MB each. Users are often on roaming mobile data in the alleys.

## Steps
1. `scripts/optimize-images.mjs` using `sharp` (devDependency):
   - Resize each image to at most 2× its largest displayed CSS size (measure in the code/CSS; e.g. the BIOS logo shows at ≤96 px tall → 192 px tall).
   - Write a `.webp` (quality ~82, alpha kept) next to the original.
   - Keep the originals in `media/` (git-ignored source folder), **not** `public/`.
2. Pixel-art sprites (anything rendered with `image-rendering: pixelated`) stay **PNG**: resize with nearest-neighbour only to an exact integer fraction, or not at all, and run lossless palette compression (`sharp().png({ palette: true })`). Don't blur pixel art.
3. Update every reference. For `<img>`, use `<picture>` with a PNG fallback only if needed; all target browsers support WebP, so a straight swap is fine.
4. BIOS `ASSETS_TO_PRELOAD`: only the logo and wallpaper. Everything else lazy-loads (`loading="lazy"`, or preload when the walkthrough starts).
5. nginx: add long cache headers for hashed `/assets/` and a week for `/gaichan/` and `/icons/`.
6. Don't change the 3D model (`public/gaichan/model`) in this task.

## Acceptance criteria
- [ ] `du -sh public/gaichan` (excluding model) under ~3 MB
- [ ] Side-by-side screenshots of the BIOS, the walkthrough (3 steps) and the desktop look the same
- [ ] Cold load transfers under 1.5 MB before the desktop is interactive (check with Playwright's network log)

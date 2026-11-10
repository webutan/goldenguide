#!/usr/bin/env node
// Image diet: builds the web-sized images in public/ from the full-size
// originals in media/originals/ (git-ignored; also recoverable from git history).
//
//   node scripts/optimize-images.mjs
//
// Two modes, picked by how the image is rendered in CSS:
//
//  - 'webp'  painted/illustrated images rendered with the default smooth scaling.
//            Resized (lanczos) to fit maxW x maxH, written as WebP q82 with alpha.
//
//  - 'pixel' anything rendered with `image-rendering: pixelated`. Stays PNG.
//            Downscaled only by an integer factor k with nearest-neighbour (k = the
//            smallest integer that brings it within maxW x maxH, often 1), then
//            lossless-ish palette compression. Never blurred.
//
// maxW/maxH = 2x the largest CSS size the image is displayed at. Reference
// viewports: desktop (dialogue panel 820px, CRT terminal 580px) and phones up
// to 430px wide. Where each number comes from is noted per entry.

import sharp from 'sharp'
import { mkdir, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(root, 'media/originals')
const OUT = join(root, 'public')

// Rule images in the CRT terminal (.crt-image, pixelated, max 100% of the screen).
// Largest screen: mobile 430px -> crt-screen 385x306, minus padding -> ~375x296.
const CRT = { mode: 'pixel', maxW: 750, maxH: 592 }

const IMAGES = [
  // BIOS logo: 72px tall (desktop) / 96px tall (mobile) -> 192px tall.
  // Tucked dialogue icon: 70% of the 151px screen -> 106px wide. 2816x1536 / 8 = 352x192.
  { src: 'gaichan/gaichanicon.png', mode: 'pixel', maxW: 352, maxH: 192 },

  // Dialogue frame + its mask: full panel width, 820px desktop -> 1640px.
  // (GaiChan.vue window shows it cover-fitted at most ~1000px wide.)
  { src: 'gaichan/gaichanwindow.png', out: 'gaichan/gaichanwindow.webp', mode: 'webp', maxW: 1640, maxH: 1640 },
  { src: 'gaichan/gaichanwindowtp.png', out: 'gaichan/gaichanwindowtp.webp', mode: 'webp', maxW: 1640, maxH: 1640 },

  // CRT terminal frame + mask: 580px desktop, 430*1268/701 = 778px mobile -> 1556 (> native).
  { src: 'gaichan/terminal.png', out: 'gaichan/terminal.webp', mode: 'webp', maxW: 1556, maxH: 1556 },
  { src: 'gaichan/terminaltp.png', out: 'gaichan/terminaltp.webp', mode: 'webp', maxW: 1556, maxH: 1556 },

  // Mobile tour terminal frame: 175px wide -> 350 (> native).
  { src: 'gaichan/smallterminaltp.png', out: 'gaichan/smallterminaltp.webp', mode: 'webp', maxW: 350, maxH: 350 },

  // Scene behind Gai-chan: 151x141 cover (desktop); mobile CRT screen 385x306 cover -> 770 wide.
  { src: 'gaichan/gaichanbackground.png', out: 'gaichan/gaichanbackground.webp', mode: 'webp', maxW: 770, maxH: 2000 },

  // 3D lab page background (dev only), full-screen cover -> keep native size.
  { src: 'gaichan/gaichanbg.jpg', out: 'gaichan/gaichanbg.webp', mode: 'webp', maxW: 2000, maxH: 2000 },

  // 2D fallback sprites (GaiChanModel fallback, pixelated): up to ~343px tall on mobile -> 686 (> native).
  ...['gaichanmouthclosed', 'gaichanmouthopen', 'gaichanthinking', 'gaichanthinkingmouthopen',
    'gaichansurprised', 'gaichansurprisedmouthopen', 'gaichanembarassed', 'gaichanembarassedmouthopen',
  ].map(n => ({ src: `gaichan/${n}.png`, mode: 'pixel', maxW: 700, maxH: 686 })),

  // GaiChan.vue sprites: pixelated 110px-tall in the bubble, contain-fitted in a
  // 260x323 window on mobile -> 646 tall.
  { src: 'gaichan/windowsprite.png', mode: 'pixel', maxW: 520, maxH: 646 },
  { src: 'gaichan/windowspritethink.png', mode: 'pixel', maxW: 520, maxH: 646 },

  // Rule illustrations shown in the CRT terminal.
  ...['gaichanidle', 'camera', 'yen', 'luggage', 'smoking', 'trash', 'drinking', 'photo',
    'shouting', 'graffiti2', 'drugs', 'vomit', 'blocking', 'skateboard', 'climbing',
  ].map(n => ({ src: `gaichan/${n}.png`, ...CRT })),

  // Desktop wallpaper: full-screen cover -> keep native size.
  { src: 'static-off.png', out: 'static-off.webp', mode: 'webp', maxW: 2560, maxH: 2560 },

  // Desktop sign banner: 220px tall (desktop, ~755px wide), 100% width on mobile -> native.
  { src: 'signs/sign.png', out: 'signs/sign.webp', mode: 'webp', maxW: 1510, maxH: 702 },
]

async function optimize({ src, out = src, mode, maxW, maxH }) {
  const input = join(SRC, src)
  const output = join(OUT, out)
  await mkdir(dirname(output), { recursive: true })
  const { width, height } = await sharp(input).metadata()
  let img = sharp(input)
  let w = width, h = height

  if (mode === 'pixel') {
    let k = 1
    while (width / k > maxW || height / k > maxH) k++
    if (k > 1) {
      w = Math.round(width / k); h = Math.round(height / k)
      img = img.resize(w, h, { kernel: 'nearest' })
    }
    await img.png({ palette: true, quality: 100, effort: 10, compressionLevel: 9 }).toFile(output)
  } else {
    if (width > maxW || height > maxH) {
      img = img.resize(maxW, maxH, { fit: 'inside', withoutEnlargement: true, kernel: 'lanczos3' })
    }
    await img.webp({ quality: 82, alphaQuality: 100, effort: 6 }).toFile(output)
    ;({ width: w, height: h } = await sharp(output).metadata())
  }

  const before = (await stat(input)).size
  const after = (await stat(output)).size
  return { src, out, before, after, dims: `${width}x${height} -> ${w}x${h}` }
}

const kb = n => `${(n / 1024).toFixed(0)} KB`
let totalBefore = 0, totalAfter = 0
for (const entry of IMAGES) {
  const r = await optimize(entry)
  totalBefore += r.before; totalAfter += r.after
  console.log(`${r.out.padEnd(36)} ${r.dims.padEnd(24)} ${kb(r.before).padStart(8)} -> ${kb(r.after).padStart(7)}`)
}
console.log(`\ntotal ${kb(totalBefore)} -> ${kb(totalAfter)}`)

// Generates public/og/default.png, the 1200x630 image link previews show when
// a bar has no photo (and for /, /map, /directory). See server/lib/seo.js.
//
//   node scripts/make-og-image.mjs
//
// The card is drawn as an SVG in the app's look (Win95 window with the orange
// title bar, CRT scanlines, Gai-chan) and rasterised with sharp. The text uses
// the app's own W95FA pixel font from src/fonts/, handed to sharp's text
// renderer through a throw-away fontconfig file, so the result does not depend
// on the fonts installed on this machine. Commit the PNG after regenerating it.
//
// Latin text only: sharp's bundled FreeType cannot read WOFF2, which is the
// only format the Japanese font (PixelMplus10) is kept in.
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { inflateSync } from 'node:zlib'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(root, 'public/og/default.png')
const W = 1200
const H = 630

// WOFF 1.0 is an sfnt (TTF/OTF) whose tables are zlib-compressed one by one.
// sharp's FreeType reads plain sfnt only, so unpack it.
function woffToSfnt(woff) {
  if (woff.toString('latin1', 0, 4) !== 'wOFF') throw new Error('not a WOFF 1.0 file')
  const numTables = woff.readUInt16BE(12)
  const tables = []
  for (let i = 0; i < numTables; i++) {
    const entry = 44 + i * 20
    const offset = woff.readUInt32BE(entry + 4)
    const compLength = woff.readUInt32BE(entry + 8)
    const origLength = woff.readUInt32BE(entry + 12)
    const packed = woff.subarray(offset, offset + compLength)
    tables.push({
      tag: woff.toString('latin1', entry, entry + 4),
      checksum: woff.readUInt32BE(entry + 16),
      data: compLength < origLength ? inflateSync(packed) : packed,
    })
  }
  const header = Buffer.alloc(12 + numTables * 16)
  const pow = 2 ** Math.floor(Math.log2(numTables))
  header.writeUInt32BE(woff.readUInt32BE(4), 0) // sfnt flavor
  header.writeUInt16BE(numTables, 4)
  header.writeUInt16BE(pow * 16, 6)
  header.writeUInt16BE(Math.log2(pow), 8)
  header.writeUInt16BE((numTables - pow) * 16, 10)
  const parts = [header]
  let offset = header.length
  tables.forEach((table, i) => {
    const entry = 12 + i * 16
    header.write(table.tag, entry, 'latin1')
    header.writeUInt32BE(table.checksum, entry + 4)
    header.writeUInt32BE(offset, entry + 8)
    header.writeUInt32BE(table.data.length, entry + 12)
    const pad = (4 - (table.data.length % 4)) % 4
    parts.push(table.data, Buffer.alloc(pad))
    offset += table.data.length + pad
  })
  return Buffer.concat(parts)
}

// fontconfig must be pointed at the font before sharp (libvips) loads
const fcDir = mkdtempSync(join(tmpdir(), 'og-fonts-'))
writeFileSync(join(fcDir, 'w95fa.ttf'), woffToSfnt(readFileSync(resolve(root, 'src/fonts/w95fa.woff'))))
writeFileSync(join(fcDir, 'fonts.conf'), `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${fcDir}</dir>
  <cachedir>${join(fcDir, 'cache')}</cachedir>
</fontconfig>
`)
process.env.FONTCONFIG_FILE = join(fcDir, 'fonts.conf')
const { default: sharp } = await import('sharp')

// Palette from src/styles/win2000.css
const C = {
  desktop: '#0a0810',
  face: '#2a2535',
  faceDark: '#1a1625',
  light: '#4a4060',
  dark: '#1a1525',
  darkest: '#0d0a15',
  text: '#c8c0d0',
  dim: '#887898',
  titleA: '#c45c1a',
  titleB: '#e8a040',
  orange: '#e8a040',
  glow: '#ff8800',
  warm: '#ffe4a0',
}
const LATIN = 'W95FA'

// Raised 3D box: light top/left, dark bottom/right, two layers (the 4-layer bevel)
function raised(x, y, w, h, fill = C.face) {
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.darkest}"/>
    <rect x="${x}" y="${y}" width="${w - 2}" height="${h - 2}" fill="${C.light}"/>
    <rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}" fill="${C.dark}"/>
    <rect x="${x + 2}" y="${y + 2}" width="${w - 6}" height="${h - 6}" fill="${fill}"/>`
}

// Sunken field: the reverse
function sunken(x, y, w, h, fill = C.desktop) {
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.light}"/>
    <rect x="${x}" y="${y}" width="${w - 2}" height="${h - 2}" fill="${C.darkest}"/>
    <rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}" fill="${fill}"/>`
}

// A strip of the map: two alleys of tiny bars, a few of them lit
function alleys(x, y, w, h) {
  const street = ['#8B2500', '#005559', '#3a5c20', '#6a1a48']
  let out = ''
  let seed = 7
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
  const rows = 4
  const rowH = Math.floor((h - (rows - 1) * 14) / rows)
  for (let r = 0; r < rows; r++) {
    const ry = y + r * (rowH + 14)
    let cx = x
    while (cx < x + w - 18) {
      const bw = Math.min(18 + Math.floor(rnd() * 26), x + w - cx)
      const lit = rnd() < 0.3
      const color = lit ? C.orange : street[r % street.length]
      out += `<rect x="${cx}" y="${ry}" width="${bw - 3}" height="${rowH}" fill="${color}" opacity="${lit ? 1 : 0.85}"/>`
      out += `<rect x="${cx}" y="${ry}" width="${bw - 3}" height="2" fill="#ffffff" opacity="0.18"/>`
      cx += bw
    }
  }
  return out
}

const win = { x: 60, y: 44, w: 1080, h: 484 }
const inner = { x: win.x + 6, y: win.y + 6, w: win.w - 12 }
const titleH = 44
const body = { x: win.x + 22, y: win.y + 6 + titleH + 20, w: win.w - 44, h: win.h - titleH - 48 }
const textX = body.x + 34

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="title" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="${C.titleA}"/>
      <stop offset="1" stop-color="${C.titleB}"/>
    </linearGradient>
    <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="2" fill="#000000" opacity="0.28"/>
    </pattern>
    <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75">
      <stop offset="0.55" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.55"/>
    </radialGradient>
    <clipPath id="screen"><rect x="${body.x + 2}" y="${body.y + 2}" width="${body.w - 4}" height="${body.h - 4}"/></clipPath>
  </defs>

  <rect width="${W}" height="${H}" fill="${C.desktop}"/>

  <!-- window -->
  ${raised(win.x, win.y, win.w, win.h)}
  <rect x="${inner.x}" y="${inner.y}" width="${inner.w}" height="${titleH}" fill="url(#title)"/>
  <text x="${inner.x + 14}" y="${inner.y + 31}" font-family="${LATIN}" font-size="28" fill="#ffffff">Golden Gai Map</text>
  ${[0, 1, 2].map((i) => {
    const bx = inner.x + inner.w - 38 - i * 36 - (i === 0 ? 0 : 4)
    const by = inner.y + 7
    const glyph = i === 0
      ? `<path d="M${bx + 9} ${by + 8} l12 12 m0 -12 l-12 12" stroke="${C.text}" stroke-width="3" fill="none"/>`
      : i === 1
        ? `<rect x="${bx + 8}" y="${by + 7}" width="14" height="13" fill="none" stroke="${C.text}" stroke-width="2"/><rect x="${bx + 8}" y="${by + 7}" width="14" height="4" fill="${C.text}"/>`
        : `<rect x="${bx + 8}" y="${by + 19}" width="12" height="3" fill="${C.text}"/>`
    return raised(bx, by, 32, 30) + glyph
  }).join('')}

  <!-- CRT screen -->
  ${sunken(body.x, body.y, body.w, body.h)}
  <g clip-path="url(#screen)">
    <text x="${textX}" y="${body.y + 62}" font-family="${LATIN}" font-size="32" fill="${C.warm}">C:\\SHINJUKU\\KABUKICHO&gt;</text>
    <text x="${textX + 3}" y="${body.y + 165}" font-family="${LATIN}" font-size="104" fill="${C.glow}" opacity="0.4">GOLDEN GAI MAP</text>
    <text x="${textX}" y="${body.y + 162}" font-family="${LATIN}" font-size="104" fill="${C.orange}">GOLDEN GAI MAP</text>
    <text x="${textX}" y="${body.y + 214}" font-family="${LATIN}" font-size="32" fill="${C.text}">Every tiny bar in Shinjuku Golden Gai, on one map.</text>
    ${alleys(textX, body.y + 252, 640, body.h - 280)}
    <rect x="${body.x}" y="${body.y}" width="${body.w}" height="${body.h}" fill="url(#scan)"/>
  </g>

  <!-- taskbar -->
  ${raised(-4, H - 62, W + 8, 70)}
  ${raised(14, H - 52, 150, 42)}
  <rect x="28" y="${H - 42}" width="22" height="22" fill="${C.orange}"/>
  <rect x="33" y="${H - 37}" width="12" height="12" fill="${C.face}"/>
  <text x="62" y="${H - 22}" font-family="${LATIN}" font-size="26" fill="${C.text}">Start</text>
  ${sunken(176, H - 52, 300, 42, C.faceDark)}
  <text x="190" y="${H - 22}" font-family="${LATIN}" font-size="26" fill="${C.text}">Golden Gai Map</text>
  ${sunken(W - 190, H - 52, 176, 42, C.face)}
  <text x="${W - 174}" y="${H - 22}" font-family="${LATIN}" font-size="26" fill="${C.text}">EN / JP  19:00</text>

  <rect width="${W}" height="${H}" fill="url(#vignette)"/>
</svg>`

// Gai-chan stands in the screen, cut off by its bottom edge
const spriteH = 430
const sprite = await sharp(resolve(root, 'public/gaichanidle.png'))
  .trim()
  .resize({ height: spriteH, kernel: 'nearest' })
  .toBuffer({ resolveWithObject: true })
const spriteTop = body.y + 22
const visibleH = Math.min(spriteH, body.y + body.h - 2 - spriteTop)
const spriteCut = await sharp(sprite.data)
  .extract({ left: 0, top: 0, width: sprite.info.width, height: visibleH })
  .toBuffer()

mkdirSync(dirname(OUT), { recursive: true })
await sharp(Buffer.from(svg))
  .composite([{ input: spriteCut, left: body.x + body.w - sprite.info.width - 70, top: spriteTop }])
  .png({ palette: true, colours: 128, compressionLevel: 9, effort: 10 })
  .toFile(OUT)

rmSync(fcDir, { recursive: true, force: true })
const meta = await sharp(OUT).metadata()
console.log(`${OUT}: ${meta.width}x${meta.height}, ${(statSync(OUT).size / 1024).toFixed(1)} kB`)

import { describe, it, expect } from 'vitest'
import qrcode from 'qrcode/lib/core/qrcode.js'
import {
  normalizeBaseUrl, isLocalBaseUrl, stickerUrl, displayHost, paginate, stickerNames, nameSize, streetName,
  qrPath, qrViewSize, QR_QUIET_ZONE, STICKERS_PER_PAGE, STICKER_REF,
} from '../src/utils/sticker.js'
import { parseUrl } from '../src/composables/useUrlState.js'
import { COUNTED_REFS } from '../server/lib/refHits.js'

describe('normalizeBaseUrl', () => {
  it('keeps origin and path, drops trailing slashes, query and fragment', () => {
    expect(normalizeBaseUrl('https://gai.example')).toBe('https://gai.example')
    expect(normalizeBaseUrl('  https://gai.example/  ')).toBe('https://gai.example')
    expect(normalizeBaseUrl('http://192.168.1.20:8080/')).toBe('http://192.168.1.20:8080')
    expect(normalizeBaseUrl('https://example.com/gai/?x=1#top')).toBe('https://example.com/gai')
    expect(normalizeBaseUrl('HTTPS://Gai.Example')).toBe('https://gai.example')
  })

  it('refuses anything that is not an http(s) address', () => {
    for (const bad of ['', '   ', 'gai.example', 'ftp://gai.example', 'javascript:alert(1)', 'https://', 'https://user:pw@gai.example', null, undefined]) {
      expect(normalizeBaseUrl(bad)).toBe(null)
    }
  })
})

describe('isLocalBaseUrl', () => {
  it('spots addresses that only work on this machine or network', () => {
    for (const local of ['http://localhost:5173', 'http://127.0.0.1', 'http://192.168.1.20:8080', 'http://10.0.0.5', 'http://172.20.1.1', 'http://nas.local', 'http://nas:8080', 'http://[::1]:80']) {
      expect(isLocalBaseUrl(local), local).toBe(true)
    }
    for (const open of ['https://gai.example', 'http://172.32.0.1', 'http://8.8.8.8', 'https://[2001:db8::1]']) {
      expect(isLocalBaseUrl(open), open).toBe(false)
    }
  })
})

describe('stickerUrl', () => {
  it('is the deep link with ?ref=sticker', () => {
    expect(stickerUrl('https://gai.example', 'bar-tomorrow')).toBe('https://gai.example/bar/bar-tomorrow?ref=sticker')
    expect(stickerUrl('https://gai.example/', 'bar-tomorrow')).toBe('https://gai.example/bar/bar-tomorrow?ref=sticker')
  })

  it('percent-encodes a Japanese slug, so the payload is plain ASCII', () => {
    const url = stickerUrl('https://gai.example', '愛鷹')
    expect(url).toBe('https://gai.example/bar/%E6%84%9B%E9%B7%B9?ref=sticker')
    expect(url).toMatch(/^[\x21-\x7E]+$/)
  })

  it('round-trips through the app\'s URL parser, reserved characters included', () => {
    for (const slug of ['bar-tomorrow', '愛鷹', 'a/b c?&#', 'ガルシア']) {
      const url = new URL(stickerUrl('https://gai.example', slug))
      expect(parseUrl(url.pathname, url.search).slug).toBe(slug)
    }
  })

  it('uses a ref the API counts', () => {
    expect(COUNTED_REFS).toContain(STICKER_REF)
  })
})

describe('displayHost / streetName', () => {
  it('shows the host only', () => {
    expect(displayHost('https://gai.example/sub')).toBe('gai.example')
    expect(displayHost('http://192.168.1.20:8080')).toBe('192.168.1.20:8080')
    expect(displayHost('nope')).toBe('')
  })

  it('labels a street id', () => {
    expect(streetName('hanazono-1')).toBe('Hanazono 1')
    expect(streetName('maneki-dori')).toBe('Maneki Dori')
    expect(streetName(null)).toBe('')
  })
})

describe('paginate', () => {
  const bars = Array.from({ length: 182 }, (_, i) => i)

  it('puts 182 stickers on 23 sheets of 8, the last one part full, none empty', () => {
    const pages = paginate(bars)
    expect(STICKERS_PER_PAGE).toBe(8)
    expect(pages).toHaveLength(23)
    expect(pages.slice(0, 22).every(p => p.length === 8)).toBe(true)
    expect(pages[22]).toHaveLength(6)
    expect(pages.flat()).toEqual(bars)
  })

  it('has no trailing empty page for an exact multiple, and none for nothing', () => {
    expect(paginate(bars.slice(0, 16))).toHaveLength(2)
    expect(paginate(bars.slice(0, 8))).toHaveLength(1)
    expect(paginate([])).toEqual([])
    expect(paginate(bars.slice(0, 3), 1)).toEqual([[0], [1], [2]])
  })
})

describe('stickerNames', () => {
  it('puts English first and Japanese below', () => {
    expect(stickerNames({ name_en: 'Albatross', name_jp: 'アルバトロス' })).toEqual({ primary: 'Albatross', secondary: 'アルバトロス' })
  })

  it('has one line when there is one name, or the same name twice', () => {
    expect(stickerNames({ name_en: '', name_jp: '愛鷹' })).toEqual({ primary: '愛鷹', secondary: '' })
    expect(stickerNames({ name_en: null, name_jp: '愛鷹' })).toEqual({ primary: '愛鷹', secondary: '' })
    expect(stickerNames({ name_en: 'BAR tomorrow', name_jp: 'bar  Tomorrow' })).toEqual({ primary: 'BAR tomorrow', secondary: '' })
    expect(stickerNames({})).toEqual({ primary: '', secondary: '' })
  })
})

describe('nameSize', () => {
  it('steps down for long names, counting full-width characters double', () => {
    expect(nameSize('Albatross')).toBe('l')
    expect(nameSize('愛鷹')).toBe('l')
    expect(nameSize('Bar Plastic Model')).toBe('m')
    expect(nameSize('アルバトロスゴールデン')).toBe('m')
    expect(nameSize('The Very Long Name Of A Bar')).toBe('s')
    expect(nameSize('クレマスターゴールデン街店')).toBe('s')
  })
})

describe('qrPath', () => {
  // . X X .
  // X . . X
  const grid = [[0, 1, 1, 0], [1, 0, 0, 1]]
  const dark = (r, c) => !!(grid[r] && grid[r][c])

  it('merges runs of dark modules and offsets them by the quiet zone', () => {
    expect(qrPath(4, dark, 4)).toBe('M5 4h2v1h-2zM4 5h1v1h-1zM7 5h1v1h-1z')
    expect(qrPath(4, dark, 0)).toBe('M1 0h2v1h-2zM0 1h1v1h-1zM3 1h1v1h-1z')
  })

  it('keeps a quiet zone of at least 4 modules', () => {
    expect(QR_QUIET_ZONE).toBeGreaterThanOrEqual(4)
    expect(qrViewSize(33)).toBe(33 + 2 * QR_QUIET_ZONE)
  })

  it('draws exactly the dark modules of a real symbol', () => {
    const { modules } = qrcode.create(stickerUrl('https://gai.example', '愛鷹'), { errorCorrectionLevel: 'M' })
    const d = qrPath(modules.size, (r, c) => !!modules.get(r, c))
    // Area covered by the path == number of dark modules
    let area = 0
    for (const m of d.matchAll(/h(\d+)v1/g)) area += Number(m[1])
    let darkCount = 0
    for (let r = 0; r < modules.size; r++) for (let c = 0; c < modules.size; c++) if (modules.get(r, c)) darkCount++
    expect(area).toBe(darkCount)
    // Nothing is drawn in the quiet zone
    for (const m of d.matchAll(/M(\d+) (\d+)h(\d+)/g)) {
      expect(Number(m[1])).toBeGreaterThanOrEqual(QR_QUIET_ZONE)
      expect(Number(m[2])).toBeGreaterThanOrEqual(QR_QUIET_ZONE)
      expect(Number(m[1]) + Number(m[3])).toBeLessThanOrEqual(modules.size + QR_QUIET_ZONE)
    }
  })
})

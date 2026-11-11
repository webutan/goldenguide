import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  escapeHtml, escapeXml, serializeJsonLd, cleanText, truncate, seoLang, resolveOrigin, barPath, photoPath,
  barName, streetLabel, fallbackDescription, barDescription, openingHoursSpecification, buildBarJsonLd,
  buildHead, injectHead, renderPage, isSpaTemplate, buildSitemapXml, buildRobotsTxt, createTemplateCache,
  DEFAULT_OG_IMAGE, STATUS_META_NAME,
} from '../server/lib/seo.js'

const ORIGIN = 'https://gai.example'

// The real index.html, plus the kind of tags Vite adds at build time
const SOURCE_TEMPLATE = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8')
const TEMPLATE = SOURCE_TEMPLATE.replace(
  '<script type="module" src="/src/main.js"></script>',
  ''
).replace(
  '</head>',
  '  <script type="module" crossorigin src="/assets/index-AbC123.js"></script>\n    <link rel="stylesheet" crossorigin href="/assets/index-XyZ789.css">\n  </head>'
)

const BAR = {
  id: 7,
  slug: 'bar-tomorrow',
  name_jp: 'BAR tomorrow',
  name_en: '',
  street: 'hanazono-1',
  floor: 1,
  charge: '1250',
  seats: 8,
  description: '',
  address: '〒160-0021 東京都新宿区歌舞伎町１丁目１−８',
  lat: 35.6941,
  lng: 139.7046,
  schedule: { default: { open: '19:00', close: '03:00' }, closedDays: ['sun'] },
  is_active: true,
}

const HOSTILE = {
  ...BAR,
  slug: 'evil"><bar',
  name_en: `"><script>alert(1)</script><!-- ' & </title>`,
  name_jp: '悪い</script><script>alert(2)</script>',
  description: `</script><script>alert(3)</script> <!-- "onload="x \u2028\u2029 line\nbreak & more`,
  address: '</script><img src=x onerror=alert(4)>',
  phone: '<!--',
}

const count = (html, re) => (html.match(re) || []).length

// Extract and parse the JSON-LD block the way a browser would delimit it:
// the script element ends at the first "</script".
function jsonLdOf(html) {
  const open = '<script type="application/ld+json">'
  const start = html.indexOf(open)
  expect(start).toBeGreaterThan(-1)
  const from = start + open.length
  const end = html.toLowerCase().indexOf('</script', from)
  return JSON.parse(html.slice(from, end))
}

describe('escaping', () => {
  it('escapeHtml covers the five characters and tolerates non-strings', () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe('&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;')
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
    expect(escapeHtml(12)).toBe('12')
  })

  it('escapeXml escapes markup and drops characters XML cannot carry', () => {
    expect(escapeXml(`a&b<c>"d"'e'`)).toBe('a&amp;b&lt;c&gt;&quot;d&quot;&apos;e&apos;')
    expect(escapeXml('a\u0000b\u0008c\uFFFEd')).toBe('abcd')
    expect(escapeXml('日本語 😀')).toBe('日本語 😀')
  })

  it('serializeJsonLd cannot close the script element or open a comment', () => {
    const data = { a: '</script><script>alert(1)</script>', b: '<!-- x -->', c: 'x\u2028y\u2029z', d: 'a & b', e: ']]>' }
    const out = serializeJsonLd(data)
    expect(out).not.toMatch(/[<>&]/)
    expect(out).not.toMatch(/[\u2028\u2029]/)
    expect(out.toLowerCase()).not.toContain('</script')
    expect(out).not.toContain('<!--')
    expect(JSON.parse(out)).toEqual(data)
  })

  it('cleanText and truncate', () => {
    expect(cleanText('  a\n\tb \u2028 c\u0000d  ')).toBe('a b c d')
    expect(truncate('abcdef', 4)).toBe('abc…')
    expect(truncate('abc', 4)).toBe('abc')
    // counts code points, never splits a surrogate pair
    expect(truncate('😀😀😀😀', 3)).toBe('😀😀…')
  })
})

describe('language, origin, paths', () => {
  it('seoLang', () => {
    expect(seoLang('jp')).toBe('jp')
    expect(seoLang('ja')).toBe('jp')
    expect(seoLang('en')).toBe('en')
    expect(seoLang(undefined)).toBe('en')
    expect(seoLang(['jp', 'en'])).toBe('en')
  })

  it('resolveOrigin prefers PUBLIC_URL', () => {
    expect(resolveOrigin({ publicUrl: 'https://gai.example/', protocol: 'http', host: 'other.test' })).toBe('https://gai.example')
    expect(resolveOrigin({ publicUrl: ' https://gai.example:8443 ', host: 'x' })).toBe('https://gai.example:8443')
  })

  it('resolveOrigin falls back to protocol + host, and ignores a bad PUBLIC_URL', () => {
    expect(resolveOrigin({ protocol: 'https', host: 'Gai.Example' })).toBe('https://gai.example')
    expect(resolveOrigin({ protocol: 'http', host: '127.0.0.1:8090' })).toBe('http://127.0.0.1:8090')
    expect(resolveOrigin({ protocol: 'ftp', host: 'gai.example' })).toBe('http://gai.example')
    expect(resolveOrigin({ publicUrl: 'javascript:alert(1)', protocol: 'https', host: 'gai.example' })).toBe('https://gai.example')
    expect(resolveOrigin({ publicUrl: 'https://gai.example/path', protocol: 'https', host: 'gai.example' })).toBe('https://gai.example')
  })

  it('resolveOrigin refuses a Host header that is not a host name', () => {
    for (const host of ['', undefined, 'a b', 'evil.test/"><script>', 'a@b', 'x<y', '"quoted"', '-bad.test', 'a..b']) {
      expect(resolveOrigin({ protocol: 'https', host })).toBe('')
    }
  })

  it('barPath percent-encodes Japanese and reserved characters', () => {
    expect(barPath('bar-tomorrow')).toBe('/bar/bar-tomorrow')
    expect(barPath('ガルシア')).toBe('/bar/%E3%82%AC%E3%83%AB%E3%82%B7%E3%82%A2')
    expect(barPath('a/b?c#d"e')).toBe('/bar/a%2Fb%3Fc%23d%22e')
    expect(decodeURIComponent(barPath('ガルシア').slice(5))).toBe('ガルシア')
  })

  it('photoPath', () => {
    expect(photoPath('bars/17/abc.png')).toBe('/uploads/bars/17/abc.png')
    expect(photoPath('bars/1/a b.png')).toBe('/uploads/bars/1/a%20b.png')
    for (const bad of ['', null, '../etc/passwd', 'bars/../../x', '/abs.png', 'a//b.png', 'a\\b.png', './x.png']) {
      expect(photoPath(bad)).toBeNull()
    }
  })
})

describe('bar text', () => {
  it('barName picks by language with fallback', () => {
    expect(barName({ name_en: 'Tomorrow', name_jp: 'トゥモロー' }, 'en')).toBe('Tomorrow')
    expect(barName({ name_en: 'Tomorrow', name_jp: 'トゥモロー' }, 'jp')).toBe('トゥモロー')
    expect(barName({ name_en: '', name_jp: 'トゥモロー' }, 'en')).toBe('トゥモロー')
    expect(barName({ name_en: 'Tomorrow', name_jp: null }, 'jp')).toBe('Tomorrow')
    expect(barName({}, 'en')).toBe('Golden Gai Map')
  })

  it('streetLabel', () => {
    expect(streetLabel('hanazono-3', 'en')).toBe('Hanazono 3')
    expect(streetLabel('hanazono-3', 'jp')).toBe('花園三番街')
    expect(streetLabel('maneki-dori', 'jp')).toBe('まねき通り')
    expect(streetLabel('g2-dori', 'en')).toBe('G2 Dori')
    expect(streetLabel(null)).toBe('')
  })

  it('fallbackDescription in English', () => {
    expect(fallbackDescription(BAR, 'en')).toBe('Charge ¥1,250 · 8 seats · Hanazono 1 · Golden Gai, Shinjuku')
    expect(fallbackDescription({ ...BAR, floor: 2, seats: 1, charge: '0' }, 'en'))
      .toBe('No cover charge · 1 seat · Hanazono 1, 2F · Golden Gai, Shinjuku')
  })

  it('fallbackDescription in Japanese', () => {
    expect(fallbackDescription({ ...BAR, floor: 2 }, 'jp')).toBe('チャージ ¥1,250 · 8席 · 花園一番街 2階 · 新宿ゴールデン街')
  })

  it('fallbackDescription leaves out what is unknown', () => {
    expect(fallbackDescription({}, 'en')).toBe('Golden Gai, Shinjuku')
    expect(fallbackDescription({ charge: '', seats: null, street: null, floor: 1 }, 'en')).toBe('Golden Gai, Shinjuku')
    expect(fallbackDescription({ charge: '¥500–¥1000', seats: 0 }, 'en')).toBe('Charge ¥500–¥1000 · Golden Gai, Shinjuku')
    expect(fallbackDescription({ charge: 'x'.repeat(60) }, 'en')).toBe('Golden Gai, Shinjuku')
  })

  it('barDescription prefers the bar\'s own text, on one line, truncated', () => {
    expect(barDescription({ ...BAR, description: ' Jazz bar.\nVinyl only. ' }, 'en')).toBe('Jazz bar. Vinyl only.')
    const long = barDescription({ ...BAR, description: 'a'.repeat(500) }, 'en')
    expect(Array.from(long)).toHaveLength(200)
    expect(long.endsWith('…')).toBe(true)
    expect(barDescription(BAR, 'en')).toBe(fallbackDescription(BAR, 'en'))
  })
})

describe('openingHoursSpecification', () => {
  const day = (name) => `https://schema.org/${name}`

  it('groups days with the same hours and skips closed days', () => {
    expect(openingHoursSpecification(BAR.schedule)).toEqual([{
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day),
      opens: '19:00',
      closes: '03:00',
    }])
  })

  it('keeps hours past midnight as closes < opens', () => {
    const [spec] = openingHoursSpecification({ default: { open: '20:00', close: '05:00' } })
    expect(spec.opens).toBe('20:00')
    expect(spec.closes).toBe('05:00')
    expect(spec.dayOfWeek).toHaveLength(7)
  })

  it('applies per-day overrides', () => {
    const specs = openingHoursSpecification({
      default: { open: '18:00', close: '02:00' },
      overrides: { fri: { open: '18:00', close: '05:00' }, sat: { open: '18:00', close: '05:00' } },
      closedDays: ['mon'],
    })
    expect(specs).toEqual([
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Tuesday', 'Wednesday', 'Thursday', 'Sunday'].map(day), opens: '18:00', closes: '02:00' },
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Friday', 'Saturday'].map(day), opens: '18:00', closes: '05:00' },
    ])
  })

  it('treats open === close as the whole day', () => {
    const [spec] = openingHoursSpecification({ default: { open: '12:00', close: '12:00' } })
    expect([spec.opens, spec.closes]).toEqual(['00:00', '23:59'])
  })

  it('normalises times and leaves out malformed days', () => {
    expect(openingHoursSpecification({ default: { open: '9:00', close: '24:00' } })[0]).toMatchObject({ opens: '09:00', closes: '00:00' })
    expect(openingHoursSpecification({ default: { open: '25:00', close: '03:00' } })).toEqual([])
    expect(openingHoursSpecification({ default: { open: '19:00' } })).toEqual([])
    const specs = openingHoursSpecification({ default: { open: 'late', close: '03:00' }, overrides: { fri: { open: '19:00', close: '03:00' } } })
    expect(specs).toEqual([{ '@type': 'OpeningHoursSpecification', dayOfWeek: [day('Friday')], opens: '19:00', closes: '03:00' }])
  })

  it('returns [] for an unknown schedule', () => {
    for (const s of [null, undefined, {}, [], 'x', { closedDays: ['mon'] }, { default: null }]) {
      expect(openingHoursSpecification(s)).toEqual([])
    }
  })

  it('every day closed', () => {
    expect(openingHoursSpecification({ default: { open: '19:00', close: '03:00' }, closedDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] })).toEqual([])
  })
})

describe('buildBarJsonLd', () => {
  it('has the expected fields', () => {
    const data = buildBarJsonLd(BAR, { url: `${ORIGIN}/bar/bar-tomorrow`, image: `${ORIGIN}/og/default.png` })
    expect(data).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'BarOrPub',
      name: 'BAR tomorrow',
      url: `${ORIGIN}/bar/bar-tomorrow`,
      image: `${ORIGIN}/og/default.png`,
      address: { '@type': 'PostalAddress', streetAddress: BAR.address, addressLocality: 'Shinjuku', addressRegion: 'Tokyo', addressCountry: 'JP' },
      geo: { '@type': 'GeoCoordinates', latitude: 35.6941, longitude: 139.7046 },
    })
    expect(data.openingHoursSpecification).toHaveLength(1)
    expect(data).not.toHaveProperty('alternateName')
    expect(data).not.toHaveProperty('description')
    expect(data).not.toHaveProperty('telephone')
  })

  it('omits geo, hours and street address when unknown', () => {
    const data = buildBarJsonLd({ slug: 'x', name_jp: 'X', lat: null, lng: null, schedule: {}, address: '' }, { url: 'u' })
    expect(data).not.toHaveProperty('geo')
    expect(data).not.toHaveProperty('openingHoursSpecification')
    expect(data.address).not.toHaveProperty('streetAddress')
    expect(buildBarJsonLd({ name_jp: 'X', lat: 'abc', lng: 139 }, {})).not.toHaveProperty('geo')
    expect(buildBarJsonLd({ name_jp: 'X', lat: 0, lng: 0 }, {}).geo).toEqual({ '@type': 'GeoCoordinates', latitude: 0, longitude: 0 })
  })

  it('names follow the language', () => {
    const bar = { ...BAR, name_en: 'Tomorrow', name_jp: 'トゥモロー' }
    expect(buildBarJsonLd(bar, { lang: 'en' })).toMatchObject({ name: 'Tomorrow', alternateName: 'トゥモロー' })
    expect(buildBarJsonLd(bar, { lang: 'jp' })).toMatchObject({ name: 'トゥモロー', alternateName: 'Tomorrow' })
  })
})

describe('buildHead + injectHead', () => {
  it('the template fixture is the SPA shell', () => {
    expect(isSpaTemplate(TEMPLATE)).toBe(true)
    expect(isSpaTemplate('<html><head></head><body>nginx error</body></html>')).toBe(false)
    expect(isSpaTemplate(null)).toBe(false)
  })

  it('puts bar-specific tags in <head> and leaves the rest of the shell alone', () => {
    const html = renderPage(TEMPLATE, { kind: 'bar', bar: BAR, origin: ORIGIN, lang: 'en' })
    expect(html).toContain('<html lang="en">')
    expect(html).toContain('<title>BAR tomorrow — Golden Gai Map</title>')
    expect(html).toContain('<meta name="description" content="Charge ¥1,250 · 8 seats · Hanazono 1 · Golden Gai, Shinjuku" />')
    expect(html).toContain('<meta property="og:title" content="BAR tomorrow — Golden Gai Map" />')
    expect(html).toContain(`<meta property="og:url" content="${ORIGIN}/bar/bar-tomorrow" />`)
    expect(html).toContain(`<meta property="og:image" content="${ORIGIN}${DEFAULT_OG_IMAGE.path}" />`)
    expect(html).toContain('<meta property="og:image:width" content="1200" />')
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />')
    expect(html).toContain(`<link rel="canonical" href="${ORIGIN}/bar/bar-tomorrow" />`)
    expect(html).toContain(`<link rel="alternate" hreflang="en" href="${ORIGIN}/bar/bar-tomorrow" />`)
    expect(html).toContain(`<link rel="alternate" hreflang="ja" href="${ORIGIN}/bar/bar-tomorrow?lang=jp" />`)
    expect(html).toContain(`<link rel="alternate" hreflang="x-default" href="${ORIGIN}/bar/bar-tomorrow" />`)
    expect(html).not.toContain('noindex')
    // untouched shell
    expect(html).toContain('<div id="app"></div>')
    expect(html).toContain('<script type="module" crossorigin src="/assets/index-AbC123.js"></script>')
    expect(html).toContain('<link rel="stylesheet" crossorigin href="/assets/index-XyZ789.css">')
    expect(html).toContain('<link rel="icon" href="/favicon.ico" type="image/x-icon" />')
    expect(html).toContain('<meta name="theme-color"')
    expect(html).toContain('<meta charset="UTF-8" />')
    expect(html.indexOf('<title>')).toBeLessThan(html.indexOf('</head>'))
    expect(jsonLdOf(html)).toMatchObject({ '@type': 'BarOrPub', name: 'BAR tomorrow', url: `${ORIGIN}/bar/bar-tomorrow` })
  })

  it('replaces the defaults instead of duplicating them', () => {
    for (const page of [
      { kind: 'bar', bar: BAR },
      { kind: 'bar', bar: HOSTILE, lang: 'jp' },
      { kind: 'home' },
      { kind: 'map', lang: 'jp' },
      { kind: 'directory' },
      { kind: 'notFound' },
    ]) {
      const html = renderPage(TEMPLATE, { origin: ORIGIN, ...page })
      expect(count(html, /<title[\s>]/gi)).toBe(1)
      expect(count(html, /<meta name="description"/gi)).toBe(1)
      expect(count(html, /property="og:title"/gi)).toBe(1)
      expect(count(html, /property="og:description"/gi)).toBe(1)
      expect(count(html, /property="og:image"/gi)).toBe(1)
      expect(count(html, /property="og:type"/gi)).toBe(1)
      expect(count(html, /property="og:site_name"/gi)).toBe(1)
      expect(count(html, /name="twitter:card"/gi)).toBe(1)
      expect(count(html, /rel="canonical"/gi)).toBe(page.kind === 'notFound' ? 0 : 1)
      expect(count(html, /property="og:url"/gi)).toBe(page.kind === 'notFound' ? 0 : 1)
      expect(count(html, /<html[\s>]/gi)).toBe(1)
      expect(count(html, /<\/head>/gi)).toBe(1)
      expect(count(html, /name="theme-color"/gi)).toBe(1)
    }
  })

  it('is idempotent: injecting into an already injected page does not pile up tags', () => {
    const once = renderPage(TEMPLATE, { kind: 'bar', bar: BAR, origin: ORIGIN })
    const twice = renderPage(once, { kind: 'bar', bar: { ...BAR, name_jp: 'Other' }, origin: ORIGIN, lang: 'jp' })
    expect(count(twice, /property="og:title"/gi)).toBe(1)
    expect(count(twice, /application\/ld\+json/gi)).toBe(1)
    expect(count(twice, /hreflang=/gi)).toBe(3)
    expect(twice).toContain('<title>Other — Golden Gai Map</title>')
    expect(twice).toContain('<html lang="ja">')
  })

  it('Japanese page: name, description, <html lang="ja">, self-canonical, locale', () => {
    const bar = { ...BAR, name_en: 'Tomorrow', name_jp: 'トゥモロー', floor: 2 }
    const html = renderPage(TEMPLATE, { kind: 'bar', bar, origin: ORIGIN, lang: 'jp' })
    expect(html).toContain('<html lang="ja">')
    expect(html).not.toContain('lang="jp"')
    expect(html).toContain('<title>トゥモロー — Golden Gai Map</title>')
    expect(html).toContain('content="チャージ ¥1,250 · 8席 · 花園一番街 2階 · 新宿ゴールデン街"')
    expect(html).toContain(`<link rel="canonical" href="${ORIGIN}/bar/bar-tomorrow?lang=jp" />`)
    expect(html).toContain(`<meta property="og:url" content="${ORIGIN}/bar/bar-tomorrow?lang=jp" />`)
    expect(html).toContain('<meta property="og:locale" content="ja_JP" />')
    expect(html).toContain('<meta property="og:locale:alternate" content="en_US" />')
    expect(html).toContain(`hreflang="en" href="${ORIGIN}/bar/bar-tomorrow"`)
    expect(html).toContain(`hreflang="ja" href="${ORIGIN}/bar/bar-tomorrow?lang=jp"`)
    expect(html).toContain(`hreflang="x-default" href="${ORIGIN}/bar/bar-tomorrow"`)
    expect(jsonLdOf(html)).toMatchObject({ name: 'トゥモロー', alternateName: 'Tomorrow', url: `${ORIGIN}/bar/bar-tomorrow?lang=jp` })
  })

  it('Japanese slug: percent-encoded in every URL', () => {
    const html = renderPage(TEMPLATE, { kind: 'bar', bar: { ...BAR, slug: 'ガルシア', name_jp: 'ガルシア' }, origin: ORIGIN })
    const enc = '%E3%82%AC%E3%83%AB%E3%82%B7%E3%82%A2'
    expect(html).toContain(`<link rel="canonical" href="${ORIGIN}/bar/${enc}" />`)
    expect(html).toContain(`<meta property="og:url" content="${ORIGIN}/bar/${enc}" />`)
    expect(html).toContain(`hreflang="ja" href="${ORIGIN}/bar/${enc}?lang=jp"`)
    expect(html).not.toContain('/bar/ガルシア')
    expect(jsonLdOf(html).url).toBe(`${ORIGIN}/bar/${enc}`)
  })

  it('uses the bar photo as og:image when there is one', () => {
    const html = renderPage(TEMPLATE, { kind: 'bar', bar: BAR, origin: ORIGIN, photo: '/uploads/bars/7/abc.png' })
    expect(html).toContain(`<meta property="og:image" content="${ORIGIN}/uploads/bars/7/abc.png" />`)
    expect(html).toContain(`<meta name="twitter:image" content="${ORIGIN}/uploads/bars/7/abc.png" />`)
    // size is only known for the default card
    expect(html).not.toContain('og:image:width')
    expect(jsonLdOf(html).image).toBe(`${ORIGIN}/uploads/bars/7/abc.png`)
  })

  it('hostile bar data cannot break out of attributes, the title or the JSON-LD block', () => {
    for (const lang of ['en', 'jp']) {
      const html = renderPage(TEMPLATE, { kind: 'bar', bar: HOSTILE, origin: ORIGIN, lang })
      const head = html.slice(0, html.indexOf('</head>'))

      // The only script elements are the JSON-LD block and the build's module script
      expect(count(html, /<script/gi)).toBe(2)
      expect(count(html, /<\/script/gi)).toBe(2)
      expect(html).not.toContain('<img')
      expect(html).not.toContain('<!-- \'')
      expect(count(html, /<!--/g)).toBe(count(TEMPLATE, /<!--/g))
      expect(html).not.toMatch(/[\u2028\u2029]/)
      expect(count(head, /<title>/gi)).toBe(1)
      expect(count(head, /<\/title>/gi)).toBe(1)

      // Every meta/link the injection wrote is a single well-formed tag whose
      // attribute values contain no raw quote or angle bracket
      const injected = head.split('\n').filter(l => /^\s*<(meta|link) /.test(l) && !l.includes('crossorigin'))
      expect(injected.length).toBeGreaterThan(15)
      for (const line of injected) {
        expect(line.trim()).toMatch(/^<(?:meta|link)(?: [a-z:-]+="[^"<>]*")+ ?\/?>$/)
      }

      const data = jsonLdOf(html)
      expect(data['@type']).toBe('BarOrPub')
      expect(data.name).toBe(lang === 'jp' ? HOSTILE.name_jp : cleanText(HOSTILE.name_en))
      expect(data.address.streetAddress).toBe(HOSTILE.address)
      expect(data.telephone).toBe('<!--')
      expect(data.description).toContain('</script><script>alert(3)</script>')
      expect(data.url).toContain('/bar/evil%22%3E%3Cbar')
    }
  })

  it('a replacement pattern in the data is not interpreted', () => {
    const html = renderPage(TEMPLATE, { kind: 'bar', bar: { ...BAR, name_jp: "$& $1 $` $' $$" }, origin: ORIGIN })
    expect(html).toContain('<title>$&amp; $1 $` $&#39; $$ — Golden Gai Map</title>')
  })

  it('not found: noindex and the marker the SPA reads, no canonical', () => {
    const html = renderPage(TEMPLATE, { kind: 'notFound', origin: ORIGIN })
    expect(html).toContain('<meta name="robots" content="noindex" />')
    expect(html).toContain(`<meta name="${STATUS_META_NAME}" content="not-found" />`)
    expect(html).toContain('<title>Bar not found — Golden Gai Map</title>')
    expect(html).not.toContain('rel="canonical"')
    expect(html).not.toContain('hreflang=')
    expect(html).not.toContain('application/ld+json')
    expect(html).toContain('<div id="app"></div>')
    expect(html).toContain('/assets/index-AbC123.js')
  })

  it('noindex flag (inactive bar shown to an admin)', () => {
    const html = renderPage(TEMPLATE, { kind: 'bar', bar: BAR, origin: ORIGIN, noindex: true })
    expect(html).toContain('<meta name="robots" content="noindex" />')
    expect(html).not.toContain(STATUS_META_NAME)
  })

  it('entry pages get absolute defaults', () => {
    const home = renderPage(TEMPLATE, { kind: 'home', origin: ORIGIN })
    expect(home).toContain(`<link rel="canonical" href="${ORIGIN}/" />`)
    expect(home).toContain(`<meta property="og:image" content="${ORIGIN}/og/default.png" />`)
    expect(home).toContain(`hreflang="ja" href="${ORIGIN}/?lang=jp"`)
    expect(jsonLdOf(home)).toMatchObject({ '@type': 'WebSite', url: `${ORIGIN}/` })
    const map = renderPage(TEMPLATE, { kind: 'map', origin: ORIGIN, lang: 'jp' })
    expect(map).toContain(`<link rel="canonical" href="${ORIGIN}/map?lang=jp" />`)
    expect(map).toContain('<html lang="ja">')
    expect(renderPage(TEMPLATE, { kind: 'directory', origin: ORIGIN })).toContain(`<link rel="canonical" href="${ORIGIN}/directory" />`)
  })

  it('without an origin the URLs stay path-only', () => {
    const html = renderPage(TEMPLATE, { kind: 'bar', bar: BAR, origin: '' })
    expect(html).toContain('<link rel="canonical" href="/bar/bar-tomorrow" />')
  })

  it('falls back to </head> when the template has no <title>', () => {
    const html = injectHead('<html><head>\n<meta charset="UTF-8">\n</head><body><div id="app"></div></body></html>', buildHead({ kind: 'home', origin: ORIGIN }))
    expect(html).toContain('<html lang="en">')
    expect(html.indexOf('<title>')).toBeGreaterThan(-1)
    expect(html.indexOf('<title>')).toBeLessThan(html.indexOf('</head>'))
  })

  it('the default tags in index.html match what the API serves for /', () => {
    const { title } = buildHead({ kind: 'home' })
    expect(SOURCE_TEMPLATE).toContain(`<title>${title}</title>`)
    expect(SOURCE_TEMPLATE).toContain(`<meta property="og:title" content="${title}" />`)
    expect(SOURCE_TEMPLATE).toContain(`<meta property="og:image" content="${DEFAULT_OG_IMAGE.path}" />`)
  })
})

describe('sitemap.xml and robots.txt', () => {
  const bars = [
    { slug: 'bar-tomorrow', updated_at: new Date('2026-03-04T05:06:07Z') },
    { slug: 'ガルシア', updated_at: '2026-01-02T03:04:05.000Z' },
    { slug: `a&b<c>"d'`, updated_at: 'not a date' },
    { slug: '' },
    null,
  ]

  it('lists the entry pages and every bar, encoded and escaped', () => {
    const xml = buildSitemapXml(ORIGIN, bars)
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')).toBe(true)
    const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map(m => m[1])
    expect(locs).toEqual([
      `${ORIGIN}/`,
      `${ORIGIN}/map`,
      `${ORIGIN}/directory`,
      `${ORIGIN}/bar/bar-tomorrow`,
      `${ORIGIN}/bar/%E3%82%AC%E3%83%AB%E3%82%B7%E3%82%A2`,
      `${ORIGIN}/bar/a%26b%3Cc%3E%22d&apos;`,
    ])
    expect([...xml.matchAll(/<lastmod>([^<]*)<\/lastmod>/g)].map(m => m[1])).toEqual(['2026-03-04', '2026-01-02'])
    expect(count(xml, /<url>/g)).toBe(count(xml, /<\/url>/g))
    // no raw markup characters outside the tags we wrote
    expect(xml.replace(/<\/?(?:urlset|url|loc|lastmod)[^>]*>|<\?xml[^>]*\?>/g, '')).not.toMatch(/[<>"]/)
  })

  it('escapes the origin too', () => {
    expect(buildSitemapXml('https://a.test/?x=1&y=2', [])).toContain('<loc>https://a.test/?x=1&amp;y=2/</loc>')
  })

  it('robots.txt points at the sitemap and keeps crawlers out of the API', () => {
    const txt = buildRobotsTxt(ORIGIN)
    expect(txt).toContain('User-agent: *')
    expect(txt).toContain('Disallow: /api/')
    expect(txt).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`)
    expect(buildRobotsTxt('')).not.toContain('Sitemap:')
  })
})

describe('createTemplateCache', () => {
  const page = (n) => `<html><head><title>${n}</title></head><body><div id="app"></div></body></html>`

  it('caches for the TTL, then reloads', async () => {
    let t = 0
    const load = vi.fn(async () => page(load.mock.calls.length))
    const cache = createTemplateCache({ load, ttlMs: 1000, now: () => t })
    expect(await cache.get()).toBe(page(1))
    t = 999
    expect(await cache.get()).toBe(page(1))
    expect(load).toHaveBeenCalledTimes(1)
    t = 1000
    expect(await cache.get()).toBe(page(2))
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('keeps serving the last good copy when a reload fails, and retries later', async () => {
    let t = 0
    let fail = false
    const errors = []
    const load = vi.fn(async () => { if (fail) throw new Error('down'); return page('ok') })
    const cache = createTemplateCache({ load, ttlMs: 1000, retryMs: 100, now: () => t, onError: e => errors.push(e.message) })
    await cache.get()
    fail = true
    t = 2000
    expect(await cache.get()).toBe(page('ok'))
    expect(errors).toEqual(['down'])
    t = 2050 // inside the retry delay: no new attempt
    expect(await cache.get()).toBe(page('ok'))
    expect(load).toHaveBeenCalledTimes(2)
    t = 2100
    fail = false
    expect(await cache.get()).toBe(page('ok'))
    expect(load).toHaveBeenCalledTimes(3)
  })

  it('rejects when there has never been a good copy, without hammering the source', async () => {
    let t = 0
    const load = vi.fn(async () => { throw new Error('down') })
    const cache = createTemplateCache({ load, retryMs: 100, now: () => t })
    await expect(cache.get()).rejects.toThrow('down')
    await expect(cache.get()).rejects.toThrow('unavailable')
    expect(load).toHaveBeenCalledTimes(1)
    t = 100
    await expect(cache.get()).rejects.toThrow('down')
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('refuses a response that is not the SPA shell', async () => {
    let body = page('good')
    let t = 0
    const cache = createTemplateCache({ load: async () => body, ttlMs: 10, retryMs: 10, now: () => t })
    expect(await cache.get()).toBe(page('good'))
    body = '<html><body>502 Bad Gateway</body></html>'
    t = 20
    expect(await cache.get()).toBe(page('good'))
  })

  it('shares one load between concurrent callers', async () => {
    const load = vi.fn(() => new Promise(r => setTimeout(() => r(page('x')), 5)))
    const cache = createTemplateCache({ load })
    const results = await Promise.all([cache.get(), cache.get(), cache.get()])
    expect(results).toEqual([page('x'), page('x'), page('x')])
    expect(load).toHaveBeenCalledTimes(1)
  })
})

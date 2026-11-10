import { describe, it, expect } from 'vitest'
import {
  parseUrl, buildUrl, navigationKind, barShareUrl, resolveLang, langFromBrowser,
  emptyFilters, barTitle, pageTitle, htmlLang,
} from '../src/composables/useUrlState.js'
import { buildHead } from '../server/lib/seo.js'

const route = (over = {}) => ({ view: 'desktop', slug: null, lang: null, filters: emptyFilters(), ...over })

describe('parseUrl', () => {
  it('maps the three views', () => {
    expect(parseUrl('/')).toEqual(route())
    expect(parseUrl('/map')).toEqual(route({ view: 'map' }))
    expect(parseUrl('/directory')).toEqual(route({ view: 'directory' }))
    expect(parseUrl('/map/')).toEqual(route({ view: 'map' }))
  })

  it('treats anything unknown as the desktop', () => {
    expect(parseUrl('/nope').view).toBe('desktop')
    expect(parseUrl('/map/extra').view).toBe('desktop')
    expect(parseUrl('/bar/a/b').view).toBe('desktop')
    expect(parseUrl('').view).toBe('desktop')
  })

  it('reads a bar slug, on the map view', () => {
    expect(parseUrl('/bar/bar-tomorrow')).toEqual(route({ view: 'map', slug: 'bar-tomorrow' }))
    expect(parseUrl('/bar/bar-tomorrow/').slug).toBe('bar-tomorrow')
  })

  it('decodes a Japanese slug as the browser reports it', () => {
    const pathname = new URL('http://x/bar/ガルシア').pathname
    expect(pathname).toBe('/bar/%E3%82%AC%E3%83%AB%E3%82%B7%E3%82%A2')
    expect(parseUrl(pathname).slug).toBe('ガルシア')
    // An unencoded path (some servers / tests hand it over raw) works too
    expect(parseUrl('/bar/ガルシア').slug).toBe('ガルシア')
  })

  it('decodes reserved characters inside a slug', () => {
    expect(parseUrl('/bar/a%2Fb%20c%3F').slug).toBe('a/b c?')
  })

  it('falls back to the map for an empty or malformed slug', () => {
    expect(parseUrl('/bar')).toEqual(route({ view: 'map' }))
    expect(parseUrl('/bar/')).toEqual(route({ view: 'map' }))
    expect(parseUrl('/bar/%E3%82')).toEqual(route({ view: 'map' }))
  })

  it('reads ?lang, accepting ja as jp and ignoring junk', () => {
    expect(parseUrl('/', '?lang=jp').lang).toBe('jp')
    expect(parseUrl('/map', '?lang=en').lang).toBe('en')
    expect(parseUrl('/map', '?lang=ja').lang).toBe('jp')
    expect(parseUrl('/map', '?lang=fr').lang).toBe(null)
  })

  it('accepts and drops parameters it does not own, such as ?ref=sticker (G05)', () => {
    const parsed = parseUrl('/bar/%E6%84%9B%E9%B7%B9', '?ref=sticker')
    expect(parsed).toEqual(route({ view: 'map', slug: '愛鷹' }))
    // What the address bar is rewritten to, and what the share link is built from
    expect(buildUrl(parsed)).toBe('/bar/%E6%84%9B%E9%B7%B9')
    expect(buildUrl(parseUrl('/bar/bar-tomorrow', '?ref=sticker&lang=jp'))).toBe('/bar/bar-tomorrow?lang=jp')
    expect(buildUrl(parseUrl('/map', '?ref=sticker&open=1'))).toBe('/map?open=1')
  })

  it('reads the map filters', () => {
    expect(parseUrl('/map', '?tags=karaoke,english-ok&mode=and&open=1&floor=2').filters).toEqual({
      ...emptyFilters(), tags: ['karaoke', 'english-ok'], mode: 'and', open: true, floor: 2,
    })
    expect(parseUrl('/map', '?cmin=0&cmax=1000&dmin=500&dmax=900').filters).toEqual({
      ...emptyFilters(), chargeMin: 0, chargeMax: 1000, drinkMin: 500, drinkMax: 900,
    })
    expect(parseUrl('/bar/x', '?tags=karaoke').filters.tags).toEqual(['karaoke'])
    expect(parseUrl('/map', '?floor=-1').filters.floor).toBe(-1)
  })

  it('drops invalid filter values and duplicates', () => {
    const f = parseUrl('/map', '?tags=a,,a,%20b&mode=xor&open=yes&floor=abc&cmin=-5&cmax=1e9').filters
    expect(f).toEqual({ ...emptyFilters(), tags: ['a', 'b'] })
    expect(parseUrl('/map', '?floor=0').filters.floor).toBe(null)
  })

  it('ignores filters outside the map', () => {
    expect(parseUrl('/directory', '?tags=karaoke&open=1').filters).toEqual(emptyFilters())
    expect(parseUrl('/', '?floor=2').filters).toEqual(emptyFilters())
  })
})

describe('buildUrl', () => {
  it('serialises views and bars', () => {
    expect(buildUrl(route())).toBe('/')
    expect(buildUrl(route({ view: 'map' }))).toBe('/map')
    expect(buildUrl(route({ view: 'directory' }))).toBe('/directory')
    expect(buildUrl(route({ view: 'map', slug: 'bar-tomorrow' }))).toBe('/bar/bar-tomorrow')
  })

  it('percent-encodes a Japanese slug exactly as the browser does', () => {
    const url = buildUrl(route({ view: 'map', slug: 'ガルシア' }))
    expect(url).toBe('/bar/%E3%82%AC%E3%83%AB%E3%82%B7%E3%82%A2')
    expect(new URL(url, 'http://x').pathname).toBe(url)
  })

  it('writes only the filters that are set, in a stable order', () => {
    const filters = { ...emptyFilters(), tags: ['karaoke', 'english-ok'], mode: 'and', open: true, floor: 2 }
    expect(buildUrl(route({ view: 'map', filters }))).toBe('/map?tags=karaoke,english-ok&mode=and&open=1&floor=2')
    expect(buildUrl(route({ view: 'map', lang: 'jp', filters: { ...emptyFilters(), chargeMax: 500 } })))
      .toBe('/map?lang=jp&cmax=500')
  })

  it('leaves filters out of non-map URLs', () => {
    const filters = { ...emptyFilters(), tags: ['karaoke'] }
    expect(buildUrl(route({ view: 'directory', filters }))).toBe('/directory')
    expect(buildUrl(route({ view: 'directory', slug: 'x', filters }))).toBe('/bar/x')
  })

  it('round-trips through parseUrl', () => {
    const routes = [
      route(),
      route({ lang: 'jp' }),
      route({ view: 'directory', lang: 'en' }),
      route({ view: 'map', slug: 'ガルシア', lang: 'jp' }),
      route({ view: 'map', slug: 'a/b c?&=#' }),
      route({ view: 'map', filters: { ...emptyFilters(), tags: ['a b', 'c&d'], mode: 'and', open: true, floor: -1, drinkMin: 0 } }),
    ]
    for (const r of routes) {
      const url = new URL(buildUrl(r), 'http://x')
      expect(parseUrl(url.pathname, url.search)).toEqual(r)
    }
  })
})

describe('navigationKind', () => {
  const map = route({ view: 'map' })
  it('is none when the URL would not change', () => {
    expect(navigationKind(map, route({ view: 'map' }))).toBe('none')
  })
  it('pushes for a view switch, opening, changing and closing a bar', () => {
    expect(navigationKind(route(), map)).toBe('push')
    expect(navigationKind(map, route({ view: 'map', slug: 'a' }))).toBe('push')
    expect(navigationKind(route({ view: 'map', slug: 'a' }), route({ view: 'map', slug: 'b' }))).toBe('push')
    expect(navigationKind(route({ view: 'map', slug: 'a' }), map)).toBe('push')
  })
  it('replaces for filters and language', () => {
    expect(navigationKind(map, route({ view: 'map', filters: { ...emptyFilters(), open: true } }))).toBe('replace')
    expect(navigationKind(map, route({ view: 'map', lang: 'jp' }))).toBe('replace')
  })
})

describe('barShareUrl', () => {
  it('is the canonical bar URL, with ?lang only when not the default', () => {
    expect(barShareUrl('https://gai.example', 'bar-tomorrow', 'en')).toBe('https://gai.example/bar/bar-tomorrow')
    expect(barShareUrl('https://gai.example/', 'bar-tomorrow', 'jp')).toBe('https://gai.example/bar/bar-tomorrow?lang=jp')
    expect(barShareUrl('https://gai.example', 'ナナ', null)).toBe('https://gai.example/bar/%E3%83%8A%E3%83%8A')
  })
})

describe('resolveLang', () => {
  it('prefers ?lang, then the saved language, then the browser', () => {
    expect(resolveLang({ urlLang: 'jp', savedLang: 'en', browserLang: 'en-US' })).toBe('jp')
    expect(resolveLang({ urlLang: null, savedLang: 'jp', browserLang: 'en-US' })).toBe('jp')
    expect(resolveLang({ urlLang: 'xx', savedLang: null, browserLang: 'ja-JP' })).toBe('jp')
    expect(resolveLang({ browserLang: 'fr-FR' })).toBe('en')
    expect(resolveLang()).toBe('en')
  })
  it('maps ja* to jp', () => {
    expect(langFromBrowser('ja')).toBe('jp')
    expect(langFromBrowser('JA-jp')).toBe('jp')
    expect(langFromBrowser('jam')).toBe('en')
    expect(langFromBrowser(undefined)).toBe('en')
  })
})

describe('barTitle', () => {
  it('follows the open bar and resets', () => {
    expect(barTitle('Bar Tomorrow')).toBe('Bar Tomorrow — Golden Gai Map')
    expect(barTitle(null)).toBe('Golden Gai Map')
  })
})

describe('pageTitle', () => {
  it('is the bar title while a bar is open, whatever the view', () => {
    expect(pageTitle({ view: 'map', barName: 'Bar Tomorrow', lang: 'en' })).toBe('Bar Tomorrow — Golden Gai Map')
    expect(pageTitle({ view: 'directory', barName: '明日', lang: 'jp' })).toBe('明日 — Golden Gai Map')
  })

  it('names the Map and Directory views exactly as the server does', () => {
    for (const lang of ['en', 'jp']) {
      expect(pageTitle({ view: 'map', lang })).toBe(buildHead({ kind: 'map', lang }).title)
      expect(pageTitle({ view: 'directory', lang })).toBe(buildHead({ kind: 'directory', lang }).title)
    }
    expect(pageTitle({ view: 'map', lang: 'en' })).toBe('Map — Golden Gai Map')
    expect(pageTitle({ view: 'directory', lang: 'jp' })).toBe('店舗一覧 — Golden Gai Map')
  })

  it('is the site title on the desktop and for anything unknown', () => {
    expect(pageTitle({ view: 'desktop', lang: 'en' })).toBe('Golden Gai Map')
    expect(pageTitle({ view: 'nope', lang: 'jp' })).toBe('Golden Gai Map')
    expect(pageTitle()).toBe('Golden Gai Map')
  })
})

describe('htmlLang', () => {
  it('maps the app code jp to the HTML code ja', () => {
    expect(htmlLang('jp')).toBe('ja')
    expect(htmlLang('en')).toBe('en')
    expect(htmlLang(null)).toBe('en')
  })
})

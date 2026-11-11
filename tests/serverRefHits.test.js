import { describe, it, expect, vi } from 'vitest'
import { COUNTED_REFS, normalizeRef, isBotUserAgent, countedRef, recordRefHit, refStats } from '../server/lib/refHits.js'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'

const req = (over = {}) => ({ method: 'GET', query: { ref: 'sticker' }, headers: { 'user-agent': IPHONE }, ...over })

describe('normalizeRef', () => {
  it('accepts only the whitelisted values', () => {
    expect(COUNTED_REFS).toEqual(['sticker'])
    expect(normalizeRef('sticker')).toBe('sticker')
    for (const bad of ['Sticker', 'sticker ', 'flyer', '', undefined, null, 1, ['sticker'], ['sticker', 'sticker'], { a: 'sticker' }]) {
      expect(normalizeRef(bad)).toBe(null)
    }
  })
})

describe('isBotUserAgent', () => {
  it('lets phone and desktop browsers through', () => {
    for (const ua of [
      IPHONE,
      ANDROID,
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Line/14.9.0',
      'Mozilla/5.0 (Linux; Android 9; CUBOT X19) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    ]) {
      expect(isBotUserAgent(ua), ua).toBe(false)
    }
  })

  it('flags link-preview fetchers, crawlers and scripts', () => {
    for (const ua of [
      'Twitterbot/1.0',
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
      'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
      'WhatsApp/2.23.20.0',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/126.0.0.0 Safari/537.36',
      'curl/8.5.0',
      'python-requests/2.32.0',
      'node',
      'okhttp/4.12.0',
      'Mozilla/5.0 (compatible; Google-InspectionTool/1.0; Lighthouse)',
      '',
      '   ',
      undefined,
    ]) {
      expect(isBotUserAgent(ua), String(ua)).toBe(true)
    }
  })
})

describe('countedRef', () => {
  it('counts a browser arriving with ?ref=sticker', () => {
    expect(countedRef(req())).toBe('sticker')
    expect(countedRef(req({ headers: { 'user-agent': ANDROID } }))).toBe('sticker')
  })

  it('ignores everything else', () => {
    expect(countedRef(req({ query: {} }))).toBe(null)
    expect(countedRef(req({ query: { ref: 'flyer' } }))).toBe(null)
    expect(countedRef(req({ query: { ref: ['sticker', 'sticker'] } }))).toBe(null)
    expect(countedRef(req({ method: 'HEAD' }))).toBe(null)
    expect(countedRef(req({ headers: { 'user-agent': 'Twitterbot/1.0' } }))).toBe(null)
    expect(countedRef(req({ headers: {} }))).toBe(null)
    expect(countedRef(req({ headers: { 'user-agent': IPHONE, 'sec-purpose': 'prefetch;prerender' } }))).toBe(null)
    expect(countedRef(req({ headers: { 'user-agent': IPHONE, purpose: 'prefetch' } }))).toBe(null)
    expect(countedRef(null)).toBe(null)
  })
})

describe('database helpers', () => {
  it('recordRefHit upserts one row per (ref, bar, Tokyo day) and stores nothing about the visitor', async () => {
    const db = { query: vi.fn().mockResolvedValue({ rows: [] }) }
    await recordRefHit(db, 'sticker', 7)
    const [sql, params] = db.query.mock.calls[0]
    expect(params).toEqual(['sticker', 7])
    expect(sql).toMatch(/INSERT INTO ref_hits \(ref, bar_id, day, hits\)/)
    expect(sql).toMatch(/ON CONFLICT \(ref, bar_id, day\) DO UPDATE SET hits = ref_hits\.hits \+ 1/)
    expect(sql).toMatch(/Asia\/Tokyo/)
  })

  it('recordRefHit rejects on a database error (the route catches it)', async () => {
    const db = { query: vi.fn().mockRejectedValue(new Error('down')) }
    await expect(recordRefHit(db, 'sticker', 7)).rejects.toThrow('down')
  })

  it('refStats passes the ref and the window', async () => {
    const rows = [{ bar_id: 7, recent: 2, total: 5, last_day: '2026-01-02' }]
    const db = { query: vi.fn().mockResolvedValue({ rows }) }
    expect(await refStats(db, 'sticker', 30)).toBe(rows)
    expect(db.query.mock.calls[0][1]).toEqual(['sticker', 30])
  })
})

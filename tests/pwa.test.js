import { describe, it, expect } from 'vitest'
import { isAppNavigationPath, isPublicApiRequest, runtimeCacheFor, entryScriptOf, PUBLIC_API_PATHS } from '../src/utils/swRules.js'
import { recordVisit, shouldOfferInstall, isVisitState, VISIT_GAP_MS } from '../src/utils/installOffer.js'

const req = (path, headers = {}) => [new URL(path, 'https://example.test'), new Headers(headers)]

describe('service worker rules', () => {
  it('treats the app URLs as navigations to the shell', () => {
    for (const path of ['/', '/map', '/directory', '/bar/albatross', '/bar/%E3%83%90%E3%83%BC', '/bar/', '/nope', '/a/b']) {
      expect(isAppNavigationPath(path), path).toBe(true)
    }
    // a slug may contain a dot
    expect(isAppNavigationPath('/bar/bar.v2')).toBe(true)
  })

  it('leaves the API, sockets, files and SEO documents alone', () => {
    for (const path of [
      '/api/bars', '/api/admin/check', '/api', '/socket.io/', '/socket.io/?EIO=4&transport=polling',
      '/uploads/a.jpg', '/assets/index-abc.js', '/sitemap.xml', '/robots.txt', '/sw.js',
      '/manifest.webmanifest', '/og/default.png', '/favicon.ico', '/icons/gaios.ico',
    ]) {
      expect(isAppNavigationPath(path), path).toBe(false)
    }
  })

  it('caches only the public API lists, exactly', () => {
    for (const path of PUBLIC_API_PATHS) expect(isPublicApiRequest(...req(path)), path).toBe(true)
    for (const path of [
      '/api/admin/check', '/api/reviews/week', '/api/reviews/bar/3', '/api/feed', '/api/feed/account/x',
      '/api/suggestions', '/api/suggestions/count', '/api/stats', '/api/bars/albatross', '/api/bars/3/photos',
      '/api/bars?x=1', '/api/tags/', '/sitemap.xml', '/robots.txt', '/socket.io/',
    ]) {
      expect(isPublicApiRequest(...req(path)), path).toBe(false)
    }
  })

  it('never caches an admin-authenticated request', () => {
    expect(isPublicApiRequest(...req('/api/bars', { 'X-Admin-Password': 'secret' }))).toBe(false)
    expect(isPublicApiRequest(...req('/api/bars', { 'x-admin-password': '' }))).toBe(false)
    expect(isPublicApiRequest(...req('/api/tags', { Authorization: 'Bearer x' }))).toBe(false)
  })

  it('never caches the admin review endpoints (R09), with or without the header', () => {
    for (const path of [
      '/api/reviews/admin',
      '/api/reviews/admin?status=all&limit=50',
      '/api/reviews/admin?status=hidden&barId=3',
      '/api/reviews/admin?status=all&cursor=2026-01-01T00:00:00.000000Z_5',
      '/api/reviews/admin/12/drawing',
    ]) {
      expect(isPublicApiRequest(...req(path, { 'X-Admin-Password': 'secret' })), path).toBe(false)
      expect(isPublicApiRequest(...req(path)), path).toBe(false)
      expect(isAppNavigationPath(new URL(path, 'https://example.test').pathname), path).toBe(false)
      expect(runtimeCacheFor(new URL(path, 'https://example.test').pathname), path).toBeNull()
    }
  })

  it('finds the entry script of a shell', () => {
    const html = '<head><link rel="stylesheet" crossorigin href="/assets/index-abc.css"><script type="module" crossorigin src="/assets/index-C9N-jq_a.js"></script></head>'
    expect(entryScriptOf(html)).toBe('/assets/index-C9N-jq_a.js')
    expect(entryScriptOf('<script type="application/ld+json">{}</script>')).toBeNull()
    expect(entryScriptOf('<script src="https://platform.twitter.com/widgets.js"></script>')).toBeNull()
    expect(entryScriptOf('')).toBeNull()
  })

  it('picks the runtime cache by path', () => {
    expect(runtimeCacheFor('/uploads/1/a.webp')).toBe('uploads')
    expect(runtimeCacheFor('/gaichan/model/gaichan.glb')).toBe('art')
    expect(runtimeCacheFor('/assets/GaiChanStage-abc.js')).toBe('assets')
    expect(runtimeCacheFor('/api/reviews/week')).toBeNull()
    expect(runtimeCacheFor('/socket.io/')).toBeNull()
    expect(runtimeCacheFor('/og/default.png')).toBeNull()
  })
})

describe('install offer', () => {
  const T0 = 1_700_000_000_000

  it('counts a first load as visit one', () => {
    expect(recordVisit(null, T0)).toEqual({ count: 1, last: T0 })
    expect(recordVisit('garbage', T0)).toEqual({ count: 1, last: T0 })
  })

  it('does not count a reload or a quick return', () => {
    const first = recordVisit(null, T0)
    expect(recordVisit(first, T0 + 5000)).toBe(first)
    expect(recordVisit(first, T0 + VISIT_GAP_MS - 1)).toBe(first)
  })

  it('counts a later return, and survives a clock set back', () => {
    const first = recordVisit(null, T0)
    expect(recordVisit(first, T0 + VISIT_GAP_MS)).toEqual({ count: 2, last: T0 + VISIT_GAP_MS })
    expect(recordVisit(first, T0 - 1000)).toEqual({ count: 2, last: T0 - 1000 })
  })

  it('validates stored state', () => {
    expect(isVisitState({ count: 2, last: T0 })).toBe(true)
    expect(isVisitState({ count: -1, last: T0 })).toBe(false)
    expect(isVisitState({ count: 1 })).toBe(false)
    expect(isVisitState([1, 2])).toBe(false)
    expect(isVisitState(null)).toBe(false)
  })

  const ok = { visits: 2, offered: false, installMode: 'prompt', onboarding: false, deepLink: false, admin: false, busy: false }

  it('offers from the second visit where installing is possible', () => {
    expect(shouldOfferInstall(ok)).toBe(true)
    expect(shouldOfferInstall({ ...ok, visits: 7, installMode: 'ios' })).toBe(true)
  })

  it('never offers on the first visit', () => {
    expect(shouldOfferInstall({ ...ok, visits: 1 })).toBe(false)
    expect(shouldOfferInstall({ ...ok, visits: 0 })).toBe(false)
  })

  it('stays quiet when it would be in the way or pointless', () => {
    expect(shouldOfferInstall({ ...ok, offered: true })).toBe(false)
    expect(shouldOfferInstall({ ...ok, onboarding: true })).toBe(false)
    expect(shouldOfferInstall({ ...ok, deepLink: true })).toBe(false)
    expect(shouldOfferInstall({ ...ok, admin: true })).toBe(false)
    expect(shouldOfferInstall({ ...ok, busy: true })).toBe(false)
    expect(shouldOfferInstall({ ...ok, installMode: 'installed' })).toBe(false)
    expect(shouldOfferInstall({ ...ok, installMode: 'manual' })).toBe(false)
  })
})

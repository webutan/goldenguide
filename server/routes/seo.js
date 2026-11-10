// Link previews and SEO (G02). nginx proxies these paths here:
//
//   /bar/<slug>              the SPA's index.html with that bar's <title>,
//                            description, Open Graph / Twitter tags, canonical,
//                            hreflang and JSON-LD in <head>. Crawlers and link
//                            preview bots do not run JS; people get the normal app.
//                            `?ref=sticker` (a door sticker's QR code, G05) is
//                            counted per bar per day and changes nothing else:
//                            the canonical and og:url never carry it.
//   /, /map, /directory      the same shell with the site's default tags, made
//                            absolute (og:image and og:url must be absolute URLs)
//   /sitemap.xml, /robots.txt
//
// The shell is the built index.html, fetched from the web container
// (SPA_TEMPLATE_URL, default http://web/index.html) and cached; see
// createTemplateCache. If it cannot be had, the answer is 503 and nginx falls
// back to its own static index.html, so the app always loads.
import { Router } from 'express'
import { stat } from 'fs/promises'
import { resolve } from 'path'
import pool from '../db.js'
import { isAdminRequest } from '../middleware/admin.js'
import { seoLimiter } from '../middleware/rateLimits.js'
import { UPLOADS_DIR, isInsideUploads } from './photos.js'
import { countedRef, recordRefHit } from '../lib/refHits.js'
import {
  renderPage, resolveOrigin, seoLang, photoPath, buildSitemapXml, buildRobotsTxt, createTemplateCache,
} from '../lib/seo.js'

const TEMPLATE_URL = process.env.SPA_TEMPLATE_URL || 'http://web/index.html'
const TEMPLATE_TIMEOUT_MS = 3000

// Short on purpose: the shell names the current build's hashed assets, so a
// stale copy after a web deploy would point at files that no longer exist.
// The fetch is a tiny request to the neighbouring container.
const TEMPLATE_TTL_MS = 15 * 1000

const templates = createTemplateCache({
  ttlMs: TEMPLATE_TTL_MS,
  async load() {
    const res = await fetch(TEMPLATE_URL, { signal: AbortSignal.timeout(TEMPLATE_TIMEOUT_MS), redirect: 'error' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.text()
  },
  onError: (err) => console.warn(`[seo] could not load the SPA template from ${TEMPLATE_URL}: ${err.message}`),
})

const router = Router()

// PUBLIC_URL when set; otherwise what nginx forwarded (req.protocol follows
// X-Forwarded-Proto because of `trust proxy`).
function originOf(req) {
  return resolveOrigin({ publicUrl: process.env.PUBLIC_URL, protocol: req.protocol, host: req.headers.host })
}

async function sendPage(req, res, status, page) {
  let template
  try {
    template = await templates.get()
  } catch {
    // nginx turns this into its static index.html
    res.set('Cache-Control', 'no-store')
    return res.status(503).type('text/plain').send('SPA template unavailable')
  }
  const html = renderPage(template, { ...page, origin: originOf(req), lang: seoLang(req.query.lang) })
  // The shell names hashed assets of the current build: always revalidate.
  res.set('Cache-Control', 'no-cache')
  res.set('X-Content-Type-Options', 'nosniff')
  res.status(status).type('html').send(html)
}

// First photo of the bar that still exists on disk, as a /uploads/... path.
async function firstPhoto(barId) {
  const { rows } = await pool.query(
    'SELECT filename FROM photos WHERE bar_id = $1 ORDER BY sort_order, uploaded_at, id LIMIT 5',
    [barId]
  )
  for (const { filename } of rows) {
    const path = photoPath(filename)
    if (!path || !isInsideUploads(filename)) continue
    try {
      const info = await stat(resolve(UPLOADS_DIR, filename))
      if (info.isFile() && info.size > 0) return path
    } catch { /* row without a file: try the next one */ }
  }
  return null
}

router.get(['/', '/map', '/directory'], seoLimiter, (req, res) => {
  const kind = req.path === '/map' ? 'map' : req.path === '/directory' ? 'directory' : 'home'
  sendPage(req, res, 200, { kind }).catch((err) => {
    console.error('[seo] page error:', err)
    if (!res.headersSent) res.status(500).type('text/plain').send('Internal server error')
  })
})

// A RegExp route so the slug can be decoded here: Express answers 400 for
// malformed percent-encoding in a named parameter, and people should get the
// app with its "not found" dialog instead.
router.get(/^\/bar\/.*$/, seoLimiter, async (req, res) => {
  try {
    // req.path is still percent-encoded
    const raw = req.path.slice('/bar/'.length).replace(/\/$/, '')
    if (raw === '') return await sendPage(req, res, 200, { kind: 'map' })

    let slug = null
    if (!raw.includes('/')) {
      try { slug = decodeURIComponent(raw) } catch { slug = null }
    }
    // No bar has NUL in its slug, and Postgres refuses it in a text parameter
    if (slug === null || slug.includes('\u0000') || slug.length > 300) {
      return await sendPage(req, res, 404, { kind: 'notFound' })
    }

    const { rows } = await pool.query('SELECT * FROM bars WHERE slug = $1', [slug])
    const bar = rows[0]
    if (!bar || (!bar.is_active && !isAdminRequest(req))) {
      return await sendPage(req, res, 404, { kind: 'notFound' })
    }
    // Arrivals from a door sticker. Not awaited and never allowed to fail the
    // page. When the API is down nginx serves the static shell and the visit
    // simply is not counted.
    const ref = bar.is_active ? countedRef(req) : null
    if (ref) {
      recordRefHit(pool, ref, bar.id).catch((err) => console.warn(`[seo] could not count ref=${ref}: ${err.message}`))
    }
    await sendPage(req, res, 200, {
      kind: 'bar',
      bar,
      photo: await firstPhoto(bar.id),
      noindex: !bar.is_active, // only an admin gets here
    })
  } catch (err) {
    console.error('[seo] GET /bar error:', err)
    // 500 -> nginx serves the plain SPA
    if (!res.headersSent) res.status(500).type('text/plain').send('Internal server error')
  }
})

router.get('/sitemap.xml', seoLimiter, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT slug, updated_at FROM bars WHERE is_active = true ORDER BY id'
    )
    res.set('Cache-Control', 'public, max-age=3600')
    res.type('application/xml').send(buildSitemapXml(originOf(req), rows))
  } catch (err) {
    console.error('[seo] GET /sitemap.xml error:', err)
    res.status(500).type('text/plain').send('Internal server error')
  }
})

router.get('/robots.txt', seoLimiter, (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600')
  res.type('text/plain').send(buildRobotsTxt(originOf(req)))
})

export default router

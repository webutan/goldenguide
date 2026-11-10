import { Router } from 'express'
import pool from '../db.js'
import admin from '../middleware/admin.js'
import { reviewLimiter, publicWriteLimiter } from '../middleware/rateLimits.js'
import { parsePositiveInt } from '../lib/validate.js'
import {
  parseAdminReviewStatus, parseAdminReviewLimit, parseAdminReviewCursor, encodeAdminReviewCursor,
  shouldAutoHide, reporterKey,
} from '../lib/reviewModeration.js'

const router = Router()

// Admin rows never carry the drawing itself (a data URL of up to 150 kB each):
// `has_drawing` says there is one, GET /admin/:id/drawing fetches it on demand.
const ADMIN_REVIEW_COLUMNS = `
  r.id, r.bar_id, r.nickname, r.text, (r.drawing IS NOT NULL) AS has_drawing, r.created_at,
  r.hidden, r.report_count, r.auto_hide_exempt, b.name_en, b.name_jp`
// created_at in UTC with microseconds: the paging cursor (see reviewModeration.js)
const CURSOR_TS = `to_char(r.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`

// GET /api/reviews/admin?status=reported|hidden|all&barId=&limit=&cursor=
// Moderation list (admin). Declared first so no parameterised route can ever
// capture "admin".
//   reported: has reports and has not been cleared by an admin (the queue;
//             includes reviews that were auto-hidden), most reported first
//   hidden:   currently hidden, newest first
//   all:      everything, newest first
//   barId:    only that bar's reviews (the bar's review panel in admin mode
//             asks for status=hidden&barId= to show hidden reviews in place)
// Answers { items, nextCursor, total }: `nextCursor` is null on the last
// page, `total` counts every row the filter matches.
router.get('/admin', admin, async (req, res) => {
  const status = parseAdminReviewStatus(req.query.status)
  const limit = parseAdminReviewLimit(req.query.limit)
  const cursor = parseAdminReviewCursor(status, req.query.cursor)
  if (cursor && cursor.error) return res.status(400).json({ error: cursor.error })
  let barId = null
  if (req.query.barId !== undefined) {
    barId = parsePositiveInt(req.query.barId)
    if (barId === null) return res.status(400).json({ error: 'Invalid barId' })
  }

  const conditions = []
  const params = []
  if (status === 'reported') conditions.push('r.report_count > 0 AND NOT r.auto_hide_exempt')
  if (status === 'hidden') conditions.push('r.hidden')
  if (barId !== null) {
    params.push(barId)
    conditions.push(`r.bar_id = $${params.length}`)
  }
  const filter = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // The page: rows strictly after the cursor in the list's order (all DESC)
  const pageConditions = [...conditions]
  const pageParams = [...params]
  if (cursor) {
    if (status === 'reported') {
      pageParams.push(cursor.reports, cursor.ts, cursor.id)
      const n = pageParams.length
      pageConditions.push(`(r.report_count, r.created_at, r.id) < ($${n - 2}::int, $${n - 1}::timestamptz, $${n}::int)`)
    } else {
      pageParams.push(cursor.ts, cursor.id)
      const n = pageParams.length
      pageConditions.push(`(r.created_at, r.id) < ($${n - 1}::timestamptz, $${n}::int)`)
    }
  }
  const pageFilter = pageConditions.length > 0 ? `WHERE ${pageConditions.join(' AND ')}` : ''
  const order = status === 'reported'
    ? 'r.report_count DESC, r.created_at DESC, r.id DESC'
    : 'r.created_at DESC, r.id DESC'

  try {
    // One row more than the page, to know whether another page follows
    const [page, count] = await Promise.all([
      pool.query(`
        SELECT ${ADMIN_REVIEW_COLUMNS}, ${CURSOR_TS} AS cursor_ts
        FROM reviews r
        JOIN bars b ON b.id = r.bar_id
        ${pageFilter}
        ORDER BY ${order}
        LIMIT ${limit + 1}
      `, pageParams),
      pool.query(`SELECT COUNT(*)::int AS n FROM reviews r ${filter}`, params),
    ])
    const rows = page.rows.slice(0, limit)
    const nextCursor = page.rows.length > limit ? encodeAdminReviewCursor(status, rows[rows.length - 1]) : null
    res.set('Cache-Control', 'no-store')
    res.json({
      items: rows.map(({ cursor_ts: _ts, ...row }) => row),
      nextCursor,
      total: count.rows[0].n,
    })
  } catch (err) {
    console.error('GET /reviews/admin error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/reviews/admin/:id/drawing — one review's drawing (admin), fetched
// when its row is looked at. Works for hidden reviews too.
router.get('/admin/:id/drawing', admin, async (req, res) => {
  const id = parsePositiveInt(req.params.id)
  if (id === null) return res.status(400).json({ error: 'Invalid review id' })
  try {
    const { rows } = await pool.query('SELECT drawing FROM reviews WHERE id = $1', [id])
    if (rows.length === 0) return res.status(404).json({ error: 'Review not found' })
    if (!rows[0].drawing) return res.status(404).json({ error: 'Review has no drawing' })
    res.set('Cache-Control', 'no-store')
    res.json({ id, drawing: rows[0].drawing })
  } catch (err) {
    console.error('GET /reviews/admin/:id/drawing error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/reviews/week — all reviews from the past 7 days
router.get('/week', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.id, r.bar_id, r.nickname, r.text, r.drawing, r.created_at,
             b.name_en, b.name_jp
      FROM reviews r
      JOIN bars b ON b.id = r.bar_id
      WHERE r.created_at >= NOW() - INTERVAL '7 days' AND NOT r.hidden
      ORDER BY r.created_at DESC
      LIMIT 50
    `)
    res.json(rows)
  } catch (err) {
    console.error('GET /reviews/week error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/reviews/bar/:barId — reviews for a specific bar
router.get('/bar/:barId', async (req, res) => {
  const barId = parseInt(req.params.barId, 10)
  if (isNaN(barId)) return res.status(400).json({ error: 'Invalid barId' })
  try {
    const { rows } = await pool.query(`
      SELECT id, bar_id, nickname, text, drawing, created_at
      FROM reviews
      WHERE bar_id = $1 AND NOT hidden
      ORDER BY created_at DESC
      LIMIT 20
    `, [barId])
    res.json(rows)
  } catch (err) {
    console.error('GET /reviews/bar error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/reviews — create a review (rate-limited per IP; every attempt
// counts, valid or not)
router.post('/', reviewLimiter, async (req, res) => {
  const { barId, nickname, text, drawing } = req.body || {}
  if (!Number.isInteger(barId) || barId <= 0) return res.status(400).json({ error: 'barId must be a positive integer' })
  if (!nickname || typeof nickname !== 'string' || !nickname.trim()) return res.status(400).json({ error: 'nickname required' })
  if (text != null && typeof text !== 'string') return res.status(400).json({ error: 'text must be a string' })
  const cleanText = (text || '').trim()
  if (cleanText.length > 500) return res.status(400).json({ error: 'text too long' })

  const hasDrawing = drawing != null && drawing !== ''
  if (hasDrawing) {
    if (typeof drawing !== 'string' || !drawing.startsWith('data:image/png;base64,')) {
      return res.status(400).json({ error: 'drawing must be a PNG data URL' })
    }
    if (drawing.length > 150000) return res.status(400).json({ error: 'drawing too large' })
  }
  if (!cleanText && !hasDrawing) return res.status(400).json({ error: 'text or drawing required' })

  try {
    // Verify bar exists
    const barCheck = await pool.query('SELECT id FROM bars WHERE id = $1', [barId])
    if (barCheck.rows.length === 0) return res.status(404).json({ error: 'Bar not found' })

    const { rows } = await pool.query(
      `INSERT INTO reviews (bar_id, nickname, text, drawing) VALUES ($1, $2, $3, $4)
       RETURNING id, bar_id, nickname, text, drawing, created_at`,
      [barId, nickname.trim().slice(0, 30), cleanText, hasDrawing ? drawing : null]
    )
    res.json(rows[0])
  } catch (err) {
    console.error('POST /reviews error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/reviews/:id/report — flag a review (public, rate-limited).
// One report per visitor (keyed hash of the IP) per review, stored in review_reports so it survives a
// restart. Always answers 200 { ok: true } for a well-formed id: a missing
// review, a hidden one and a repeat report all look the same, so the endpoint
// reveals nothing the public lists don't already show.
router.post('/:id/report', publicWriteLimiter, async (req, res) => {
  const id = parsePositiveInt(req.params.id)
  if (id === null) return res.status(400).json({ error: 'Invalid review id' })
  const reporter = reporterKey(req.ip)

  let client
  try {
    client = await pool.connect()
    await client.query('BEGIN')
    // Row lock: concurrent reports for the same review are counted one by one.
    const { rows } = await client.query(
      'SELECT auto_hide_exempt FROM reviews WHERE id = $1 AND NOT hidden FOR UPDATE',
      [id]
    )
    if (rows.length > 0) {
      const inserted = await client.query(
        'INSERT INTO review_reports (review_id, reporter) VALUES ($1, $2) ON CONFLICT (review_id, reporter) DO NOTHING',
        [id, reporter]
      )
      if (inserted.rowCount > 0) {
        const count = await client.query(
          'SELECT COUNT(*)::int AS n FROM review_reports WHERE review_id = $1',
          [id]
        )
        const reportCount = count.rows[0].n
        const hide = shouldAutoHide({ reportCount, autoHideExempt: rows[0].auto_hide_exempt })
        await client.query(
          'UPDATE reviews SET report_count = $2, hidden = hidden OR $3 WHERE id = $1',
          [id, reportCount, hide]
        )
      }
    }
    await client.query('COMMIT')
    res.json({ ok: true })
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {})
    console.error('POST /reviews/:id/report error:', err.message)
    res.status(500).json({ error: 'Server error' })
  } finally {
    if (client) client.release()
  }
})

// PATCH /api/reviews/:id { hidden } — hide or un-hide a review (admin).
// Un-hiding also marks the review auto_hide_exempt: an admin has looked at it,
// so later reports are still counted but can no longer hide it.
router.patch('/:id', admin, async (req, res) => {
  const id = parsePositiveInt(req.params.id)
  if (id === null) return res.status(400).json({ error: 'Invalid review id' })
  const hidden = req.body?.hidden
  if (typeof hidden !== 'boolean') return res.status(400).json({ error: 'hidden must be a boolean' })
  try {
    const { rows } = await pool.query(`
      WITH r AS (
        UPDATE reviews
        SET hidden = $2, auto_hide_exempt = auto_hide_exempt OR NOT $2
        WHERE id = $1
        RETURNING *
      )
      SELECT ${ADMIN_REVIEW_COLUMNS}
      FROM r
      JOIN bars b ON b.id = r.bar_id
    `, [id, hidden])
    if (rows.length === 0) return res.status(404).json({ error: 'Review not found' })
    res.json(rows[0])
  } catch (err) {
    console.error('PATCH /reviews/:id error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/reviews/:id — remove a review and its reports (admin).
router.delete('/:id', admin, async (req, res) => {
  const id = parsePositiveInt(req.params.id)
  if (id === null) return res.status(400).json({ error: 'Invalid review id' })
  try {
    const { rowCount } = await pool.query('DELETE FROM reviews WHERE id = $1', [id])
    if (rowCount === 0) return res.status(404).json({ error: 'Review not found' })
    res.json({ ok: true })
  } catch (err) {
    console.error('DELETE /reviews/:id error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router

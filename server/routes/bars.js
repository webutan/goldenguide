import { Router } from 'express'
import pool from '../db.js'
import admin, { isAdminRequest } from '../middleware/admin.js'
import { pickBarFields, parsePositiveInt, slugify, normalizeTagIds } from '../lib/validate.js'
// The bar list SELECT and the update itself live in lib/barStore.js, shared
// with POST /api/suggestions/:id/apply.
import { selectBars, replaceTags, updateBarInTransaction, clientError } from '../lib/barStore.js'

const router = Router()

// GET /api/bars — all bars with tags. Inactive bars are only returned to admin requests.
router.get('/', async (req, res) => {
  try {
    const rows = isAdminRequest(req)
      ? await selectBars(pool)
      : await selectBars(pool, 'b.is_active = true')
    res.set('Cache-Control', 'no-store')
    res.json(rows)
  } catch (err) {
    console.error('GET /api/bars error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/bars/:slug — single bar with photos. An inactive bar is a 404
// unless the request is admin.
router.get('/:slug', async (req, res) => {
  try {
    const barResult = await pool.query(`
      SELECT b.*,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', t.id, 'label', t.label, 'label_jp', t.label_jp, 'icon', t.icon, 'color', t.color))
          FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) AS tags,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', p.id, 'filename', p.filename, 'photo_type', p.photo_type))
          FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) AS photos
      FROM bars b
      LEFT JOIN bar_tags bt ON bt.bar_id = b.id
      LEFT JOIN tags t ON t.id = bt.tag_id
      LEFT JOIN photos p ON p.bar_id = b.id
      WHERE b.slug = $1
      GROUP BY b.id
    `, [req.params.slug])

    const bar = barResult.rows[0]
    if (!bar || (!bar.is_active && !isAdminRequest(req))) {
      return res.status(404).json({ error: 'Bar not found' })
    }
    res.set('Cache-Control', 'no-store')
    res.json(bar)
  } catch (err) {
    console.error('GET /api/bars/:slug error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /api/bars/:id — update bar fields and/or replace tags (admin).
// Runs in one transaction and responds with the bar in the GET /api/bars shape.
router.patch('/:id', admin, async (req, res) => {
  const id = parsePositiveInt(req.params.id)
  if (id === null) return res.status(400).json({ error: 'Invalid id' })
  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const fields = pickBarFields(body)
  let tagIds = null
  if (body.tags !== undefined) {
    tagIds = normalizeTagIds(body.tags)
    if (tagIds === null) return res.status(400).json({ error: 'tags must be an array of tag ids' })
  }

  let client
  try {
    client = await pool.connect()
  } catch (err) {
    console.error('bars: DB connect error:', err.message)
    return res.status(500).json({ error: 'Internal server error' })
  }
  try {
    await client.query('BEGIN')
    const bar = await updateBarInTransaction(client, id, { fields, tagIds })
    if (!bar) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Bar not found' })
    }
    await client.query('COMMIT')
    res.json(bar)
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    const known = clientError(err)
    if (known) return res.status(known.status).json({ error: known.error })
    console.error('PATCH /api/bars/:id error:', err)
    res.status(500).json({ error: 'Internal server error' })
  } finally {
    client.release()
  }
})

// POST /api/bars — create bar (admin). Accepts the same fields as PATCH, plus
// `slug` (generated from name_en / name_jp when omitted) and `tags`.
router.post('/', admin, async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {}
  if (typeof body.name_jp !== 'string' || !body.name_jp.trim()) {
    return res.status(400).json({ error: 'name_jp is required' })
  }
  // Omitted/null columns fall back to their DB defaults (floor, is_active, schedule...)
  const fields = pickBarFields(body).filter(([, v]) => v !== null)
  let tagIds = []
  if (body.tags !== undefined) {
    tagIds = normalizeTagIds(body.tags)
    if (tagIds === null) return res.status(400).json({ error: 'tags must be an array of tag ids' })
  }
  let slug = null
  if (body.slug !== undefined && body.slug !== null && body.slug !== '') {
    if (typeof body.slug !== 'string' || !body.slug.trim()) return res.status(400).json({ error: 'Invalid slug' })
    slug = body.slug.trim()
  }

  let client
  try {
    client = await pool.connect()
  } catch (err) {
    console.error('bars: DB connect error:', err.message)
    return res.status(500).json({ error: 'Internal server error' })
  }
  try {
    await client.query('BEGIN')
    if (!slug) {
      const base = slugify(body.name_en) || slugify(body.name_jp) || 'bar'
      const taken = await client.query(
        `SELECT slug FROM bars WHERE slug = $1 OR left(slug, length($1) + 1) = $1 || '-'`,
        [base]
      )
      const used = new Set(taken.rows.map(r => r.slug))
      slug = base
      for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`
    }

    const cols = ['slug', ...fields.map(([k]) => k)]
    const vals = [slug, ...fields.map(([, v]) => v)]
    const { rows } = await client.query(
      `INSERT INTO bars (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id`,
      vals
    )
    const id = rows[0].id
    if (tagIds.length > 0) await replaceTags(client, id, tagIds)

    const [bar] = await selectBars(client, 'b.id = $1', [id])
    await client.query('COMMIT')
    res.status(201).json(bar)
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    const known = clientError(err)
    if (known) return res.status(known.status).json({ error: known.error })
    console.error('POST /api/bars error:', err)
    res.status(500).json({ error: 'Internal server error' })
  } finally {
    client.release()
  }
})

// DELETE /api/bars/:id (admin)
router.delete('/:id', admin, async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id)
    if (id === null) return res.status(400).json({ error: 'Invalid id' })
    const result = await pool.query('DELETE FROM bars WHERE id = $1 RETURNING id', [id])
    if (result.rows.length === 0) return res.status(404).json({ error: 'Bar not found' })
    res.json({ success: true, id })
  } catch (err) {
    console.error('DELETE /api/bars/:id error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

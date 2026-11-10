import { Router } from 'express'
import pool from '../db.js'
import admin from '../middleware/admin.js'
import { suggestionLimiter } from '../middleware/rateLimits.js'
import { parsePositiveInt } from '../lib/validate.js'
import { hashIp } from '../lib/ipHash.js'
import { validateSuggestionBody, parseSuggestionFilter, SUGGESTION_STATUSES } from '../lib/suggestions.js'

// "Suggest an edit": visitors send corrections, admins review them in the
// Inbox. Applying one is done by the admin UI through PATCH /api/bars/:id (the
// one place bars are updated), followed by PATCH /:id { status: 'applied' }.

const router = Router()

// The bar's CURRENT values, so the Inbox can show old -> new at review time.
const SELECT_SUGGESTIONS = `
  SELECT s.id, s.bar_id, s.kind, s.payload, s.note, s.contact, s.status, s.created_at,
    CASE WHEN b.id IS NULL THEN NULL ELSE json_build_object(
      'id', b.id, 'slug', b.slug, 'name_jp', b.name_jp, 'name_en', b.name_en,
      'is_active', b.is_active, 'schedule', b.schedule,
      'charge', b.charge, 'male_charge', b.male_charge, 'drink_price', b.drink_price,
      'cash_only', b.cash_only, 'phone', b.phone, 'sns', b.sns
    ) END AS bar
  FROM bar_suggestions s
  LEFT JOIN bars b ON b.id = s.bar_id
`

// POST /api/suggestions — public, 5 per hour per IP.
router.post('/', suggestionLimiter, async (req, res) => {
  const result = validateSuggestionBody(req.body)
  if (result.error) return res.status(400).json({ error: result.error })
  const { barId, items, note, contact, bot } = result.value
  // Honeypot filled in: answer as if it worked, store nothing.
  if (bot) return res.status(201).json({ ok: true, count: items.length })

  try {
    if (barId !== null) {
      const bar = await pool.query('SELECT 1 FROM bars WHERE id = $1 AND is_active = true', [barId])
      if (bar.rows.length === 0) return res.status(400).json({ error: 'Unknown bar' })
    }
    // One statement, so the changes are stored together or not at all.
    await pool.query(
      `INSERT INTO bar_suggestions (bar_id, kind, payload, note, contact, ip_hash)
       SELECT $1, i.kind, i.payload, $3, $4, $5
       FROM jsonb_to_recordset($2::jsonb) AS i(kind text, payload jsonb)`,
      [barId, JSON.stringify(items), note, contact, hashIp(req.ip)]
    )
    res.status(201).json({ ok: true, count: items.length })
  } catch (err) {
    console.error('POST /api/suggestions error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/suggestions/count — number of open suggestions (admin; the "Inbox (N)" tab).
router.get('/count', admin, async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT count(*)::int AS open FROM bar_suggestions WHERE status = 'open'`)
    res.set('Cache-Control', 'no-store')
    res.json({ open: rows[0].open })
  } catch (err) {
    console.error('GET /api/suggestions/count error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/suggestions?status=open|applied|dismissed|all — admin list, newest first.
router.get('/', admin, async (req, res) => {
  try {
    const filter = parseSuggestionFilter(req.query.status)
    const { rows } = filter === 'all'
      ? await pool.query(`${SELECT_SUGGESTIONS} ORDER BY s.created_at DESC, s.id DESC LIMIT 200`)
      : await pool.query(`${SELECT_SUGGESTIONS} WHERE s.status = $1 ORDER BY s.created_at DESC, s.id DESC LIMIT 200`, [filter])
    res.set('Cache-Control', 'no-store')
    res.json(rows)
  } catch (err) {
    console.error('GET /api/suggestions error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /api/suggestions/:id { status } — admin: mark applied / dismissed (or reopen).
// The row is kept either way.
router.patch('/:id', admin, async (req, res) => {
  const id = parsePositiveInt(req.params.id)
  if (id === null) return res.status(400).json({ error: 'Invalid id' })
  const status = req.body && req.body.status
  if (!SUGGESTION_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' })
  try {
    const updated = await pool.query('UPDATE bar_suggestions SET status = $1 WHERE id = $2 RETURNING id', [status, id])
    if (updated.rows.length === 0) return res.status(404).json({ error: 'Suggestion not found' })
    const { rows } = await pool.query(`${SELECT_SUGGESTIONS} WHERE s.id = $1`, [id])
    res.json(rows[0])
  } catch (err) {
    console.error('PATCH /api/suggestions/:id error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

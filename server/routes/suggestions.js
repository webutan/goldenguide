import { Router } from 'express'
import pool from '../db.js'
import admin from '../middleware/admin.js'
import { suggestionLimiter } from '../middleware/rateLimits.js'
import { parsePositiveInt } from '../lib/validate.js'
import { hashIp } from '../lib/ipHash.js'
import { validateSuggestionBody, parseSuggestionFilter, SUGGESTION_STATUSES } from '../lib/suggestions.js'
import { suggestionChanges, changesToPatch, isApplicableKind } from '../lib/suggestionApply.js'
import { pickBarFields } from '../lib/validate.js'
import { updateBarInTransaction, clientError } from '../lib/barStore.js'

// "Suggest an edit": visitors send corrections, admins review them in the
// Inbox. Applying one is POST /:id/apply: the bar update (the same code as
// PATCH /api/bars/:id) and the status change happen in one transaction.

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

// POST /api/suggestions/:id/apply — admin: apply a suggestion to its bar.
// The patch is computed here, from the stored suggestion against the bar's
// CURRENT row (both locked), and written through the same whitelist and
// update code as PATCH /api/bars/:id. The bar update and the status change
// are one transaction: either both happen or neither does.
//
// 200 { result, changes, suggestion }
//   result 'applied'    the bar was updated; `changes` is [{ field, from, to }]
//          'no_changes' the bar already matches (edited since); nothing was
//                       written and the suggestion stays as it is
//          'not_open'   already applied or dismissed; nothing was written
// 422 { code: 'manual_kind' } for 'moved' / 'new_bar' (handled by hand)
router.post('/:id/apply', admin, async (req, res) => {
  const id = parsePositiveInt(req.params.id)
  if (id === null) return res.status(400).json({ error: 'Invalid id' })

  let client
  try {
    client = await pool.connect()
  } catch (err) {
    console.error('suggestions: DB connect error:', err.message)
    return res.status(500).json({ error: 'Internal server error' })
  }
  try {
    await client.query('BEGIN')
    const found = await client.query(
      'SELECT id, bar_id, kind, payload, status FROM bar_suggestions WHERE id = $1 FOR UPDATE',
      [id]
    )
    const suggestion = found.rows[0]
    if (!suggestion) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Suggestion not found' })
    }
    if (!isApplicableKind(suggestion.kind) || suggestion.bar_id === null) {
      await client.query('ROLLBACK')
      return res.status(422).json({
        error: `A "${suggestion.kind}" suggestion cannot be applied automatically`,
        code: 'manual_kind',
      })
    }

    let result = 'not_open'
    let changes = []
    if (suggestion.status === 'open') {
      // bar_id is ON DELETE CASCADE, so the bar of an existing suggestion exists
      const current = await client.query('SELECT * FROM bars WHERE id = $1 FOR UPDATE', [suggestion.bar_id])
      changes = suggestionChanges(suggestion, current.rows[0])
      if (changes.length === 0) {
        result = 'no_changes'
      } else {
        const fields = pickBarFields(changesToPatch(changes))
        await updateBarInTransaction(client, suggestion.bar_id, { fields })
        await client.query(`UPDATE bar_suggestions SET status = 'applied' WHERE id = $1`, [id])
        result = 'applied'
      }
    }

    const { rows } = await client.query(`${SELECT_SUGGESTIONS} WHERE s.id = $1`, [id])
    await client.query('COMMIT')
    res.set('Cache-Control', 'no-store')
    res.json({ result, changes, suggestion: rows[0] })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    const known = clientError(err)
    if (known) return res.status(known.status).json({ error: known.error })
    console.error('POST /api/suggestions/:id/apply error:', err)
    res.status(500).json({ error: 'Internal server error' })
  } finally {
    client.release()
  }
})

export default router

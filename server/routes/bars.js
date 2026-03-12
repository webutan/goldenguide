import { Router } from 'express'
import pool from '../db.js'
import admin from '../middleware/admin.js'

const router = Router()

// GET /api/bars — all bars with tags
router.get('/', async (req, res) => {
  try {
    const barsResult = await pool.query(`
      SELECT b.*,
        COALESCE(
          json_agg(json_build_object('id', t.id, 'label', t.label, 'label_jp', t.label_jp, 'icon', t.icon, 'color', t.color))
          FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) AS tags,
        (SELECT p.filename FROM photos p WHERE p.bar_id = b.id ORDER BY p.sort_order, p.uploaded_at LIMIT 1) AS photo
      FROM bars b
      LEFT JOIN bar_tags bt ON bt.bar_id = b.id
      LEFT JOIN tags t ON t.id = bt.tag_id
      GROUP BY b.id
      ORDER BY b.street, b.floor, b.name_jp
    `)
    res.set('Cache-Control', 'no-store')
    res.json(barsResult.rows)
  } catch (err) {
    console.error('GET /api/bars error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/bars/:slug — single bar with photos
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

    if (barResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bar not found' })
    }
    res.set('Cache-Control', 'no-store')
    res.json(barResult.rows[0])
  } catch (err) {
    console.error('GET /api/bars/:slug error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /api/bars/:id — update bar fields (admin)
router.patch('/:id', admin, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const { tags, ...fields } = req.body

    // Update bar fields
    const allowedFields = [
      'name_jp', 'name_en', 'street', 'floor', 'building_id', 'map_x', 'map_y',
      'lat', 'lng', 'address', 'plus_code', 'google_link', 'charge', 'male_charge', 'drink_price', 'cash_only',
      'seats', 'phone', 'hours', 'closed_days', 'description', 'sns', 'other_links', 'is_active', 'schedule',
    ]

    const updates = []
    const values = []
    let paramIdx = 1

    for (const [key, value] of Object.entries(fields)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramIdx}`)
        values.push(value)
        paramIdx++
      }
    }

    if (updates.length > 0) {
      updates.push(`updated_at = now()`)
      values.push(id)
      await pool.query(
        `UPDATE bars SET ${updates.join(', ')} WHERE id = $${paramIdx}`,
        values
      )
    }

    // Replace tags if provided
    if (Array.isArray(tags)) {
      await pool.query('DELETE FROM bar_tags WHERE bar_id = $1', [id])
      for (const tagId of tags) {
        await pool.query(
          'INSERT INTO bar_tags (bar_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [id, tagId]
        )
      }
    }

    // Return updated bar
    const result = await pool.query('SELECT * FROM bars WHERE id = $1', [id])
    res.json(result.rows[0])
  } catch (err) {
    console.error('PATCH /api/bars/:id error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/bars — create bar (admin)
router.post('/', admin, async (req, res) => {
  try {
    const { slug, name_jp, name_en, street, floor, tags, ...rest } = req.body
    const result = await pool.query(
      `INSERT INTO bars (slug, name_jp, name_en, street, floor, address, plus_code, charge, male_charge, seats, phone, hours, closed_days, description, sns)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [slug, name_jp, name_en, street, floor || 1,
       rest.address, rest.plus_code, rest.charge, rest.male_charge,
       rest.seats, rest.phone, rest.hours, rest.closed_days,
       rest.description, rest.sns]
    )

    const bar = result.rows[0]
    if (Array.isArray(tags)) {
      for (const tagId of tags) {
        await pool.query(
          'INSERT INTO bar_tags (bar_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [bar.id, tagId]
        )
      }
    }

    res.status(201).json(bar)
  } catch (err) {
    console.error('POST /api/bars error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/bars/:id (admin)
router.delete('/:id', admin, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' })
    const result = await pool.query('DELETE FROM bars WHERE id = $1 RETURNING id', [id])
    if (result.rows.length === 0) return res.status(404).json({ error: 'Bar not found' })
    res.json({ success: true, id })
  } catch (err) {
    console.error('DELETE /api/bars/:id error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

import { Router } from 'express'
import pool from '../db.js'
import admin from '../middleware/admin.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tags ORDER BY id')
    res.json(result.rows)
  } catch (err) {
    console.error('GET /api/tags error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/tags — create tag (admin)
router.post('/', admin, async (req, res) => {
  try {
    const { id, label, icon, color } = req.body
    if (!id || !label) {
      return res.status(400).json({ error: 'id and label are required' })
    }
    const result = await pool.query(
      'INSERT INTO tags (id, label, icon, color) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, label, icon || '', color || '#888']
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Tag ID already exists' })
    }
    console.error('POST /api/tags error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /api/tags/:id — update tag (admin)
router.patch('/:id', admin, async (req, res) => {
  try {
    const { label, icon, color } = req.body
    const updates = []
    const values = []
    let idx = 1

    if (label !== undefined) { updates.push(`label = $${idx++}`); values.push(label) }
    if (icon !== undefined) { updates.push(`icon = $${idx++}`); values.push(icon) }
    if (color !== undefined) { updates.push(`color = $${idx++}`); values.push(color) }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    values.push(req.params.id)
    const result = await pool.query(
      `UPDATE tags SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error('PATCH /api/tags/:id error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/tags/:id — delete tag (admin)
router.delete('/:id', admin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM tags WHERE id = $1 RETURNING *', [req.params.id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' })
    }
    res.json({ deleted: true })
  } catch (err) {
    console.error('DELETE /api/tags/:id error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

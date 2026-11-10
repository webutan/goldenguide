import { Router } from 'express'
import { unlink } from 'fs'
import { resolve } from 'path'
import pool from '../db.js'
import admin from '../middleware/admin.js'
import { UPLOADS_DIR, UNSUPPORTED_TYPE_ERROR, imageUpload, saveImage } from './photos.js'

const uploadAnnotation = imageUpload('icon')

const router = Router()

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM annotations ORDER BY id')
    res.json(result.rows)
  } catch (err) {
    console.error('GET /api/annotations error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', admin, async (req, res) => {
  try {
    const { id, text_en, text_jp, x, y, font_size, color, rotation } = req.body
    if (!id) return res.status(400).json({ error: 'id is required' })
    const result = await pool.query(
      `INSERT INTO annotations (id, text_en, text_jp, x, y, font_size, color, rotation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id, text_en || '', text_jp || '', x ?? 0, y ?? 0, font_size ?? 50, color || '#8a6540', rotation ?? 0]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('POST /api/annotations error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/:id/icon', admin, uploadAnnotation, async (req, res) => {
  let imageUrl = null
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    imageUrl = await saveImage(req.file, 'annotations')
    if (!imageUrl) return res.status(415).json({ error: UNSUPPORTED_TYPE_ERROR })
    const result = await pool.query(
      'UPDATE annotations SET image_url = $1 WHERE id = $2 RETURNING *',
      [imageUrl, req.params.id]
    )
    if (result.rows.length === 0) {
      unlink(resolve(UPLOADS_DIR, imageUrl), () => {}) // don't orphan the file
      return res.status(404).json({ error: 'Annotation not found' })
    }
    res.json({ image_url: imageUrl })
  } catch (err) {
    console.error('POST /api/annotations/:id/icon error:', err)
    if (imageUrl) unlink(resolve(UPLOADS_DIR, imageUrl), () => {})
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.patch('/:id', admin, async (req, res) => {
  try {
    const { text_en, text_jp, x, y, font_size, color, rotation, image_width, image_height } = req.body
    const allowed = { text_en, text_jp, x, y, font_size, color, rotation, image_width, image_height }
    const updates = []
    const values = []
    let idx = 1
    for (const [key, val] of Object.entries(allowed)) {
      if (val !== undefined) {
        updates.push(`${key} = $${idx++}`)
        values.push(val)
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' })
    values.push(req.params.id)
    const result = await pool.query(
      `UPDATE annotations SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Annotation not found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error('PATCH /api/annotations/:id error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', admin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM annotations WHERE id = $1 RETURNING id', [req.params.id])
    if (result.rows.length === 0) return res.status(404).json({ error: 'Annotation not found' })
    res.json({ deleted: true })
  } catch (err) {
    console.error('DELETE /api/annotations/:id error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

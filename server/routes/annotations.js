import { Router } from 'express'
import { randomUUID } from 'crypto'
import { mkdirSync } from 'fs'
import { extname, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import multer from 'multer'
import pool from '../db.js'
import admin from '../middleware/admin.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = resolve(__dirname, '..', 'uploads')

const annotationStorage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = resolve(UPLOADS_DIR, 'annotations')
    mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename(req, file, cb) {
    const ext = extname(file.originalname)
    cb(null, `${randomUUID()}${ext}`)
  },
})
const uploadAnnotation = multer({ storage: annotationStorage, limits: { fileSize: 10 * 1024 * 1024 } })

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

router.post('/:id/icon', admin, uploadAnnotation.single('icon'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    const imageUrl = `annotations/${req.file.filename}`
    const result = await pool.query(
      'UPDATE annotations SET image_url = $1 WHERE id = $2 RETURNING *',
      [imageUrl, req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Annotation not found' })
    res.json({ image_url: imageUrl })
  } catch (err) {
    console.error('POST /api/annotations/:id/icon error:', err)
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

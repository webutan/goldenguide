import { Router } from 'express'
import { randomUUID } from 'crypto'
import { mkdirSync, unlink } from 'fs'
import { extname, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import multer from 'multer'
import pool from '../db.js'
import admin from '../middleware/admin.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = resolve(__dirname, '..', 'uploads')

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = resolve(UPLOADS_DIR, 'bars', String(req.params.bar_id))
    mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename(req, file, cb) {
    const ext = extname(file.originalname)
    cb(null, `${randomUUID()}${ext}`)
  },
})

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })

const router = Router()

// GET /api/bars/:bar_id/photos
router.get('/bars/:bar_id/photos', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM photos WHERE bar_id = $1 ORDER BY sort_order, uploaded_at',
      [req.params.bar_id]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('GET photos error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/bars/:bar_id/photos
router.post('/bars/:bar_id/photos', admin, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file received. Ensure the field name is "photo".' })
    }
    const barId = parseInt(req.params.bar_id)
    const photoType = req.body.type || 'general'
    const filename = `bars/${barId}/${req.file.filename}`

    const result = await pool.query(
      'INSERT INTO photos (bar_id, filename, photo_type) VALUES ($1, $2, $3) RETURNING *',
      [barId, filename, photoType]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('POST photo error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/photos/:id
router.delete('/photos/:id', admin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM photos WHERE id = $1 RETURNING filename', [req.params.id])
    if (result.rows.length > 0) {
      const filepath = resolve(UPLOADS_DIR, result.rows[0].filename)
      unlink(filepath, () => {}) // delete file from disk, ignore errors if already gone
    }
    res.json({ ok: true })
  } catch (err) {
    console.error('DELETE photo error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

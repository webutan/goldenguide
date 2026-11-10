import { Router } from 'express'
import { randomUUID } from 'crypto'
import { mkdirSync, unlink } from 'fs'
import { writeFile } from 'fs/promises'
import { resolve, dirname, relative, isAbsolute } from 'path'
import { fileURLToPath } from 'url'
import multer from 'multer'
import pool from '../db.js'
import admin from '../middleware/admin.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const UPLOADS_DIR = resolve(__dirname, '..', 'uploads')

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export const UNSUPPORTED_TYPE_ERROR = 'Unsupported file type. Upload a JPEG, PNG, WebP or GIF image.'

// Detect the image type from the file's magic bytes. Only JPEG, PNG, WebP and
// GIF are accepted. The stored extension always comes from this, never from
// the client-supplied filename or MIME type.
export function detectImageType(buf) {
  if (!buf || buf.length < 12) return null
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' }
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { ext: 'png', mime: 'image/png' }
  }
  if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') {
    return { ext: 'webp', mime: 'image/webp' }
  }
  const gif = buf.toString('latin1', 0, 6)
  if (gif === 'GIF87a' || gif === 'GIF89a') return { ext: 'gif', mime: 'image/gif' }
  return null
}

// True if `p` resolves to something strictly inside UPLOADS_DIR.
export function isInsideUploads(p) {
  const rel = relative(UPLOADS_DIR, resolve(UPLOADS_DIR, p))
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
}

// Multer middleware that buffers a single file field in memory. Multer errors
// (size limit, unexpected field) become 413/400 JSON instead of a generic 500.
export function imageUpload(field) {
  const mw = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  }).single(field)
  return (req, res, next) => {
    mw(req, res, (err) => {
      if (!err) return next()
      if (err instanceof multer.MulterError) {
        const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400
        return res.status(status).json({ error: err.message })
      }
      next(err)
    })
  }
}

// Validate an in-memory multer file and write it to
// UPLOADS_DIR/<subdir>/<uuid>.<detected ext>. Returns the path relative to
// UPLOADS_DIR, or null if the content is not an accepted image (caller -> 415).
export async function saveImage(file, subdir) {
  const type = detectImageType(file.buffer)
  if (!type) return null
  const dir = resolve(UPLOADS_DIR, subdir)
  if (!isInsideUploads(dir)) throw new Error('Upload directory escapes UPLOADS_DIR')
  mkdirSync(dir, { recursive: true })
  const name = `${randomUUID()}.${type.ext}`
  await writeFile(resolve(dir, name), file.buffer, { flag: 'wx' })
  return `${subdir}/${name}`
}

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
router.post('/bars/:bar_id/photos', admin, imageUpload('photo'), async (req, res) => {
  let filename = null
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file received. Ensure the field name is "photo".' })
    }
    const barId = parseInt(req.params.bar_id, 10)
    if (!Number.isInteger(barId) || barId <= 0) return res.status(400).json({ error: 'Invalid bar id' })
    const photoType = req.body.type || 'general'
    filename = await saveImage(req.file, `bars/${barId}`)
    if (!filename) return res.status(415).json({ error: UNSUPPORTED_TYPE_ERROR })

    const result = await pool.query(
      'INSERT INTO photos (bar_id, filename, photo_type) VALUES ($1, $2, $3) RETURNING *',
      [barId, filename, photoType]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('POST photo error:', err)
    if (filename) unlink(resolve(UPLOADS_DIR, filename), () => {}) // don't orphan the file if the insert failed
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/photos/:id
router.delete('/photos/:id', admin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM photos WHERE id = $1 RETURNING filename', [req.params.id])
    if (result.rows.length > 0) {
      const filepath = resolve(UPLOADS_DIR, result.rows[0].filename)
      // Never unlink outside UPLOADS_DIR, whatever the DB row says
      if (isInsideUploads(filepath)) {
        unlink(filepath, () => {}) // delete file from disk, ignore errors if already gone
      } else {
        console.warn('DELETE photo: refusing to unlink path outside uploads dir:', result.rows[0].filename)
      }
    }
    res.json({ ok: true })
  } catch (err) {
    console.error('DELETE photo error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

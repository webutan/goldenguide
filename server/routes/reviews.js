import { Router } from 'express'
import pool from '../db.js'

const router = Router()

// GET /api/reviews/week — all reviews from the past 7 days
router.get('/week', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.id, r.bar_id, r.nickname, r.text, r.drawing, r.created_at,
             b.name_en, b.name_jp
      FROM reviews r
      JOIN bars b ON b.id = r.bar_id
      WHERE r.created_at >= NOW() - INTERVAL '7 days'
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
      WHERE bar_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `, [barId])
    res.json(rows)
  } catch (err) {
    console.error('GET /reviews/bar error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/reviews — create a review
router.post('/', async (req, res) => {
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

export default router

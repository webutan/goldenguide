// Admin statistics (G05).
//
//   GET /api/stats/refs?ref=sticker   arrivals counted by the SEO route for a
//                                     `?ref=` value, per bar: last 30 days and
//                                     all time (see lib/refHits.js)
import { Router } from 'express'
import pool from '../db.js'
import admin from '../middleware/admin.js'
import { normalizeRef, refStats, COUNTED_REFS } from '../lib/refHits.js'

const RECENT_DAYS = 30

const router = Router()

router.get('/refs', admin, async (req, res) => {
  const ref = req.query.ref === undefined ? COUNTED_REFS[0] : normalizeRef(req.query.ref)
  if (!ref) return res.status(400).json({ error: 'Unknown ref' })
  try {
    const bars = await refStats(pool, ref, RECENT_DAYS)
    res.set('Cache-Control', 'no-store')
    res.json({
      ref,
      days: RECENT_DAYS,
      recent: bars.reduce((sum, b) => sum + b.recent, 0),
      total: bars.reduce((sum, b) => sum + b.total, 0),
      bars,
    })
  } catch (err) {
    console.error('[stats] GET /refs error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

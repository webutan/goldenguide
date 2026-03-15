import { Router } from 'express'
import pool from '../db.js'
import admin from '../middleware/admin.js'

const router = Router()

// GET /api/partitions — all building partitions as { buildingId: data }
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT building_id, data FROM building_partitions')
    const out = {}
    for (const row of result.rows) {
      out[row.building_id] = row.data
    }
    res.set('Cache-Control', 'no-store')
    res.json(out)
  } catch (err) {
    console.error('GET /api/partitions error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/partitions/:buildingId — upsert partition data for one building (admin)
router.put('/:buildingId', admin, async (req, res) => {
  try {
    const { buildingId } = req.params
    const data = req.body
    await pool.query(
      `INSERT INTO building_partitions (building_id, data)
       VALUES ($1, $2)
       ON CONFLICT (building_id) DO UPDATE SET data = EXCLUDED.data`,
      [buildingId, JSON.stringify(data)]
    )
    res.json({ ok: true })
  } catch (err) {
    console.error('PUT /api/partitions/:buildingId error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

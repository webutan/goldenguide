import { Router } from 'express'
import pool from '../db.js'
import { refreshFeedCache, getOrFetchAccountFeed } from '../jobs/feedRefresh.js'

const router = Router()

// GET /api/feed
// Returns cached merged tweet timeline. Fetches on cache miss (rare after server warm-up).
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT data FROM cache WHERE key = 'feed' AND expires_at > now()`
    )
    if (rows.length > 0) return res.json(rows[0].data)

    // Cache miss (e.g. first request after server start) — fetch now
    const payload = await refreshFeedCache()
    res.json(payload)
  } catch (err) {
    console.error('Feed route error:', err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/feed/account/:handle
// Returns recent tweets for a single handle. DB-cached per handle.
router.get('/account/:handle', async (req, res) => {
  const handle = req.params.handle.toLowerCase()
  try {
    const data = await getOrFetchAccountFeed(handle)
    res.json(data)
  } catch (err) {
    console.error('Feed account route error:', err)
    res.json({ tweets: null, error: `Twitter API error: ${err.message}` })
  }
})

export default router

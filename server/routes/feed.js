import { Router } from 'express'
import { getMainFeed, getOrFetchAccountFeed, isKnownBarHandle } from '../jobs/feedRefresh.js'
import { isValidHandle } from '../lib/feedCore.js'

const router = Router()

// GET /api/feed
// Returns the cached merged tweet timeline. On a cache miss concurrent
// requests share one upstream fetch; if Twitter fails, the expired cache is
// served with `stale: true`.
router.get('/', async (req, res) => {
  try {
    res.json(await getMainFeed())
  } catch (err) {
    console.error('Feed route error:', err.message)
    res.status(502).json({ error: 'feed_unavailable' })
  }
})

// GET /api/feed/account/:handle
// Returns recent tweets for a single handle, DB-cached per handle. Only the
// accounts of active bars are served; anything else is a 404, so the paid
// upstream API cannot be driven with arbitrary handles.
router.get('/account/:handle', async (req, res) => {
  if (!isValidHandle(req.params.handle)) return res.status(404).json({ error: 'Not found' })
  const handle = req.params.handle.toLowerCase()
  try {
    if (!(await isKnownBarHandle(handle))) return res.status(404).json({ error: 'Not found' })
  } catch (err) {
    console.error('Feed account lookup error:', err.message)
    return res.status(500).json({ error: 'Server error' })
  }
  try {
    const data = await getOrFetchAccountFeed(handle)
    res.json(data)
  } catch (err) {
    console.error('Feed account route error:', err.message)
    res.json({ tweets: null, error: 'Twitter API error' })
  }
})

export default router

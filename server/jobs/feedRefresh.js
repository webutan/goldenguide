import pool from '../db.js'

const CACHE_TTL_MS = 30 * 60 * 1000

function parseTwitterHandle(url) {
  if (!url) return null
  const match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/([A-Za-z0-9_]+)/i)
  if (!match) return null
  const skip = ['intent', 'search', 'hashtag', 'i', 'share']
  if (skip.includes(match[1].toLowerCase())) return null
  return match[1]
}

async function fetchFromTwitter(query) {
  const url =
    `https://api.twitter.com/2/tweets/search/recent` +
    `?query=${encodeURIComponent(query)}` +
    `&tweet.fields=created_at,author_id,text,attachments` +
    `&expansions=author_id,attachments.media_keys` +
    `&user.fields=name,username,profile_image_url` +
    `&media.fields=url,preview_image_url` +
    `&max_results=25`

  const tRes = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}` },
  })

  if (!tRes.ok) {
    const body = await tRes.text()
    throw new Error(`Twitter API ${tRes.status}: ${body}`)
  }

  return tRes.json()
}

function buildTweet(tweet, usersById, mediaByKey, handleToBar) {
  const user = usersById[tweet.author_id]
  const bar = user && handleToBar ? handleToBar[user.username.toLowerCase()] : null
  const media = (tweet.attachments?.media_keys || [])
    .map(k => mediaByKey[k])
    .filter(Boolean)
    .map(m => ({ url: m.url || m.preview_image_url, type: m.type }))
  return {
    id: tweet.id,
    text: tweet.text,
    created_at: tweet.created_at,
    url: user ? `https://x.com/${user.username}/status/${tweet.id}` : null,
    author: user
      ? { username: user.username, name: user.name, profile_image_url: user.profile_image_url }
      : null,
    bar_name_en: bar?.name_en ?? null,
    bar_name_jp: bar?.name_jp ?? null,
    media,
  }
}

async function writeCache(key, data) {
  const expiresAt = new Date(Date.now() + CACHE_TTL_MS)
  await pool.query(
    `INSERT INTO cache (key, data, expires_at) VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE SET data = $2, expires_at = $3`,
    [key, data, expiresAt]
  )
}

// Pre-fetches all bars' tweets and writes to cache key 'feed'.
// Called on server startup and every 30 minutes.
export async function refreshFeedCache() {
  console.log('[feed] Refreshing main feed cache...')
  const result = await pool.query(
    `SELECT id, name_en, name_jp, sns FROM bars WHERE sns IS NOT NULL AND sns != '' AND is_active = true`
  )

  const accounts = result.rows
    .map(bar => ({ id: bar.id, name_en: bar.name_en, name_jp: bar.name_jp, handle: parseTwitterHandle(bar.sns) }))
    .filter(a => a.handle)

  let payload

  if (!process.env.TWITTER_BEARER_TOKEN || accounts.length === 0) {
    payload = { tweets: null, accounts }
  } else {
    const CHUNK = 25
    const handles = accounts.map(a => a.handle)
    const chunks = []
    for (let i = 0; i < handles.length; i += CHUNK) chunks.push(handles.slice(i, i + CHUNK))

    const handleToBar = {}
    for (const a of accounts) handleToBar[a.handle.toLowerCase()] = a

    const allTweets = []
    const usersById = {}
    const mediaByKey = {}

    for (const chunk of chunks) {
      const query = `(${chunk.map(h => `from:${h}`).join(' OR ')}) -is:reply -is:retweet`
      const data = await fetchFromTwitter(query)
      for (const u of (data.includes?.users || [])) usersById[u.id] = u
      for (const m of (data.includes?.media || [])) mediaByKey[m.media_key] = m
      for (const t of (data.data || [])) allTweets.push(t)
    }

    allTweets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    const tweets = allTweets.map(t => buildTweet(t, usersById, mediaByKey, handleToBar))
    payload = { tweets, accounts }
  }

  await writeCache('feed', payload)
  console.log('[feed] Main feed cache refreshed.')
  return payload
}

// Reads per-handle cache from DB; fetches from Twitter on miss and writes to cache.
export async function getOrFetchAccountFeed(handle) {
  const { rows } = await pool.query(
    `SELECT data FROM cache WHERE key = $1 AND expires_at > now()`,
    [`feed:${handle}`]
  )
  if (rows.length > 0) return rows[0].data

  if (!process.env.TWITTER_BEARER_TOKEN) return { tweets: null }

  const data = await fetchFromTwitter(`from:${handle} -is:reply -is:retweet`)
  const usersById = {}
  const mediaByKey = {}
  for (const u of (data.includes?.users || [])) usersById[u.id] = u
  for (const m of (data.includes?.media || [])) mediaByKey[m.media_key] = m

  const tweets = (data.data || []).map(t => buildTweet(t, usersById, mediaByKey, null))
  const result = { tweets }
  await writeCache(`feed:${handle}`, result)
  return result
}

# S02: Rate limits for public writes + feed abuse fixes

**Phase 2** · Size **M** · Agent ~2–3h · Review ~30 min · Depends on: S01 (trust proxy) · Touches: new `server/middleware/rateLimits.js`, `server/routes/reviews.js`, `server/routes/chat.js`, `server/routes/feed.js`, `server/jobs/feedRefresh.js`, `server/index.js`

## Why
- `POST /api/reviews` has no rate limit, so it's an open spam cannon (and each review can carry a 150 kB drawing).
- Chat's 1 msg/s limit is per **socket**, so reconnecting bypasses it.
- `/api/feed/account/:handle` fetches **any** handle from the paid Twitter API with no auth, so anyone can burn the quota.
- `feedRefresh.js` says it runs "every 30 minutes", but nothing schedules it. Concurrent cache misses each call Twitter (a stampede).
- Every admin route except `/api/admin/check` is unlimited, so the password can be brute-forced via `PATCH /api/bars/1`.

## Steps
1. `server/middleware/rateLimits.js` exports configured limiters:
   - `adminAuthLimiter`: 20 per 15 min, counting failed attempts only. Apply it to the `admin` middleware itself so **every** admin route counts.
   - `reviewLimiter`: 5 per 10 min per IP
   - `publicWriteLimiter`: generic, for later tasks (suggestions, guestbook)
   - `feedLimiter`: 60 per min
2. Chat: key the rate limit on IP (`socket.handshake.headers['x-forwarded-for']` first hop, else `x-real-ip`, else address), so it's 1 msg/s and 20 msgs/min per IP. Also cap check-in updates (e.g. 1 per 5 s).
3. Feed:
   - `/account/:handle` only serves handles that belong to an active bar's `sns` (look up via `parseTwitterHandle`). Anything else returns 404. Validate `^[A-Za-z0-9_]{1,15}$`.
   - Single-flight: keep an in-memory `Map<key, Promise>` so concurrent misses share one fetch.
   - Schedule `refreshFeedCache()` at startup and every 30 min (`setInterval`, skipped if no token). Log errors but never crash.
   - On Twitter errors, serve the stale cache if there is one (`expires_at` ignored) with `stale: true`.
4. Admin password check (found in S05): compare with `crypto.timingSafeEqual` (on equal-length buffers) in both `server/middleware/admin.js` and its `isAdminRequest` helper.
5. Return `429` JSON `{ error: 'rate_limited' }`, and make the frontend show a Win95 message ("Slow down! Try again in a minute.") in ReviewDialog and ChatWindow.

## Acceptance criteria
- [ ] The 6th review within 10 min from one IP gets 429 and the UI shows a friendly message
- [ ] `/api/feed/account/randomperson` → 404
- [ ] 10 parallel requests on a cold `/api/feed` cause one upstream call (log it)
- [ ] 21 bad admin passwords on `PATCH /api/bars/1` → 429

## Note: client IP (already fixed, don't redo)
`nginx.conf` now resolves the real visitor address with the realip module (trusting `X-Forwarded-For` only from private/loopback peers) and forwards exactly one address, so `req.ip` (with `trust proxy = 1`) is per visitor even when a NAS proxy or cloudflared tunnel sits in front. Key every limiter on `req.ip`; for Socket.io use the `x-real-ip` handshake header as `chat.js` already does. The chat message limit is currently per socket id, so reconnecting resets it: key it on the IP as part of this task.

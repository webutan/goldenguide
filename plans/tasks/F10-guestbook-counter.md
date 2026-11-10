# F10: About window: guestbook + retro hit counter

**Phase 5** · Size **S–M** · Agent ~2–3h · Review ~20 min · Depends on: S02 (limiter), S04 patterns (moderation) · Touches: `server/migrate.js`, new `server/routes/guestbook.js`, new `server/routes/stats.js`, `server/index.js`, new `src/components/AboutWindow.vue`, `App.vue` (replace the "Coming soon" placeholder for `about`)

## Why
"About" currently says "Coming soon". A 90s-web guestbook and odometer counter are on-theme social proof ("you are visitor #012,345").

## Steps
1. Counter: `POST /api/stats/visit`, counted once per browser per day (a localStorage date flag client-side, plus IP-hash dedupe per day server-side). `GET /api/stats` → `{ visitors, barsListed, reviews }`. The odometer renders as pixel digits in a sunken box, with a roll animation.
2. Guestbook table `(id, nickname, country_flag TEXT NULL, message ≤ 280, created_at, hidden)`. `POST` is rate-limited (3/hour/IP). `GET` is paginated 20 at a time. Admin can hide or delete (same pattern as S04). The flag is chosen from a small dropdown, never inferred from the IP.
3. AboutWindow tabs: **General** (what this is, credits, "made with ♥ in Shinjuku", links), **Guestbook** (list + sign form), **System** ("GAI OS v6.0", visitor counter, "Bars listed: 281", last data update).
4. Strings bilingual.

## Acceptance criteria
- [ ] Counter increments once per browser per day
- [ ] Guestbook post / list / hide works; rate limit enforced
- [ ] No raw IPs stored

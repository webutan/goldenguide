# F12: Feed that doesn't depend on the X API

**Phase 5** · Size **M** · Agent ~3h · Review ~20 min · Depends on: S01, S02 · Touches: `server/migrate.js`, new `server/routes/news.js`, `server/routes/feed.js`, `FeedWindow.vue`, `BarTwitterPanel.vue`, `AdminPanel.vue`

## Why
The X API's search endpoint is paid and limited. Even after S01 the feed may be empty or expensive. The feed window should always have something in it.

## Steps
1. **News posts** (admin-curated): table `news(id, bar_id NULL, title_en, title_jp, body_en, body_jp, image, link, starts_at, ends_at, pinned)`. Examples: events, closures, "new bar opened", holiday hours. Admin CRUD UI in AdminPanel (a new tab).
2. **Feed merge:** `GET /api/feed` returns tweets (if any) plus active news posts, sorted, with a `source` field. FeedWindow renders news as Win95 "Bulletin" cards with a pin icon; tweets stay as they are.
3. **Per-bar panel:** if there's no tweet data, show the bar's links (Instagram, website, `other_links`) as Win95 shortcut icons ("Instagram.lnk") and its news posts, instead of an empty or error state.
4. Graceful states: never show raw API errors to users (today `/account` returns `Twitter API error: …` text). Log them server-side only.

## Acceptance criteria
- [ ] With no Twitter token: the feed shows news posts and the bar panels show links, with no error text
- [ ] With a token: tweets and news interleave by date
- [ ] Admin can create, edit and expire a news post

# S01: Deployment env passthrough, trust proxy, DB error handling

**Phase 2** · Size **S** · Agent ~1h · Review ~15 min · Depends on: none · Touches: `docker-compose.yml`, `.env.example`, `server/index.js`, `server/db.js`, `PROJECT_GUIDE.md`, `KNOWN_ISSUES.md`

## Why
- The `api` service only receives `DATABASE_URL`, `PORT` and `ADMIN_PASSWORD`. `CORS_ORIGIN` and `TWITTER_BEARER_TOKEN` are never passed, and `dotenv` looks for `/.env` inside the container, which doesn't exist. **The feed likely never works in production.**
- `express-rate-limit` keys on IP, but `trust proxy` isn't set, so every request looks like it comes from the nginx container. The admin limiter (20 per 15 min) is **shared by all users**: one person guessing passwords locks everyone out, including the owner.
- `pg.Pool` has no `error` listener, so an idle-client error (DB restart) crashes the API process.
- The `db` service mounts the whole repo (`./:/import:ro`), which puts `.env` inside the DB container.

## Steps
1. `docker-compose.yml` `api.environment`: add `CORS_ORIGIN: ${CORS_ORIGIN:-}` and `TWITTER_BEARER_TOKEN: ${TWITTER_BEARER_TOKEN:-}`. Add `TWITTER_BEARER_TOKEN=` to `.env.example` with a comment.
2. `server/index.js`: `app.set('trust proxy', 1)`, so nginx's `X-Forwarded-For` is trusted.
3. `server/db.js`: `pool.on('error', err => console.error('[pg] idle client error', err.message))`.
4. Replace `./:/import:ro` with a dedicated `./db-import:/import:ro` folder (git-ignored) and document it, or remove it if nothing uses it (check `scripts/`).
5. Add `GET /api/health` (checks `SELECT 1`) and a compose `healthcheck` for `api`.
6. Update the docs (`PROJECT_GUIDE.md §9`, `KNOWN_ISSUES.md`: mark CORS/rate-limit items accordingly). Also mention the uploads bind-mount advice that's already in KNOWN_ISSUES. **Don't** change the uploads volume itself, because that risks data loss; the owner will migrate it manually.

## Acceptance criteria
- [ ] `docker compose config` shows both new variables on `api`
- [ ] Two different `X-Forwarded-For` IPs get independent rate-limit counters (test with curl against the API directly)
- [ ] Killing Postgres while the API idles doesn't crash the API, and it recovers when Postgres returns

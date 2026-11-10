# S05: Bars route correctness + chat pruning efficiency

**Phase 2** · Size **S** · Agent ~1.5h · Review ~15 min · Depends on: none · Touches: `server/routes/bars.js`, `server/routes/chat.js`, `server/routes/partitions.js`

## Why
- `PATCH /api/bars/:id` doesn't check `parseInt` for NaN. It deletes and re-inserts tags with N queries and **no transaction**, so a failure halfway leaves a bar with half its tags. It returns the bar without `tags` or `photo`, so the client must reload everything.
- `POST /api/bars` ignores `building_id`, `drink_price`, `cash_only`, `google_link`, `schedule`, `other_links`, `lat/lng`.
- `GET /api/bars` returns inactive bars too (`is_active` is never filtered). Decide: public GET filters `is_active = true`, and admin requests (with a valid admin header) get everything.
- Chat runs `DELETE ... WHERE id NOT IN (SELECT ... LIMIT 500)` on **every** message.
- `PUT /api/partitions/:buildingId` stores any JSON body unvalidated.

## Steps
1. PATCH: validate the id; use a transaction (`BEGIN`/`COMMIT` on one client); insert tags in one statement (`INSERT ... SELECT unnest($2::text[])`); return the same shape as `GET /api/bars` for that bar (share the SELECT via a helper).
2. POST: use the same `allowedFields` list as PATCH (one shared constant), and generate a slug from `name_en`/`name_jp` if none is given.
3. GET: filter `is_active` for non-admin requests.
4. Chat: prune with `DELETE FROM chat_messages WHERE id < (SELECT id FROM chat_messages ORDER BY id DESC OFFSET 500 LIMIT 1)`, and only every 50th insert.
5. Photos (found during S03): `GET /api/bars/:bar_id/photos` must validate `bar_id` as a positive integer (currently a 500 on non-numeric). Restrict the photo upload `type` field to an allow-list (`general`, `interior`, `exterior`, `menu`, `sign`; default `general`).
6. Partitions: validate the body is an object, `partitions` an array (≤ 8 items), numeric fields finite, size ≤ 20 kB.

## Acceptance criteria
- [ ] `PATCH /api/bars/abc` → 400
- [ ] Killing the DB connection mid-tag-update leaves the old tags intact (or simulate a bad tag id: the FK error rolls back everything)
- [ ] The PATCH response includes `tags`
- [ ] Inactive bars are hidden from the public list but visible in admin mode

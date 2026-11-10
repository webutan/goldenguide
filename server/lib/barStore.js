// Bar queries shared by the bars routes and POST /api/suggestions/:id/apply,
// so there is exactly one implementation of "update a bar". Every function
// takes the DB handle: a pool, or a client whose transaction the caller owns.

// Every bars column plus `tags` and the first `photo` filename (the
// GET /api/bars shape). `where` is an optional SQL condition on `b`.
export async function selectBars(db, where = '', params = []) {
  const { rows } = await db.query(`
    SELECT b.*,
      COALESCE(
        json_agg(json_build_object('id', t.id, 'label', t.label, 'label_jp', t.label_jp, 'icon', t.icon, 'color', t.color))
        FILTER (WHERE t.id IS NOT NULL),
        '[]'
      ) AS tags,
      (SELECT p.filename FROM photos p WHERE p.bar_id = b.id ORDER BY p.sort_order, p.uploaded_at LIMIT 1) AS photo
    FROM bars b
    LEFT JOIN bar_tags bt ON bt.bar_id = b.id
    LEFT JOIN tags t ON t.id = bt.tag_id
    ${where ? `WHERE ${where}` : ''}
    GROUP BY b.id
    ORDER BY b.street, b.floor, b.name_jp
  `, params)
  return rows
}

// Replace a bar's tags with one DELETE + one INSERT (caller owns the transaction).
export async function replaceTags(client, barId, tagIds) {
  await client.query('DELETE FROM bar_tags WHERE bar_id = $1', [barId])
  if (tagIds.length > 0) {
    await client.query(
      'INSERT INTO bar_tags (bar_id, tag_id) SELECT $1, unnest($2::text[]) ON CONFLICT DO NOTHING',
      [barId, tagIds]
    )
  }
}

// Map Postgres constraint / type errors caused by bad input to a 4xx.
export function clientError(err) {
  switch (err.code) {
    case '23503': return { status: 400, error: 'Unknown tag id' }
    case '23505': return { status: 409, error: 'A bar with that slug already exists' }
    case '23502': return { status: 400, error: `Missing required field: ${err.column || 'unknown'}` }
    case '22P02': // invalid text representation (e.g. "abc" for an integer)
    case '22003': // numeric out of range
    case '22023': // invalid parameter value
    case '22P05': // untranslatable character
      return { status: 400, error: 'Invalid field value' }
    default: return null
  }
}

/**
 * Update one bar inside the caller's transaction: lock the row, set `fields`
 * (`[[column, value], ...]` from pickBarFields, so only whitelisted columns)
 * and, when `tagIds` is an array, replace its tags.
 * @returns the bar in the GET /api/bars shape, or null if there is no such bar
 *   (nothing is written then; the caller rolls back).
 */
export async function updateBarInTransaction(client, id, { fields = [], tagIds = null } = {}) {
  const exists = await client.query('SELECT 1 FROM bars WHERE id = $1 FOR UPDATE', [id])
  if (exists.rows.length === 0) return null

  if (fields.length > 0) {
    const sets = fields.map(([key], i) => `${key} = $${i + 1}`)
    sets.push('updated_at = now()')
    await client.query(
      `UPDATE bars SET ${sets.join(', ')} WHERE id = $${fields.length + 1}`,
      [...fields.map(([, v]) => v), id]
    )
  }
  if (tagIds) await replaceTags(client, id, tagIds)

  const [bar] = await selectBars(client, 'b.id = $1', [id])
  return bar
}

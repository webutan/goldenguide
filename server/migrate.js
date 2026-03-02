import { readdir, readFile } from 'fs/promises'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pool from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SQL_DIR = resolve(__dirname, 'sql')

export async function runMigrations() {
  const client = await pool.connect()
  try {
    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id         SERIAL PRIMARY KEY,
        filename   TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)

    // Get list of already-applied migrations
    const { rows } = await client.query('SELECT filename FROM _migrations')
    const applied = new Set(rows.map(r => r.filename))

    // Read and sort SQL files
    const files = (await readdir(SQL_DIR))
      .filter(f => f.endsWith('.sql'))
      .sort()

    for (const file of files) {
      if (applied.has(file)) continue

      console.log(`Applying migration: ${file}`)
      const sql = await readFile(resolve(SQL_DIR, file), 'utf8')

      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file])
        await client.query('COMMIT')
        console.log(`  ✓ ${file}`)
      } catch (err) {
        await client.query('ROLLBACK')
        throw new Error(`Migration ${file} failed: ${err.message}`)
      }
    }

    console.log('Migrations complete.')
  } finally {
    client.release()
  }
}

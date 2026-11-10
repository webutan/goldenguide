import pg from 'pg'
import dotenv from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '..', '.env') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

// Without a listener, an error on an idle client (e.g. Postgres restarting)
// is emitted as an unhandled 'error' event and crashes the process.
// The pool discards the broken client and opens a new one on the next query.
pool.on('error', err => console.error('[pg] idle client error', err.message))

export default pool

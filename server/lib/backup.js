// Automatic database backup, taken when the API starts (i.e. on every update
// or restart) and always before any migration runs. Backups are gzipped plain
// SQL written by pg_dump to BACKUP_DIR; restore one with scripts/restore-db.sh.
//
// BACKUP_ON_START:
//   required  a failed backup stops the start-up when migrations are pending,
//             so the schema is never changed without a copy (Docker default)
//   auto      try; on failure warn and carry on (default outside Docker)
//   off       never back up
import { spawn } from 'child_process'
import { createWriteStream } from 'fs'
import { mkdir, readdir, rename, stat, unlink } from 'fs/promises'
import { createGzip } from 'zlib'
import { pipeline } from 'stream/promises'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export const DEFAULT_KEEP = 14
// A restart within this window of the last backup doesn't take another one
// (crash loops, quick restarts) unless migrations are pending.
export const MIN_INTERVAL_MS = 60 * 60 * 1000

const NAME_RE = /^golden-gai-(\d{8})-(\d{6})(?:-before-[A-Za-z0-9._-]+)?\.sql\.gz$/

export function backupMode(env = process.env) {
  const mode = String(env.BACKUP_ON_START || 'auto').toLowerCase()
  return ['required', 'auto', 'off'].includes(mode) ? mode : 'auto'
}

export function backupDir(env = process.env) {
  return env.BACKUP_DIR ? resolve(env.BACKUP_DIR) : resolve(__dirname, '..', 'backups')
}

export function keepCount(env = process.env) {
  const n = Number.parseInt(env.BACKUP_KEEP, 10)
  return Number.isInteger(n) && n >= 1 ? n : DEFAULT_KEEP
}

/** golden-gai-YYYYMMDD-HHMMSS[-before-<migration>].sql.gz (UTC). */
export function backupFileName(date, firstPending) {
  const p = n => String(n).padStart(2, '0')
  const stamp = `${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}` +
    `-${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}`
  const label = firstPending ? `-before-${String(firstPending).replace(/[^A-Za-z0-9._-]/g, '_')}` : ''
  return `golden-gai-${stamp}${label}.sql.gz`
}

/** Time encoded in a backup file name, or null if it isn't one of ours. */
export function backupTime(name) {
  const m = NAME_RE.exec(name)
  if (!m) return null
  const [, d, t] = m
  return Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8), +t.slice(0, 2), +t.slice(2, 4), +t.slice(4, 6))
}

/** Our backup files, newest first. Other files in the folder are ignored. */
export function sortBackups(names) {
  return names.filter(n => backupTime(n) !== null).sort((a, b) => backupTime(b) - backupTime(a))
}

/** Files to delete so that only the newest `keep` remain. */
export function backupsToPrune(names, keep) {
  return sortBackups(names).slice(Math.max(1, keep))
}

/**
 * Decide what to do at start-up.
 * @returns {'skip'|'backup'} with a reason, given the mode, whether the
 *   database already holds data, pending migrations and the last backup time.
 */
export function backupDecision({ mode, hasData, pendingCount, lastBackupAt, now }) {
  if (mode === 'off') return { action: 'skip', reason: 'BACKUP_ON_START=off' }
  if (!hasData) return { action: 'skip', reason: 'new database, nothing to back up' }
  if (pendingCount > 0) return { action: 'backup', reason: `${pendingCount} migration(s) pending` }
  if (lastBackupAt != null && now - lastBackupAt < MIN_INTERVAL_MS) {
    return { action: 'skip', reason: 'a backup was taken less than an hour ago' }
  }
  return { action: 'backup', reason: 'start-up' }
}

function dumpTo(file, databaseUrl) {
  return new Promise((resolvePromise, reject) => {
    // --clean --if-exists: the dump can also be loaded over an existing schema.
    const child = spawn('pg_dump', ['--no-owner', '--no-privileges', '--clean', '--if-exists', `--dbname=${databaseUrl}`], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stderr = ''
    child.stderr.on('data', (d) => { stderr = (stderr + d).slice(-2000) })
    const written = pipeline(child.stdout, createGzip(), createWriteStream(file, { mode: 0o600 }))
    child.on('error', (err) => {
      reject(err.code === 'ENOENT' ? new Error('pg_dump is not installed') : err)
    })
    child.on('close', (code) => {
      written.then(
        () => (code === 0 ? resolvePromise() : reject(new Error(`pg_dump exited with ${code}: ${stderr.trim()}`))),
        reject,
      )
    })
  })
}

/**
 * Take a backup if the decision says so. Resolves to the file path, or null
 * when skipped. Rejects when the backup fails (the caller applies the mode).
 */
export async function backupOnStart({ hasData, pending = [], env = process.env, log = console.log, now = () => new Date() } = {}) {
  const mode = backupMode(env)
  const dir = backupDir(env)
  let existing = []
  try { existing = await readdir(dir) } catch { /* created below */ }
  const newest = sortBackups(existing)[0]
  const decision = backupDecision({
    mode, hasData, pendingCount: pending.length,
    lastBackupAt: newest ? backupTime(newest) : null, now: now().getTime(),
  })
  if (decision.action === 'skip') {
    log(`[backup] skipped: ${decision.reason}`)
    return null
  }
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set')

  await mkdir(dir, { recursive: true })
  const name = backupFileName(now(), pending[0])
  const file = join(dir, name)
  const tmp = `${file}.part`
  try {
    await dumpTo(tmp, env.DATABASE_URL)
    const { size } = await stat(tmp)
    if (size < 200) throw new Error('backup file is empty')
    await rename(tmp, file)
    log(`[backup] ${decision.reason}: wrote ${file} (${Math.round(size / 1024)} kB)`)
  } catch (err) {
    await unlink(tmp).catch(() => {})
    throw err
  }

  for (const old of backupsToPrune([...existing, name], keepCount(env))) {
    await unlink(join(dir, old)).catch(() => {})
  }
  return file
}

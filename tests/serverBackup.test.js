import { describe, it, expect } from 'vitest'
import {
  backupMode, keepCount, backupFileName, backupTime, sortBackups, backupsToPrune, backupDecision,
  DEFAULT_KEEP, MIN_INTERVAL_MS,
} from '../server/lib/backup.js'

const at = (iso) => new Date(iso)

describe('backup settings', () => {
  it('reads the mode, defaulting to auto', () => {
    expect(backupMode({})).toBe('auto')
    expect(backupMode({ BACKUP_ON_START: 'Required' })).toBe('required')
    expect(backupMode({ BACKUP_ON_START: 'off' })).toBe('off')
    expect(backupMode({ BACKUP_ON_START: 'nonsense' })).toBe('auto')
  })
  it('reads how many to keep, never fewer than one', () => {
    expect(keepCount({})).toBe(DEFAULT_KEEP)
    expect(keepCount({ BACKUP_KEEP: '3' })).toBe(3)
    expect(keepCount({ BACKUP_KEEP: '0' })).toBe(DEFAULT_KEEP)
    expect(keepCount({ BACKUP_KEEP: 'abc' })).toBe(DEFAULT_KEEP)
  })
})

describe('backup file names', () => {
  it('encodes the UTC time and the first pending migration', () => {
    expect(backupFileName(at('2026-11-11T03:04:05Z'))).toBe('golden-gai-20261111-030405.sql.gz')
    expect(backupFileName(at('2026-11-11T03:04:05Z'), '016-suggestions'))
      .toBe('golden-gai-20261111-030405-before-016-suggestions.sql.gz')
  })
  it('never lets a migration name add path characters', () => {
    expect(backupFileName(at('2026-01-02T00:00:00Z'), '../../etc/x y')).toBe('golden-gai-20260102-000000-before-.._.._etc_x_y.sql.gz')
  })
  it('round-trips the time and ignores foreign files', () => {
    const name = backupFileName(at('2026-11-11T03:04:05Z'), '017-ref-hits')
    expect(backupTime(name)).toBe(at('2026-11-11T03:04:05Z').getTime())
    expect(backupTime('golden-gai-20261111-030405-before-restore.sql.gz')).not.toBeNull()
    expect(backupTime('notes.txt')).toBeNull()
    expect(backupTime('golden-gai-20261111-030405.sql.gz.part')).toBeNull()
  })
})

describe('retention', () => {
  const names = [
    'golden-gai-20261101-000000.sql.gz',
    'golden-gai-20261103-000000-before-016-suggestions.sql.gz',
    'golden-gai-20261102-000000.sql.gz',
    'README.txt',
    'golden-gai-20261104-000000.sql.gz.part',
  ]
  it('sorts newest first and ignores other files', () => {
    expect(sortBackups(names)).toEqual([
      'golden-gai-20261103-000000-before-016-suggestions.sql.gz',
      'golden-gai-20261102-000000.sql.gz',
      'golden-gai-20261101-000000.sql.gz',
    ])
  })
  it('prunes only the oldest beyond the limit, and never the newest', () => {
    expect(backupsToPrune(names, 2)).toEqual(['golden-gai-20261101-000000.sql.gz'])
    expect(backupsToPrune(names, 14)).toEqual([])
    expect(backupsToPrune(names, 0)).toHaveLength(2)
  })
})

describe('backupDecision', () => {
  const now = at('2026-11-11T12:00:00Z').getTime()
  const base = { mode: 'required', hasData: true, pendingCount: 0, lastBackupAt: null, now }
  it('skips when off or when the database is new', () => {
    expect(backupDecision({ ...base, mode: 'off', pendingCount: 3 }).action).toBe('skip')
    expect(backupDecision({ ...base, hasData: false, pendingCount: 17 }).action).toBe('skip')
  })
  it('always backs up before pending migrations, even right after another backup', () => {
    expect(backupDecision({ ...base, pendingCount: 2, lastBackupAt: now - 1000 }).action).toBe('backup')
  })
  it('backs up on a plain start unless one was taken within the hour', () => {
    expect(backupDecision(base).action).toBe('backup')
    expect(backupDecision({ ...base, lastBackupAt: now - MIN_INTERVAL_MS - 1 }).action).toBe('backup')
    expect(backupDecision({ ...base, lastBackupAt: now - 5 * 60 * 1000 }).action).toBe('skip')
  })
})

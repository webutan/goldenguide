import { describe, it, expect } from 'vitest'
import {
  REPORT_AUTO_HIDE_THRESHOLD, ADMIN_REVIEW_STATUSES, parseAdminReviewStatus, shouldAutoHide,
} from '../server/lib/reviewModeration.js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// migrate.js opens a DB pool on import, so check its source text instead.
const migrateSrc = readFileSync(fileURLToPath(new URL('../server/migrate.js', import.meta.url)), 'utf8')

describe('shouldAutoHide', () => {
  it('hides at the threshold, not before', () => {
    expect(REPORT_AUTO_HIDE_THRESHOLD).toBe(3)
    expect(shouldAutoHide({ reportCount: 0, autoHideExempt: false })).toBe(false)
    expect(shouldAutoHide({ reportCount: 2, autoHideExempt: false })).toBe(false)
    expect(shouldAutoHide({ reportCount: 3, autoHideExempt: false })).toBe(true)
    expect(shouldAutoHide({ reportCount: 50, autoHideExempt: false })).toBe(true)
  })
  it('never hides a review an admin has un-hidden', () => {
    expect(shouldAutoHide({ reportCount: 3, autoHideExempt: true })).toBe(false)
    expect(shouldAutoHide({ reportCount: 500, autoHideExempt: true })).toBe(false)
  })
  it('does not hide on a malformed count', () => {
    for (const reportCount of [undefined, null, NaN, '3', 3.5]) {
      expect(shouldAutoHide({ reportCount, autoHideExempt: false })).toBe(false)
    }
  })
})

describe('parseAdminReviewStatus', () => {
  it('accepts the known filters', () => {
    for (const s of ADMIN_REVIEW_STATUSES) expect(parseAdminReviewStatus(s)).toBe(s)
  })
  it('falls back to the reported queue', () => {
    for (const s of [undefined, '', 'ALL', 'deleted', ['all'], 1]) {
      expect(parseAdminReviewStatus(s)).toBe('reported')
    }
  })
})

describe('migration 015-review-moderation', () => {
  it('is appended after 014 with a unique (review_id, reporter) report table', () => {
    const names = [...migrateSrc.matchAll(/^\s*name: '([^']+)'/gm)].map(m => m[1])
    expect(names.indexOf('015-review-moderation')).toBe(names.indexOf('014-annotation-images') + 1)
    expect(new Set(names).size).toBe(names.length)
    const sql = migrateSrc.slice(migrateSrc.indexOf("name: '015-review-moderation'"))
    expect(sql).toMatch(/UNIQUE \(review_id, reporter\)/)
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT false/)
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS report_count INT NOT NULL DEFAULT 0/)
  })
})

describe('reporterKey', () => {
  it('is stable per IP and secret, differs across IPs, and never contains the IP', async () => {
    const { reporterKey } = await import('../server/lib/reviewModeration.js')
    const a = reporterKey('203.0.113.7', 's')
    expect(a).toBe(reporterKey('203.0.113.7', 's'))
    expect(a).not.toBe(reporterKey('203.0.113.8', 's'))
    expect(a).not.toBe(reporterKey('203.0.113.7', 'other'))
    expect(a).not.toContain('203.0.113.7')
    expect(a).toMatch(/^[0-9a-f]{32}$/)
  })
})

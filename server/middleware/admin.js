import { createHash, timingSafeEqual } from 'crypto'
import { adminAuthLimiter, sendRateLimited } from './rateLimits.js'
import { ipKey } from '../lib/rateLimitCore.js'

const sha256 = value => createHash('sha256').update(String(value)).digest()

// Constant-time password comparison. Both sides are hashed first so the
// buffers always have equal length (timingSafeEqual requires it) and the
// comparison time does not depend on the length of either value.
function passwordMatches(given, expected) {
  if (typeof given !== 'string' || typeof expected !== 'string' || !expected) return false
  return timingSafeEqual(sha256(given), sha256(expected))
}

// Failed attempts are counted per IP (limits in rateLimits.js). Rules:
// - a request with the correct password is never counted;
// - once an IP has used up its failures it is locked out until they age out,
//   and during the lockout even the correct password is refused. This is
//   deliberate: letting the right password through would turn the lockout
//   into an unlimited "is this the password?" oracle.

// True if the request carries the correct admin password header.
// Used by public routes that show admins more (e.g. inactive bars).
// A request without the header is an ordinary visitor: not an attempt.
export function isAdminRequest(req) {
  const password = process.env.ADMIN_PASSWORD
  const given = req.headers['x-admin-password']
  if (!password || given === undefined) return false
  const ip = ipKey(req)
  if (adminAuthLimiter.isBlocked(ip)) return false
  if (passwordMatches(given, password)) return true
  adminAuthLimiter.hit(ip)
  return false
}

export default function admin(req, res, next) {
  const password = process.env.ADMIN_PASSWORD
  if (!password) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD not configured' })
  }
  const ip = ipKey(req)
  if (adminAuthLimiter.isBlocked(ip)) {
    return sendRateLimited(res, adminAuthLimiter.retryAfterMs(ip))
  }
  if (!passwordMatches(req.headers['x-admin-password'], password)) {
    adminAuthLimiter.hit(ip)
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

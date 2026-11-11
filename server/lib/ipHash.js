import { createHmac } from 'crypto'

// Keyed hash of a visitor's IP address, for tables that need "the same
// visitor" without ever holding the address itself (review reports, edit
// suggestions). The key is the admin password: changing it only means old
// hashes stop matching new ones, which is harmless.
export function hashIp(ip, secret = process.env.ADMIN_PASSWORD || 'golden-gai') {
  return createHmac('sha256', String(secret)).update(String(ip || 'unknown')).digest('hex').slice(0, 32)
}

export default function admin(req, res, next) {
  const password = process.env.ADMIN_PASSWORD
  if (!password) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD not configured' })
  }
  if (req.headers['x-admin-password'] !== password) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

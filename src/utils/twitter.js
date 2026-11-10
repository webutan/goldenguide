// Extract the handle from a bar's `sns` URL when it is a Twitter/X profile,
// else null. Keep in step with parseTwitterHandle in server/lib/feedCore.js
// (tests/twitter.test.js runs the same cases against both).
export function parseTwitterHandle(url) {
  if (!url) return null
  const match = String(url).trim().match(/^(?:https?:\/\/)?(?:www\.|mobile\.)?(?:twitter\.com|x\.com)\/@?([A-Za-z0-9_]+)/i)
  if (!match) return null
  const skip = ['intent', 'search', 'hashtag', 'i', 'share']
  if (skip.includes(match[1].toLowerCase())) return null
  return match[1]
}

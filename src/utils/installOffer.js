// When to offer the "Install GAI OS" wizard on its own (G03): once, from a
// visitor's second visit on, and never in the middle of something else.
// Pure; the storage keys live in App.vue.

/** A reload or a quick return is the same visit. */
export const VISIT_GAP_MS = 30 * 60 * 1000

export function isVisitState(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Number.isInteger(value.count) && value.count >= 0
    && typeof value.last === 'number' && Number.isFinite(value.last)
}

/**
 * Count a page load. Returns the new `{ count, last }`: the count goes up
 * only when the previous counted load was more than VISIT_GAP_MS ago.
 */
export function recordVisit(previous, now) {
  const prev = isVisitState(previous) ? previous : { count: 0, last: 0 }
  // A clock set back must not freeze the counter
  const elapsed = now - prev.last
  if (prev.count > 0 && elapsed >= 0 && elapsed < VISIT_GAP_MS) return prev
  return { count: prev.count + 1, last: now }
}

/**
 * @param {object} s
 * @param {number} s.visits        visit count including this one
 * @param {boolean} s.offered      the wizard was offered (or opened) before
 * @param {'prompt'|'ios'|'manual'|'installed'} s.installMode
 * @param {boolean} s.onboarding   BIOS, language/first-time questions, rules or tour on screen
 * @param {boolean} s.deepLink     this visit started on /map, /directory or /bar/...
 * @param {boolean} s.admin
 * @param {boolean} s.busy         a dialog or a bar card is open
 */
export function shouldOfferInstall({ visits, offered, installMode, onboarding, deepLink, admin, busy }) {
  if (offered || onboarding || deepLink || admin || busy) return false
  if (!(visits >= 2)) return false
  // Only where installing is actually possible from here
  return installMode === 'prompt' || installMode === 'ios'
}

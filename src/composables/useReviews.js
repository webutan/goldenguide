import { ref, computed } from 'vue'
import {
  fetchBarReviews, fetchWeeklyReviews, postReview, fetchAdminReviews,
  reportReview as apiReportReview, setReviewHidden, deleteReview as apiDeleteReview,
} from '../api/reviews.js'
import { useDialog } from './useDialog.js'
import { isAdmin } from './useAdmin.js'
import { mergeBarReviews } from '../utils/reviewLists.js'
import { readJSON, writeJSON, isNumberArray } from '../utils/storage.js'
import { rateLimitMessage } from '../utils/retryAfter.js'

const REPORTED_KEY = 'golden-gai-reported-reviews'
const REPORTED_MAX = 200

// How many hidden reviews of one bar the panel shows in admin mode
const HIDDEN_PER_BAR = 100

const reviews = ref([])
const weeklyReviews = ref([])
// Admin mode only: the current bar's hidden reviews, from the admin endpoint
// (the public one never returns them). Rows carry `has_drawing`, not the
// drawing; one hidden a moment ago keeps the drawing it was loaded with.
const hiddenReviews = ref([])
// What the bar's review panel lists: for visitors the public reviews, for an
// admin the hidden ones as well, in place.
const barReviews = computed(() =>
  isAdmin.value ? mergeBarReviews(reviews.value, hiddenReviews.value) : reviews.value
)
// Bar whose reviews are in `reviews` (so moderation can refresh the list).
let currentBarId = null
let barLoadSeq = 0
// Reviews this visitor has already reported: the button turns into "Reported".
// Only a convenience; the server enforces one report per IP per review.
const reportedIds = ref(readJSON(REPORTED_KEY, [], isNumberArray))

async function loadBarReviews(barId) {
  currentBarId = barId
  const seq = ++barLoadSeq
  const [publicList, hiddenList] = await Promise.all([
    fetchBarReviews(barId).catch(err => {
      console.error('loadBarReviews error:', err.message)
      return []
    }),
    isAdmin.value
      ? fetchAdminReviews({ status: 'hidden', barId, limit: HIDDEN_PER_BAR }).then(page => page.items).catch(err => {
        console.error('loadBarReviews (hidden) error:', err.message)
        return []
      })
      : [],
  ])
  // A newer load (another bar, or a refresh) has taken over
  if (seq !== barLoadSeq) return
  reviews.value = publicList
  hiddenReviews.value = hiddenList
}

async function loadWeeklyReviews() {
  try {
    weeklyReviews.value = await fetchWeeklyReviews()
  } catch (err) {
    console.error('loadWeeklyReviews error:', err.message)
    weeklyReviews.value = []
  }
}

async function submitReview({ barId, nickname, text, drawing }) {
  const review = await postReview({ barId, nickname, text, drawing })
  reviews.value = [review, ...reviews.value]
  return review
}

// ── Moderation ──────────────────────────────────────────────────────────────

function hasReported(id) {
  return reportedIds.value.includes(id)
}

/** Drop a review from the public lists (after an admin hides or deletes it). */
function dropFromPublicLists(id) {
  reviews.value = reviews.value.filter(r => r.id !== id)
  weeklyReviews.value = weeklyReviews.value.filter(r => r.id !== id)
}

/** Re-fetch the public lists (after an admin un-hides a review). */
function refreshPublicLists() {
  loadWeeklyReviews()
  if (currentBarId != null) loadBarReviews(currentBarId)
}

/** Visitor flags a review: confirm, send, thank. Resolves true if it was sent. */
async function reportReview(review) {
  const dialog = useDialog()
  const { t } = dialog
  const title = t('reviewReportTitle')
  if (hasReported(review.id)) return false
  const ok = await dialog.confirm(t('reviewReportConfirm'), { title, icon: 'question', yesNo: true })
  if (!ok) return false
  try {
    await apiReportReview(review.id)
  } catch (err) {
    await dialog.alert(err.status === 429 ? rateLimitMessage(t, err.retryAfter) : t('reviewReportFailed'), { title, icon: 'error' })
    return false
  }
  if (!hasReported(review.id)) {
    reportedIds.value = [...reportedIds.value, review.id].slice(-REPORTED_MAX)
    writeJSON(REPORTED_KEY, reportedIds.value)
  }
  await dialog.alert(t('reviewReportThanks'), { title, icon: 'info' })
  return true
}

async function adminActionFailed(err) {
  const dialog = useDialog()
  console.error('review moderation error:', err.message)
  await dialog.alert(dialog.t('reviewAdminFailed'), { title: dialog.t('reviews'), icon: 'error' })
}

/** Admin hides (or un-hides) a review. Resolves with the updated review, or null. */
async function setHidden(review, hidden) {
  try {
    const updated = await setReviewHidden(review.id, hidden)
    if (hidden) {
      dropFromPublicLists(review.id)
      // The open bar panel keeps it, greyed out, so it can be un-hidden there
      if (isAdmin.value && updated.bar_id === currentBarId) {
        hiddenReviews.value = [
          { ...review, ...updated },
          ...hiddenReviews.value.filter(r => r.id !== review.id),
        ]
      }
    } else {
      // It stays listed as hidden until the fresh lists arrive
      refreshPublicLists()
    }
    return updated
  } catch (err) {
    await adminActionFailed(err)
    return null
  }
}

/** Admin deletes a review after a confirmation dialog. Resolves true if deleted. */
async function removeReview(review) {
  const dialog = useDialog()
  const { t } = dialog
  const ok = await dialog.confirm(
    t('reviewDeleteConfirm', { name: review.nickname }),
    { title: t('reviewDeleteTitle'), icon: 'warning', yesNo: true, defaultButton: 1 },
  )
  if (!ok) return false
  try {
    await apiDeleteReview(review.id)
  } catch (err) {
    await adminActionFailed(err)
    return false
  }
  dropFromPublicLists(review.id)
  hiddenReviews.value = hiddenReviews.value.filter(r => r.id !== review.id)
  return true
}

export function useReviews() {
  return {
    reviews, barReviews, weeklyReviews, loadBarReviews, loadWeeklyReviews, submitReview,
    hasReported, reportReview, setHidden, removeReview,
  }
}

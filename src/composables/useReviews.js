import { ref } from 'vue'
import {
  fetchBarReviews, fetchWeeklyReviews, postReview,
  reportReview as apiReportReview, setReviewHidden, deleteReview as apiDeleteReview,
} from '../api/reviews.js'
import { useDialog } from './useDialog.js'
import { readJSON, writeJSON, isNumberArray } from '../utils/storage.js'

const REPORTED_KEY = 'golden-gai-reported-reviews'
const REPORTED_MAX = 200

const reviews = ref([])
const weeklyReviews = ref([])
// Bar whose reviews are in `reviews` (so moderation can refresh the list).
let currentBarId = null
// Reviews this visitor has already reported: the button turns into "Reported".
// Only a convenience; the server enforces one report per IP per review.
const reportedIds = ref(readJSON(REPORTED_KEY, [], isNumberArray))

async function loadBarReviews(barId) {
  currentBarId = barId
  try {
    reviews.value = await fetchBarReviews(barId)
  } catch (err) {
    console.error('loadBarReviews error:', err.message)
    reviews.value = []
  }
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
    await dialog.alert(err.status === 429 ? t('rateLimited') : t('reviewReportFailed'), { title, icon: 'error' })
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
    if (hidden) dropFromPublicLists(review.id)
    else refreshPublicLists()
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
  return true
}

export function useReviews() {
  return {
    reviews, weeklyReviews, loadBarReviews, loadWeeklyReviews, submitReview,
    hasReported, reportReview, setHidden, removeReview,
  }
}

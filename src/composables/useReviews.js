import { ref } from 'vue'
import { fetchBarReviews, fetchWeeklyReviews, postReview } from '../api/reviews.js'

const reviews = ref([])
const weeklyReviews = ref([])

async function loadBarReviews(barId) {
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

export function useReviews() {
  return { reviews, weeklyReviews, loadBarReviews, loadWeeklyReviews, submitReview }
}

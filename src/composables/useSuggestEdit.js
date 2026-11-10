// "Suggest an edit" state shared by the bar cards, the Start menu, the single
// <SuggestEditHost /> mounted in App.vue, and the admin Inbox tab.
import { ref } from 'vue'
import { fetchSuggestionCount } from '../api/suggestions.js'

// { bar } to correct an existing bar, { bar: null } for "a bar we're missing"
const request = ref(null)
// Bumped after a successful send; the host shows the thank-you balloon
const thanksKey = ref(0)

// Open suggestions, for the admin "Inbox (N)" tab label
const openCount = ref(0)

export function useSuggestEdit() {
  function openSuggestEdit(bar) {
    if (bar && bar.id != null) request.value = { bar }
  }
  function openMissingBar() {
    request.value = { bar: null }
  }
  function closeSuggestEdit() {
    request.value = null
  }
  function showThanks() {
    thanksKey.value++
  }
  return { request, thanksKey, openSuggestEdit, openMissingBar, closeSuggestEdit, showThanks }
}

export function useSuggestionInbox() {
  async function refreshOpenCount() {
    try {
      openCount.value = await fetchSuggestionCount()
    } catch (err) {
      console.error('fetchSuggestionCount error:', err.message)
    }
  }
  return { openCount, refreshOpenCount }
}

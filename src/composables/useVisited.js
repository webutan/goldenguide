import { ref, computed } from 'vue'
import { readJSON, writeJSON } from '../utils/storage.js'

const VISITED_KEY = 'golden-gai-visited'
const FAVORITES_KEY = 'golden-gai-favorites'

// Keep the valid entries instead of discarding a user's whole history when
// one entry is malformed. Numeric strings (e.g. "12") are coerced to numbers.
export function sanitizeIds(value) {
  if (!Array.isArray(value)) return []
  const out = []
  for (const v of value) {
    const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v
    if (typeof n === 'number' && Number.isInteger(n) && !out.includes(n)) out.push(n)
  }
  return out
}

function loadIds(key) {
  return sanitizeIds(readJSON(key, [], Array.isArray))
}

const visitedIds = ref(loadIds(VISITED_KEY))
const favoritedIds = ref(loadIds(FAVORITES_KEY))

function saveVisited() {
  writeJSON(VISITED_KEY, visitedIds.value)
}

function saveFavorites() {
  writeJSON(FAVORITES_KEY, favoritedIds.value)
}

export function useVisited() {
  function isVisited(barId) {
    return visitedIds.value.includes(barId)
  }

  function toggleVisited(barId, onNewVisit) {
    const idx = visitedIds.value.indexOf(barId)
    if (idx === -1) {
      visitedIds.value = [...visitedIds.value, barId]
      saveVisited()
      onNewVisit?.()
    } else {
      visitedIds.value = visitedIds.value.filter(id => id !== barId)
      saveVisited()
    }
  }

  function isFavorited(barId) {
    return favoritedIds.value.includes(barId)
  }

  function toggleFavorited(barId) {
    const idx = favoritedIds.value.indexOf(barId)
    if (idx === -1) {
      favoritedIds.value.push(barId)
    } else {
      favoritedIds.value.splice(idx, 1)
    }
    saveFavorites()
  }

  const visitedCount = computed(() => visitedIds.value.length)

  return { visitedIds, isVisited, toggleVisited, visitedCount, favoritedIds, isFavorited, toggleFavorited }
}

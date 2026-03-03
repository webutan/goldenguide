import { ref, computed } from 'vue'

const VISITED_KEY = 'golden-gai-visited'
const FAVORITES_KEY = 'golden-gai-favorites'

function loadIds(key) {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

const visitedIds = ref(loadIds(VISITED_KEY))
const favoritedIds = ref(loadIds(FAVORITES_KEY))

function saveVisited() {
  localStorage.setItem(VISITED_KEY, JSON.stringify(visitedIds.value))
}

function saveFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoritedIds.value))
}

export function useVisited() {
  function isVisited(barId) {
    return visitedIds.value.includes(barId)
  }

  function toggleVisited(barId) {
    const idx = visitedIds.value.indexOf(barId)
    if (idx === -1) {
      visitedIds.value.push(barId)
    } else {
      visitedIds.value.splice(idx, 1)
    }
    saveVisited()
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

import { ref, computed } from 'vue'

const STORAGE_KEY = 'golden-gai-visited'

function loadVisited() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

const visitedIds = ref(loadVisited())

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(visitedIds.value))
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
    save()
  }

  const visitedCount = computed(() => visitedIds.value.length)

  return { visitedIds, isVisited, toggleVisited, visitedCount }
}

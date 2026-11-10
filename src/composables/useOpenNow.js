import { ref, watch, onUnmounted } from 'vue'
import { isBarOpen, tokyoNow } from '../utils/openNow.js'

export function useOpenNow(bars) {
  const openBarIds = ref(new Set())        // open or unknown (used by filter)
  const definitivelyOpenIds = ref(new Set()) // confirmed open
  const closedBarIds = ref(new Set())      // confirmed closed

  function refresh() {
    const now = tokyoNow()
    const ids = new Set()
    const openIds = new Set()
    const closedIds = new Set()
    for (const bar of bars.value) {
      const result = isBarOpen(bar.schedule, now)
      if (result === true || result === null) ids.add(String(bar.id))
      if (result === true) openIds.add(String(bar.id))
      if (result === false) closedIds.add(String(bar.id))
    }
    openBarIds.value = ids
    definitivelyOpenIds.value = openIds
    closedBarIds.value = closedIds
  }

  watch(bars, refresh, { immediate: true, deep: false })

  const interval = setInterval(refresh, 60000)
  onUnmounted(() => clearInterval(interval))

  return { openBarIds, definitivelyOpenIds, closedBarIds }
}

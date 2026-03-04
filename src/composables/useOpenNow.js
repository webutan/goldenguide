import { ref, watch, onUnmounted } from 'vue'

const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

function isBarOpen(schedule, now) {
  if (!schedule || !schedule.default) return null // unknown

  const day = DAY_NAMES[now.getDay()]
  const hours = now.getHours()
  const minutes = now.getMinutes()
  const currentMinutes = hours * 60 + minutes

  // Check if closed today
  if (schedule.closedDays && schedule.closedDays.includes(day)) {
    // But could still be open from yesterday's late-night hours
    const yesterday = DAY_NAMES[(now.getDay() + 6) % 7]
    if (schedule.closedDays.includes(yesterday)) return false
    const yHours = (schedule.overrides && schedule.overrides[yesterday]) || schedule.default
    const yOpen = timeToMinutes(yHours.open)
    const yClose = timeToMinutes(yHours.close)
    // Only applies if close is past midnight (close < open) and we're before the close time
    if (yClose < yOpen && currentMinutes < yClose) return true
    return false
  }

  // Get today's hours (override or default)
  const todayHours = (schedule.overrides && schedule.overrides[day]) || schedule.default
  const openMin = timeToMinutes(todayHours.open)
  const closeMin = timeToMinutes(todayHours.close)

  if (closeMin > openMin) {
    // Same-day closing (e.g. 10:00-22:00)
    return currentMinutes >= openMin && currentMinutes < closeMin
  } else {
    // Past-midnight closing (e.g. 18:00-02:00)
    // Open from openMin until midnight, or from midnight until closeMin
    if (currentMinutes >= openMin) return true
    if (currentMinutes < closeMin) return true

    // Also check if yesterday's hours carry over
    const yesterday = DAY_NAMES[(now.getDay() + 6) % 7]
    if (schedule.closedDays && schedule.closedDays.includes(yesterday)) return false
    const yHours = (schedule.overrides && schedule.overrides[yesterday]) || schedule.default
    const yOpen = timeToMinutes(yHours.open)
    const yClose = timeToMinutes(yHours.close)
    if (yClose < yOpen && currentMinutes < yClose) return true

    return false
  }
}

export function useOpenNow(bars) {
  const openBarIds = ref(new Set())        // open or unknown (used by filter)
  const definitivelyOpenIds = ref(new Set()) // confirmed open
  const closedBarIds = ref(new Set())      // confirmed closed

  function refresh() {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
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

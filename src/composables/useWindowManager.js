import { ref, computed } from 'vue'

const windows = ref([])
let nextZ = 10

export function useWindowManager() {
  function register(id, title, icon = '') {
    const existing = windows.value.find(w => w.id === id)
    if (existing) return existing
    const win = {
      id,
      title,
      icon,
      minimized: false,
      zIndex: nextZ++,
    }
    windows.value.push(win)
    return win
  }

  function unregister(id) {
    windows.value = windows.value.filter(w => w.id !== id)
  }

  function focus(id) {
    const win = windows.value.find(w => w.id === id)
    if (!win) return
    win.zIndex = nextZ++
    if (win.minimized) win.minimized = false
  }

  function minimize(id) {
    const win = windows.value.find(w => w.id === id)
    if (win) win.minimized = true
  }

  function restore(id) {
    const win = windows.value.find(w => w.id === id)
    if (!win) return
    win.minimized = false
    win.zIndex = nextZ++
  }

  function toggle(id) {
    const win = windows.value.find(w => w.id === id)
    if (!win) return
    if (win.minimized) {
      restore(id)
    } else if (isActive(id)) {
      minimize(id)
    } else {
      focus(id)
    }
  }

  function isActive(id) {
    const win = windows.value.find(w => w.id === id)
    if (!win || win.minimized) return false
    const maxZ = Math.max(...windows.value.filter(w => !w.minimized).map(w => w.zIndex))
    return win.zIndex === maxZ
  }

  function getWindow(id) {
    return windows.value.find(w => w.id === id)
  }

  const openWindows = computed(() =>
    windows.value.filter(w => !w.minimized)
  )

  return {
    windows,
    openWindows,
    register,
    unregister,
    focus,
    minimize,
    restore,
    toggle,
    isActive,
    getWindow,
  }
}

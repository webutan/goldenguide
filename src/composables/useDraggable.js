import { ref, onUnmounted } from 'vue'

// Minimum width of title bar that must stay on screen so a window can always
// be grabbed and dragged back.
export const MIN_VISIBLE_TITLE = 40

/**
 * Pure clamping maths for a window inside its container (the desktop area
 * above the taskbar). All values are in the container's own CSS pixels.
 *
 * - Horizontally the window may hang off either edge, but at least
 *   `minVisible` px of the draggable part of the title bar stays inside.
 *   `grabInsetRight` is the width at the right end of the window that is not
 *   draggable (the minimise/close buttons), so it doesn't count as visible
 *   title bar when the window hangs off the left edge.
 * - Vertically the whole title bar stays inside: never above the top and
 *   never below the container's bottom edge (i.e. under the taskbar).
 */
export function clampWindowPosition({
  x,
  y,
  width,
  titleBarHeight = 0,
  containerWidth,
  containerHeight,
  minVisible = MIN_VISIBLE_TITLE,
  grabInsetRight = 0,
}) {
  // Window too narrow to hang off the left at all → behaves like x >= 0
  const minX = Math.min(0, minVisible + grabInsetRight - width)
  const maxX = Math.max(minX, containerWidth - minVisible)
  const maxY = Math.max(0, containerHeight - titleBarHeight)
  const nx = Number.isFinite(x) ? x : 0
  const ny = Number.isFinite(y) ? y : 0
  return {
    x: Math.min(Math.max(nx, minX), maxX),
    y: Math.min(Math.max(ny, 0), maxY),
  }
}

/**
 * Pointer-event dragging (mouse, touch and pen).
 *
 * options.clamp(x, y) → { x, y }  keeps the position in bounds (default: x,y ≥ 0)
 * options.getScale()  → number    client px per position px. #app is rendered
 *                                 with CSS `zoom`, so pointer deltas (client
 *                                 px) have to be divided by it. Default 1.
 */
export function useDraggable(initialX = 0, initialY = 0, options = {}) {
  const clamp = options.clamp || ((px, py) => ({ x: Math.max(0, px), y: Math.max(0, py) }))
  const getScale = options.getScale || (() => 1)

  const x = ref(initialX)
  const y = ref(initialY)
  const isDragging = ref(false)

  let pointerId = null
  let captureEl = null
  let startClientX = 0
  let startClientY = 0
  let startX = 0
  let startY = 0
  let scale = 1

  function apply(newX, newY) {
    const p = clamp(newX, newY) || { x: newX, y: newY }
    x.value = p.x
    y.value = p.y
  }

  function onPointerMove(e) {
    if (!isDragging.value || e.pointerId !== pointerId) return
    apply(
      startX + (e.clientX - startClientX) / scale,
      startY + (e.clientY - startClientY) / scale,
    )
  }

  function stopDrag() {
    if (captureEl && pointerId !== null) {
      try { captureEl.releasePointerCapture(pointerId) } catch { /* already released */ }
    }
    isDragging.value = false
    pointerId = null
    captureEl = null
    if (typeof window === 'undefined') return
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerEnd)
    window.removeEventListener('pointercancel', onPointerEnd)
  }

  function onPointerEnd(e) {
    if (e.pointerId !== pointerId) return
    stopDrag()
  }

  // Call from the title bar's `pointerdown`.
  function startDrag(e) {
    if (isDragging.value) return
    // Left mouse button / first finger / pen tip only
    if (e.button !== 0 || e.isPrimary === false) return
    // Title-bar buttons (minimise, close) keep their own clicks and taps
    if (e.target?.closest?.('button')) return

    isDragging.value = true
    pointerId = e.pointerId
    startClientX = e.clientX
    startClientY = e.clientY
    startX = x.value
    startY = y.value
    const s = Number(getScale())
    scale = s > 0 && Number.isFinite(s) ? s : 1

    // Capture so the drag keeps tracking when the pointer leaves the title
    // bar or the browser window. Moves still bubble to `window`.
    captureEl = e.currentTarget?.setPointerCapture ? e.currentTarget : null
    try { captureEl?.setPointerCapture(pointerId) } catch { captureEl = null }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerEnd)
    window.addEventListener('pointercancel', onPointerEnd)
  }

  function setPosition(newX, newY) {
    apply(newX, newY)
  }

  // Re-apply the bounds to the current position (e.g. after a viewport resize)
  function reclamp() {
    apply(x.value, y.value)
  }

  onUnmounted(stopDrag)

  return { x, y, isDragging, startDrag, stopDrag, setPosition, reclamp }
}

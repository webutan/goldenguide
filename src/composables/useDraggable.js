import { ref, onUnmounted } from 'vue'

export function useDraggable(initialX = 0, initialY = 0) {
  const x = ref(initialX)
  const y = ref(initialY)
  const isDragging = ref(false)

  let startMouseX = 0
  let startMouseY = 0
  let startX = 0
  let startY = 0

  function onMouseMove(e) {
    if (!isDragging.value) return
    const dx = e.clientX - startMouseX
    const dy = e.clientY - startMouseY
    x.value = Math.max(0, startX + dx)
    y.value = Math.max(0, startY + dy)
  }

  function onMouseUp() {
    isDragging.value = false
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

  function startDrag(e) {
    // Only drag from title bar (left mouse button)
    if (e.button !== 0) return
    isDragging.value = true
    startMouseX = e.clientX
    startMouseY = e.clientY
    startX = x.value
    startY = y.value
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  function setPosition(newX, newY) {
    x.value = newX
    y.value = newY
  }

  onUnmounted(() => {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  })

  return { x, y, isDragging, startDrag, setPosition }
}

import { ref, onUnmounted } from 'vue'
import { io } from 'socket.io-client'

const NICKNAME_KEY = 'golden-gai-chat-nickname'

function generateGuestName() {
  const n = Math.floor(1000 + Math.random() * 9000)
  return `Guest${n}`
}

// Module-level singleton so the socket persists while the window is open
let socket = null
let refCount = 0

const messages = ref([])
const userCount = ref(0)
const connected = ref(false)
const nickname = ref(localStorage.getItem(NICKNAME_KEY) || generateGuestName())
const checkinList = ref([])
const myCheckinBarId = ref(null)

function ensureSocket() {
  if (socket) return
  socket = io('/chat', {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
  })

  socket.on('connect', () => { connected.value = true })
  socket.on('disconnect', () => { connected.value = false })

  socket.on('chat:history', (history) => {
    messages.value = history
  })

  socket.on('chat:message', (msg) => {
    messages.value = [...messages.value, msg]
    // Keep at most 500 in memory
    if (messages.value.length > 500) {
      messages.value = messages.value.slice(messages.value.length - 500)
    }
  })

  socket.on('chat:usercount', (n) => {
    userCount.value = n
  })

  socket.on('checkin:list', (list) => {
    checkinList.value = list
  })

  window.addEventListener('beforeunload', () => {
    socket?.emit('checkin:set', { barId: null, barName: null, nickname: nickname.value })
  })
}

function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
    connected.value = false
  }
}

export function useChat() {
  refCount++
  ensureSocket()

  onUnmounted(() => {
    refCount--
    if (refCount <= 0) {
      disconnectSocket()
      refCount = 0
    }
  })

  function setNickname(nick) {
    const clean = nick.trim().slice(0, 30) || generateGuestName()
    nickname.value = clean
    localStorage.setItem(NICKNAME_KEY, clean)
  }

  function sendMessage(text) {
    const msg = text.trim().slice(0, 500)
    if (!msg || !socket) return
    socket.emit('chat:send', { nickname: nickname.value, message: msg })
  }

  function checkIn(barId, barName) {
    myCheckinBarId.value = barId
    socket?.emit('checkin:set', { barId, barName, nickname: nickname.value })
  }

  function checkOut() {
    myCheckinBarId.value = null
    socket?.emit('checkin:set', { barId: null, barName: null, nickname: nickname.value })
  }

  return {
    messages,
    userCount,
    connected,
    nickname,
    setNickname,
    sendMessage,
    checkinList,
    myCheckinBarId,
    checkIn,
    checkOut,
  }
}

import { ref, onUnmounted } from 'vue'
import { readString, writeString } from '../utils/storage.js'

const NICKNAME_KEY = 'golden-gai-chat-nickname'

function generateGuestName() {
  const n = Math.floor(1000 + Math.random() * 9000)
  return `Guest${n}`
}

// Module-level singleton so the socket persists while the window is open
let socket = null
let refCount = 0
// socket.io-client is loaded on demand so it stays out of the main bundle.
// `connecting` is the in-flight import; `generation` lets a disconnect that
// happens before the import resolves cancel the pending connection.
let connecting = null
let generation = 0

const messages = ref([])
const userCount = ref(0)
const connected = ref(false)
const nickname = ref(readString(NICKNAME_KEY) || generateGuestName())
const checkinList = ref([])
const myCheckinBarId = ref(null)
// Set when the server drops a message / check-in for being too fast:
// { kind: 'message' | 'checkin', text, retryAfter, seq }. `text` is the dropped
// message so the window can put it back in the input; `retryAfter` is the
// wait in seconds (null if the server did not say). Cleared after a few seconds.
const rateLimitNotice = ref(null)
const RATE_LIMIT_NOTICE_MS = 6000
let noticeTimer = null
let noticeSeq = 0
let lastSentText = ''

function clearRateLimitNotice() {
  clearTimeout(noticeTimer)
  noticeTimer = null
  rateLimitNotice.value = null
}

function setNickname(nick) {
  const clean = String(nick ?? '').trim().slice(0, 30) || generateGuestName()
  nickname.value = clean
  writeString(NICKNAME_KEY, clean)
}

/**
 * The chat nickname without the chat: does not open a socket or load
 * socket.io-client. Use this anywhere that only needs the name (reviews).
 */
export function useNickname() {
  return { nickname, setNickname }
}

/**
 * True when a scroll container is at (or within `threshold` px of) its bottom.
 * A missing element counts as "at the bottom" so callers default to following.
 */
export function isNearBottom(el, threshold = 40) {
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold
}

// Registered once while a socket exists (not once per socket) and removed in
// disconnectSocket, so reconnecting never stacks listeners.
let unloadRegistered = false
function handleBeforeUnload() {
  socket?.emit('checkin:set', { barId: null, barName: null, nickname: nickname.value })
}

function ensureSocket() {
  if (socket || connecting) return
  const gen = generation
  connecting = import('socket.io-client')
    .then(({ io }) => {
      if (gen !== generation || socket) return
      openSocket(io)
    })
    .catch((err) => {
      console.warn('[chat] failed to load socket.io-client', err)
    })
    .finally(() => {
      if (gen === generation) connecting = null
    })
}

function openSocket(io) {
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

  socket.on('chat:rate_limited', (info) => {
    const kind = info?.kind === 'checkin' ? 'checkin' : 'message'
    // A refused check-in never happened: go back to what the server holds.
    if (kind === 'checkin') myCheckinBarId.value = info?.barId ?? null
    const waitMs = info?.retryAfterMs
    rateLimitNotice.value = {
      kind,
      text: kind === 'message' ? lastSentText : '',
      retryAfter: typeof waitMs === 'number' && waitMs >= 0 ? waitMs / 1000 : null,
      seq: ++noticeSeq,
    }
    clearTimeout(noticeTimer)
    noticeTimer = setTimeout(clearRateLimitNotice, RATE_LIMIT_NOTICE_MS)
  })

  if (!unloadRegistered) {
    window.addEventListener('beforeunload', handleBeforeUnload)
    unloadRegistered = true
  }
}

function disconnectSocket() {
  generation++
  connecting = null
  if (unloadRegistered) {
    window.removeEventListener('beforeunload', handleBeforeUnload)
    unloadRegistered = false
  }
  if (socket) {
    socket.disconnect()
    socket = null
    connected.value = false
  }
  clearRateLimitNotice()
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

  function sendMessage(text) {
    const msg = text.trim().slice(0, 500)
    if (!msg || !socket) return
    lastSentText = msg
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
    rateLimitNotice,
    clearRateLimitNotice,
  }
}

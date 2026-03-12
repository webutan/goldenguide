<script setup>
import { ref, nextTick, onMounted, watch, computed } from 'vue'
import { useChat } from '../composables/useChat.js'
import { useI18n } from '../composables/useI18n.js'
import WinButton from './win2000/WinButton.vue'

const props = defineProps({
  lang: { type: String, default: 'en' },
  bars: { type: Array, default: () => [] },
})

const { messages, userCount, connected, nickname, setNickname, sendMessage, checkinList, myCheckinBarId, checkIn, checkOut } = useChat()
const { t } = useI18n(computed(() => props.lang))

const inputText = ref('')
const messagesEl = ref(null)
const nickEditing = ref(false)
const nickInput = ref('')
const showNickPrompt = ref(false)
const showCheckinPicker = ref(false)
const checkinSearch = ref('')

const filteredBars = computed(() => {
  const q = checkinSearch.value.trim().toLowerCase()
  if (!q) return props.bars.slice(0, 30)
  return props.bars.filter(b => {
    const en = (b.name_en || '').toLowerCase()
    const jp = b.name_jp || ''
    return en.includes(q) || jp.includes(q)
  }).slice(0, 20)
})

function getBarName(bar) {
  return props.lang === 'jp' ? (bar.name_jp || bar.name_en) : (bar.name_en || bar.name_jp)
}

function handleCheckIn(bar) {
  checkIn(bar.id, getBarName(bar))
  showCheckinPicker.value = false
  checkinSearch.value = ''
}

const myCheckinBar = computed(() => {
  if (!myCheckinBarId.value) return null
  return props.bars.find(b => b.id === myCheckinBarId.value) || null
})

// Check if nickname was auto-generated (Guest####) and show prompt
onMounted(() => {
  const saved = localStorage.getItem('golden-gai-chat-nickname')
  if (!saved) {
    showNickPrompt.value = true
    nickInput.value = nickname.value
  }
})

function submitNick() {
  if (nickInput.value.trim()) {
    setNickname(nickInput.value)
  }
  showNickPrompt.value = false
  nickEditing.value = false
}

function startEditNick() {
  nickInput.value = nickname.value
  nickEditing.value = true
}

function sendChat() {
  const text = inputText.value.trim()
  if (!text) return
  sendMessage(text)
  inputText.value = ''
}

function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendChat()
  }
}

// Auto-scroll to bottom on new messages
watch(messages, async () => {
  await nextTick()
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  }
}, { deep: true })

// Scroll on mount too
onMounted(async () => {
  await nextTick()
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  }
})

// Hash-based nickname color (8 distinct hues)
const NICK_COLORS = [
  '#C62828', // red
  '#1565C0', // blue
  '#2E7D32', // green
  '#6A1B9A', // purple
  '#E65100', // orange
  '#00695C', // teal
  '#AD1457', // pink
  '#4527A0', // indigo
]

function nickColor(nick) {
  let hash = 0
  for (let i = 0; i < nick.length; i++) {
    hash = nick.charCodeAt(i) + ((hash << 5) - hash)
  }
  return NICK_COLORS[Math.abs(hash) % NICK_COLORS.length]
}

function isOwn(msg) {
  return msg.nickname === nickname.value
}

function formatTime(ts) {
  const d = new Date(ts)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}
</script>

<template>
  <div class="chat-window">

    <!-- Nickname prompt overlay -->
    <div v-if="showNickPrompt" class="chat-nick-overlay">
      <div class="chat-nick-box">
        <div class="chat-nick-title">
          <img src="/icons/desktop/network_internet_pcs.png" class="chat-nick-icon" alt="" />
          Enter Your Screen Name
        </div>
        <div class="chat-nick-body">
          <label class="chat-nick-label">Screen Name:</label>
          <input
            v-model="nickInput"
            class="chat-nick-input"
            maxlength="30"
            autofocus
            @keydown.enter="submitNick"
          />
        </div>
        <div class="chat-nick-footer">
          <WinButton @click="submitNick">Sign In</WinButton>
        </div>
      </div>
    </div>

    <!-- AIM header strip -->
    <div class="chat-aim-header">
      <img src="/icons/desktop/network_internet_pcs.png" class="chat-aim-logo" alt="" />
      <span class="chat-aim-title">Golden Gai Chat</span>
    </div>

    <!-- Who's Here section -->
    <div v-if="checkinList.length > 0" class="chat-checkin-section">
      <div class="chat-checkin-title">🍺 {{ t('whoIsHere') }}</div>
      <div v-for="entry in checkinList" :key="entry.nickname + entry.barId" class="chat-checkin-entry">
        <span class="chat-checkin-nick">{{ entry.nickname }}</span>
        <span class="chat-checkin-arrow">→</span>
        <span class="chat-checkin-bar">{{ entry.barName }}</span>
      </div>
    </div>

    <!-- Messages area -->
    <div ref="messagesEl" class="chat-messages">
      <div
        v-for="msg in messages"
        :key="msg.id"
        :class="['chat-msg-row', isOwn(msg) ? 'chat-msg-own' : 'chat-msg-other']"
      >
        <div v-if="!isOwn(msg)" class="chat-msg-nick" :style="{ color: nickColor(msg.nickname) }">
          {{ msg.nickname }}
        </div>
        <div class="chat-bubble-wrap">
          <div :class="['chat-bubble', isOwn(msg) ? 'chat-bubble-own' : 'chat-bubble-other']">
            {{ msg.message }}
          </div>
          <span class="chat-msg-time">{{ formatTime(msg.created_at) }}</span>
        </div>
      </div>
      <div v-if="messages.length === 0" class="chat-empty">
        No messages yet. Say hi!
      </div>
    </div>

    <!-- Input area -->
    <div class="chat-input-area">
      <div class="chat-input-row">
        <input
          v-model="inputText"
          class="chat-input"
          placeholder="Type a message..."
          maxlength="500"
          @keydown="onKeydown"
        />
        <WinButton class="chat-send-btn" @click="sendChat">Send</WinButton>
      </div>
    </div>

    <!-- Check-in bar picker -->
    <div v-if="showCheckinPicker" class="checkin-picker">
      <div class="checkin-picker-header">
        <span class="checkin-picker-title">🍺 {{ t('checkIn') }}</span>
        <button class="checkin-picker-close" @click="showCheckinPicker = false">✕</button>
      </div>
      <input
        v-model="checkinSearch"
        class="checkin-search"
        placeholder="Search bars..."
        autofocus
      />
      <div class="checkin-bar-list">
        <button
          v-for="bar in filteredBars"
          :key="bar.id"
          class="checkin-bar-btn"
          @click="handleCheckIn(bar)"
        >
          {{ getBarName(bar) }}
        </button>
      </div>
    </div>

    <!-- Status strip -->
    <div class="chat-status-strip">
      <!-- Nickname display/edit -->
      <template v-if="!nickEditing">
        <span class="chat-status-nick" @click="startEditNick" title="Click to change screen name">
          <img src="/icons/desktop/network_internet_pcs.png" class="chat-status-icon" alt="" />
          {{ nickname }}
        </span>
      </template>
      <template v-else>
        <input
          v-model="nickInput"
          class="chat-nick-inline-input"
          maxlength="30"
          @keydown.enter="submitNick"
          @keydown.escape="nickEditing = false"
        />
        <WinButton class="chat-nick-ok-btn" @click="submitNick">OK</WinButton>
      </template>

      <span class="chat-status-spacer"></span>

      <!-- Check-in button -->
      <button
        v-if="myCheckinBarId"
        class="chat-checkin-btn chat-checkin-btn--active"
        @click="checkOut()"
        :title="'Checked in: ' + (myCheckinBar ? getBarName(myCheckinBar) : '')"
      >
        🍺 {{ myCheckinBar ? getBarName(myCheckinBar) : t('checkedIn') }}
      </button>
      <button
        v-else
        class="chat-checkin-btn"
        @click="showCheckinPicker = !showCheckinPicker"
      >
        {{ t('checkIn') }}
      </button>

      <!-- Online count + connection indicator -->
      <span class="chat-status-users">
        {{ userCount }} online
      </span>
      <span :class="['chat-status-dot', connected ? 'chat-status-dot-on' : 'chat-status-dot-off']"></span>
    </div>
  </div>
</template>

<style scoped>
.chat-window {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 340px;
  background: #fff;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 12px;
  position: relative;
  overflow: hidden;
}

/* Nickname prompt overlay */
.chat-nick-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.chat-nick-box {
  background: #c0c0c0;
  border: 2px solid;
  border-color: #ffffff #808080 #808080 #ffffff;
  box-shadow: 1px 1px 0 #000;
  width: 260px;
}

.chat-nick-title {
  background: #000080;
  color: #fff;
  font-size: 11px;
  font-family: var(--win-font, 'W95FA', Arial);
  padding: 3px 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.chat-nick-icon {
  width: 14px;
  height: 14px;
  image-rendering: pixelated;
}

.chat-nick-body {
  padding: 14px 16px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chat-nick-label {
  font-size: 12px;
  color: #000;
}

.chat-nick-input {
  height: 22px;
  border: 2px solid;
  border-color: #808080 #dfdfdf #dfdfdf #808080;
  background: #fff;
  font-size: 12px;
  padding: 2px 4px;
  font-family: Arial, sans-serif;
  outline: none;
}

.chat-nick-footer {
  padding: 0 16px 12px;
  display: flex;
  justify-content: flex-end;
}

/* Who's Here */
.chat-checkin-section {
  flex-shrink: 0;
  background: #e8f0e8;
  border-bottom: 1px solid #aac0aa;
  padding: 5px 8px;
  font-size: 10px;
  font-family: Arial, sans-serif;
}

.chat-checkin-title {
  font-weight: bold;
  color: #1a5c1a;
  margin-bottom: 3px;
  font-size: 10px;
}

.chat-checkin-entry {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 1px 0;
}

.chat-checkin-nick {
  color: #000080;
  font-weight: bold;
  font-size: 10px;
}

.chat-checkin-arrow {
  color: #555;
  font-size: 10px;
}

.chat-checkin-bar {
  color: #333;
  font-size: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* AIM header */
.chat-aim-header {
  background: linear-gradient(135deg, #4080C0 0%, #006080 100%);
  color: #fff;
  padding: 5px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: bold;
  font-family: Arial, Helvetica, sans-serif;
  letter-spacing: 0.3px;
  flex-shrink: 0;
  border-bottom: 1px solid #003060;
}

.chat-aim-logo {
  width: 20px;
  height: 20px;
  image-rendering: pixelated;
  filter: brightness(3);
}

.chat-aim-title {
  text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
}

/* Messages area */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 8px 10px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 0;
}

.chat-empty {
  color: #888;
  font-style: italic;
  text-align: center;
  margin-top: 20px;
  font-size: 11px;
}

.chat-msg-row {
  display: flex;
  flex-direction: column;
  max-width: 85%;
}

.chat-msg-own {
  align-self: flex-end;
  align-items: flex-end;
}

.chat-msg-other {
  align-self: flex-start;
  align-items: flex-start;
}

.chat-msg-nick {
  font-size: 10px;
  font-weight: bold;
  margin-bottom: 1px;
  padding-left: 2px;
}

.chat-bubble-wrap {
  display: flex;
  align-items: flex-end;
  gap: 4px;
}

.chat-msg-own .chat-bubble-wrap {
  flex-direction: row-reverse;
}

.chat-bubble {
  padding: 5px 9px;
  border-radius: 0;
  font-size: 12px;
  line-height: 1.4;
  word-break: break-word;
  border: 1px solid;
}

.chat-bubble-own {
  background: #CCE5FF;
  border-color: #5599CC;
  color: #000;
}

.chat-bubble-other {
  background: #F5F5F5;
  border-color: #C0C0C0;
  color: #000;
}

.chat-msg-time {
  font-size: 9px;
  color: #aaa;
  white-space: nowrap;
  flex-shrink: 0;
  padding-bottom: 1px;
}

/* Input area */
.chat-input-area {
  flex-shrink: 0;
  background: #ececec;
  border-top: 1px solid #999;
  padding: 5px 6px;
}

.chat-input-row {
  display: flex;
  gap: 4px;
}

.chat-input {
  flex: 1;
  height: 24px;
  border: 2px solid;
  border-color: #808080 #dfdfdf #dfdfdf #808080;
  background: #fff;
  font-size: 12px;
  padding: 2px 4px;
  font-family: Arial, sans-serif;
  outline: none;
}

.chat-send-btn {
  flex-shrink: 0;
  height: 24px;
  font-size: 11px !important;
  padding: 0 10px !important;
}

/* Status strip */
.chat-status-strip {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px;
  background: #c0c0c0;
  border-top: 1px solid #fff;
  font-size: 10px;
  color: #333;
  font-family: Arial, sans-serif;
}

.chat-status-icon {
  width: 12px;
  height: 12px;
  image-rendering: pixelated;
  vertical-align: middle;
  margin-right: 2px;
}

.chat-status-nick {
  cursor: pointer;
  display: flex;
  align-items: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 140px;
  color: #000080;
  font-weight: bold;
  font-size: 10px;
}

.chat-status-nick:hover {
  text-decoration: underline;
}

.chat-nick-inline-input {
  height: 18px;
  border: 1px solid #808080;
  background: #fff;
  font-size: 11px;
  padding: 1px 3px;
  font-family: Arial, sans-serif;
  outline: none;
  width: 110px;
}

.chat-nick-ok-btn {
  height: 18px !important;
  font-size: 10px !important;
  padding: 0 6px !important;
}

.chat-status-spacer {
  flex: 1;
}

.chat-status-users {
  font-size: 10px;
  color: #555;
  white-space: nowrap;
}

.chat-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid rgba(0,0,0,0.3);
}

.chat-status-dot-on {
  background: #00c800;
}

.chat-status-dot-off {
  background: #cc0000;
}

/* Check-in button in status strip */
.chat-checkin-btn {
  font-size: 10px;
  padding: 2px 6px;
  background: #c0c0c0;
  border: 2px solid;
  border-color: #ffffff #808080 #808080 #ffffff;
  cursor: pointer;
  font-family: Arial, sans-serif;
  color: #000;
  white-space: nowrap;
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}

.chat-checkin-btn:active {
  border-color: #808080 #ffffff #ffffff #808080;
}

.chat-checkin-btn--active {
  background: #d4e8d4;
  color: #005500;
  font-weight: bold;
}

/* Check-in picker panel */
.checkin-picker {
  flex-shrink: 0;
  background: #f0f0f0;
  border-top: 2px solid;
  border-color: #ffffff #808080 #808080 #ffffff;
  display: flex;
  flex-direction: column;
  max-height: 200px;
}

.checkin-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  background: #000080;
  color: #fff;
  font-size: 11px;
  font-family: Arial, sans-serif;
  font-weight: bold;
  flex-shrink: 0;
}

.checkin-picker-title {
  font-size: 11px;
}

.checkin-picker-close {
  background: #c0c0c0;
  border: 1px solid #808080;
  cursor: pointer;
  font-size: 10px;
  padding: 0 4px;
  color: #000;
  line-height: 1.4;
}

.checkin-search {
  margin: 4px 6px;
  padding: 3px 5px;
  border: 2px solid;
  border-color: #808080 #dfdfdf #dfdfdf #808080;
  font-size: 11px;
  font-family: Arial, sans-serif;
  background: #fff;
  outline: none;
  flex-shrink: 0;
}

.checkin-bar-list {
  overflow-y: auto;
  flex: 1;
  padding: 2px 4px 4px;
}

.checkin-bar-btn {
  display: block;
  width: 100%;
  text-align: left;
  padding: 3px 6px;
  background: none;
  border: none;
  font-size: 11px;
  font-family: Arial, sans-serif;
  cursor: pointer;
  color: #000;
  border-radius: 0;
}

.checkin-bar-btn:hover {
  background: #000080;
  color: #fff;
}
</style>

<script setup>
import { ref, onMounted, nextTick, computed } from 'vue'
import { fetchFeed } from '../api/index.js'
import { useI18n } from '../composables/useI18n.js'

const props = defineProps({
  lang: { type: String, default: 'en' },
})

const emit = defineEmits(['close'])

const { t } = useI18n(computed(() => props.lang))

const tweets = ref(null)   // null = no API key, use embedded mode
const accounts = ref([])
const loading = ref(true)
const error = ref(null)

function formatDate(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const mins = Math.floor(diffMs / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const embedListRef = ref(null)

function loadTwitterWidgets() {
  const container = embedListRef.value
  const run = () => {
    if (window.twttr?.ready) {
      window.twttr.ready(() => window.twttr.widgets.load(container))
    } else if (window.twttr?.widgets) {
      window.twttr.widgets.load(container)
    }
  }

  if (window.twttr) {
    run()
    return
  }

  if (document.querySelector('script[src*="platform.twitter.com"]')) {
    window.addEventListener('twttr:load', run, { once: true })
    return
  }

  const script = document.createElement('script')
  script.src = 'https://platform.twitter.com/widgets.js'
  script.async = true
  script.charset = 'utf-8'
  script.onload = () => {
    window.dispatchEvent(new Event('twttr:load'))
    run()
  }
  document.head.appendChild(script)
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const data = await fetchFeed()
    tweets.value = data.tweets
    accounts.value = data.accounts || []
    if (data.error) error.value = data.error
    if (data.tweets === null && accounts.value.length > 0) {
      await nextTick()
      loadTwitterWidgets()
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="feed-win">
    <button class="feed-close-btn" @click="emit('close')" title="Close">
      <img src="/icons/msg_error-1.png" alt="Close" />
    </button>

    <!-- Loading -->
    <div v-if="loading" class="feed-status">
      <img src="/icons/desktop/goldengaisprite.ico" class="feed-status-icon" alt="" />
      Loading...
    </div>

    <!-- No accounts -->
    <div v-else-if="accounts.length === 0" class="feed-status">
      No Twitter/X accounts found in database.
    </div>

    <!-- API mode: merged tweet timeline -->
    <template v-else-if="tweets !== null">
      <div v-if="error" class="feed-error">{{ error }}</div>
      <div v-if="tweets.length === 0" class="feed-status">No recent tweets found.</div>
      <div v-else class="tweet-list">
        <a
          v-for="tweet in tweets"
          :key="tweet.id"
          :href="tweet.url"
          target="_blank"
          rel="noopener noreferrer"
          class="tweet-card"
        >
          <div class="tweet-top">
            <img
              v-if="tweet.author?.profile_image_url"
              :src="tweet.author.profile_image_url"
              class="tweet-avatar"
              alt=""
            />
            <div class="tweet-byline">
              <span class="tweet-bar-name">
                {{ lang === 'jp' ? (tweet.bar_name_jp || tweet.bar_name_en) : (tweet.bar_name_en || tweet.bar_name_jp) }}
              </span>
              <span class="tweet-handle">@{{ tweet.author?.username }}</span>
            </div>
            <span class="tweet-time">{{ formatDate(tweet.created_at) }}</span>
          </div>
          <div class="tweet-text">{{ tweet.text }}</div>
          <div v-if="tweet.media?.length" class="tweet-media">
            <img
              v-for="(m, i) in tweet.media"
              :key="i"
              :src="m.url"
              class="tweet-img"
              alt=""
            />
          </div>
        </a>
      </div>
    </template>

    <!-- Embedded mode: one Twitter timeline per account -->
    <template v-else>
      <div v-if="error" class="feed-error">{{ error }}</div>
      <div class="embed-list" ref="embedListRef">
        <div v-for="account in accounts" :key="account.handle" class="embed-item">
          <div class="embed-label">
            <img src="/icons/desktop/goldengaisprite.ico" class="embed-label-icon" alt="" />
            <span>{{ lang === 'jp' ? (account.name_jp || account.name_en) : (account.name_en || account.name_jp) }}</span>
            <span class="embed-handle">@{{ account.handle }}</span>
          </div>
          <a
            class="twitter-timeline"
            data-theme="dark"
            data-height="320"
            data-chrome="noheader nofooter noborders"
            :href="`https://twitter.com/${account.handle}`"
          >Tweets by @{{ account.handle }}</a>
        </div>
      </div>
    </template>

  </div>
</template>

<style scoped>
.feed-win {
  position: relative;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background: var(--win-bg-dark);
  font-family: var(--win-font);
}

/* Scrollbar */
.feed-win::-webkit-scrollbar { width: 16px; }
.feed-win::-webkit-scrollbar-track { background: var(--win-bg); }
.feed-win::-webkit-scrollbar-thumb {
  background: var(--win-bg);
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
}

.feed-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 20px;
  color: var(--win-text-disabled);
  font-size: 11px;
  justify-content: center;
}

.feed-status-icon {
  width: 16px;
  height: 16px;
  image-rendering: pixelated;
}

.feed-error {
  padding: 6px 8px;
  font-size: 10px;
  color: #c04040;
  background: #2a0808;
  border-bottom: 1px solid #501010;
}

/* API mode: tweet cards */
.tweet-list {
  display: flex;
  flex-direction: column;
}

.tweet-card {
  display: block;
  padding: 8px 10px;
  border-bottom: 1px solid var(--win-border-dark);
  text-decoration: none;
  color: var(--win-text);
  transition: background 0.1s;
}

.tweet-card:hover {
  background: var(--win-bg);
}

.tweet-top {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin-bottom: 5px;
}

.tweet-avatar {
  width: 32px;
  height: 32px;
  border-radius: 0;
  flex-shrink: 0;
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  image-rendering: pixelated;
}

.tweet-byline {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.tweet-bar-name {
  font-size: 11px;
  font-weight: bold;
  color: var(--valhalla-orange);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tweet-handle {
  font-size: 10px;
  color: var(--win-text-disabled);
}

.tweet-time {
  font-size: 10px;
  color: var(--win-text-disabled);
  flex-shrink: 0;
  margin-left: auto;
}

.tweet-text {
  font-size: 11px;
  color: var(--win-text);
  line-height: 1.5;
  word-break: break-word;
  white-space: pre-wrap;
}

.tweet-media {
  margin-top: 6px;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.tweet-img {
  max-width: 100%;
  max-height: 180px;
  object-fit: cover;
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

/* Embedded mode */
.embed-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.embed-item {
  border-bottom: 1px solid var(--win-border-dark);
}

.embed-label {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  background: var(--win-bg);
  font-size: 11px;
  font-weight: bold;
  color: var(--valhalla-orange);
  border-bottom: 1px solid var(--win-border-dark);
  box-shadow: inset 0 -1px 0 var(--win-border-light);
}

.embed-label-icon {
  width: 14px;
  height: 14px;
  image-rendering: pixelated;
}

.embed-handle {
  font-size: 10px;
  color: var(--win-text-disabled);
  font-weight: normal;
  margin-left: 2px;
}

/* Hidden on desktop (WinWindow provides its own close button) */
.feed-close-btn {
  display: none;
  position: fixed;
  bottom: calc(var(--taskbar-height, 32px) + 10px);
  right: 10px;
  width: 44px;
  height: 44px;
  background: var(--win-bg);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark),
    2px 2px 4px rgba(0, 0, 0, 0.5);
  cursor: pointer;
  align-items: center;
  justify-content: center;
  padding: 4px;
  z-index: 400;
}

/* Shown on mobile: fixed at bottom-right above taskbar */
@media (max-width: 768px) {
  .feed-close-btn { display: flex; }
}

.feed-close-btn:active {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.feed-close-btn img {
  width: 32px;
  height: 32px;
  image-rendering: pixelated;
  display: block;
}
</style>

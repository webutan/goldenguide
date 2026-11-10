<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { fetchBarFeed } from '../api/index.js'
import { useI18n } from '../composables/useI18n.js'
import { useOnline } from '../composables/usePwa.js'
import { parseTwitterHandle } from '../utils/twitter.js'

const props = defineProps({
  bar: { type: Object, default: null },
  lang: { type: String, default: 'en' },
})

const emit = defineEmits(['close'])

const { t } = useI18n(computed(() => props.lang))

const handle = computed(() => parseTwitterHandle(props.bar?.sns))

const barName = computed(() => {
  if (!props.bar) return ''
  return props.lang === 'jp'
    ? (props.bar.name_jp || props.bar.name_en)
    : (props.bar.name_en || props.bar.name_jp)
})

const tweets = ref(null)   // null = no API key / no tweets field, array = tweets
const loading = ref(false)
const error = ref(false) // the request failed, or the server reported an upstream error

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

async function loadFeed(h) {
  if (!h) return
  loading.value = true
  error.value = false
  tweets.value = null
  try {
    const data = await fetchBarFeed(h)
    // The response may have no `tweets` field at all (e.g. error-only payloads)
    tweets.value = Array.isArray(data?.tweets) ? data.tweets : null
    if (data?.error) error.value = true
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(() => { if (handle.value) loadFeed(handle.value) })
watch(handle, (h) => { if (h) loadFeed(h) })

// Not saved for offline use: say so, and load it once back online
const { offline } = useOnline()
watch(offline, (isOffline) => { if (!isOffline && error.value && handle.value) loadFeed(handle.value) })
</script>

<template>
  <div v-if="handle" class="bar-twitter-panel">
    <div class="btp-header">
      <img src="/icons/twitterwhite.ico" class="btp-icon" :alt="t('twitterX')" />
      <span class="btp-name">{{ barName }}</span>
      <span class="btp-handle">@{{ handle }}</span>
      <button class="btp-close" @click="emit('close')">✕</button>
    </div>

    <!-- Mobile: fixed close button at bottom-right above taskbar -->
    <button class="btp-mobile-close" @click="emit('close')" :title="t('close')">
      <img src="/icons/msg_error-1.png" :alt="t('close')" />
    </button>

    <div class="btp-body">
      <!-- Loading -->
      <div v-if="loading" class="btp-status">{{ t('loading') }}</div>

      <!-- Error banner -->
      <div v-if="error" class="btp-error">{{ offline ? t('offlineFeed') : t('feedLoadFailed') }}</div>

      <!-- No API key — show link fallback -->
      <div v-else-if="tweets == null && !loading" class="btp-no-api">
        <a
          :href="`https://x.com/${handle}`"
          target="_blank"
          rel="noopener noreferrer"
          class="btp-link"
        >{{ t('viewOnX', { handle }) }}</a>
      </div>

      <!-- No tweets found -->
      <div v-else-if="tweets != null && tweets.length === 0 && !loading" class="btp-status">
        {{ t('noRecentTweets') }}
      </div>

      <!-- Tweet cards -->
      <div v-else-if="tweets != null" class="btp-tweets">
        <a
          v-for="tweet in tweets"
          :key="tweet.id"
          :href="tweet.url"
          target="_blank"
          rel="noopener noreferrer"
          class="btp-tweet-card"
        >
          <div class="btp-tweet-top">
            <img
              v-if="tweet.author?.profile_image_url"
              :src="tweet.author.profile_image_url"
              class="btp-avatar"
              alt=""
            />
            <div class="btp-byline">
              <span class="btp-display-name">{{ tweet.author?.name }}</span>
              <span class="btp-tweet-handle">@{{ tweet.author?.username }}</span>
            </div>
            <span class="btp-time">{{ formatDate(tweet.created_at) }}</span>
          </div>
          <div class="btp-tweet-text">{{ tweet.text }}</div>
          <div v-if="tweet.media?.length" class="btp-media">
            <img
              v-for="(m, i) in tweet.media"
              :key="i"
              :src="m.url"
              class="btp-media-img"
              alt=""
            />
          </div>
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bar-twitter-panel {
  position: fixed;
  right: 0;
  top: 0;
  bottom: var(--taskbar-height, 32px);
  width: 320px;
  display: flex;
  flex-direction: column;
  background: var(--win-bg-dark);
  box-shadow:
    inset 1px 0 0 var(--win-border-dark),
    -3px 0 8px rgba(0, 0, 0, 0.5);
  z-index: 300;
  font-family: var(--win-font);
}

.btp-header {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 6px;
  background: var(--win-title-active);
  color: var(--win-title-text-active);
  font-size: 11px;
  font-weight: bold;
  flex-shrink: 0;
  user-select: none;
}

.btp-icon {
  width: 16px;
  height: 16px;
  image-rendering: pixelated;
  flex-shrink: 0;
}

.btp-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.btp-handle {
  font-size: 10px;
  opacity: 0.75;
  flex-shrink: 0;
}

.btp-close {
  width: 16px;
  height: 14px;
  background: var(--win-bg);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: bold;
  color: var(--win-text);
  flex-shrink: 0;
  margin-left: 2px;
}

.btp-close:active {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.btp-body {
  flex: 1;
  overflow-y: auto;
}

.btp-body::-webkit-scrollbar { width: 16px; }
.btp-body::-webkit-scrollbar-track { background: var(--win-bg); }
.btp-body::-webkit-scrollbar-thumb {
  background: var(--win-bg);
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
}

.btp-status {
  padding: 20px;
  font-size: 11px;
  color: var(--win-text-disabled);
  text-align: center;
}

.btp-error {
  padding: 6px 8px;
  font-size: 10px;
  color: #c04040;
  background: #2a0808;
  border-bottom: 1px solid #501010;
}

.btp-no-api {
  padding: 20px;
  text-align: center;
}

.btp-link {
  font-size: 11px;
  color: var(--valhalla-orange);
  text-decoration: underline;
}

/* Tweet cards */
.btp-tweets {
  display: flex;
  flex-direction: column;
}

.btp-tweet-card {
  display: block;
  padding: 8px 10px;
  border-bottom: 1px solid var(--win-border-dark);
  text-decoration: none;
  color: var(--win-text);
  transition: background 0.1s;
}

.btp-tweet-card:hover {
  background: var(--win-bg);
}

.btp-tweet-top {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin-bottom: 5px;
}

.btp-avatar {
  width: 28px;
  height: 28px;
  border-radius: 0;
  flex-shrink: 0;
  image-rendering: pixelated;
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.btp-byline {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.btp-display-name {
  font-size: 11px;
  font-weight: bold;
  color: var(--valhalla-orange);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btp-tweet-handle {
  font-size: 10px;
  color: var(--win-text-disabled);
}

.btp-time {
  font-size: 10px;
  color: var(--win-text-disabled);
  flex-shrink: 0;
  margin-left: auto;
}

.btp-tweet-text {
  font-size: 11px;
  color: var(--win-text);
  line-height: 1.5;
  word-break: break-word;
  white-space: pre-wrap;
}

.btp-media {
  margin-top: 6px;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.btp-media-img {
  max-width: 100%;
  max-height: 140px;
  object-fit: cover;
}

/* Mobile fixed close button — hidden on desktop */
.btp-mobile-close {
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

.btp-mobile-close:active {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.btp-mobile-close img {
  width: 32px;
  height: 32px;
  image-rendering: pixelated;
  display: block;
}

/* ── Mobile: full-screen like the feed panel ── */
@media (max-width: 768px) {
  .bar-twitter-panel {
    top: 0;
    left: 0;
    right: 0;
    bottom: var(--taskbar-height, 32px);
    width: auto;
    height: auto;
    box-shadow: none;
  }

  /* Hide header close button — mobile uses the fixed bottom-right button instead */
  .btp-close { display: none; }

  .btp-mobile-close { display: flex; }
}
</style>

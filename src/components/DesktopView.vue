<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from '../composables/useI18n.js'
import { useReviews } from '../composables/useReviews.js'
import StickyNote from './StickyNote.vue'

const props = defineProps({
  lang: { type: String, default: 'en' },
  tourHighlight: { type: String, default: null },
})

const emit = defineEmits(['openApp'])

const { t } = useI18n(computed(() => props.lang))
const { weeklyReviews, loadWeeklyReviews } = useReviews()

const selected = ref(null)
const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

const icons = [
  { id: 'map', icon: '/icons/desktop/search_web.png', labelKey: 'iconMap' },
  { id: 'directory', icon: '/icons/desktop/directory_open_cool.png', labelKey: 'iconDirectory' },
  { id: 'feed', icon: '/icons/twitterblue.ico', labelKey: 'iconFeed' },
  { id: 'chatroom', icon: '/icons/desktop/network_internet_pcs.png', labelKey: 'iconChatroom' },
  { id: 'reviews', icon: '/icons/winrep-1.png', labelKey: 'iconReviews' },
  { id: 'about', icon: '/icons/desktop/about.png', labelKey: 'iconAbout' },
  { id: 'contact', icon: '/icons/desktop/contact.png', labelKey: 'iconContact' },
]

const stickyNotes = computed(() => weeklyReviews.value.slice(0, 8))

onMounted(() => {
  loadWeeklyReviews()
})

function handleClick(id) {
  if (selected.value === id) {
    emit('openApp', id)
    selected.value = null
  } else {
    selected.value = id
  }
}

function handleDblClick(id) {
  emit('openApp', id)
  selected.value = null
}

function handleDesktopClick() {
  selected.value = null
}
</script>

<template>
  <div class="desktop-view" @click.self="handleDesktopClick">
    <!-- Sticky notes: desktop only, behind icons -->
    <template v-if="!isMobile">
      <StickyNote
        v-for="review in stickyNotes"
        :key="review.id"
        :review="review"
      />
    </template>

    <img src="/signs/sign.png" class="desktop-sign-banner" alt="Golden Gai" @click="handleDesktopClick" />
    <div class="desktop-icons">
      <div
        v-for="icon in icons"
        :key="icon.id"
        :class="['desktop-icon', { selected: selected === icon.id, 'tour-highlight': tourHighlight === `btn-${icon.id}` }]"
        @click.stop="handleClick(icon.id)"
        @dblclick.stop="handleDblClick(icon.id)"
      >
        <div class="desktop-icon-img-wrap">
          <img :src="icon.icon" :alt="t(icon.labelKey)" class="desktop-icon-img" />
        </div>
        <span class="desktop-icon-label">{{ t(icon.labelKey) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.desktop-view {
  position: absolute;
  inset: 0;
  background: url('/static-off.png') center / cover no-repeat;
  overflow: hidden;
}

.desktop-icons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  width: fit-content;
}

.desktop-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 90px;
  padding: 4px;
  cursor: pointer;
  user-select: none;
}

.desktop-icon.selected .desktop-icon-img-wrap {
  background: rgba(0, 0, 128, 0.4);
}

.desktop-icon.selected .desktop-icon-label {
  background: var(--win-highlight, #000080);
  color: #fff;
}

.desktop-icon-img-wrap {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.desktop-icon-img {
  width: 64px;
  height: 64px;
  image-rendering: pixelated;
}

.desktop-icon-label {
  font-family: var(--win-font);
  font-size: 12px;
  color: #fff;
  text-align: center;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.9);
  padding: 0 2px;
  line-height: 1.3;
  word-break: break-word;
}

.desktop-icon.selected .desktop-icon-label {
  text-shadow: none;
}

/* Tour highlight pulse */
.tour-highlight {
  outline: 2px solid #ffcc44;
  animation: tour-pulse 1s ease-in-out infinite;
}

@keyframes tour-pulse {
  0%, 100% { outline-color: #ffcc44; filter: drop-shadow(0 0 6px rgba(255, 204, 68, 0.7)); }
  50%       { outline-color: #ffdd88; filter: drop-shadow(0 0 12px rgba(255, 204, 68, 0.9)); }
}

/* Sign banner — top-center on desktop, full-width on mobile */
.desktop-sign-banner {
  display: block;
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  height: 220px;
  width: auto;
  pointer-events: none;
  z-index: 1;
}

@media (max-width: 768px) {
  .desktop-view {
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow-y: auto;
  }

  .desktop-sign-banner {
    position: static;
    transform: none;
    width: 100%;
    height: auto;
    flex-shrink: 0;
    pointer-events: auto;
  }

  .desktop-icons {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    padding: 16px;
    width: 100%;
    justify-items: center;
  }

  .desktop-icon {
    width: 80px;
  }

  .desktop-icon-img-wrap,
  .desktop-icon-img {
    width: 56px;
    height: 56px;
  }
}
</style>

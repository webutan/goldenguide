<script setup>
import { ref, computed } from 'vue'
import { useI18n } from '../composables/useI18n.js'

const props = defineProps({
  lang: { type: String, default: 'en' },
})

const emit = defineEmits(['openApp'])

const { t } = useI18n(computed(() => props.lang))

const selected = ref(null)

const icons = [
  { id: 'map', icon: '/icons/desktop/search_web.png', labelKey: 'iconMap' },
  { id: 'directory', icon: '/icons/desktop/directory_open_cool.png', labelKey: 'iconDirectory' },
  { id: 'feed', icon: '/icons/desktop/goldengaisprite.ico', labelKey: 'iconFeed' },
  { id: 'chatroom', icon: '/icons/desktop/network_internet_pcs.png', labelKey: 'iconChatroom' },
  { id: 'about', icon: '/icons/desktop/about.png', labelKey: 'iconAbout' },
  { id: 'contact', icon: '/icons/desktop/contact.png', labelKey: 'iconContact' },
]

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
    <img src="/signs/sign.png" class="desktop-sign-banner" alt="Golden Gai" @click="handleDesktopClick" />
    <div class="desktop-icons">
      <div
        v-for="icon in icons"
        :key="icon.id"
        :class="['desktop-icon', { selected: selected === icon.id }]"
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

/* Sign banner — hidden on desktop, shown on mobile */
.desktop-sign-banner {
  display: none;
}

@media (max-width: 768px) {
  .desktop-view {
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow-y: auto;
  }

  .desktop-sign-banner {
    display: block;
    width: 100%;
    height: auto;
    flex-shrink: 0;
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

<script setup>
import { ref, computed } from 'vue'
import { useWindowManager } from '../../composables/useWindowManager.js'
import { useI18n } from '../../composables/useI18n.js'

const props = defineProps({
  visitedCount: { type: Number, default: 0 },
  totalBars: { type: Number, default: 0 },
  isAdmin: { type: Boolean, default: false },
  activeView: { type: String, default: 'desktop' },
  lang: { type: String, default: 'en' },
})

const { t } = useI18n(computed(() => props.lang))

const emit = defineEmits(['toggleAdmin', 'switchView', 'update:lang'])

const { windows, toggle, isActive } = useWindowManager()

const startOpen = ref(false)

function toggleStart() {
  startOpen.value = !startOpen.value
}

function closeStart() {
  startOpen.value = false
}

function switchView(view) {
  emit('switchView', view)
  closeStart()
}

const time = ref('')
function updateTime() {
  const now = new Date()
  time.value = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
updateTime()
setInterval(updateTime, 30000)
</script>

<template>
  <div class="win-taskbar" @click.self="closeStart">
    <!-- Start button -->
    <button
      :class="['taskbar-start', { pressed: startOpen }]"
      @click="toggleStart"
    >
      <span class="start-icon">&#x2756;</span>
      <span class="start-text">Gai</span>
    </button>

    <!-- Start menu -->
    <div v-if="startOpen" class="start-menu" @click="closeStart">
      <div class="start-menu-sidebar">{{ t('goldenGai') }}</div>
      <div class="start-menu-items">
        <div class="start-menu-item" @click="emit('toggleAdmin')">
          <span>{{ isAdmin ? '&#9745;' : '&#9744;' }}</span>
          <span>{{ t('adminMode') }}</span>
        </div>
      </div>
    </div>

    <!-- Divider -->
    <div class="taskbar-divider"></div>

    <!-- View buttons -->
    <button
      :class="['taskbar-view-btn', { active: activeView === 'desktop' }]"
      @click="switchView('desktop')"
      :title="t('desktop')"
    >
      <svg class="view-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <rect x="1" y="1" width="14" height="10" fill="#c0c0c0" stroke="#808080" stroke-width="1"/>
        <rect x="2" y="2" width="12" height="8" fill="#000080"/>
        <rect x="5" y="11" width="6" height="2" fill="#c0c0c0" stroke="#808080" stroke-width="0.5"/>
        <rect x="4" y="13" width="8" height="1.5" fill="#808080"/>
      </svg>
      <span class="view-label">{{ t('desktop') }}</span>
    </button>
    <button
      :class="['taskbar-view-btn', { active: activeView === 'directory' }]"
      @click="switchView('directory')"
      :title="t('directory')"
    >
      <img class="view-icon" src="/icons/desktop/directory.png" aria-hidden="true" />
      <span class="view-label">{{ t('directory') }}</span>
    </button>
    <button
      :class="['taskbar-view-btn', { active: activeView === 'map' }]"
      @click="switchView('map')"
      :title="t('map')"
    >
      <img class="view-icon" src="/icons/desktop/map.png" aria-hidden="true" />
      <span class="view-label">{{ t('map') }}</span>
    </button>

    <!-- Divider -->
    <div class="taskbar-divider"></div>

    <!-- Window buttons -->
    <div class="taskbar-windows">
      <button
        v-for="win in windows"
        :key="win.id"
        :class="['taskbar-win-btn', { active: isActive(win.id), minimized: win.minimized }]"
        @click="toggle(win.id)"
        :title="win.title"
      >
        <span v-if="win.icon" class="taskbar-win-icon" v-html="win.icon"></span>
        <span class="taskbar-win-text">{{ win.title }}</span>
      </button>
    </div>

    <!-- Language toggle -->
    <div class="taskbar-divider"></div>
    <button
      :class="['taskbar-lang-btn', { active: lang === 'en' }]"
      @click="emit('update:lang', 'en')"
      title="English"
    >
      <svg viewBox="0 0 60 30" width="24" height="14" aria-label="English">
        <rect width="60" height="30" fill="#012169"/>
        <path d="M0,0 L60,30 M0,30 L60,0" stroke="#fff" stroke-width="6"/>
        <path d="M37,0 L60,15 M60,15 L37,30" stroke="#C8102E" stroke-width="4" stroke-dasharray="2.5,0"/>
        <path d="M0,15 L23,0 M23,30 L0,15" stroke="#C8102E" stroke-width="4"/>
        <path d="M30,0 V30 M0,15 H60" stroke="#fff" stroke-width="10"/>
        <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" stroke-width="6"/>
      </svg>
    </button>
    <button
      :class="['taskbar-lang-btn', { active: lang === 'jp' }]"
      @click="emit('update:lang', 'jp')"
      title="日本語"
    >
      <svg viewBox="0 0 30 20" width="24" height="16" aria-label="日本語">
        <rect width="30" height="20" fill="#fff" stroke="#ddd" stroke-width="0.5"/>
        <circle cx="15" cy="10" r="6" fill="#BC002D"/>
      </svg>
    </button>

    <!-- System tray -->
    <div class="taskbar-tray">
      <span v-if="isAdmin" class="tray-admin">ADM</span>
      <span class="tray-visited" :title="`${visitedCount} of ${totalBars} bars visited`">
        {{ visitedCount }}/{{ totalBars }}
      </span>
      <span class="tray-clock">{{ time }}</span>
    </div>
  </div>
</template>

<style scoped>
.win-taskbar {
  height: var(--taskbar-height);
  background: var(--win-bg);
  box-shadow:
    inset 0 1px 0 var(--win-border-light),
    inset 0 2px 0 var(--win-border-mid);
  display: flex;
  align-items: center;
  padding: 2px 2px;
  gap: 2px;
  position: relative;
  z-index: 1000;
  flex-shrink: 0;
}

.taskbar-start {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  height: 24px;
  background: var(--win-bg);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark),
    inset 2px 2px 0 var(--win-border-mid),
    inset -2px -2px 0 var(--win-border-darkest);
  cursor: pointer;
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  font-weight: bold;
  color: var(--valhalla-orange);
  flex-shrink: 0;
}

.taskbar-start:active,
.taskbar-start.pressed {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light),
    inset 2px 2px 0 var(--win-border-darkest),
    inset -2px -2px 0 var(--win-border-mid);
}

.start-icon {
  font-size: 14px;
  color: var(--valhalla-orange);
}

.start-text {
  font-size: 11px;
}

.start-menu {
  position: absolute;
  bottom: var(--taskbar-height);
  left: 2px;
  width: 200px;
  background: var(--win-bg);
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark),
    2px 2px 6px rgba(0, 0, 0, 0.5);
  display: flex;
  z-index: 1001;
}

.start-menu-sidebar {
  width: 24px;
  background: linear-gradient(to top, #c45c1a, #e8a040);
  color: white;
  font-size: 11px;
  font-weight: bold;
  writing-mode: vertical-lr;
  text-orientation: mixed;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 8px 2px;
  letter-spacing: 1px;
  transform: rotate(180deg);
}

.start-menu-items {
  flex: 1;
  padding: 4px 0;
}

.start-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
}

.start-menu-item:hover {
  background: var(--win-highlight);
  color: var(--win-highlight-text);
}

.taskbar-divider {
  width: 2px;
  height: 20px;
  box-shadow:
    inset 1px 0 0 var(--win-border-dark),
    1px 0 0 var(--win-border-light);
  margin: 0 2px;
  flex-shrink: 0;
}

/* View buttons (Directory/Map) */
.taskbar-view-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  height: 22px;
  background: var(--win-bg);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
  cursor: pointer;
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
  flex-shrink: 0;
}

.taskbar-view-btn.active {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  background: var(--win-bg-dark);
  color: var(--valhalla-orange);
  font-weight: bold;
}

.view-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  image-rendering: pixelated;
  display: block;
}

.taskbar-windows {
  flex: 1;
  display: flex;
  gap: 2px;
  overflow: hidden;
}

.taskbar-win-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  height: 22px;
  min-width: 100px;
  max-width: 160px;
  background: var(--win-bg);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
  cursor: pointer;
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
  text-align: left;
  overflow: hidden;
}

.taskbar-win-btn.active {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  background: var(--win-bg-dark);
  font-weight: bold;
  color: var(--valhalla-orange);
}

.taskbar-win-btn.minimized {
  font-weight: normal;
}

.taskbar-win-icon {
  font-size: 12px;
  flex-shrink: 0;
}

.taskbar-win-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.taskbar-tray {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 6px;
  height: 22px;
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  font-family: var(--win-font);
  font-size: 10px;
  color: var(--win-text);
  flex-shrink: 0;
}

.taskbar-lang-btn {
  padding: 2px 6px;
  height: 22px;
  background: var(--win-bg);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
  cursor: pointer;
  font-family: var(--win-font);
  font-size: 10px;
  color: var(--win-text);
  flex-shrink: 0;
  min-width: auto;
}

.taskbar-lang-btn.active {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  background: var(--win-bg-dark);
  color: var(--valhalla-orange);
  font-weight: bold;
}

.tray-admin {
  color: var(--valhalla-pink);
  font-weight: bold;
  font-size: 9px;
}

.tray-visited {
  color: var(--valhalla-orange);
}

.tray-clock {
  color: var(--win-text-disabled);
}

@media (max-width: 768px) {
  .win-taskbar {
    height: var(--taskbar-height);
    padding: 4px 6px;
    gap: 4px;
  }

  /* Bigger touch targets */
  .taskbar-start,
  .taskbar-view-btn,
  .taskbar-lang-btn {
    height: 42px;
    padding: 4px 12px;
  }

  /* Larger icons, hide text labels */
  .view-icon {
    width: 24px;
    height: 24px;
  }
  .view-label {
    display: none;
  }

  /* Hide start button text */
  .start-text {
    display: none;
  }
  .start-icon {
    font-size: 20px;
  }

  /* Hide window buttons — not useful on mobile */
  .taskbar-windows {
    display: none;
  }

  /* Lang buttons */
  .taskbar-lang-btn {
    padding: 4px 8px;
    min-width: 44px;
  }

  /* Tray — keep clock, hide visited count */
  .taskbar-tray {
    height: 42px;
    padding: 0 10px;
    gap: 8px;
  }
  .tray-visited,
  .tray-clock {
    display: none;
  }
}
</style>

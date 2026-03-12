<script setup>
import { ref, computed, watch } from 'vue'
import { useVisited } from '../composables/useVisited.js'
import { useI18n } from '../composables/useI18n.js'
import WinButton from './win2000/WinButton.vue'
import WinScrollContainer from './win2000/WinScrollContainer.vue'
import TagIcon from './TagIcon.vue'
import ReviewDialog from './ReviewDialog.vue'

const props = defineProps({
  buildingBars: Array, // array of bars in the clicked building
  buildingId: String,
  tags: Array,
  lang: { type: String, default: 'en' },
  openBarIds: { type: Set, default: () => new Set() },
  twitterOpen: { type: Boolean, default: false },
  autoTwitter: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'select-bar', 'show-reviews'])

const { isVisited, toggleVisited, isFavorited, toggleFavorited } = useVisited()
const { t } = useI18n(computed(() => props.lang))

const showReviewDialog = ref(false)

// Which bar is selected within the building
const selectedIndex = ref(0)

watch(() => props.buildingBars, (val) => {
  if (val && val.length > 0) selectedIndex.value = 0
})

const bar = computed(() => {
  if (!props.buildingBars || props.buildingBars.length === 0) return null
  return props.buildingBars[selectedIndex.value] || props.buildingBars[0]
})

// On desktop (autoTwitter=true): auto-open Twitter panel immediately when bar loads/changes.
// On mobile: only update the panel if it's already open.
watch(bar, (newBar) => {
  if (!newBar) return
  if (props.autoTwitter || props.twitterOpen) emit('select-bar', newBar)
}, { immediate: props.autoTwitter })

const visited = computed(() => bar.value && isVisited(bar.value.id))
const favorited = computed(() => bar.value && isFavorited(bar.value.id))

const barTags = computed(() => {
  if (!bar.value) return []
  const tags = bar.value.tags || []
  return tags.map(t => {
    if (typeof t === 'object' && t.id) return t
    if (props.tags) return props.tags.find(tag => tag.id === t)
    return null
  }).filter(Boolean)
})

const displayName = computed(() => {
  if (!bar.value) return ''
  if (props.lang === 'jp') return bar.value.name_jp || bar.value.name_en
  return bar.value.name_en || bar.value.name_jp
})

const subName = computed(() => {
  if (!bar.value) return ''
  if (props.lang === 'jp') return bar.value.name_en
  return bar.value.name_jp
})

const floorLabel = computed(() => {
  if (!bar.value) return ''
  const f = bar.value.floor
  if (f < 0) return `B${Math.abs(f)}F`
  return `${f}F`
})

const photoUrl = computed(() => {
  if (!bar.value || !bar.value.photo) return null
  return `/uploads/${bar.value.photo}`
})

const googleMapsUrl = computed(() => {
  if (!bar.value) return null
  if (bar.value.google_link) return bar.value.google_link
  if (bar.value.plus_code) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(bar.value.plus_code)}`
  return null
})

const openStatus = computed(() => {
  if (!bar.value) return null
  const hasSchedule = bar.value.schedule && bar.value.schedule.default
  if (!hasSchedule) return null // unknown
  return props.openBarIds.has(String(bar.value.id)) ? 'open' : 'closed'
})

function parseTwitterHandle(url) {
  if (!url) return null
  const match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/([A-Za-z0-9_]+)/i)
  if (!match) return null
  const skip = ['intent', 'search', 'hashtag', 'i', 'share']
  if (skip.includes(match[1].toLowerCase())) return null
  return match[1]
}

const twitterHandle = computed(() => parseTwitterHandle(bar.value?.sns))

function openGoogleMaps() {
  if (googleMapsUrl.value) window.open(googleMapsUrl.value, '_blank')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="popup">
      <div v-if="buildingBars && buildingBars.length > 0" class="popup-overlay" @click.self="emit('close')">
        <div class="win-dialog">
          <!-- Title bar -->
          <div class="win-dialog-titlebar">
            <span class="win-dialog-title">{{ buildingId || 'Building' }} &mdash; {{ buildingBars.length }} bar{{ buildingBars.length > 1 ? 's' : '' }}</span>
            <button class="win-ctrl-btn" @click="emit('close')" title="Close">
              <span class="win-ctrl-icon">&#10005;</span>
            </button>
          </div>

          <!-- Body -->
          <div class="win-dialog-body">
            <WinScrollContainer><div class="win-dialog-body-inner">
            <!-- Bar list (if multiple) -->
            <div v-if="buildingBars.length > 1" class="bar-list-tabs">
              <button
                v-for="(b, i) in buildingBars"
                :key="b.id"
                :class="['bar-tab', { active: i === selectedIndex }]"
                @click="selectedIndex = i"
              >
                {{ lang === 'jp' ? (b.name_jp || b.name_en) : (b.name_en || b.name_jp) }}
              </button>
            </div>

            <template v-if="bar">
              <!-- Bar image -->
              <div v-if="photoUrl" class="dialog-image">
                <img :src="photoUrl" :alt="displayName" />
              </div>

              <div class="dialog-header">
                <div class="dialog-header-names">
                  <div class="bar-name-en">{{ displayName }}</div>
                  <div v-if="subName" class="bar-name-jp">{{ subName }}</div>
                </div>
                <div class="dialog-header-btns">
                  <button
                    v-if="twitterHandle"
                    class="icon-action-btn"
                    title="Twitter/X"
                    @click="emit('select-bar', bar)"
                  >
                    <img src="/icons/twitter.png" alt="Twitter/X" class="icon-action-img" />
                  </button>
                  <button
                    v-if="googleMapsUrl"
                    class="maps-icon-btn"
                    :title="t('googleMaps')"
                    @click="openGoogleMaps"
                  >
                    <img src="/icons/googlemaps.png" alt="Google Maps" class="maps-icon-img" />
                  </button>
                </div>
              </div>

              <div v-if="barTags.length" class="dialog-tags">
                <span
                  v-for="tag in barTags"
                  :key="tag.id"
                  class="dialog-tag"
                  :style="{ borderLeft: `3px solid ${tag.color}` }"
                >
                  <TagIcon :icon="tag.icon" :size="10" /> {{ lang === 'jp' && tag.label_jp ? tag.label_jp : tag.label }}
                </span>
              </div>

              <div class="dialog-info">
                <div class="info-row">
                  <span class="info-label">{{ t('floor') }}</span>
                  <span>{{ floorLabel }}</span>
                </div>
                <div v-if="bar.charge" class="info-row">
                  <span class="info-label">{{ t('cover') }}</span>
                  <span>&yen;{{ bar.charge }}</span>
                </div>
                <div v-if="bar.male_charge" class="info-row">
                  <span class="info-label">{{ t('maleCharge') }}</span>
                  <span>&yen;{{ bar.male_charge }}</span>
                </div>
                <div v-if="bar.drink_price" class="info-row">
                  <span class="info-label">{{ t('drinks') }}</span>
                  <span>&yen;{{ bar.drink_price }}~</span>
                </div>
                <div v-if="bar.cash_only" class="info-row">
                  <span class="info-label">{{ t('payment') }}</span>
                  <span>{{ t('cashOnly') }}</span>
                </div>
                <div v-if="bar.seats" class="info-row">
                  <span class="info-label">{{ t('seats') }}</span>
                  <span>~{{ bar.seats }}</span>
                </div>
                <div v-if="bar.hours" class="info-row">
                  <span class="info-label">{{ t('hours') }}</span>
                  <span>{{ bar.hours }}
                    <span v-if="openStatus === 'open'" class="status-indicator status-open">&#9679; {{ t('open') }}</span>
                    <span v-else-if="openStatus === 'closed'" class="status-indicator status-closed">&#9679; {{ t('closed') }}</span>
                  </span>
                </div>
                <div v-if="bar.closed_days" class="info-row">
                  <span class="info-label">{{ t('closedDays') }}</span>
                  <span>{{ bar.closed_days }}</span>
                </div>
                <div v-if="bar.phone" class="info-row">
                  <span class="info-label">{{ t('phone') }}</span>
                  <span>{{ bar.phone }}</span>
                </div>
                <div v-if="bar.address" class="info-row">
                  <span class="info-label">{{ t('address') }}</span>
                  <span style="font-size: 10px">{{ bar.address }}</span>
                </div>
              </div>

              <p v-if="bar.description" class="dialog-description">
                {{ bar.description }}
              </p>

              <div v-if="bar.sns && !twitterHandle" class="dialog-sns">
                <img src="/icons/tags/url1.ico" class="sns-link-icon" />
                <a :href="bar.sns" target="_blank" rel="noopener">{{ bar.sns.length > 40 ? bar.sns.slice(0, 40) + '...' : bar.sns }}</a>
              </div>
              <div v-for="link in (bar.other_links || [])" :key="link" class="dialog-sns">
                <img src="/icons/tags/url1.ico" class="sns-link-icon" />
                <a :href="link" target="_blank" rel="noopener">{{ link.length > 40 ? link.slice(0, 40) + '...' : link }}</a>
              </div>

              <div class="dialog-actions">
                <WinButton
                  :pressed="favorited"
                  @click="toggleFavorited(bar.id)"
                >
                  <svg viewBox="0 0 10 10" width="10" height="10" style="margin-right:3px;vertical-align:middle">
                    <path d="M5,8.5C5,8.5 1,5.5 1,3C1,1.8 2,1 3,1.5C4,2 5,3 5,3C5,3 6,2 7,1.5C8,1 9,1.8 9,3C9,5.5 5,8.5 5,8.5Z" :fill="favorited ? '#e87898' : 'none'" :stroke="favorited ? '#e87898' : 'currentColor'" stroke-width="0.8"/>
                  </svg>
                  <template v-if="favorited">{{ t('favorited') }}</template>
                  <template v-else>{{ t('markFavorite') }}</template>
                </WinButton>
                <WinButton
                  :pressed="visited"
                  @click="toggleVisited(bar.id, () => { showReviewDialog = true })"
                >
                  <template v-if="visited">&#10003; {{ t('visited') }}</template>
                  <template v-else>{{ t('markVisited') }}</template>
                </WinButton>
                <WinButton @click="emit('show-reviews', bar)">{{ t('reviews') }}</WinButton>
                <WinButton @click="emit('close')">{{ t('close') }}</WinButton>
              </div>
            </template>
            </div></WinScrollContainer>
          </div>
        </div>
      </div>
    </Transition>

    <ReviewDialog
      v-if="showReviewDialog && bar"
      :bar="bar"
      :lang="lang"
      @done="showReviewDialog = false"
    />
  </Teleport>
</template>

<style scoped>
.popup-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.win-dialog {
  background: var(--win-bg);
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark),
    inset 2px 2px 0 var(--win-border-mid),
    inset -2px -2px 0 var(--win-border-darkest),
    4px 4px 10px rgba(0, 0, 0, 0.6);
  padding: 3px;
  width: 400px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.win-dialog-titlebar {
  display: flex;
  align-items: center;
  height: 20px;
  padding: 0 3px;
  background: var(--win-title-active);
  color: var(--win-title-text-active);
  font-family: var(--win-font);
  font-size: 11px;
  font-weight: bold;
  user-select: none;
  flex-shrink: 0;
}

.win-dialog-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-left: 2px;
}

.win-ctrl-btn {
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
  padding: 0;
}

.win-ctrl-btn:active {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.win-ctrl-icon {
  font-size: 8px;
  font-weight: bold;
  color: var(--win-text);
  line-height: 1;
}

.win-dialog-body {
  overflow: hidden;
  display: flex;
  flex: 1;
  min-height: 0;
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
}

.win-dialog-body-inner {
  padding: 8px;
}

/* Bar tabs for multi-bar buildings */
.bar-list-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 1px;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--win-border-dark);
}

.bar-tab {
  padding: 3px 8px;
  background: var(--win-bg);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
  cursor: pointer;
  font-family: var(--win-font);
  font-size: 10px;
  color: var(--win-text);
}

.bar-tab.active {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  background: var(--win-bg-dark);
  color: var(--valhalla-orange);
  font-weight: bold;
}

/* Bar image */
.dialog-image {
  margin-bottom: 8px;
  background: var(--win-bg-dark);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  padding: 2px;
}

.dialog-image img {
  width: 100%;
  height: 160px;
  object-fit: cover;
  display: block;
  image-rendering: auto;
}

.dialog-header {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--win-border-dark);
}

.dialog-header-names {
  flex: 1;
  min-width: 0;
}

.dialog-header-btns {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding-top: 2px;
}

.bar-name-en {
  font-size: 14px;
  font-weight: 700;
  color: var(--valhalla-orange);
}

.bar-name-jp {
  font-size: 11px;
  color: var(--win-text-disabled);
}

.icon-action-btn {
  background: var(--win-bg);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  flex-shrink: 0;
}

.icon-action-btn:active {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.icon-action-img {
  width: 80px;
  height: 15px;
  display: block;
  image-rendering: pixelated;
}

.dialog-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.dialog-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 6px;
  background: var(--win-bg-dark);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  font-size: 10px;
}

.dialog-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.info-row {
  display: flex;
  gap: 8px;
}

.info-label {
  color: var(--win-text-disabled);
  min-width: 70px;
  flex-shrink: 0;
}

.dialog-description {
  margin-top: 8px;
  line-height: 1.5;
  color: var(--win-text);
  padding: 4px;
  background: var(--win-bg-dark);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.dialog-sns {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.dialog-sns a {
  color: var(--valhalla-orange);
  font-size: 10px;
  text-decoration: underline;
}

.sns-link-icon {
  width: 14px;
  height: 14px;
  image-rendering: pixelated;
  flex-shrink: 0;
}

.dialog-actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 4px;
  padding-top: 8px;
  border-top: 1px solid var(--win-border-dark);
}

.dialog-actions > * {
  flex: 1 1 auto;
  min-width: 0;
}

.maps-icon-btn {
  background: var(--win-bg);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  flex-shrink: 0;
}

.maps-icon-btn:active {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.maps-icon-img {
  width: 80px;
  height: 15px;
  display: block;
  image-rendering: pixelated;
}

.status-indicator {
  font-size: 10px;
  margin-left: 6px;
  font-weight: bold;
}

.status-open {
  color: #4caf50;
}

.status-closed {
  color: #e05050;
}

.popup-enter-active,
.popup-leave-active {
  transition: opacity 0.15s;
}
.popup-enter-from,
.popup-leave-to {
  opacity: 0;
}
</style>

<script setup>
// The floor/building headers and bar cards of the bar drawer. Its own
// component so the drawer can show two lists at once (the long list and the
// map-hover preview over it) and so a hover, which only changes the drawer's
// title and preview, does not re-render the cards of the long list.
import { computed } from 'vue'
import { useVisited } from '../composables/useVisited.js'
import { useSuggestEdit } from '../composables/useSuggestEdit.js'
import { useI18n } from '../composables/useI18n.js'
import { canNativeShare } from '../composables/useUrlState.js'
import { parsePrice, yen } from '../utils/barFilters.js'
import WinButton from './win2000/WinButton.vue'
import TagIcon from './TagIcon.vue'
import { parseTwitterHandle } from '../utils/twitter.js'

const props = defineProps({
  // [{ key, label, floor, bars, isBuilding }]
  groups: { type: Array, default: () => [] },
  // Reuse the card elements when the bars change (keyed by position, not by
  // bar): for the hover preview, where the cards are swapped on every move
  // and patching one in place is cheaper than building a new one. The cards
  // hold no state of their own, so nothing can leak from one bar to the next.
  reuseCards: { type: Boolean, default: false },
  chargeMin: { type: Number, default: null },
  chargeMax: { type: Number, default: null },
  drinkMin: { type: Number, default: null },
  drinkMax: { type: Number, default: null },
  openBarIds: { type: Set, default: () => new Set() },
  tags: { type: Array, default: () => [] },
  lang: { type: String, default: 'en' },
})

const emit = defineEmits(['select-bar', 'show-reviews', 'share-bar', 'hover-bar', 'unhover-bar', 'review-bar'])

const { openSuggestEdit } = useSuggestEdit()
// "Share…" opens the phone's share sheet; elsewhere the link is copied
const nativeShare = canNativeShare()
const { isVisited, toggleVisited, isFavorited, toggleFavorited } = useVisited()
const { t } = useI18n(computed(() => props.lang))

const FLOOR_COLORS = {
  '-3': '#0f2040',
  '-2': '#2a1845',
  '-1': '#1a3868',
  1: '#934400',
  2: '#005559',
  3: '#4a6030',
  4: '#7a2050',
  5: '#5a3020',
}

function floorColor(floor) {
  return FLOOR_COLORS[floor] ?? '#934400'
}

// "?" marker: a price filter is active but this bar's price is unconfirmed
// (unknown prices pass price filters).
const chargeUnknown = (bar) =>
  (props.chargeMin != null || props.chargeMax != null) && parsePrice(bar.charge) == null
const drinkUnknown = (bar) =>
  (props.drinkMin != null || props.drinkMax != null) && parsePrice(bar.drink_price) == null

const tagMap = computed(() => {
  const map = {}
  for (const tag of props.tags) map[tag.id] = tag
  return map
})

function getBarTags(bar) {
  return (bar.tags || []).map(t => {
    if (typeof t === 'object' && t.id) return t
    return tagMap.value[t]
  }).filter(Boolean)
}

function getDisplayName(bar) {
  if (props.lang === 'jp') return bar.name_jp || bar.name_en
  return bar.name_en || bar.name_jp
}

function getSubName(bar) {
  if (props.lang === 'jp') return bar.name_en
  return bar.name_jp
}

function getGoogleMapsUrl(bar) {
  if (bar.google_link) return bar.google_link
  if (bar.plus_code) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(bar.plus_code)}`
  return null
}

function openGoogleMaps(bar) {
  const url = getGoogleMapsUrl(bar)
  if (url) window.open(url, '_blank')
}

function getOpenStatus(bar) {
  const hasSchedule = bar.schedule && bar.schedule.default
  if (!hasSchedule) return null
  return props.openBarIds.has(String(bar.id)) ? 'open' : 'closed'
}
</script>

<template>
<template v-for="(group, gi) in groups" :key="reuseCards ? gi : group.key">
  <div
    class="drawer-floor-header"
    :style="{ borderLeftColor: group.isBuilding ? '#4a3010' : floorColor(group.floor) }"
  >
    {{ group.label }}
  </div>
  <div v-for="(bar, bi) in group.bars" :key="reuseCards ? bi : bar.id" class="drawer-bar-card"
    @mouseenter="emit('hover-bar', String(bar.id))"
    @mouseleave="emit('unhover-bar')"
  >
    <div v-if="bar.photo" :key="bar.photo" class="drawer-bar-photo">
      <img :src="`/uploads/${bar.photo}`" :alt="getDisplayName(bar)" />
    </div>
    <div class="drawer-bar-header">
      <div class="drawer-bar-names">
        <div class="drawer-bar-name-en" :class="{ 'name-favorited': isFavorited(bar.id) }">
          <svg v-if="isVisited(bar.id)" class="bar-status-icon" viewBox="0 0 10 10" width="10" height="10" fill="none">
            <polyline points="1,5 3.5,8.5 9,1.5" stroke="#4caf50" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg v-if="isFavorited(bar.id)" class="bar-status-icon" viewBox="0 0 10 10" width="10" height="10">
            <path d="M5,8.5C5,8.5 1,5.5 1,3C1,1.8 2,1 3,1.5C4,2 5,3 5,3C5,3 6,2 7,1.5C8,1 9,1.8 9,3C9,5.5 5,8.5 5,8.5Z" fill="#e87898"/>
          </svg>
          {{ getDisplayName(bar) }}
        </div>
        <div v-if="getSubName(bar)" class="drawer-bar-name-jp">{{ getSubName(bar) }}</div>
      </div>
      <div class="drawer-bar-header-btns">
        <button
          v-if="parseTwitterHandle(bar.sns)"
          class="icon-action-btn"
          :title="t('twitterX')"
          @click="emit('select-bar', bar)"
        >
          <img src="/icons/twitter.png" :alt="t('twitterX')" class="icon-action-img" />
        </button>
        <button
          v-if="getGoogleMapsUrl(bar)"
          class="maps-icon-btn"
          :title="t('googleMaps')"
          @click="openGoogleMaps(bar)"
        >
          <img src="/icons/googlemaps.png" :alt="t('googleMaps')" class="maps-icon-img" />
        </button>
      </div>
    </div>
    <div v-if="getBarTags(bar).length" class="drawer-bar-tags">
      <span
        v-for="tag in getBarTags(bar)"
        :key="tag.id"
        class="drawer-tag"
        :style="{ borderLeft: `3px solid ${tag.color}` }"
      >
        <TagIcon :icon="tag.icon" :size="10" /> {{ lang === 'jp' && tag.label_jp ? tag.label_jp : tag.label }}
      </span>
    </div>
    <div class="drawer-bar-info">
      <div v-if="bar.charge" class="info-row">
        <span class="info-label">{{ t('cover') }}</span>
        <span>{{ yen(bar.charge) }}<span v-if="chargeUnknown(bar)" class="price-unknown" :title="t('priceUnconfirmed')">?</span></span>
      </div>
      <div v-else-if="chargeUnknown(bar)" class="info-row">
        <span class="info-label">{{ t('cover') }}</span>
        <span class="price-unknown" :title="t('priceUnconfirmed')">&yen;?</span>
      </div>
      <div v-if="bar.male_charge" class="info-row">
        <span class="info-label">{{ t('maleCharge') }}</span>
        <span>{{ yen(bar.male_charge) }}</span>
      </div>
      <div v-if="bar.drink_price" class="info-row">
        <span class="info-label">{{ t('drinks') }}</span>
        <span>{{ yen(bar.drink_price) }}~<span v-if="drinkUnknown(bar)" class="price-unknown" :title="t('priceUnconfirmed')">?</span></span>
      </div>
      <div v-else-if="drinkUnknown(bar)" class="info-row">
        <span class="info-label">{{ t('drinks') }}</span>
        <span class="price-unknown" :title="t('priceUnconfirmed')">&yen;?</span>
      </div>
      <div v-if="bar.seats" class="info-row">
        <span class="info-label">{{ t('seats') }}</span>
        <span>~{{ bar.seats }}</span>
      </div>
      <div v-if="bar.hours" class="info-row">
        <span class="info-label">{{ t('hours') }}</span>
        <span>{{ bar.hours }}
          <span v-if="getOpenStatus(bar) === 'open'" class="status-open">&#9679; {{ t('open') }}</span>
          <span v-else-if="getOpenStatus(bar) === 'closed'" class="status-closed">&#9679; {{ t('closed') }}</span>
        </span>
      </div>
      <div v-if="bar.description" class="info-description">{{ bar.description }}</div>
      <div v-if="bar.sns && !parseTwitterHandle(bar.sns)" class="info-sns-link">
        <img src="/icons/tags/url1.ico" class="sns-link-icon" />
        <a :href="bar.sns" target="_blank" rel="noopener">{{ bar.sns.length > 40 ? bar.sns.slice(0, 40) + '...' : bar.sns }}</a>
      </div>
      <div v-for="link in (bar.other_links || [])" :key="link" class="info-sns-link">
        <img src="/icons/tags/url1.ico" class="sns-link-icon" />
        <a :href="link" target="_blank" rel="noopener">{{ link.length > 40 ? link.slice(0, 40) + '...' : link }}</a>
      </div>
    </div>
    <div class="drawer-bar-actions">
      <WinButton small :pressed="isVisited(bar.id)" @click="toggleVisited(bar.id, () => emit('review-bar', bar))">
        <template v-if="isVisited(bar.id)">&#10003; {{ t('visited') }}</template>
        <template v-else>{{ t('markVisited') }}</template>
      </WinButton>
      <WinButton small :pressed="isFavorited(bar.id)" @click="toggleFavorited(bar.id)">
        <template v-if="isFavorited(bar.id)">&#9829; {{ t('favorited') }}</template>
        <template v-else>{{ t('markFavorite') }}</template>
      </WinButton>
      <WinButton small @click="emit('show-reviews', bar)">{{ t('reviews') }}</WinButton>
      <WinButton small class="share-btn" @click="emit('share-bar', { bar, anchor: $event.currentTarget })">
        <img src="/icons/tags/url1.ico" class="share-btn-icon" alt="" />{{ t(nativeShare ? 'shareBar' : 'copyLink') }}
      </WinButton>
    </div>
    <div class="suggest-row">
      <button class="suggest-link" @click.stop="openSuggestEdit(bar)">&#9998; {{ t('suggestEdit') }}</button>
    </div>
  </div>
</template>
</template>

<style scoped>
.drawer-floor-header {
  padding: 3px 6px;
  font-size: 10px;
  font-weight: bold;
  font-family: var(--win-font);
  color: var(--win-text-disabled);
  text-transform: uppercase;
  letter-spacing: 1px;
  border-left: 4px solid #934400;
  margin: 6px 0 2px;
  background: var(--win-bg-dark);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.drawer-bar-card {
  margin-bottom: 4px;
  padding: 5px 6px;
  background: var(--win-bg);
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
}

.drawer-bar-photo {
  margin-bottom: 5px;
  background: var(--win-bg-dark);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  padding: 2px;
}

.drawer-bar-photo img {
  width: 100%;
  height: 90px;
  object-fit: cover;
  display: block;
}

.drawer-bar-header {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 4px;
}

.drawer-bar-names {
  flex: 1;
  min-width: 0;
}

.drawer-bar-header-btns {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
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

.drawer-bar-name-en {
  font-size: 12px;
  font-weight: 700;
  color: var(--valhalla-orange);
  display: flex;
  align-items: center;
  gap: 3px;
}

.drawer-bar-name-en.name-favorited {
  color: #e87898;
}

.bar-status-icon {
  flex-shrink: 0;
}

.drawer-bar-name-jp {
  font-size: 10px;
  color: var(--win-text-disabled);
}

.drawer-bar-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  margin-bottom: 4px;
}

.drawer-tag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1px 5px;
  background: var(--win-bg-dark);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  font-size: 10px;
}

.drawer-bar-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 5px;
}

.info-row {
  display: flex;
  gap: 8px;
  font-size: 11px;
}

.info-label {
  color: var(--win-text-disabled);
  min-width: 70px;
  flex-shrink: 0;
}

.price-unknown {
  color: var(--win-text-disabled);
  margin-left: 2px;
  cursor: help;
}

.info-sns-link {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 3px;
}
.info-sns-link a {
  color: var(--valhalla-orange, #b85800);
  font-size: 10px;
  text-decoration: underline;
  word-break: break-all;
}
.sns-link-icon {
  width: 14px;
  height: 14px;
  image-rendering: pixelated;
  flex-shrink: 0;
}

.info-description {
  font-size: 10px;
  color: var(--win-text-disabled);
  margin-top: 2px;
  padding: 3px 4px;
  background: var(--win-bg-dark);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  line-height: 1.4;
}

.status-open {
  color: #4caf50;
  font-size: 10px;
  margin-left: 4px;
  font-weight: bold;
}

.status-closed {
  color: #e05050;
  font-size: 10px;
  margin-left: 4px;
  font-weight: bold;
}

.drawer-bar-actions {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
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

@media (max-width: 768px) {
  .drawer-floor-header {
    font-size: 13px;
    padding: 5px 8px;
    margin: 8px 0 3px;
  }

  .drawer-bar-card {
    padding: 8px 10px;
    margin-bottom: 6px;
  }

  .drawer-bar-name-en {
    font-size: 16px;
  }

  .drawer-bar-name-jp {
    font-size: 13px;
  }

  .drawer-tag {
    font-size: 12px;
    padding: 3px 8px;
  }

  .info-row {
    font-size: 13px;
  }

  .info-label {
    min-width: 90px;
  }

  .info-description {
    font-size: 12px;
  }

  .drawer-bar-photo img {
    height: 120px;
  }

  .maps-icon-img {
    width: 100px;
    height: 19px;
  }
}

/* "Suggest edit": Win95 hyperlink-style text button under the actions */
.suggest-row {
  display: flex;
  justify-content: flex-end;
}

.suggest-link {
  font-family: var(--win-font);
  font-size: 10px;
  line-height: 1;
  background: none;
  border: none;
  padding: 3px 0;
  color: var(--win-title-text-inactive);
  text-decoration: underline;
  cursor: pointer;
}

.suggest-link:hover { color: var(--valhalla-orange); }

.suggest-link:focus-visible {
  outline: 1px dotted currentColor;
  outline-offset: 1px;
}

/* Share / copy-link button */
.share-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.share-btn-icon {
  width: 14px;
  height: 14px;
  image-rendering: pixelated;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  /* Beats WinButton's own .small sizing. Every action button, not only the
     share button: a wrapped row without it was 23px tall. */
  .drawer-bar-actions .win-btn.small {
    min-height: 40px;
  }
  .drawer-bar-actions .share-btn.small {
    padding: 2px 10px;
  }
  .suggest-link {
    min-height: 40px;
    padding: 0 4px;
    font-size: 12px;
  }
}
</style>

<script setup>
// One door sticker (G05): a 90 x 55 mm Win95 window, "GaiMap.exe", with the
// bar's name and a QR code to its page. Sized in millimetres so it prints at
// true size; the on-screen preview scales the whole card.
//
// The sticker is bilingual whatever language the admin works in: it is read
// by whoever walks past the door.
import { computed } from 'vue'
// The encoder only: the package's renderers (canvas, PNG, its own SVG string)
// are not needed, the matrix is drawn below.
import qrcode from 'qrcode/lib/core/qrcode.js'
import { useI18n } from '../../composables/useI18n.js'
import { stickerUrl, stickerNames, nameSize, displayHost, qrPath, qrViewSize } from '../../utils/sticker.js'

const props = defineProps({
  bar: { type: Object, required: true },
  baseUrl: { type: String, required: true },
})

const en = useI18n('en').t
const jp = useI18n('jp').t

const url = computed(() => stickerUrl(props.baseUrl, props.bar.slug))
const host = computed(() => displayHost(props.baseUrl))
const names = computed(() => stickerNames(props.bar))

// "Rules · Hours · Charge": the pixel font has no middle dot, so the
// separators are drawn as squares instead of falling back to a system font.
const infoLines = computed(() => [en, jp].map(t => t('stickerInfoLine').split('·').map(part => part.trim())))

// Level M: 15% of the symbol can be damaged. Higher levels make the modules
// too small for a long Japanese slug at this size.
const qr = computed(() => {
  try {
    const { modules } = qrcode.create(url.value, { errorCorrectionLevel: 'M' })
    return {
      view: qrViewSize(modules.size),
      path: qrPath(modules.size, (row, col) => !!modules.get(row, col)),
    }
  } catch (err) {
    console.error('QR encoding failed:', err)
    return null
  }
})
</script>

<template>
  <div class="sticker-card" :data-sticker-url="url">
    <div class="sticker-window">
      <div class="sticker-window-inner">
        <div class="sticker-title">
          <img class="sticker-title-icon" src="/icons/desktop/map.png" alt="" />
          <span class="sticker-title-text">GaiMap.exe</span>
          <span class="sticker-ctrl">
            <svg viewBox="0 0 8 7" shape-rendering="crispEdges"><path d="M1 5h5v1H1z" /></svg>
          </span>
          <span class="sticker-ctrl">
            <svg viewBox="0 0 8 7" shape-rendering="crispEdges"><path d="M1 0h6v6H1zM2 2v3h4V2z" fill-rule="evenodd" /></svg>
          </span>
          <span class="sticker-ctrl sticker-ctrl-close">
            <svg viewBox="0 0 8 7" shape-rendering="crispEdges"><path d="M1 0h2v1h1v1h1V1h1V0h1v1H6v1H5v1h1v1h1v1h1v1H6V5H5V4H4v1H3v1H1V5h1V4h1V3H2V2H1z" /></svg>
          </span>
        </div>

        <div class="sticker-body">
          <div class="sticker-qr-well">
            <svg
              v-if="qr"
              class="sticker-qr"
              :viewBox="`0 0 ${qr.view} ${qr.view}`"
              shape-rendering="crispEdges"
              role="img"
              :aria-label="url"
            >
              <rect :width="qr.view" :height="qr.view" fill="#fff" />
              <path :d="qr.path" fill="#000" />
            </svg>
          </div>

          <div class="sticker-text">
            <div class="sticker-names">
              <div :class="['sticker-name', `size-${nameSize(names.primary)}`]">{{ names.primary }}</div>
              <div v-if="names.secondary" :class="['sticker-name-sub', `size-${nameSize(names.secondary)}`]">{{ names.secondary }}</div>
            </div>
            <div class="sticker-pitch">
              <div class="sticker-pitch-en">{{ en('stickerFindUs') }}</div>
              <div class="sticker-pitch-brand">Golden Gai Map</div>
              <div class="sticker-pitch-jp">{{ jp('stickerFindUs') }}</div>
              <div v-if="host" class="sticker-host">{{ host }}</div>
            </div>
          </div>
        </div>

        <div class="sticker-status">
          <div v-for="(parts, i) in infoLines" :key="i" class="sticker-status-cell">
            <template v-for="(part, j) in parts" :key="j">
              <span v-if="j" class="sticker-dot" />{{ part }}
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Classic light Win95 chrome: this goes on paper, so it is the silver theme
   with the app's orange title bar, not the app's dark one. Bevels are real
   borders (they print as vectors). Colours must print: print-color-adjust. */
.sticker-card {
  width: 90mm;
  height: 55mm;
  padding: 1.5mm;
  background: #fff;
  color: #000;
  font-family: var(--win-font);
  font-size: 2.6mm;
  line-height: 1.15;
  overflow: hidden;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  text-align: left;
}

.sticker-card * {
  cursor: inherit;
}

.sticker-window {
  width: 100%;
  height: 100%;
  border: 0.35mm solid;
  border-color: #dfdfdf #000 #000 #dfdfdf;
  background: #c0c0c0;
}

.sticker-window-inner {
  width: 100%;
  height: 100%;
  border: 0.35mm solid;
  border-color: #fff #808080 #808080 #fff;
  padding: 0.4mm;
  display: flex;
  flex-direction: column;
}

/* Title bar */
.sticker-title {
  flex: none;
  height: 5.6mm;
  display: flex;
  align-items: center;
  gap: 0.6mm;
  padding: 0 0.7mm 0 1mm;
  background: linear-gradient(to right, #c45c1a, #e8a040);
  color: #fff;
}

.sticker-title-icon {
  width: 4mm;
  height: 4mm;
  image-rendering: pixelated;
}

.sticker-title-text {
  flex: 1;
  font-size: 3.4mm;
  letter-spacing: 0.1mm;
  white-space: nowrap;
  padding-left: 0.5mm;
}

.sticker-ctrl {
  flex: none;
  width: 4.4mm;
  height: 3.9mm;
  background: #c0c0c0;
  border: 0.3mm solid;
  border-color: #fff #000 #000 #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sticker-ctrl svg {
  width: 2.5mm;
  height: 2.2mm;
  fill: #000;
}

.sticker-ctrl-close {
  margin-left: 0.5mm;
}

/* Body */
.sticker-body {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  gap: 2.4mm;
  padding: 0 1.4mm 0 1.2mm;
}

/* Sunken white field, like a list box. 34.7 mm inside: with the 4-module quiet
   zone the symbol itself is 27 to 29 mm across, depending on the slug's length. */
.sticker-qr-well {
  flex: none;
  width: 35.4mm;
  height: 35.4mm;
  border: 0.35mm solid;
  border-color: #808080 #fff #fff #808080;
  background: #fff;
}

/* No second (black) bevel line here: nothing dark may touch the quiet zone */
.sticker-qr {
  display: block;
  width: 100%;
  height: 100%;
  background: #fff;
}

.sticker-text {
  flex: 1;
  min-width: 0;
  height: 35.4mm;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.sticker-names {
  min-width: 0;
}

.sticker-name,
.sticker-name-sub {
  overflow: hidden;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.sticker-name.size-l { font-size: 5.6mm; }
.sticker-name.size-m { font-size: 4.3mm; }
.sticker-name.size-s { font-size: 3.4mm; }

.sticker-name-sub {
  margin-top: 0.8mm;
}

.sticker-name-sub.size-l { font-size: 4mm; }
.sticker-name-sub.size-m { font-size: 3.3mm; }
.sticker-name-sub.size-s { font-size: 2.8mm; }

/* Etched line above the pitch, as between groups in a dialog */
.sticker-pitch {
  border-top: 0.3mm solid #808080;
  box-shadow: inset 0 0.3mm 0 #fff;
  padding-top: 1.3mm;
}

.sticker-pitch-en {
  font-size: 2.9mm;
}

.sticker-pitch-brand {
  font-size: 4.4mm;
  white-space: nowrap;
}

.sticker-pitch-jp {
  font-size: 2.9mm;
  margin-top: 0.5mm;
}

.sticker-host {
  font-size: 2.4mm;
  margin-top: 0.9mm;
  color: #404040;
  white-space: nowrap;
  overflow: hidden;
}

/* Status bar */
.sticker-status {
  flex: none;
  display: flex;
  gap: 0.6mm;
  height: 4.9mm;
}

.sticker-dot {
  display: inline-block;
  width: 0.5mm;
  height: 0.5mm;
  margin: 0 1.1mm;
  vertical-align: middle;
  background: #000;
}

.sticker-status-cell {
  flex: 1;
  min-width: 0;
  border: 0.3mm solid;
  border-color: #808080 #fff #fff #808080;
  padding: 0 1mm;
  font-size: 2.7mm;
  line-height: 4.2mm;
  white-space: nowrap;
  overflow: hidden;
}
</style>

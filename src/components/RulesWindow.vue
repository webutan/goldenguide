<script setup>
import WinButton from './win2000/WinButton.vue'

defineProps({
  lang: { type: String, default: 'en' },
})
const emit = defineEmits(['accepted'])

const GENERAL_RULES = [
  {
    en: 'Golden Gai is located on private streets, so please observe the rules.',
    jp: 'ゴールデン街はすべて私道です。ルールを守って楽しい夜をお過ごしください。',
    sprite: '/gaichan/gaichanidle.png',
  },
  {
    en: 'Security cameras are in operation to prevent crime.',
    jp: '犯罪行為抑止のため、防犯カメラが作動しています。',
    sprite: '/gaichan/gaichanidle.png',
  },
  {
    en: 'The buildings are old and made of wood. Please do not smoke.',
    jp: '建物は古く木造です。喫煙しないでください。',
    sprite: '/gaichan/smoking.png',
  },
  {
    en: 'Some establishments may require a table charge.',
    jp: 'お店によってはチャージ料金が掛かります。',
    sprite: '/gaichan/gaichanidle.png',
  },
  {
    en: 'Please beware of luggage thieves.',
    jp: '置き引きに注意してください。',
    sprite: '/gaichan/gaichanidle.png',
  },
]

const PROHIBITED_RULES = [
  { num: 1,  en: 'Smoking outside',                    jp: '路上禁煙',                        sprite: '/gaichan/smoking.png'     },
  { num: 2,  en: 'Littering of trash and cigarettes',  jp: 'ゴミ・タバコのポイ捨て',           sprite: '/gaichan/trash.png'       },
  { num: 3,  en: 'Drinking alcohol outside',           jp: '路上飲酒',                        sprite: '/gaichan/drinking.png'    },
  { num: 4,  en: 'Photography',                        jp: '撮影',                            sprite: '/gaichan/gaichanidle.png' },
  { num: 5,  en: 'Shouting / Noise disturbance',       jp: '大声・大合唱',                     sprite: '/gaichan/gaichanidle.png' },
  { num: 6,  en: 'Graffiti',                           jp: '落ち書き',                         sprite: '/gaichan/gaichanidle.png' },
  { num: 7,  en: 'The sale or use of illegal drugs',   jp: 'ドラッグの売買・使用',             sprite: '/gaichan/drugs.png'       },
  { num: 8,  en: 'Urinating, vomiting, and spitting',  jp: '立ちション・嘔吐・ツバを吐く',      sprite: '/gaichan/vomit.png'       },
  { num: 9,  en: 'Obstructing traffic or loitering',   jp: '通行妨害(道をふさぐ・たむろする）', sprite: '/gaichan/gaichanidle.png' },
  { num: 10, en: 'Riding bicycles or skateboards',     jp: '自転車・スケボーの乗り入れ',        sprite: '/gaichan/skateboard.png'  },
  { num: 11, en: 'Climbing over fences or buildings',  jp: '建物やフェンスによじ登る',          sprite: '/gaichan/gaichanidle.png' },
]
</script>

<template>
  <Teleport to="body">
    <div class="rules-backdrop"></div>

    <div class="rules-window">
      <div class="rules-titlebar">
        <span>ゴールデン街 / Golden Gai — Rules &amp; Manners</span>
      </div>

      <div class="rules-body">
        <!-- Sign banner -->
        <img class="rules-sign" src="/signs/sign.png" alt="Golden Gai Rules" />

        <!-- General rules -->
        <div class="rules-section-header">
          <span class="rules-section-en">Rules and Manners for Enjoying Golden Gai</span>
          <span class="rules-section-jp">ゴールデン街を楽しむためのルールとマナー</span>
        </div>

        <ul class="rules-list">
          <li v-for="(rule, i) in GENERAL_RULES" :key="'g' + i" class="rule-item">
            <div class="rule-text">
              <span class="rule-en">{{ rule.en }}</span>
              <span class="rule-jp">{{ rule.jp }}</span>
            </div>
            <div class="rule-divider"></div>
            <img class="rule-sprite" :src="rule.sprite" alt="" />
          </li>
        </ul>

        <!-- Prohibited acts -->
        <div class="rules-section-header rules-section-header--prohibited">
          <span class="rules-section-en">The Following Acts Are Prohibited</span>
          <span class="rules-section-jp">屋外（道路）での禁止行為</span>
        </div>

        <ul class="rules-list">
          <li v-for="rule in PROHIBITED_RULES" :key="'p' + rule.num" class="rule-item">
            <div class="rule-text">
              <span class="rule-num">{{ rule.num }}.</span>
              <span class="rule-en">{{ rule.en }}</span>
              <span class="rule-jp">{{ rule.jp }}</span>
            </div>
            <div class="rule-divider"></div>
            <img class="rule-sprite" :src="rule.sprite" alt="" />
          </li>
        </ul>

        <!-- Footer rule -->
        <div class="rules-footer-rule">
          <span>It is illegal for those under 20 years of age to drink alcohol.</span>
          <span>20歳未満の飲酒は法律で禁止されています。</span>
        </div>

        <!-- Accept button -->
        <div class="rules-accept">
          <WinButton class="rules-accept-btn" @click="emit('accepted')">I Understand</WinButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.rules-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  z-index: 1099;
}

.rules-window {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(85vw, 960px);
  height: 88vh;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  background: var(--win-bg);
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark),
    inset 2px 2px 0 var(--win-border-mid),
    inset -2px -2px 0 var(--win-border-darkest),
    8px 8px 24px rgba(0, 0, 0, 0.8);
  padding: 3px;
}

.rules-titlebar {
  height: 20px;
  display: flex;
  align-items: center;
  padding: 0 6px;
  background: var(--win-title-active);
  color: var(--win-title-text-active);
  font-family: var(--win-font);
  font-size: 11px;
  font-weight: bold;
  user-select: none;
  flex-shrink: 0;
}

.rules-body {
  flex: 1;
  overflow-y: auto;
  background: #e1e1d5;
}

/* Sign banner */
.rules-sign {
  width: 100%;
  height: 130px;
  display: block;
  object-fit: cover;
  object-position: center;
  image-rendering: pixelated;
}

/* Section headers */
.rules-section-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 20px 10px;
  border-bottom: 2px solid #19613a;
}

.rules-section-header--prohibited {
  margin-top: 8px;
  padding-top: 14px;
}

.rules-section-en {
  font-family: var(--win-font);
  font-size: 13px;
  font-weight: bold;
  color: #19613a;
}

.rules-section-jp {
  font-family: var(--win-font);
  font-size: 11px;
  color: #19613a;
  opacity: 0.8;
}

/* Rules list */
.rules-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.rule-item {
  display: flex;
  align-items: stretch;
  gap: 0;
  padding: 10px 16px 10px 20px;
  border-bottom: 1px solid rgba(25, 97, 58, 0.2);
}

.rule-item:last-child {
  border-bottom: none;
}

.rule-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  text-align: left;
  justify-content: center;
}

.rule-num {
  font-family: var(--win-font);
  font-size: 15px;
  font-weight: bold;
  color: #a82e28;
}

.rule-en {
  font-family: var(--win-font);
  font-size: 15px;
  font-weight: bold;
  color: #a82e28;
  line-height: 1.4;
}

.rule-jp {
  font-family: var(--win-font);
  font-size: 12px;
  color: #a82e28;
  opacity: 0.8;
}

.rule-divider {
  width: 2px;
  align-self: stretch;
  background: #19613a;
  flex-shrink: 0;
  margin: 0 16px;
}

.rule-sprite {
  height: 160px;
  width: auto;
  flex-shrink: 0;
  image-rendering: pixelated;
  align-self: center;
}

/* Footer rule */
.rules-footer-rule {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 14px 20px;
  border-top: 2px solid #19613a;
  margin-top: 8px;
  font-family: var(--win-font);
  font-size: 12px;
  color: #a82e28;
  font-style: italic;
}

/* Accept button */
.rules-accept {
  display: flex;
  justify-content: center;
  padding: 20px 0 24px;
}

.rules-accept-btn {
  padding: 4px 24px !important;
  font-size: 12px !important;
}
</style>

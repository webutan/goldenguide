<script setup>
import { ref, computed } from 'vue'
import WinButton from './win2000/WinButton.vue'
import WinScrollContainer from './win2000/WinScrollContainer.vue'

const props = defineProps({
  lang: { type: String, default: 'en' },
})
const emit = defineEmits(['close'])

const form = ref({ name: '', email: '', message: '' })
const submitted = ref(false)

const jp = computed(() => props.lang === 'jp')

function handleSubmit() {
  if (!form.value.message.trim()) return
  const subject = encodeURIComponent('Golden Guide Contact Form')
  const body = encodeURIComponent(
    `Name: ${form.value.name}\nEmail: ${form.value.email}\n\nMessage:\n${form.value.message}`
  )
  window.open(`mailto:aaren@golden.guide?subject=${subject}&body=${body}`, '_blank')
  submitted.value = true
}
</script>

<template>
  <Teleport to="body">
    <div class="contact-backdrop" @click.self="emit('close')"></div>

    <div class="contact-window">
      <div class="contact-titlebar">
        <span>Contact / お問い合わせ</span>
        <button class="contact-close-btn" @click="emit('close')" title="Close">
          <span>&#10005;</span>
        </button>
      </div>

      <div class="contact-body">
        <WinScrollContainer><div class="contact-body-inner">
        <div class="contact-intro">
          <p class="contact-heading">
            {{ jp ? 'Golden Guideへようこそ！' : 'Thank you for visiting Golden Guide!' }}
          </p>
          <p class="contact-text">
            <template v-if="jp">
              Golden Guideは私個人のプロジェクトです。ゴールデン街や新宿三光商店街振興組合とは一切関係がなく、著作権はすべて同組合に帰属します。
            </template>
            <template v-else>
              Golden Guide is a personal project of mine. I have no affiliation with Golden Gai or
              the Shinjuku Golden Gai Promotion Association
              (新宿三光商店街振興組合), of which have all rights reserved.
            </template>
          </p>
          <p class="contact-text">
            <template v-if="jp">
              ご質問やご不明な点がございましたら、
              <a href="mailto:aaren@golden.guide" class="contact-link">aaren@golden.guide</a>
              までメールいただくか、以下のフォームよりお問い合わせください。ゴールデン街のバーで情報の修正をご希望の方もお気軽にご連絡ください。
            </template>
            <template v-else>
              If you have any questions or concerns, you can reach me at
              <a href="mailto:aaren@golden.guide" class="contact-link">aaren@golden.guide</a>,
              or by filling in the contact form below. You can also reach out if you are a bar in
              Golden Gai who wants to correct any information that may be incorrect.
            </template>
          </p>
        </div>

        <div class="contact-divider"></div>

        <div v-if="submitted" class="contact-thanks">
          <p>{{ jp ? 'メールクライアントにメッセージが入力された状態で開いたはずです。ありがとうございます！' : 'Your email client should have opened with your message pre-filled. Thank you!' }}</p>
          <WinButton @click="emit('close')">{{ jp ? '閉じる' : 'Close' }}</WinButton>
        </div>

        <form v-else class="contact-form" @submit.prevent="handleSubmit">
          <div class="form-field">
            <label class="form-label">{{ jp ? 'お名前' : 'Name' }}</label>
            <input v-model="form.name" type="text" class="form-input" :placeholder="jp ? 'お名前を入力してください' : 'Your name'" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ jp ? 'メールアドレス' : 'Email' }}</label>
            <input v-model="form.email" type="email" class="form-input" placeholder="your@email.com" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ jp ? 'メッセージ' : 'Message' }} <span class="form-required">*</span></label>
            <textarea
              v-model="form.message"
              class="form-textarea"
              rows="5"
              :placeholder="jp ? 'こちらにメッセージをご記入ください...' : 'Write your message here...'"
              required
            ></textarea>
          </div>
          <div class="form-actions">
            <WinButton type="submit" :disabled="!form.message.trim()">{{ jp ? '送信する' : 'Send Message' }}</WinButton>
            <WinButton type="button" @click="emit('close')">{{ jp ? 'キャンセル' : 'Cancel' }}</WinButton>
          </div>
        </form>
        </div></WinScrollContainer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.contact-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 1099;
}

.contact-window {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(90vw, 520px);
  max-height: 88vh;
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

.contact-titlebar {
  height: 20px;
  display: flex;
  align-items: center;
  padding: 0 3px 0 6px;
  background: var(--win-title-active);
  color: var(--win-title-text-active);
  font-family: var(--win-font);
  font-size: 11px;
  font-weight: bold;
  user-select: none;
  flex-shrink: 0;
}

.contact-titlebar span:first-child {
  flex: 1;
}

.contact-close-btn {
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
  font-size: 8px;
  font-weight: bold;
  color: var(--win-text);
  line-height: 1;
}

.contact-close-btn:active {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.contact-body {
  flex: 1;
  overflow: hidden;
  background: #e1e1d5;
  display: flex;
}

.contact-body-inner {
  padding: 20px 24px 24px;
  flex: 1;
}

.contact-intro {
  margin-bottom: 16px;
}

.contact-heading {
  font-family: var(--win-font);
  font-size: 15px;
  font-weight: bold;
  color: #19613a;
  margin: 0 0 12px;
}

.contact-text {
  font-family: var(--win-font);
  font-size: 12px;
  color: #1a1a1a;
  line-height: 1.6;
  margin: 0 0 10px;
}

.contact-link {
  color: #19613a;
  font-weight: bold;
  text-decoration: underline;
}

.contact-divider {
  height: 2px;
  background: #19613a;
  margin-bottom: 16px;
}

.contact-thanks {
  font-family: var(--win-font);
  font-size: 12px;
  color: #19613a;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.contact-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.form-label {
  font-family: var(--win-font);
  font-size: 11px;
  font-weight: bold;
  color: #19613a;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-required {
  color: #a82e28;
}

.form-input,
.form-textarea {
  font-family: var(--win-font);
  font-size: 12px;
  color: #1a1a1a;
  background: #f5f5ee;
  border: none;
  box-shadow:
    inset 1px 1px 0 #999,
    inset -1px -1px 0 #fff;
  padding: 4px 6px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}

.form-input:focus,
.form-textarea:focus {
  background: #fff;
}

.form-textarea {
  resize: vertical;
  min-height: 90px;
}

.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 4px;
}
</style>

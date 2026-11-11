<script setup>
// Moderation controls shown under a review: a public "Report" link and, in
// admin mode, Hide / Delete. `adminOnly` drops the public link (sticky notes).
import { computed, ref } from 'vue'
import { useReviews } from '../composables/useReviews.js'
import { useAdmin } from '../composables/useAdmin.js'
import { useI18n } from '../composables/useI18n.js'

const props = defineProps({
  review: { type: Object, required: true },
  lang: { type: String, default: 'en' },
  adminOnly: { type: Boolean, default: false },
})

const { hasReported, reportReview, setHidden, removeReview } = useReviews()
const { isAdmin } = useAdmin()
const { t } = useI18n(computed(() => props.lang))

const busy = ref(false)
const reported = computed(() => hasReported(props.review.id))

async function run(action) {
  if (busy.value) return
  busy.value = true
  try { await action() } finally { busy.value = false }
}
</script>

<template>
  <div v-if="!adminOnly || isAdmin" class="review-actions" @click.stop>
    <template v-if="isAdmin">
      <!-- A hidden review (only ever listed for admins) offers Unhide instead -->
      <button
        class="ra-link ra-admin"
        :data-action="review.hidden ? 'unhide' : 'hide'"
        :disabled="busy"
        @click="run(() => setHidden(review, !review.hidden))"
      >{{ review.hidden ? t('reviewUnhide') : t('reviewHide') }}</button>
      <button class="ra-link ra-admin ra-danger" data-action="delete" :disabled="busy" @click="run(() => removeReview(review))">{{ t('reviewDelete') }}</button>
    </template>
    <button
      v-if="!adminOnly && !review.hidden"
      class="ra-link ra-report"
      :disabled="busy || reported"
      @click="run(() => reportReview(review))"
    >{{ reported ? t('reviewReported') : t('reviewReport') }}</button>
  </div>
</template>

<style scoped>
.review-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 2px;
  pointer-events: auto;
}

/* Win95 hyperlink-style text button */
.ra-link {
  font-family: var(--win-font);
  font-size: 10px;
  line-height: 1;
  background: none;
  border: none;
  padding: 3px 0;
  color: var(--win-title-text-inactive);
  text-decoration: underline;
  cursor: pointer;
  user-select: none;
}

.ra-link:hover:not(:disabled) { color: var(--valhalla-orange); }

.ra-link:focus-visible {
  outline: 1px dotted currentColor;
  outline-offset: 1px;
}

.ra-link:disabled {
  color: var(--win-text-disabled);
  text-decoration: none;
  cursor: default;
}

.ra-admin { color: var(--valhalla-orange); }
.ra-danger { color: var(--valhalla-pink); }
.ra-admin:hover:not(:disabled) { color: var(--win-title-text-active); }

/* Report sits on the right; admin controls (if any) on the left */
.ra-report { margin-left: auto; }

@media (max-width: 768px) {
  .review-actions { gap: 4px; margin-top: 0; }
  /* Touch target >= 40px */
  .ra-link {
    min-height: 40px;
    min-width: 40px;
    padding: 0 8px;
    font-size: 11px;
  }
}
</style>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  icon: String,
  size: { type: Number, default: 14 },
})

const isImage = computed(() => {
  if (!props.icon) return false
  return props.icon.startsWith('http') || props.icon.startsWith('/') || props.icon.startsWith('data:')
})
</script>

<template>
  <img
    v-if="isImage"
    :src="icon"
    alt=""
    class="tag-icon-img"
    :style="{ width: size + 'px', height: size + 'px' }"
  />
  <span v-else class="tag-icon-emoji" :style="{ fontSize: size + 'px' }">{{ icon }}</span>
</template>

<style scoped>
.tag-icon-img {
  vertical-align: middle;
  image-rendering: pixelated;
  object-fit: contain;
}

.tag-icon-emoji {
  line-height: 1;
}
</style>

<script setup>
import WinButton from './win2000/WinButton.vue'

const emit = defineEmits(['select'])
</script>

<template>
  <Teleport to="body">
    <div class="lang-overlay">
      <div class="lang-dialog">
        <!-- Title bar -->
        <div class="lang-titlebar">
          <span class="lang-title">Golden Gai</span>
        </div>

        <!-- Body -->
        <div class="lang-body">
          <img src="/icons/desktop/charmap.png" alt="" class="lang-icon" />
          <div class="lang-text">
            <div>What language do you speak?</div>
            <div class="lang-text-jp">言語を選んでください</div>
          </div>
        </div>

        <!-- Buttons -->
        <div class="lang-actions">
          <WinButton @click="emit('select', 'en')">English</WinButton>
          <WinButton @click="emit('select', 'jp')">日本語</WinButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.lang-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lang-dialog {
  background: var(--win-bg);
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark),
    inset 2px 2px 0 var(--win-border-mid),
    inset -2px -2px 0 var(--win-border-darkest),
    4px 4px 10px rgba(0, 0, 0, 0.6);
  padding: 3px;
  width: 320px;
  max-width: 90vw;
}

.lang-titlebar {
  display: flex;
  align-items: center;
  height: 20px;
  padding: 0 4px;
  background: var(--win-title-active);
  color: var(--win-title-text-active);
  font-family: var(--win-font);
  font-size: 11px;
  font-weight: bold;
  user-select: none;
}

.lang-title {
  flex: 1;
  padding-left: 2px;
}

.lang-body {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 12px 12px;
}

.lang-icon {
  width: 32px;
  height: 32px;
  image-rendering: pixelated;
  flex-shrink: 0;
}

.lang-text {
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
  line-height: 1.5;
}

.lang-text-jp {
  margin-top: 4px;
  color: var(--win-text-disabled);
}

.lang-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 0 12px 12px;
}
</style>

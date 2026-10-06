<script setup lang="ts">
// Goes back in history when we came from inside the app, otherwise to a sensible parent page.
const props = withDefaults(defineProps<{ fallback?: string; label?: string; dark?: boolean }>(), {
  fallback: '/',
  label: 'Back'
})
const router = useRouter()

function goBack() {
  if (import.meta.client && window.history.state?.back) router.back()
  else navigateTo(props.fallback)
}
</script>

<template>
  <button type="button" class="back" :class="dark ? 'back--dark' : 'glass'" @click="goBack">
    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" /></svg>
    {{ label }}
  </button>
</template>

<style scoped>
.back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 36px;
  padding: 0 14px 0 10px;
  border-radius: 980px;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--ink);
  transition: transform 0.3s var(--ease);
}
.back:hover { transform: translateX(-2px); }
.back:active { transform: scale(0.96); }
.back svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.back--dark {
  border: 0;
  background: rgb(255 255 255 / 0.12);
  color: #fff;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.15);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
}
</style>

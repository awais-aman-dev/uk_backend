<script setup lang="ts">
// Thin horizontal progress bar (0–100).
withDefaults(defineProps<{ value: number; color?: string; height?: number }>(), { color: 'var(--go)', height: 6 })
</script>

<template>
  <span class="bar" :style="{ height: `${height}px` }" role="img" :aria-label="`${Math.round(value)}%`">
    <i :style="{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }" />
  </span>
</template>

<style scoped>
.bar { display: block; flex: none; border-radius: 99px; background: rgb(127 127 127 / 0.15); overflow: hidden; }
.bar i { display: block; height: 100%; border-radius: inherit; transition: width 0.6s var(--ease); }
</style>

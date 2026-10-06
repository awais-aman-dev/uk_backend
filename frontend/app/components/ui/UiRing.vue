<script setup lang="ts">
// Circular progress (0–100) with anything in the middle via the default slot.
withDefaults(defineProps<{ value: number; size?: number; thickness?: number; color?: string }>(), {
  size: 52,
  thickness: 5,
  color: 'var(--accent)'
})
</script>

<template>
  <span
    class="ring"
    role="img"
    :aria-label="`${Math.round(value)}%`"
    :style="{ '--v': value, '--size': `${size}px`, '--th': `${thickness}px`, '--c': color }"
  >
    <span class="ring__inner"><slot /></span>
  </span>
</template>

<style scoped>
.ring {
  position: relative;
  flex: none;
  display: grid;
  place-items: center;
  width: var(--size);
  height: var(--size);
  border-radius: 50%;
  background: conic-gradient(var(--c) calc(var(--v) * 1%), rgb(127 127 127 / 0.15) 0);
  color: var(--ink);
}
.ring::before { content: ''; position: absolute; inset: var(--th); border-radius: 50%; background: var(--ring-bg, var(--card)); }
.ring__inner { position: relative; display: grid; place-items: center; text-align: center; line-height: 1.05; }
</style>

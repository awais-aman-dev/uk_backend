<script setup lang="ts">
// Activity-style concentric rings: theory (outer), mock tests, hazard perception (inner).
const props = withDefaults(defineProps<{ theory: number; mock: number; hazard: number; overall: number; size?: number }>(), { size: 200 })
const rings = computed(() => [
  { r: 52, v: props.theory, color: '#ff375f', track: 'rgb(255 55 95 / 0.18)' },
  { r: 38, v: props.mock, color: '#30d158', track: 'rgb(48 209 88 / 0.18)' },
  { r: 24, v: props.hazard, color: '#0a84ff', track: 'rgb(10 132 255 / 0.18)' }
])
</script>

<template>
  <div class="rings" :style="{ width: `${size}px` }">
    <svg viewBox="0 0 120 120" role="img" :aria-label="`Readiness ${overall}%`">
      <g v-for="ring in rings" :key="ring.r">
        <circle cx="60" cy="60" :r="ring.r" :stroke="ring.track" />
        <circle
          class="rings__val"
          cx="60"
          cy="60"
          :r="ring.r"
          :stroke="ring.color"
          pathLength="100"
          :stroke-dasharray="`${Math.max(0.5, ring.v)} 100`"
        />
      </g>
    </svg>
    <div class="rings__center"><strong>{{ overall }}%</strong><small>ready</small></div>
  </div>
</template>

<style scoped>
.rings { position: relative; aspect-ratio: 1; }
.rings svg { transform: rotate(-90deg); }
.rings circle { fill: none; stroke-width: 11; stroke-linecap: round; }
.rings__val { animation: grow 1.4s var(--ease) both; }
@keyframes grow { from { stroke-dasharray: 0 100; } }
.rings__center { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; line-height: 1.05; }
.rings__center strong { font-family: var(--font-display); font-size: 1.5rem; color: var(--ink); }
.rings__center small { color: var(--muted); font-size: 0.75rem; }
</style>

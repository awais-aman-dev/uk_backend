<script setup lang="ts">
// A small side-view car (facing right). Wheels turn either by GSAP (svgOrigin 0 0 = the axle)
// or, with `css-spin`, by the --spin custom property set by the parent.
withDefaults(defineProps<{ color?: string; cssSpin?: boolean }>(), { color: '#6f9fd0', cssSpin: false })
</script>

<template>
  <svg viewBox="0 0 170 74" class="car-svg" :class="{ 'car-svg--css': cssSpin }" aria-hidden="true">
    <ellipse cx="84" cy="68" rx="76" ry="5" fill="#1b2430" opacity="0.18" />
    <!-- body drawn bonnet-left, mirrored so the bonnet (the front) leads to the right -->
    <g transform="matrix(-1 0 0 1 170 0)">
      <path
        class="car__body"
        :fill="color"
        d="M10 50c0-8 5-12 14-13l26-3 18-17c4-4 9-6 15-6h33c6 0 11 2 15 6l15 15c9 1 16 4 17 11v10c0 4-3 6-6 6H16c-4 0-6-3-6-6z"
      />
      <path d="M72 20 56 34h38V20zM100 20v14h40l-12-12c-2-2-4-2-6-2z" fill="#e9f1f8" opacity="0.92" />
      <path d="M24 46h138" stroke="#fff" stroke-opacity="0.35" stroke-width="2" />
    </g>
    <rect x="151" y="41" width="9" height="6" rx="3" fill="#fbe7a8" />
    <rect x="8" y="40" width="7" height="6" rx="3" fill="#e9a3a0" />
    <!-- wheels are not mirrored, so a positive turn still rolls forwards (clockwise) -->
    <g v-for="x in [38, 126]" :key="x" class="wheel" :transform="`translate(${x} 58)`">
      <g class="wheel__spin">
        <circle r="12" fill="#2f353d" /><circle r="6" fill="#c9d0d8" />
        <path d="M0-6v12M-6 0h12" stroke="#8b929c" stroke-width="2" />
      </g>
    </g>
  </svg>
</template>

<style scoped>
.car-svg { display: block; width: 100%; overflow: visible; }
.car-svg--css .wheel__spin { transform: rotate(var(--spin, 0deg)); }
</style>

<script setup lang="ts">
import type { SignSpec } from '#shared/types/learn'

// UK road signs drawn from a small spec (shape + colours + symbol key). Symbols live in a ±20 unit box.
const props = defineProps<{ spec: SignSpec; label?: string; size?: number | string }>()

const geometry = computed(() => {
  switch (props.spec.shape) {
    case 'triangle':
      return { viewBox: '0 0 100 90', cx: 50, cy: 60, scale: 0.85 }
    case 'inverted-triangle':
      return { viewBox: '0 0 100 90', cx: 50, cy: 30, scale: 0.75 }
    case 'rect':
      return { viewBox: '0 0 100 70', cx: 50, cy: 35, scale: 1.2 }
    default:
      return { viewBox: '0 0 100 100', cx: 50, cy: 50, scale: 1.25 }
  }
})

// Dark symbol on white signs, white symbol on blue/red ones
const ink = computed(() => (props.spec.fill === '#fff' ? '#1d1d1f' : '#fff'))


const symbol = computed(() => SIGN_SYMBOLS[props.spec.symbol] ?? '')
const isText = computed(() => props.spec.symbol === 'text' || props.spec.symbol === 'P' || props.spec.symbol === 'H')
const text = computed(() => (props.spec.symbol === 'P' || props.spec.symbol === 'H' ? props.spec.symbol : props.spec.text ?? ''))

// Django's sign `spec` is open-ended (Learning API guide §7): a shape we can't draw falls back to the sign's name
const drawable = computed(() => ['triangle', 'inverted-triangle', 'octagon', 'rect', 'square', 'circle'].includes(props.spec?.shape))
</script>

<template>
  <span v-if="!drawable" class="sign-name" :style="size ? { width: `${size}px` } : undefined" role="img" :aria-label="label">{{ label || 'Road sign' }}</span>
  <svg
    v-else
    class="sign"
    :class="{ 'sign--fluid': !size }"
    :viewBox="geometry.viewBox"
    :width="size"
    role="img"
    :aria-label="label"
    :style="{ color: ink }"
  >
    <!-- Shape -->
    <path
      v-if="spec.shape === 'triangle'"
      d="M50 6 95 84H5z"
      :fill="spec.fill"
      :stroke="spec.border"
      stroke-width="9"
      stroke-linejoin="round"
    />
    <path
      v-else-if="spec.shape === 'inverted-triangle'"
      d="M5 6h90L50 84z"
      :fill="spec.fill"
      :stroke="spec.border"
      stroke-width="9"
      stroke-linejoin="round"
    />
    <path
      v-else-if="spec.shape === 'octagon'"
      d="M30 3h40l27 27v40L70 97H30L3 70V30z"
      :fill="spec.fill"
      stroke="#fff"
      stroke-width="3"
    />
    <rect v-else-if="spec.shape === 'rect'" x="2" y="2" width="96" height="66" rx="7" :fill="spec.fill" stroke="#fff" stroke-width="2.5" />
    <rect v-else-if="spec.shape === 'square'" x="3" y="3" width="94" height="94" rx="8" :fill="spec.fill" stroke="#fff" stroke-width="2.5" />
    <template v-else>
      <circle cx="50" cy="50" r="47" :fill="spec.border ?? spec.fill" :stroke="!spec.border && spec.fill === '#fff' ? '#1d1d1f' : 'none'" stroke-width="1.5" />
      <circle cx="50" cy="50" :r="spec.border ? 37 : 44" :fill="spec.fill" :stroke="spec.border ? 'none' : '#fff'" :stroke-width="spec.border ? 0 : 2" />
    </template>

    <!-- Symbol -->
    <text
      v-if="isText"
      :x="geometry.cx"
      :y="geometry.cy"
      text-anchor="middle"
      dominant-baseline="central"
:font-size="spec.shape === 'octagon' ? 25 : spec.shape === 'inverted-triangle' ? 11 : text.length > 1 ? 34 : 56"
      font-weight="700"
      font-family="-apple-system, 'SF Pro Display', Inter, Arial, sans-serif"
      :fill="spec.shape === 'octagon' ? '#fff' : 'currentColor'"
      :letter-spacing="text.length > 3 ? 0.5 : -1"
    >{{ text }}</text>
    <g v-else :transform="`translate(${geometry.cx} ${geometry.cy}) scale(${geometry.scale})`" v-html="symbol" />

    <!-- Red diagonal for prohibitions like "no right turn" -->
    <path v-if="spec.slash" d="M24 24 76 76" stroke="#d4021d" stroke-width="8" />
  </svg>
</template>

<style scoped>
.sign { display: block; height: auto; overflow: visible; }
.sign--fluid { width: 100%; }
.sign-name { display: inline-grid; place-items: center; min-height: 3em; padding: 8px 10px; border-radius: 10px; border: 2px solid currentColor; font-size: 0.8125rem; font-weight: 600; text-align: center; line-height: 1.2; }
</style>

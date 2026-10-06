<script setup lang="ts">
import type { Toast } from '~/composables/useToast'

/*
 * One toast as a drop of the island's glass.
 *
 * The whole liquid shape is a single `clip-path: path()` on a frosted layer, recomputed every frame:
 *   1. a bead swells out of the island's bottom edge on a wide neck (it still belongs to the island)
 *   2. it falls; the neck stretches thin and snaps; the leftover stub is pulled back into the island
 *   3. the drop lands and spreads into a capsule with a little springy overshoot; the text fades in
 * Closing plays it backwards: the capsule gathers into a bead, rises, reconnects and is absorbed.
 * Without the island (learning app, admin) it drips from the top edge of the screen instead.
 */
const props = defineProps<{ toast: Toast; index: number; leaving: boolean }>()
const emit = defineEmits<{ gone: []; dismiss: [] }>()

const H = 56 // capsule height
const GAP = 10
const R = 15 // bead radius
const ENTER_MS = 950
const LEAVE_MS = 700

const layer = ref<HTMLElement>()
const rim = ref<SVGPathElement>()
const shine = ref<SVGPathElement>()
const progress = ref(0) // 0 = inside the island, 1 = capsule
const geo = reactive({ cx: 0, top: 0, width: 360, light: false, y: 0 })
const reduced = ref(false)

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const easeOut = (t: number) => 1 - (1 - t) ** 3
// damped spring settling at 1 (small overshoot) — the drop "splats" into shape
const spring = (t: number, k = 9, w = 11) => 1 - Math.exp(-k * t) * Math.cos(w * t)

const targetY = (i: number) => geo.top + 12 + i * (H + GAP)

function roundRect(x: number, y: number, w: number, h: number) {
  const r = Math.min(w, h) / 2
  return `M${x + r},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${y + h - r}A${r},${r} 0 0 1 ${x + w - r},${y + h}H${x + r}A${r},${r} 0 0 1 ${x},${y + h - r}V${y + r}A${r},${r} 0 0 1 ${x + r},${y}Z`
}
/** Neck from the island edge (half-width a) through a waist (n at yw) into the drop (b at yb). Clockwise, like the rest. */
function neck(cx: number, top: number, a: number, n: number, yw: number, b: number, yb: number) {
  const t0 = top - 3 // tuck under the island's rim so the liquid reads as continuous
  const u = yw - t0
  const v = yb - yw
  return (
    `M${cx - a},${t0}H${cx + a}` +
    `C${cx + a},${t0 + u * 0.55} ${cx + n},${yw - u * 0.45} ${cx + n},${yw}` +
    `C${cx + n},${yw + v * 0.45} ${cx + b},${yb - v * 0.55} ${cx + b},${yb}` +
    `H${cx - b}` +
    `C${cx - b},${yb - v * 0.55} ${cx - n},${yw + v * 0.45} ${cx - n},${yw}` +
    `C${cx - n},${yw - u * 0.45} ${cx - a},${t0 + u * 0.55} ${cx - a},${t0}Z`
  )
}
const circle = (cx: number, cy: number, r: number) => `M${cx - r},${cy}A${r},${r} 0 1 1 ${cx + r},${cy}A${r},${r} 0 1 1 ${cx - r},${cy}Z`

/** The liquid shape at progress p (0…1) for a capsule centred at y = Y. */
function shape(p: number) {
  const { cx, top, width: W } = geo
  const Y = geo.y
  const tc = Y + H / 2
  let d = ''
  let capsule: { x: number; y: number; w: number; h: number } | null = null
  if (p < 0.28) {
    // 1. swell out of the island
    const r = R * easeOut(p / 0.28)
    if (r < 0.5) return { d: '', capsule }
    const cy = top + r * 0.35
    d += circle(cx, cy, r)
    d += neck(cx, top, r * 1.9, r * 0.95, top + (cy - top) * 0.45, r * 0.95, cy)
  } else if (p < 0.56) {
    // 2. fall, stretch, snap
    const t = (p - 0.28) / 0.28
    const cy = lerp(top + R * 0.35, tc, t * t)
    const rx = R * (1 - 0.12 * t)
    const ry = R * (1 + 0.25 * t)
    d += roundRect(cx - rx, cy - ry, rx * 2, ry * 2)
    const pinch = clamp(t / 0.72)
    const n = R * 0.95 * (1 - pinch) ** 1.5
    if (n > 0.6) {
      const dropTop = cy - ry
      d += neck(cx, top, R * 1.9 * (1 - pinch * 0.7), n, top + (dropTop - top) * 0.42, rx * 0.8, cy - ry * 0.35)
    } else if (t < 1) {
      // what's left of the neck is pulled back into the island
      const s = 7 * (1 - clamp((t - 0.72) / 0.28))
      if (s > 0.5) d += circle(cx, top - 1, s) + neck(cx, top, s * 1.6, s * 0.9, top - 1 + s * 0.3, s * 0.6, top - 1 + s * 0.5)
    }
  } else {
    // 3. land and spread into a capsule
    const t = (p - 0.56) / 0.44
    const w = lerp(R * 2 * 0.88, W, clamp(spring(t)))
    const h = lerp(R * 2 * 1.25, H, spring(t, 7, 9))
    capsule = { x: cx - w / 2, y: tc - h / 2, w, h }
    d += roundRect(capsule.x, capsule.y, w, h)
  }
  return { d, capsule }
}

function paint() {
  const { d } = shape(progress.value)
  const el = layer.value
  if (!el) return
  el.style.clipPath = d ? `path('${d}')` : 'inset(50%)'
  // the same outline drives the gloss and the rim (the rim filter keeps only the outer edge of the union)
  shine.value?.setAttribute('d', d)
  rim.value?.setAttribute('d', d)
}

function measure() {
  const island = document.querySelector<HTMLElement>('.header .island')
  const vw = document.documentElement.clientWidth
  geo.width = Math.min(420, vw - 32)
  if (island) {
    const r = island.getBoundingClientRect()
    geo.cx = r.left + r.width / 2
    geo.top = r.bottom
    geo.light = island.classList.contains('island--light')
  } else {
    geo.cx = vw / 2
    geo.top = 0
    geo.light = false
  }
}

let raf = 0
function animate(from: number, to: number, ms: number, done?: () => void) {
  cancelAnimationFrame(raf)
  const start = performance.now()
  const step = (now: number) => {
    const t = clamp((now - start) / ms)
    progress.value = lerp(from, to, t)
    paint()
    if (t < 1) raf = requestAnimationFrame(step)
    else done?.()
  }
  raf = requestAnimationFrame(step)
}

// Stack position: glide when a toast above goes away
let yRaf = 0
watch(
  () => props.index,
  (i) => {
    const from = geo.y
    const to = targetY(i)
    const start = performance.now()
    cancelAnimationFrame(yRaf)
    const step = (now: number) => {
      const t = clamp((now - start) / 420)
      geo.y = lerp(from, to, easeOut(t))
      paint()
      if (t < 1) yRaf = requestAnimationFrame(step)
    }
    yRaf = requestAnimationFrame(step)
  }
)

watch(
  () => props.leaving,
  (leaving) => {
    if (!leaving) return
    if (reduced.value) return setTimeout(() => emit('gone'), 220)
    measure() // the island may have changed tint / position since
    animate(progress.value, 0, LEAVE_MS, () => emit('gone'))
  }
)

onMounted(() => {
  reduced.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  measure()
  geo.y = targetY(props.index)
  if (reduced.value) {
    progress.value = 1
    paint()
  } else animate(0, 1, ENTER_MS)
  const onResize = () => {
    measure()
    geo.y = targetY(props.index)
    paint()
  }
  window.addEventListener('resize', onResize)
  onBeforeUnmount(() => {
    window.removeEventListener('resize', onResize)
    cancelAnimationFrame(raf)
    cancelAnimationFrame(yRaf)
  })
})

// Text shows once the drop has (nearly) become a capsule
const contentOpacity = computed(() => (reduced.value ? (props.leaving ? 0 : 1) : clamp((progress.value - 0.78) / 0.18)))
const box = computed(() => ({ left: `${geo.cx - geo.width / 2}px`, top: `${geo.y}px`, width: `${geo.width}px`, height: `${H}px` }))
</script>

<template>
  <div class="drop" :class="{ 'drop--light': geo.light, 'drop--reduced': reduced, 'drop--leaving': leaving }">
    <div ref="layer" class="drop__glass" :style="{ height: `${geo.y + H + 40}px` }" />
    <svg class="drop__rim" aria-hidden="true" :style="{ height: `${geo.y + H + 40}px`, clipPath: `inset(${geo.top}px 0 0 0)` }">
      <defs>
        <!-- specular rim: bright top-left, soft bottom-right (objectBoundingBox = the whole liquid shape) -->
        <linearGradient :id="`rim-${toast.id}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" :stop-color="geo.light ? '#fff' : 'rgb(255 255 255 / 0.75)'" />
          <stop offset="0.5" :stop-color="geo.light ? 'rgb(255 255 255 / 0.35)' : 'rgb(255 255 255 / 0.08)'" />
          <stop offset="1" :stop-color="geo.light ? 'rgb(255 255 255 / 0.9)' : 'rgb(255 255 255 / 0.4)'" />
        </linearGradient>
        <!-- gloss on the convex surface -->
        <linearGradient :id="`shine-${toast.id}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" :stop-color="geo.light ? 'rgb(255 255 255 / 0.65)' : 'rgb(255 255 255 / 0.16)'" />
          <stop offset="0.55" stop-color="rgb(255 255 255 / 0)" />
        </linearGradient>
        <!-- keep only the outer 1.2px of the union: no seams where the neck meets the drop -->
        <filter :id="`edge-${toast.id}`" x="-5%" y="-5%" width="110%" height="110%">
          <feMorphology in="SourceAlpha" operator="erode" radius="1.2" result="inner" />
          <feComposite in="SourceGraphic" in2="inner" operator="out" />
        </filter>
      </defs>
      <path ref="shine" :fill="`url(#shine-${toast.id})`" />
      <path ref="rim" :fill="`url(#rim-${toast.id})`" :filter="`url(#edge-${toast.id})`" />
    </svg>
    <div class="toast" :style="{ ...box, opacity: contentOpacity }" role="status">
      <span class="toast__icon" :class="`toast__icon--${toast.variant}`" aria-hidden="true">
        <svg v-if="toast.variant === 'success'" viewBox="0 0 16 16"><path d="m3.5 8.5 3 3 6-7" /></svg>
        <svg v-else-if="toast.variant === 'error'" viewBox="0 0 16 16"><path d="M8 4v5M8 11.5v.5" /></svg>
        <svg v-else viewBox="0 0 16 16"><path d="M8 7v5M8 4v.5" /></svg>
      </span>
      <p>{{ toast.message }}</p>
      <button type="button" aria-label="Dismiss" @click="emit('dismiss')">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4.5 4.5 7 7m0-7-7 7" /></svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.drop { position: absolute; inset: 0 0 auto; }
/* The liquid: same glass as the island, clipped to the animated shape */
.drop__glass {
  position: absolute;
  inset: 0 0 auto;
  background: rgb(24 24 27 / 0.58); /* = .liquid tint, so the drop is the island’s glass */
  -webkit-backdrop-filter: blur(14px) saturate(180%) brightness(1.06);
  backdrop-filter: blur(14px) saturate(180%) brightness(1.06);
  clip-path: inset(50%);
  pointer-events: none;
}
.drop--light .drop__glass { background: rgb(255 255 255 / 0.48); }
.drop__rim { position: absolute; inset: 0 0 auto; width: 100%; overflow: visible; pointer-events: none; }

.toast {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 10px 0 14px;
  color: #f5f5f7;
  font-size: 0.9375rem;
  font-weight: 500;
  pointer-events: auto;
}
.drop--light .toast { color: #1d1d1f; }
.drop--reduced .toast { transition: opacity 0.2s; }
.drop--reduced .drop__glass { transition: opacity 0.2s; }
.drop--reduced.drop--leaving .drop__glass { opacity: 0; }
.drop--leaving .toast { pointer-events: none; }
.toast p { flex: 1; line-height: 1.3; }
.toast__icon { flex: none; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; }
.toast__icon svg, .toast button svg { width: 16px; height: 16px; fill: none; stroke: #fff; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.toast__icon--success { background: var(--go); }
.toast__icon--error { background: var(--stop); }
.toast__icon--info { background: var(--accent); }
.toast button { display: grid; place-items: center; width: 32px; height: 32px; border: 0; border-radius: 50%; background: rgb(127 127 127 / 0.18); }
.drop--light .toast button svg { stroke: #1d1d1f; }
.toast button:hover { background: rgb(127 127 127 / 0.28); }
</style>

<script setup lang="ts" generic="T extends string">
// iOS-style segmented control with a liquid indicator: two blobs follow the selection at different speeds
// and an SVG "goo" filter melts them together, so the thumb stretches like a drop between options.
const props = defineProps<{
  label: string
  options: readonly { value: T; label: string; sub?: string; tag?: string }[]
}>()
const model = defineModel<T>({ required: true })

const id = useId()
const filterId = `goo-${id}`
const index = computed(() => Math.max(0, props.options.findIndex((o) => o.value === model.value)))
const style = computed(() => ({
  '--n': props.options.length,
  '--i': index.value
}))
</script>

<template>
  <fieldset class="seg" :style="style">
    <legend class="seg__legend">{{ label }}</legend>
    <svg class="sr-only" aria-hidden="true">
      <filter :id="filterId" color-interpolation-filters="sRGB">
        <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9" result="goo" />
        <feComposite in="SourceGraphic" in2="goo" operator="atop" />
      </filter>
    </svg>

    <div class="seg__track">
      <div class="seg__goo" :style="{ filter: `url(#${filterId})` }" aria-hidden="true">
        <span class="seg__blob seg__blob--lead" />
        <span class="seg__blob seg__blob--tail" />
      </div>

      <label v-for="o in options" :key="o.value" class="seg__opt" :class="{ 'is-on': o.value === model }">
        <input v-model="model" type="radio" :name="id" :value="o.value" class="sr-only">
        <span class="seg__label">{{ o.label }}</span>
        <span v-if="o.sub" class="seg__sub">{{ o.sub }}</span>
        <span v-if="o.tag" class="seg__tag">{{ o.tag }}</span>
      </label>
    </div>
  </fieldset>
</template>

<style scoped>
.seg { margin: 0; padding: 0; border: 0; min-width: 0; }
.seg__legend { margin-bottom: 8px; padding: 0; font-weight: 500; font-size: 0.9375rem; }
.seg__track {
  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--n), 1fr);
  padding: 4px;
  border-radius: 16px;
  background: rgb(118 118 128 / 0.12);
}
.seg__goo { position: absolute; inset: 4px; }
.seg__blob {
  position: absolute;
  top: 0;
  bottom: 0;
  width: calc(100% / var(--n));
  left: calc(100% / var(--n) * var(--i));
  border-radius: 12px;
  background: #fff;
}
/* Same target, different speeds → the gap between them is bridged by the goo filter */
.seg__blob--lead { transition: left 0.42s var(--spring); }
.seg__blob--tail { transition: left 0.7s var(--ease); width: calc(100% / var(--n) * 0.7); margin-left: calc(100% / var(--n) * 0.15); }

.seg__opt {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
  gap: 0;
  padding: 7px 6px;
  border-radius: 12px;
  cursor: pointer;
  text-align: center;
  line-height: 1.2;
}
.seg__opt:has(input:focus-visible) { outline: 3px solid rgb(0 113 227 / 0.5); outline-offset: 1px; }
.seg__label { font-size: 0.875rem; font-weight: 500; color: var(--muted); transition: color 0.3s; }
.seg__sub { font-family: var(--font-display); font-size: 1.1875rem; font-weight: 600; letter-spacing: -0.02em; color: var(--muted); transition: color 0.3s; }
.is-on .seg__label { color: var(--ink); }
.is-on .seg__sub { color: var(--ink); }
.seg__tag {
  position: absolute;
  top: -12px;
  right: 6px;
  padding: 2px 8px;
  border-radius: 980px;
  background: var(--accent);
  color: #fff;
  font-size: 0.6875rem;
  font-weight: 600;
}
/* Shadow on the selected cell (kept out of the goo layer, which would smear it) */
.seg__opt.is-on::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: 12px;
  box-shadow: 0 3px 8px rgb(0 0 0 / 0.12), 0 1px 1px rgb(0 0 0 / 0.04);
  animation: settle 0.5s 0.25s both;
}
@keyframes settle { from { opacity: 0; } }
</style>

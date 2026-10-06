<script setup lang="ts">
// Interactive stopping distances: thinking + braking, dry / wet / icy.
const speeds = [20, 30, 40, 50, 60, 70]
const BRAKING = [6, 14, 24, 38, 55, 75]
const THINKING = [6, 9, 12, 15, 18, 21]
const conditions = [
  { id: 'dry', label: 'Dry', k: 1 },
  { id: 'wet', label: 'Wet', k: 2 },
  { id: 'ice', label: 'Icy', k: 10 }
] as const

const i = ref(1)
const cond = ref<(typeof conditions)[number]['id']>('dry')
const k = computed(() => conditions.find((c) => c.id === cond.value)!.k)
const thinking = computed(() => THINKING[i.value]!)
const braking = computed(() => BRAKING[i.value]! * k.value)
const total = computed(() => thinking.value + braking.value)
const scaleMax = computed(() => (cond.value === 'ice' ? 800 : cond.value === 'wet' ? 175 : 100))
const pct = (m: number) => `${Math.min(100, (m / scaleMax.value) * 100)}%`
</script>

<template>
  <div class="sd">
    <div class="sd__controls">
      <label class="sd__speed">
        <span>Speed <b>{{ speeds[i] }} mph</b></span>
        <input v-model.number="i" type="range" min="0" :max="speeds.length - 1" step="1" aria-label="Speed">
      </label>
      <UiPills v-model="cond" label="Road surface" class="sd__cond" :options="conditions.map((c) => ({ value: c.id, label: c.label }))" />
    </div>

    <div class="sd__road">
      <svg class="sd__car" viewBox="0 0 40 20" aria-hidden="true"><rect x="2" y="6" width="34" height="9" rx="3" fill="currentColor" /><path d="M9 6l4-5h12l5 5z" fill="currentColor" /><circle cx="10" cy="16" r="3" fill="#111" /><circle cx="29" cy="16" r="3" fill="#111" /></svg>
      <div class="sd__bars">
        <span class="sd__bar sd__bar--think" :style="{ width: pct(thinking) }" />
        <span class="sd__bar sd__bar--brake" :style="{ width: pct(braking), left: pct(thinking) }" />
        <span class="sd__stop" :style="{ left: pct(total) }" />
      </div>
    </div>

    <dl class="sd__stats">
      <div><dt>Thinking</dt><dd>{{ thinking }} m</dd></div>
      <div><dt>Braking</dt><dd>{{ braking }} m</dd></div>
      <div class="sd__total"><dt>Overall</dt><dd>{{ total }} m <small>≈ {{ Math.round(total / 4) }} car lengths</small></dd></div>
    </dl>
  </div>
</template>

<style scoped>
.sd { display: grid; gap: 18px; padding: 20px; border-radius: 20px; background: var(--card-2); }
.sd__controls { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; justify-content: space-between; }
.sd__speed { display: grid; gap: 6px; flex: 1; min-width: 220px; color: var(--muted); font-size: 0.875rem; }
.sd__speed b { color: var(--ink); font-size: 1.125rem; }
.sd__speed input { accent-color: var(--accent); width: 100%; }
.sd__road { display: flex; align-items: center; gap: 10px; padding: 18px 12px; border-radius: 14px; background: #3a3a3e; }
.sd__car { flex: none; width: 46px; color: var(--accent); }
.sd__bars { position: relative; flex: 1; height: 14px; }
.sd__bar { position: absolute; top: 0; height: 100%; border-radius: 7px; transition: width 0.6s var(--ease), left 0.6s var(--ease); }
.sd__bar--think { left: 0; background: #64d2ff; }
.sd__bar--brake { background: linear-gradient(90deg, #ff9f0a, #ff375f); }
.sd__stop { position: absolute; top: -10px; bottom: -10px; width: 3px; border-radius: 2px; background: #fff; transition: left 0.6s var(--ease); }
.sd__stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 0; }
.sd__stats div { display: grid; }
.sd__stats dt { font-size: 0.8125rem; color: var(--muted); }
.sd__stats dd { margin: 0; font-family: var(--font-display); font-size: 1.5rem; font-weight: 600; color: var(--ink); }
.sd__stats small { display: block; font-family: var(--font-body); font-size: 0.75rem; font-weight: 400; color: var(--muted); }
.sd__total dd { color: var(--accent); }
</style>

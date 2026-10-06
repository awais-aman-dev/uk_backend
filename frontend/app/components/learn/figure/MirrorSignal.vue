<script setup lang="ts">
// The MSPSL routine as a stepper that cycles on its own; tap a step to jump to it.
const steps = [
  { k: 'M', title: 'Mirrors', text: 'Check what’s behind and beside you.' },
  { k: 'S', title: 'Signal', text: 'Let others know your plan, in good time.' },
  { k: 'P', title: 'Position', text: 'Move into the right place on the road.' },
  { k: 'S', title: 'Speed', text: 'Adjust your speed and gear for the turn.' },
  { k: 'L', title: 'Look', text: 'Look all around — then go only if it’s safe.' }
]
const active = ref(0)
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  timer = setInterval(() => (active.value = (active.value + 1) % steps.length), 2200)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div class="msm">
    <ol class="msm__steps">
      <li v-for="(s, i) in steps" :key="i" :class="{ 'is-on': i === active, 'is-done': i < active }">
        <button type="button" @click="active = i">{{ s.k }}</button>
      </li>
    </ol>
    <Transition name="fade" mode="out-in">
      <div :key="active" class="msm__text">
        <b>{{ steps[active]!.title }}</b>
        <span>{{ steps[active]!.text }}</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.msm { display: grid; gap: 14px; padding: 20px; border-radius: 20px; background: var(--card-2); }
.msm__steps { list-style: none; display: flex; gap: 8px; margin: 0; padding: 0; }
.msm__steps li { flex: 1; position: relative; }
.msm__steps li + li::before { content: ''; position: absolute; top: 50%; right: calc(100% - 4px); width: 12px; height: 2px; background: var(--line); }
.msm__steps button {
  width: 100%;
  aspect-ratio: 1;
  max-width: 64px;
  border: 0;
  border-radius: 50%;
  background: rgb(127 127 127 / 0.14);
  color: var(--muted);
  font-family: var(--font-display);
  font-size: 1.375rem;
  font-weight: 700;
  transition: all 0.4s var(--spring);
}
.msm__steps .is-done button { background: var(--accent-soft); color: var(--accent); }
.msm__steps .is-on button { background: var(--accent); color: #fff; transform: scale(1.08); }
.msm__text { display: grid; gap: 2px; color: var(--ink); }
.msm__text span { color: var(--muted); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s, transform 0.3s var(--ease); }
.fade-enter-from { opacity: 0; transform: translateY(6px); }
.fade-leave-to { opacity: 0; transform: translateY(-6px); }
</style>

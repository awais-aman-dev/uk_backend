<script setup lang="ts">
// The hero visual: a real, playable hazard perception clip from our own engine, framed like a windscreen.
// Loaded after the page renders, so the landing's SSR never waits on the database.
const { data } = useFetch('/api/demo/hazard', { server: false, lazy: true })
</script>

<template>
  <div class="drive">
    <div class="drive__glass">
      <LearnHazardPlayer v-if="data" :clip="data.clip" :signs="data.signs" demo class="drive__player" />
      <div v-else class="drive__placeholder" aria-hidden="true"><span /></div>
    </div>
    <p class="drive__caption">
      <span class="drive__live"><i /> Live</span>
      Not a video — a real hazard perception clip from the app. Scored like the DVSA test.
    </p>
  </div>
</template>

<style scoped>
.drive { width: min(980px, 100%); }
.drive__glass {
  position: relative;
  padding: 8px;
  border-radius: 30px;
  background: linear-gradient(160deg, rgb(255 255 255 / 0.95), rgb(255 255 255 / 0.55) 45%, rgb(255 255 255 / 0.8));
  box-shadow: 0 40px 90px -36px rgb(38 64 99 / 0.45), 0 18px 40px -24px rgb(38 48 59 / 0.35), inset 0 1px 0 #fff;
}
/* windscreen glare, above the clip but never catching clicks */
.drive__glass::after {
  content: '';
  position: absolute;
  inset: 8px;
  border-radius: 22px;
  background: linear-gradient(115deg, rgb(255 255 255 / 0.1), transparent 28%, transparent 70%, rgb(255 255 255 / 0.05));
  pointer-events: none;
}
.drive__player, .drive__placeholder { border-radius: 22px; overflow: hidden; }
.drive__placeholder { display: grid; place-items: center; aspect-ratio: 16 / 9; background: linear-gradient(#1d2733, #0b0d10); }
.drive__placeholder span { width: 34px; height: 34px; border-radius: 50%; border: 3px solid rgb(255 255 255 / 0.6); border-right-color: transparent; animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.drive__caption { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 6px 10px; margin-top: 16px; font-size: 0.875rem; color: var(--hero-muted, var(--muted)); }
.drive__live { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 980px; background: rgb(217 119 111 / 0.14); color: #c4625a; font-weight: 600; font-size: 0.75rem; letter-spacing: 0.04em; text-transform: uppercase; }
.drive__live i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; animation: blink 1.6s ease-in-out infinite; }
@keyframes blink { 50% { opacity: 0.25; } }

@media (max-width: 719px) {
  .drive__glass { padding: 5px; border-radius: 20px; }
  .drive__glass::after { inset: 5px; border-radius: 16px; }
  .drive__player, .drive__placeholder { border-radius: 16px; }
}
@media (prefers-reduced-motion: reduce) {
  .drive__live i, .drive__placeholder span { animation: none; }
}
</style>

<script setup lang="ts">
// Placeholder while a learning page's data loads (the backend can take a few seconds), so the page opens at once.
withDefaults(defineProps<{ variant?: 'dashboard' | 'list' | 'article' }>(), { variant: 'list' })
</script>

<template>
  <div class="sk" role="status" aria-live="polite" aria-label="Loading">
    <span class="sk__line sk__line--eyebrow" />
    <span class="sk__line sk__line--title" />

    <template v-if="variant === 'dashboard'">
      <span class="sk__block sk__block--hero" />
      <div class="sk__tiles"><span v-for="n in 6" :key="n" class="sk__block sk__block--tile" /></div>
      <span v-for="n in 3" :key="`r${n}`" class="sk__block sk__block--row" />
    </template>

    <div v-else-if="variant === 'list'" class="sk__grid">
      <span v-for="n in 6" :key="n" class="sk__block sk__block--card" />
    </div>

    <template v-else>
      <span v-for="n in 3" :key="n" class="sk__para"><i /><i /><i /><i class="short" /></span>
      <span class="sk__block sk__block--row" />
    </template>
    <span class="sr-only">Loading…</span>
  </div>
</template>

<style scoped>
.sk { display: grid; gap: 14px; }
.sk__line, .sk__block, .sk__para i {
  display: block;
  border-radius: 12px;
  background: linear-gradient(90deg, rgb(127 127 127 / 0.1) 0%, rgb(127 127 127 / 0.2) 40%, rgb(127 127 127 / 0.1) 80%) 0 0 / 300% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}
.sk__line--eyebrow { width: 140px; height: 14px; }
.sk__line--title { width: min(420px, 80%); height: 40px; margin-bottom: 8px; }
.sk__block--hero { height: 120px; border-radius: var(--radius-lg); }
.sk__tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
.sk__block--tile { height: 92px; border-radius: 18px; }
.sk__block--row { height: 84px; border-radius: var(--radius-lg); }
.sk__grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
.sk__block--card { height: 190px; border-radius: var(--radius-lg); }
.sk__para { display: grid; gap: 10px; max-width: 720px; }
.sk__para i { height: 14px; border-radius: 7px; }
.sk__para i.short { width: 60%; }
@keyframes shimmer { from { background-position: 100% 0; } to { background-position: 0 0; } }
@media (prefers-reduced-motion: reduce) {
  .sk__line, .sk__block, .sk__para i { animation: none; }
}
</style>

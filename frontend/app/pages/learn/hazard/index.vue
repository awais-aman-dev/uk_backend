<script setup lang="ts">
definePageMeta({ layout: 'learn', middleware: 'auth' })
useHead({ title: 'Hazard perception — 1Theory' })

const { data, error } = await useFetch('/api/learn/hazard')

const total = computed(() => (data.value?.clips ?? []).reduce((s, c) => s + (c.best ?? 0), 0))
const max = computed(() => (data.value?.clips ?? []).reduce((s, c) => s + c.maxScore, 0))
const fmt = (ms: number | null) => (ms ? `${Math.floor(ms / 60000)}:${String(Math.round(ms / 1000) % 60).padStart(2, '0')}` : '')
const lightingLabel = { day: 'Daytime', dusk: 'Dusk', night: 'Night' } as const
</script>

<template>
  <LearnLocked v-if="error?.statusCode === 402" />
  <div v-else-if="data">
    <LearnHead eyebrow="Hazard perception" title="Spot it early." sub="Each clip is filmed from the driver’s seat. Click as soon as you see a hazard starting to develop — the earlier, the higher your score.">
      <div class="total">
        <span>Best total</span>
        <b>{{ total }}<small> / {{ max }}</small></b>
      </div>
    </LearnHead>

    <div class="clips">
      <NuxtLink v-for="(c, i) in data.clips" :key="c.slug" :to="`/learn/hazard/${c.slug}`" class="clip">
        <div class="clip__thumb">
          <LearnHazardLoop v-if="c.scene" :scene="c.scene" :signs="data.signs" mode="hover" />
          <span v-else-if="c.video" class="clip__filmed" aria-hidden="true" />
          <span class="clip__play glass-dark"><AppIcon name="play" :size="20" /></span>
          <span v-if="c.durationMs" class="clip__dur glass-dark">{{ fmt(c.durationMs) }}</span>
          <span v-if="c.video" class="clip__tag glass-dark"><AppIcon name="video" :size="14" /> Filmed</span>
          <span v-if="c.locked" class="clip__lock glass-dark"><AppIcon name="lock" :size="16" /> Plan needed</span>
        </div>
        <div class="clip__body">
          <p class="clip__meta">Clip {{ i + 1 }}{{ c.lighting ? ` · ${lightingLabel[c.lighting]}` : ' · Real footage' }}{{ c.hazardCount > 1 ? ` · ${c.hazardCount} hazards` : '' }}</p>
          <h2>{{ c.title }}</h2>
          <p class="clip__desc">{{ c.description }}</p>
          <div class="clip__score">
            <span class="dots"><i v-for="n in c.maxScore" :key="n" :class="{ on: c.best !== null && n <= c.best }" /></span>
            <small>{{ c.best === null ? 'Not tried yet' : `Best ${c.best}/${c.maxScore} · ${c.tries} ${c.tries === 1 ? 'try' : 'tries'}` }}</small>
          </div>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.total { display: grid; justify-items: end; padding: 12px 18px; border-radius: 18px; background: var(--card); box-shadow: var(--shadow); }
.total span { font-size: 0.8125rem; color: var(--muted); }
.total b { font-family: var(--font-display); font-size: 1.75rem; color: var(--ink); }
.total small { font-size: 1rem; color: var(--muted); }
.clips { display: grid; gap: 16px; }
@media (min-width: 720px) { .clips { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1280px) { .clips { grid-template-columns: repeat(3, 1fr); } }
.clip { display: grid; border-radius: var(--radius-lg); background: var(--card); box-shadow: var(--shadow); overflow: hidden; color: var(--ink); text-decoration: none; transition: transform 0.5s var(--spring), box-shadow 0.3s; }
.clip:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); text-decoration: none; }
.clip__thumb { position: relative; aspect-ratio: 16 / 9; background: #111; }
.clip__play { position: absolute; left: 50%; top: 50%; display: grid; place-items: center; width: 56px; height: 56px; margin: -28px 0 0 -28px; border-radius: 50%; color: #fff; transition: transform 0.4s var(--spring); }
.clip__play :deep(path) { fill: #fff; stroke: none; }
.clip:hover .clip__play { transform: scale(1.12); }
.clip__dur { position: absolute; right: 10px; bottom: 10px; padding: 3px 8px; border-radius: 8px; font-size: 0.75rem; color: #fff; }
/* filmed clip: no animated preview — a calm road-at-dusk card instead */
.clip__filmed { position: absolute; inset: 0; background: linear-gradient(180deg, #34476a 0%, #8d8aa0 55%, #5d646f 56%, #3e434b 100%); }
.clip__filmed::after { content: ''; position: absolute; left: 50%; bottom: 0; width: 40%; height: 44%; transform: translateX(-50%); background: linear-gradient(90deg, transparent 47%, #f3eee2 47% 53%, transparent 53%) top / 100% 30% repeat-y; clip-path: polygon(46% 0, 54% 0, 100% 100%, 0 100%); opacity: 0.7; }
.clip__tag { position: absolute; left: 10px; bottom: 10px; display: flex; gap: 6px; align-items: center; padding: 3px 10px; border-radius: 980px; font-size: 0.75rem; color: #fff; }
.clip__lock { position: absolute; left: 10px; top: 10px; display: flex; gap: 6px; align-items: center; padding: 4px 10px; border-radius: 980px; font-size: 0.75rem; color: #fff; }
.clip__body { display: grid; gap: 6px; padding: 18px 20px 20px; }
.clip__meta { font-size: 0.8125rem; color: var(--muted); }
.clip h2 { font-size: 1.375rem; }
.clip__desc { color: var(--muted); font-size: 0.9375rem; }
.clip__score { display: flex; align-items: center; gap: 10px; margin-top: 6px; }
.dots { display: flex; gap: 3px; }
.dots i { width: 6px; height: 16px; border-radius: 3px; background: rgb(127 127 127 / 0.2); }
.dots i.on { background: var(--go); }
.clip__score small { color: var(--muted); font-size: 0.8125rem; }
</style>

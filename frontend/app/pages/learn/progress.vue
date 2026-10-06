<script setup lang="ts">
definePageMeta({ layout: 'learn', middleware: 'auth' })
useHead({ title: 'Progress — 1Theory' })

const [{ data }, { data: topics }, { data: mocks }, { data: hazard }] = await Promise.all([
  useFetch('/api/learn/progress'),
  useFetch('/api/learn/topics'),
  useFetch('/api/learn/mock'),
  useFetch('/api/learn/hazard')
])
const level = (n: number) => (n === 0 ? 0 : n < 5 ? 1 : n < 15 ? 2 : n < 30 ? 3 : 4)
const weeks = computed(() => {
  const cal = data.value?.calendar ?? []
  return Array.from({ length: 12 }, (_, w) => cal.slice(w * 7, w * 7 + 7))
})
const finishedMocks = computed(() => (mocks.value?.attempts ?? []).filter((a) => a.status === 'finished').reverse())
const hours = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`)
</script>

<template>
  <div v-if="data">
    <LearnHead eyebrow="Progress" title="How you’re doing." />

    <section class="top">
      <div class="card ringcard">
        <LearnReadinessRings v-bind="data.readiness" :size="170" />
        <ul class="legend">
          <li v-if="data.prediction.ready" class="ready"><AppIcon name="check" :size="14" /> Ready to book your test</li>
          <li class="chance">Chance to pass <b>{{ data.prediction.percent }}%</b></li>
          <li><i style="background: #ff375f" /> Theory <b>{{ data.readiness.theory }}%</b></li>
          <li><i style="background: #30d158" /> Mock tests <b>{{ data.readiness.mock }}%</b></li>
          <li><i style="background: #0a84ff" /> Hazard <b>{{ data.readiness.hazard }}%</b></li>
        </ul>
      </div>
      <div class="stats">
        <div class="stat"><small>Study time</small><b>{{ hours(data.studyMinutes) }}</b><span>{{ hours(data.weekMinutes) }} this week</span></div>
        <div class="stat"><small>Questions</small><b>{{ data.answered }}</b><span>{{ data.accuracy }}% correct</span></div>
        <div class="stat"><small>Lessons</small><b>{{ data.lessonsDone }}</b><span>completed</span></div>
        <NuxtLink to="/learn/practice?mode=review" class="stat stat--link"><small>Long-term memory</small><b>{{ data.review.learned }}</b><span>{{ data.review.due ? `${data.review.due} due for review →` : `of ${data.review.seen} questions` }}</span></NuxtLink>
        <div class="stat"><small>Streak</small><b>{{ data.streak }}</b><span>{{ data.visits }} visits in total</span></div>
      </div>
    </section>

    <section class="card">
      <h2>Activity</h2>
      <div class="cal" aria-label="Activity over the last 12 weeks">
        <div v-for="(w, i) in weeks" :key="i" class="cal__week">
          <span v-for="d in w" :key="d.day" :class="`l${level(d.n)}`" :title="`${d.day}: ${d.n} activities`" />
        </div>
      </div>
      <p class="cal__legend">Less <span class="l0" /><span class="l1" /><span class="l2" /><span class="l3" /><span class="l4" /> More</p>
    </section>

    <div class="cols">
      <section class="card">
        <h2>Topics</h2>
        <NuxtLink v-for="t in topics?.topics" :key="t.slug" :to="`/learn/practice?topic=${t.slug}`" class="trow">
          <AppIcon :name="t.icon" :size="18" />
          <span>{{ t.title }}</span>
          <UiBar :value="t.mastery" :color="t.mastery >= 86 ? 'var(--go)' : 'var(--warn)'" />
          <b>{{ t.mastery }}%</b>
        </NuxtLink>
      </section>

      <div class="stack">
        <section class="card">
          <h2>Mock tests</h2>
          <p v-if="!finishedMocks.length" class="muted">No mock tests yet. <NuxtLink to="/learn/mock">Take one</NuxtLink></p>
          <div v-else class="bars">
            <span class="bars__pass" :style="{ bottom: `${(mocks!.pass / mocks!.questions) * 100}%` }" />
            <i v-for="a in finishedMocks.slice(-10)" :key="a.id" :class="{ pass: a.passed }" :style="{ height: `${((a.score ?? 0) / a.total) * 100}%` }" :title="`${a.score}/${a.total}`" />
          </div>
        </section>
        <section class="card">
          <h2>Hazard perception</h2>
          <NuxtLink v-for="c in hazard?.clips" :key="c.slug" :to="`/learn/hazard/${c.slug}`" class="hrow">
            <span>{{ c.title }}</span>
            <span class="dots"><i v-for="n in c.maxScore" :key="n" :class="{ on: c.best !== null && n <= c.best }" /></span>
          </NuxtLink>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card { display: grid; gap: 12px; padding: 22px; border-radius: var(--radius-lg); background: var(--card); box-shadow: var(--shadow); color: var(--ink); align-content: start; }
.card h2 { font-size: 1.25rem; }
.muted { color: var(--muted); }
.top { display: grid; gap: 14px; margin-bottom: 14px; }
@media (min-width: 900px) { .top { grid-template-columns: 1fr 1.3fr; } }
.ringcard { grid-template-columns: auto 1fr; align-items: center; gap: 24px; }
.legend { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.legend li { display: flex; align-items: center; gap: 10px; color: var(--muted); }
.legend i { width: 10px; height: 10px; border-radius: 50%; }
.legend b { margin-left: auto; color: var(--ink); }
.stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.stat { display: grid; padding: 18px; border-radius: var(--radius-lg); background: var(--card); box-shadow: var(--shadow); }
.stat small { color: var(--muted); }
.stat b { font-family: var(--font-display); font-size: 2rem; font-weight: 600; color: var(--ink); }
.stat span { color: var(--muted); font-size: 0.8125rem; }
.stat--link { grid-column: 1 / -1; color: inherit; text-decoration: none; transition: transform 0.4s var(--spring); }
.stat--link:hover { transform: translateY(-2px); text-decoration: none; }
.stat--link span { color: var(--accent); }
.legend .ready { padding: 6px 12px; border-radius: 12px; background: var(--go-soft); color: var(--go-text); font-weight: 600; }
.legend .chance { color: var(--ink); font-weight: 500; }
.cal { display: flex; gap: 4px; overflow-x: auto; }
.cal__week { display: grid; gap: 4px; }
.cal span, .cal__legend span { display: inline-block; width: 16px; height: 16px; border-radius: 4px; }
.l0 { background: rgb(127 127 127 / 0.14); }
.l1 { background: rgb(48 209 88 / 0.3); }
.l2 { background: rgb(48 209 88 / 0.55); }
.l3 { background: rgb(48 209 88 / 0.8); }
.l4 { background: #30d158; }
.cal__legend { display: flex; gap: 4px; align-items: center; font-size: 0.75rem; color: var(--muted); }
.cols { display: grid; gap: 14px; margin-top: 14px; }
@media (min-width: 900px) { .cols { grid-template-columns: 1.2fr 1fr; } }
.stack { display: grid; gap: 14px; align-content: start; }
.trow { display: grid; grid-template-columns: 20px 1fr 90px 40px; gap: 10px; align-items: center; padding: 6px 0; color: var(--ink); text-decoration: none; font-size: 0.9375rem; }
.trow :deep(.icon) { color: var(--accent); }
.trow b { text-align: right; font-weight: 600; }
.bars { position: relative; display: flex; align-items: flex-end; gap: 6px; height: 120px; }
.bars i { flex: 1; max-width: 28px; border-radius: 5px 5px 2px 2px; background: var(--stop); }
.bars i.pass { background: var(--go); }
.bars__pass { position: absolute; left: 0; right: 0; border-top: 1.5px dashed var(--muted); }
.hrow { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; color: var(--ink); text-decoration: none; font-size: 0.9375rem; }
.dots { display: flex; gap: 3px; }
.dots i { width: 5px; height: 14px; border-radius: 2px; background: rgb(127 127 127 / 0.2); }
.dots i.on { background: var(--go); }
</style>

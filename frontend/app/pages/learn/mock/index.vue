<script setup lang="ts">
definePageMeta({ layout: 'learn', middleware: 'auth' })
useHead({ title: 'Mock test — 1Theory' })

const { data } = await useFetch('/api/learn/mock')
const starting = ref(false)
const error = ref<string>()
async function start() {
  starting.value = true
  error.value = undefined
  try {
    const { id } = await $fetch<{ id: number }>('/api/learn/mock', { method: 'POST' })
    await navigateTo(`/learn/mock/${id}`)
  } catch (e) {
    error.value = apiErrorsOf(e).form
  } finally {
    starting.value = false
  }
}
const inProgress = computed(() => data.value?.attempts.find((a) => a.status === 'in_progress'))
const finished = computed(() => data.value?.attempts.filter((a) => a.status === 'finished') ?? [])
const best = computed(() => Math.max(0, ...finished.value.map((a) => a.score ?? 0)))
</script>

<template>
  <div v-if="data">
    <LearnHead eyebrow="Mock test" title="The real thing, rehearsed." />

    <section class="intro">
      <div class="intro__glow" aria-hidden="true" />
      <dl class="intro__facts">
        <div><dt>Questions</dt><dd>{{ data.questions }}</dd></div>
        <div><dt>Minutes</dt><dd>{{ data.minutes }}</dd></div>
        <div><dt>Pass mark</dt><dd>{{ data.pass }}</dd></div>
      </dl>
      <p>A bite-size version of the real test, including a short case study — three questions about one scenario. Flag questions to come back to before you finish. Your answers save as you go.</p>
      <UiAlert v-if="error">{{ error }}</UiAlert>
      <div class="intro__actions">
        <NuxtLink v-if="inProgress" :to="`/learn/mock/${inProgress.id}`" class="btn btn--primary btn--lg">Resume test</NuxtLink>
        <UiButton v-else variant="primary" size="lg" :loading="starting" @click="start">Start mock test</UiButton>
      </div>
    </section>

    <section v-if="finished.length" class="history">
      <div class="history__head">
        <h2>Your attempts</h2>
        <span>Best {{ best }}/{{ data.questions }}</span>
      </div>
      <div class="chart" aria-hidden="true">
        <span class="chart__pass" :style="{ bottom: `${(data.pass / data.questions) * 100}%` }"><small>Pass {{ data.pass }}</small></span>
        <i v-for="a in [...finished].reverse().slice(-12)" :key="a.id" :class="{ pass: a.passed }" :style="{ height: `${((a.score ?? 0) / a.total) * 100}%` }" :title="`${a.score}/${a.total}`" />
      </div>
      <NuxtLink v-for="a in finished" :key="a.id" :to="`/learn/mock/${a.id}`" class="attempt">
        <span class="attempt__badge" :class="{ pass: a.passed }">{{ a.passed ? 'Pass' : 'Fail' }}</span>
        <span>{{ formatDateTime(a.startedAt) }}</span>
        <b>{{ a.score }}/{{ a.total }}</b>
        <AppIcon name="chevronRight" :size="16" />
      </NuxtLink>
    </section>
  </div>
</template>

<style scoped>
.intro { position: relative; overflow: hidden; display: grid; gap: 18px; padding: 32px; border-radius: var(--radius-xl); background: #000; color: #f5f5f7; isolation: isolate; }
.intro__glow { position: absolute; z-index: -1; right: -120px; top: -160px; width: 520px; height: 520px; border-radius: 50%; background: radial-gradient(closest-side, rgb(255 159 10 / 0.35), rgb(255 55 95 / 0.15) 60%, transparent); }
.intro__facts { display: flex; gap: 40px; margin: 0; }
.intro__facts dt { color: var(--muted-dark); font-size: 0.875rem; }
.intro__facts dd { margin: 0; font-family: var(--font-display); font-size: 3rem; font-weight: 600; line-height: 1.1; }
.intro p { max-width: 560px; color: var(--muted-dark); }
.history { display: grid; gap: 10px; margin-top: 28px; }
.history__head { display: flex; justify-content: space-between; align-items: baseline; color: var(--ink); }
.history__head h2 { font-size: 1.5rem; }
.history__head span { color: var(--muted); }
.chart { position: relative; display: flex; align-items: flex-end; gap: 8px; height: 140px; padding: 16px; border-radius: var(--radius-lg); background: var(--card); box-shadow: var(--shadow); }
.chart i { flex: 1; max-width: 36px; border-radius: 6px 6px 3px 3px; background: var(--stop); opacity: 0.85; animation: rise 0.8s var(--ease) both; }
.chart i.pass { background: var(--go); }
@keyframes rise { from { transform: scaleY(0); transform-origin: bottom; } }
.chart__pass { position: absolute; left: 16px; right: 16px; border-top: 1.5px dashed var(--muted); }
.chart__pass small { position: absolute; right: 0; top: -18px; font-size: 0.75rem; color: var(--muted); }
.attempt { display: flex; align-items: center; gap: 14px; padding: 14px 18px; border-radius: 16px; background: var(--card); box-shadow: var(--shadow); color: var(--ink); text-decoration: none; }
.attempt:hover { text-decoration: none; background: var(--card-2); }
.attempt span:nth-child(2) { flex: 1; color: var(--muted); }
.attempt__badge { padding: 3px 10px; border-radius: 980px; background: var(--stop-soft); color: var(--stop-text); font-size: 0.8125rem; font-weight: 600; }
.attempt__badge.pass { background: var(--go-soft); color: var(--go-text); }
</style>

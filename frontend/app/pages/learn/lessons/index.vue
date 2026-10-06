<script setup lang="ts">
definePageMeta({ layout: 'learn', middleware: 'auth' })
useHead({ title: 'Lessons — 1Theory' })

const { data } = await useFetch('/api/learn/topics')
const done = computed(() => data.value?.topics.reduce((s, t) => s + t.lessons.filter((l) => l.done).length, 0) ?? 0)
const total = computed(() => data.value?.topics.reduce((s, t) => s + t.lessons.length, 0) ?? 0)
</script>

<template>
  <div v-if="data">
    <LearnHead eyebrow="Lessons" title="Learn it properly." :sub="`${done} of ${total} lessons complete. Each one takes a few minutes and ends with a quick check.`">
      <NuxtLink to="/learn/practice" class="btn btn--ghost">Practise instead</NuxtLink>
    </LearnHead>

    <div class="topics">
      <section v-for="(t, i) in data.topics" :id="t.slug" :key="t.slug" v-reveal="(i % 3) * 60" class="topic">
        <header class="topic__head">
          <span class="topic__icon"><AppIcon :name="t.icon" :size="22" /></span>
          <div>
            <h2>{{ t.title }}</h2>
            <p>{{ t.description }}</p>
          </div>
        </header>
        <NuxtLink v-for="l in t.lessons" :key="l.slug" :to="`/learn/lessons/${l.slug}`" class="lesson" :class="{ 'is-done': l.done }">
          <span class="lesson__state"><AppIcon :name="l.done ? 'check' : 'play'" :size="14" /></span>
          <span class="lesson__text">
            <b>{{ l.title }}</b>
            <small>{{ l.summary }}</small>
          </span>
          <span class="lesson__min">{{ l.minutes }} min</span>
        </NuxtLink>
        <footer class="topic__foot">
          <UiBar :value="t.mastery" class="topic__bar" />
          <small>{{ t.mastery }}% mastered · {{ t.questions }} questions</small>
          <NuxtLink :to="`/learn/practice?topic=${t.slug}`" class="chevron-link">Practise</NuxtLink>
        </footer>
      </section>
    </div>
  </div>
</template>

<style scoped>
.topics { display: grid; gap: 14px; }
@media (min-width: 900px) { .topics { grid-template-columns: repeat(2, 1fr); } }
.topic { display: grid; gap: 4px; align-content: start; padding: 20px; border-radius: var(--radius-lg); background: var(--card); box-shadow: var(--shadow); }
.topic__head { display: flex; gap: 14px; margin-bottom: 10px; }
.topic__icon { display: grid; place-items: center; flex: none; width: 44px; height: 44px; border-radius: 14px; background: var(--accent-soft); color: var(--accent); }
.topic__head h2 { font-size: 1.25rem; color: var(--ink); }
.topic__head p { color: var(--muted); font-size: 0.875rem; }
.lesson { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 14px; color: var(--ink); text-decoration: none; transition: background-color 0.2s; }
.lesson:hover { background: var(--card-2); text-decoration: none; }
.lesson__state { display: grid; place-items: center; flex: none; width: 30px; height: 30px; border-radius: 50%; background: var(--accent); color: #fff; }
.lesson__state :deep(path) { fill: currentColor; }
.is-done .lesson__state { background: var(--go); }
.is-done .lesson__state :deep(path) { fill: none; }
.lesson__text { display: grid; flex: 1; min-width: 0; line-height: 1.3; }
.lesson__text small { color: var(--muted); font-size: 0.8125rem; }
.lesson__min { flex: none; font-size: 0.8125rem; color: var(--muted); }
.topic__foot { display: flex; align-items: center; gap: 10px; margin-top: 10px; padding-top: 14px; border-top: 1px solid var(--line-soft); }
.topic__foot small { color: var(--muted); font-size: 0.8125rem; }
.topic__foot .chevron-link { margin-left: auto; font-size: 0.9375rem; }
.topic__bar { width: 70px; }
</style>

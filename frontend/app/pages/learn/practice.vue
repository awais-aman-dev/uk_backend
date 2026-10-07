<script setup lang="ts">
import type { AnswerResult } from '#shared/types/learn'

definePageMeta({ layout: 'learn', middleware: 'auth' })
useHead({ title: 'Practice — 1Theory' })

const route = useRoute()
const toast = useToast()
const mode = computed(() => (route.query.topic ? 'topic' : (route.query.mode as string | undefined)))
const inSession = computed(() => !!mode.value)

/* ---------- Chooser ---------- */
const { data: catalogue } = await useFetch('/api/learn/topics')
const { isDjango } = useLearnSource()
const LOCAL_MODES = [
  { mode: 'review', icon: 'repeat', title: 'Review', sub: 'Due today — spaced repetition', tone: '#30d158' },
  { mode: 'random', icon: 'sparkle', title: 'Quick 10', sub: 'Random questions from every topic', tone: '#0a84ff' },
  { mode: 'weak', icon: 'target', title: 'Weak spots', sub: 'Focus on your lowest topics', tone: '#ff375f' },
  { mode: 'mistakes', icon: 'replay', title: 'My mistakes', sub: 'Questions you got wrong last time', tone: '#ff9f0a' },
  { mode: 'saved', icon: 'bookmark', title: 'Saved', sub: 'Questions you bookmarked', tone: '#5e5ce6' }
]

// Django mode: the guide's definitions of each mode (Learning API guide §8)
const DJANGO_MODES = [
  { mode: 'random', icon: 'sparkle', title: 'Quick 10', sub: 'Any questions in your plan', tone: '#0a84ff' },
  { mode: 'mistakes', icon: 'replay', title: 'My mistakes', sub: 'Wrong before, not yet answered right since', tone: '#ff9f0a' },
  { mode: 'weak', icon: 'target', title: 'Weak spots', sub: 'Questions you haven’t got right yet', tone: '#ff375f' },
  { mode: 'review', icon: 'repeat', title: 'Review', sub: 'Every question you’ve tried before', tone: '#30d158' },
  { mode: 'saved', icon: 'bookmark', title: 'Saved', sub: 'Questions you bookmarked', tone: '#5e5ce6' }
]
const MODES = computed(() => (isDjango.value ? DJANGO_MODES : LOCAL_MODES))
const DJANGO_EMPTY: Record<string, { title: string; text: string }> = {
  review: { title: 'Nothing to review yet', text: 'Questions you answer will appear here.' },
  mistakes: { title: 'No mistakes to fix', text: 'Any question you get wrong will appear here until you get it right.' },
  weak: { title: 'No weak spots', text: 'You’ve answered every question correctly at least once.' },
  saved: { title: 'Nothing saved yet', text: 'Tap the bookmark on any question to save it.' }
}
const LOCAL_EMPTY: Record<string, { title: string; text: string }> = {
  review: { title: 'Nothing due right now', text: 'Questions you answer come back just before you’d forget them — 1, 3, 7, 14 then 30 days after each right answer.' },
  mistakes: { title: 'No mistakes to review', text: 'Answer a few questions first — any you get wrong will appear here.' },
  saved: { title: 'Nothing saved yet', text: 'Tap the bookmark on any question to save it.' }
}

/* ---------- Session ---------- */
const { data, error, refresh, status } = await useFetch('/api/learn/practice', {
  query: computed(() => ({ mode: mode.value, topic: route.query.topic, count: 10 })),
  immediate: inSession.value,
  watch: false
})
watch(() => route.fullPath, () => {
  reset()
  if (inSession.value) refresh()
})

const index = ref(0)
const results = ref<boolean[]>([])
const answered = ref(false)
const saved = ref(new Set<string>())
watch(data, (d) => (saved.value = new Set(d?.saved ?? [])), { immediate: true })

const questions = computed(() => data.value?.questions ?? [])
const current = computed(() => questions.value[index.value])
const finished = computed(() => questions.value.length > 0 && results.value.length === questions.value.length && !current.value)
const score = computed(() => results.value.filter(Boolean).length)
const title = computed(() => {
  if (route.query.topic) return catalogue.value?.topics.find((t) => t.slug === route.query.topic)?.title ?? 'Topic practice'
  return MODES.value.find((m) => m.mode === mode.value)?.title ?? 'Practice'
})

function reset() {
  index.value = 0
  results.value = []
  answered.value = false
}
function onAnswered(r: AnswerResult) {
  results.value.push(r.correct)
  answered.value = true
}
function next() {
  answered.value = false
  index.value++
}
async function toggleSave(key: string, on: boolean) {
  const s = new Set(saved.value)
  if (on) s.add(key)
  else s.delete(key)
  saved.value = s
  await $fetch('/api/learn/bookmarks', { method: 'POST', body: { kind: 'question', ref: key, on } })
  toast.show(on ? 'Saved for later' : 'Removed from saved', 'info', 2500)
}
async function again() {
  reset()
  await refresh()
}
</script>

<template>
  <div>
    <!-- Chooser -->
    <template v-if="!inSession">
      <LearnHead eyebrow="Practice" title="Little and often." sub="Every answer is explained. Questions you get wrong come back in “My mistakes”." />
      <div class="modes">
        <NuxtLink v-for="m in MODES" :key="m.mode" :to="`/learn/practice?mode=${m.mode}`" class="mode" :style="{ '--tone': m.tone }">
          <span class="mode__icon"><AppIcon :name="m.icon" :size="24" /></span>
          <b>{{ m.title }}</b>
          <small>{{ m.sub }}</small>
        </NuxtLink>
      </div>
      <NuxtLink to="/learn/mock" class="mockcta">
        <span class="mockcta__icon"><AppIcon name="timer" :size="26" /></span>
        <span><b>Full mock test</b><small>10 questions · 12 minutes · pass mark 9 — the real test’s format, in bite size</small></span>
        <AppIcon name="chevronRight" :size="20" />
      </NuxtLink>
      <h2 class="h2">By topic</h2>
      <div class="tlist">
        <NuxtLink v-for="t in catalogue?.topics" :key="t.slug" :to="`/learn/practice?topic=${t.slug}`" class="tlist__item">
          <AppIcon :name="t.icon" :size="20" />
          <span>{{ t.title }}</span>
          <small>{{ t.questions }} Qs</small>
          <UiBar :value="t.mastery" class="tbar" />
        </NuxtLink>
      </div>
    </template>

    <!-- Session -->
    <template v-else>
      <div class="session">
        <div class="session__top">
          <BackButton fallback="/learn/practice" label="Practice" />
          <b>{{ title }}</b>
        </div>
        <LearnLocked v-if="error?.statusCode === 402" />
        <div v-else-if="status === 'success' && !questions.length" class="empty">
          <AppIcon name="check" :size="28" />
          <h2>{{ (isDjango ? DJANGO_EMPTY : LOCAL_EMPTY)[mode ?? '']?.title ?? 'No questions here yet' }}</h2>
          <p>{{ (isDjango ? DJANGO_EMPTY : LOCAL_EMPTY)[mode ?? '']?.text ?? 'Try another set.' }}</p>
          <NuxtLink to="/learn/practice?mode=random" class="btn btn--primary">Quick 10</NuxtLink>
        </div>
        <template v-else-if="questions.length">
          <div class="segs" aria-hidden="true">
            <span v-for="(q, i) in questions" :key="q.id" :class="{ right: results[i] === true, wrong: results[i] === false, current: i === index }" />
          </div>

          <Transition name="slide" mode="out-in">
            <div v-if="current" :key="current.id" class="card">
              <LearnQuestionCard
                :question="current"
                :signs="data!.signs"
                :saved="saved.has(current.key)"
                :number="`Question ${index + 1} of ${questions.length}`"
                @answered="onAnswered"
                @toggle-save="(on) => toggleSave(current!.key, on)"
              />
              <UiButton v-if="answered" variant="primary" size="lg" class="next" @click="next">
                {{ index < questions.length - 1 ? 'Next question' : 'See results' }}
              </UiButton>
            </div>
            <div v-else-if="finished" class="card result">
              <UiRing :value="(score / questions.length) * 100" :size="150" :thickness="12" color="var(--go)" class="result__ring">
                <strong>{{ score }}</strong><small>/ {{ questions.length }}</small>
              </UiRing>
              <h2>{{ score === questions.length ? 'Flawless.' : score / questions.length >= 0.86 ? 'Pass-level score!' : 'Keep going.' }}</h2>
              <p>The real test pass mark is 86% (43 out of 50).</p>
              <div class="result__actions">
                <UiButton variant="primary" @click="again">Another 10</UiButton>
                <NuxtLink v-if="results.some((r) => !r)" to="/learn/practice?mode=mistakes" class="btn btn--ghost">Review mistakes</NuxtLink>
                <NuxtLink to="/learn" class="btn btn--ghost">Done</NuxtLink>
              </div>
            </div>
          </Transition>
        </template>
      </div>
    </template>
  </div>
</template>

<style scoped>
.modes { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
@media (min-width: 900px) { .modes { grid-template-columns: repeat(5, 1fr); } }
.mode { display: grid; gap: 4px; padding: 20px; border-radius: var(--radius-lg); background: var(--card); box-shadow: var(--shadow); color: var(--ink); text-decoration: none; transition: transform 0.4s var(--spring); }
.mode:hover { transform: translateY(-3px); text-decoration: none; }
.mode__icon { display: grid; place-items: center; width: 48px; height: 48px; margin-bottom: 10px; border-radius: 16px; background: var(--tone); color: #fff; }
.mode small { color: var(--muted); font-size: 0.8125rem; }
.mockcta { display: flex; align-items: center; gap: 16px; margin-top: 12px; padding: 20px 22px; border-radius: var(--radius-lg); background: #000; color: #fff; text-decoration: none; position: relative; overflow: hidden; }
.mockcta::before { content: ''; position: absolute; right: -80px; top: -120px; width: 320px; height: 320px; border-radius: 50%; background: radial-gradient(closest-side, rgb(255 159 10 / 0.4), transparent); }
.mockcta:hover { text-decoration: none; }
.mockcta > span:nth-child(2) { display: grid; flex: 1; position: relative; }
.mockcta small { color: var(--muted-dark); }
.mockcta__icon { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 16px; background: #ff9f0a; position: relative; }
.h2 { margin: 28px 0 12px; font-size: 1.5rem; color: var(--ink); }
.tlist { display: grid; gap: 1px; border-radius: var(--radius-lg); overflow: hidden; background: var(--line-soft); box-shadow: var(--shadow); }
@media (min-width: 900px) { .tlist { grid-template-columns: 1fr 1fr; } }
.tlist__item { display: flex; align-items: center; gap: 12px; padding: 14px 18px; background: var(--card); color: var(--ink); text-decoration: none; }
.tlist__item:hover { background: var(--card-2); text-decoration: none; }
.tlist__item :deep(.icon) { color: var(--accent); flex: none; }
.tlist__item span:nth-of-type(1) { flex: 1; }
.tlist__item small { color: var(--muted); }
.tbar { width: 56px; }

.session { display: grid; gap: 16px; max-width: 720px; margin-inline: auto; }
.session__top { display: flex; align-items: center; gap: 14px; color: var(--ink); }
.segs { display: flex; gap: 4px; }
.segs span { flex: 1; height: 4px; border-radius: 2px; background: rgb(127 127 127 / 0.2); transition: background-color 0.4s; }
.segs .current { background: var(--ink); }
.segs .right { background: var(--go); }
.segs .wrong { background: var(--stop); }
.card { display: grid; gap: 18px; padding: 24px; border-radius: var(--radius-xl); background: var(--card); box-shadow: var(--shadow-lg); }
@media (min-width: 640px) { .card { padding: 32px; } }
.next { justify-self: end; }
.result { justify-items: center; text-align: center; padding-block: 40px; color: var(--ink); }
.result p { color: var(--muted); }
.result__ring { animation: pop 0.7s var(--spring); }
.result__ring strong { font-family: var(--font-display); font-size: 3rem; line-height: 1; }
.result__ring small { color: var(--muted); }
@keyframes pop { from { transform: scale(0.6); opacity: 0; } }
.result__actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 8px; }
.empty { display: grid; justify-items: center; gap: 10px; padding: 48px 24px; border-radius: var(--radius-xl); background: var(--card); text-align: center; color: var(--ink); }
.empty :deep(.icon) { color: var(--go); }
.empty p { color: var(--muted); max-width: 380px; }
.slide-enter-active, .slide-leave-active { transition: opacity 0.3s, transform 0.45s var(--ease), filter 0.3s; }
.slide-enter-from { opacity: 0; transform: translateX(30px); filter: blur(4px); }
.slide-leave-to { opacity: 0; transform: translateX(-30px); filter: blur(4px); }
</style>

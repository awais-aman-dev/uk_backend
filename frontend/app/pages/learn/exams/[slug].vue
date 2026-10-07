<script setup lang="ts">
import type { DjangoExamResult } from '#shared/types/learn'

/*
 * A Django exam — the Learning API guide's Flow D: load the questions, run the timer here, keep the answers in the
 * browser (never /answer/ during an exam), submit once, then show the score and every question's result.
 */
definePageMeta({ layout: 'learn', middleware: 'auth', focus: true })

const route = useRoute()
const toast = useToast()
const slug = computed(() => String(route.params.slug))
const { data, error } = await useFetch(() => `/api/learn/exams/${slug.value}`)
useHead({ title: () => `${data.value?.exam.title ?? 'Exam'} — 1Theory` })

type Phase = 'intro' | 'running' | 'submitting' | 'result'
const phase = ref<Phase>('intro')
const questions = computed(() => data.value?.questions ?? [])
const answers = ref<Record<number, string[]>>({})
const index = ref(0)
const current = computed(() => questions.value[index.value])
const answeredCount = computed(() => questions.value.filter((q) => (answers.value[q.id]?.length ?? 0) === q.pick).length)
const result = ref<DjangoExamResult | null>(null)
const submitError = ref<string>()

/* ---------- Timer (the backend doesn't enforce it — the guide asks the FE to) ---------- */
const limitMs = computed(() => (data.value?.exam.timeLimitSeconds ?? 0) * 1000)
const timed = computed(() => !!data.value?.exam.timeLimitSeconds)
const startedAt = ref(0)
const now = ref(Date.now())
const remaining = computed(() => Math.max(0, startedAt.value + limitMs.value - now.value))
const clock = computed(() => {
  const s = Math.ceil(remaining.value / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
})
let tick: ReturnType<typeof setInterval> | undefined
onBeforeUnmount(() => clearInterval(tick))
watch(remaining, (r) => {
  if (phase.value === 'running' && timed.value && r === 0) submit(true)
})

function start() {
  answers.value = {}
  result.value = null
  submitError.value = undefined
  index.value = 0
  startedAt.value = Date.now()
  now.value = Date.now()
  clearInterval(tick)
  tick = setInterval(() => (now.value = Date.now()), 500)
  phase.value = 'running'
}

function setAnswer(id: number, sel: string[]) {
  answers.value = { ...answers.value, [id]: sel }
}
const navOpen = ref(false)
const confirming = ref(false)
function go(i: number) {
  index.value = Math.max(0, Math.min(questions.value.length - 1, i))
  navOpen.value = false
}

/** One submission for the whole exam: { answers: { "<question id>": [option ids] } } */
async function submit(auto = false) {
  if (phase.value !== 'running') return
  clearInterval(tick)
  phase.value = 'submitting'
  confirming.value = false
  submitError.value = undefined
  const body: Record<string, string[]> = {}
  for (const q of questions.value) if (answers.value[q.id]?.length) body[q.id] = answers.value[q.id]!
  try {
    result.value = await $fetch<DjangoExamResult>(`/api/learn/exams/${slug.value}/submit`, { method: 'POST', body: { answers: body } })
    phase.value = 'result'
    if (auto) toast.show('Time’s up — your exam has been marked', 'info')
    window.scrollTo({ top: 0 })
  } catch (e) {
    // keep the answers: the learner can try submitting again
    submitError.value = apiErrorsOf(e).form ?? 'Your exam couldn’t be submitted. Check your connection and try again.'
    phase.value = 'running'
  }
}

/* ---------- Review ---------- */
const filter = ref<'all' | 'wrong'>('wrong')
const byId = computed(() => new Map((result.value?.questions ?? []).map((r) => [r.id, r])))
const reviewList = computed(() => questions.value.filter((q) => filter.value === 'all' || !byId.value.get(q.id)?.correct))
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`
</script>

<template>
  <div class="examp">
    <LearnLocked v-if="error?.statusCode === 402" />
    <UiAlert v-else-if="error">This exam couldn’t be found. <NuxtLink to="/learn/mock">Back to exams</NuxtLink></UiAlert>

    <template v-else-if="data">
      <!-- Intro -->
      <section v-if="phase === 'intro'" class="intro">
        <BackButton fallback="/learn/mock" label="Exams" />
        <p class="intro__kicker">{{ data.exam.kind === 'mock' ? 'Mock test' : 'Practice exam' }}</p>
        <h1>{{ data.exam.title }}</h1>
        <p v-if="data.exam.description" class="intro__desc">{{ data.exam.description }}</p>
        <dl class="intro__facts">
          <div><dt>Questions</dt><dd>{{ questions.length }}</dd></div>
          <div><dt>Pass mark</dt><dd>{{ data.exam.passMark }}</dd></div>
          <div><dt>Time</dt><dd>{{ timed ? `${Math.round(data.exam.timeLimitSeconds! / 60)} min` : 'Untimed' }}</dd></div>
        </dl>
        <p class="intro__note">You’ll see your score and every answer once you submit. Unanswered questions count as wrong.</p>
        <UiButton variant="primary" size="lg" :disabled="!questions.length" @click="start">Start exam</UiButton>
        <p v-if="!questions.length" class="intro__note">This exam has no questions yet.</p>
      </section>

      <!-- Running -->
      <template v-else-if="(phase === 'running' || phase === 'submitting') && current">
        <header class="exam-bar glass">
          <BackButton fallback="/learn/mock" label="Exit" />
          <button type="button" class="exam-bar__nav" @click="navOpen = true">
            <AppIcon name="grid" :size="16" /> {{ index + 1 }} / {{ questions.length }}
          </button>
          <span v-if="timed" class="exam-bar__clock" :class="{ low: remaining < 5 * 60_000 }"><AppIcon name="timer" :size="16" /> {{ clock }}</span>
          <UiButton variant="primary" size="sm" :loading="phase === 'submitting'" @click="confirming = true">Submit</UiButton>
        </header>

        <div class="exam">
          <UiAlert v-if="submitError">{{ submitError }}</UiAlert>
          <div class="exam__progress"><i :style="{ width: `${(answeredCount / questions.length) * 100}%` }" /></div>
          <div :key="current.id" class="card">
            <LearnQuestionCard
              :question="current"
              :signs="data.signs"
              mode="exam"
              :number="`Question ${index + 1}`"
              :selected="answers[current.id] ?? []"
              @update:selected="(s) => setAnswer(current!.id, s)"
            />
          </div>
          <div class="exam__foot">
            <UiButton variant="ghost" :disabled="index === 0" @click="go(index - 1)">Previous</UiButton>
            <UiButton v-if="index < questions.length - 1" variant="primary" @click="go(index + 1)">Next</UiButton>
            <UiButton v-else variant="primary" @click="confirming = true">Review & submit</UiButton>
          </div>
        </div>

        <UiModal v-model:open="navOpen" title="Questions">
          <div class="grid">
            <button
              v-for="(q, i) in questions"
              :key="q.id"
              type="button"
              :class="{ done: (answers[q.id]?.length ?? 0) === q.pick, now: i === index }"
              @click="go(i)"
            >{{ i + 1 }}</button>
          </div>
        </UiModal>

        <UiModal v-model:open="confirming">
          <div class="confirm">
            <h2>Submit the exam?</h2>
            <p>{{ answeredCount }} of {{ questions.length }} answered.</p>
            <UiAlert v-if="answeredCount < questions.length" variant="info">Unanswered questions count as wrong.</UiAlert>
            <div class="confirm__actions">
              <UiButton variant="ghost" @click="confirming = false">Keep going</UiButton>
              <UiButton variant="primary" :loading="phase === 'submitting'" @click="submit()">Submit & mark</UiButton>
            </div>
          </div>
        </UiModal>
      </template>

      <!-- Result (POST …/submit/) -->
      <div v-else-if="phase === 'result' && result" class="result">
        <BackButton fallback="/learn/mock" label="Exams" />
        <section class="verdict" :class="result.passed ? 'pass' : 'fail'">
          <p class="verdict__kicker">{{ result.passed ? 'Pass' : 'Not this time' }}</p>
          <div class="verdict__score"><strong>{{ result.score }}</strong><span>/ {{ result.total }}</span></div>
          <p>Pass mark {{ result.passMark }}.<template v-if="!result.passed"> {{ plural(Math.max(0, result.passMark - result.score), 'more correct answer') }} to pass.</template></p>
          <div class="verdict__actions">
            <UiButton variant="primary" @click="start">Try again</UiButton>
            <NuxtLink to="/learn/mock" class="btn btn--ghost-dark">All exams</NuxtLink>
          </div>
        </section>

        <section class="review">
          <div class="review__head">
            <h2>Review</h2>
            <UiSegmented v-model="filter" label="Show" :options="[{ value: 'wrong', label: 'Wrong' }, { value: 'all', label: 'All' }]" />
          </div>
          <p v-if="!reviewList.length" class="muted">Every answer correct.</p>
          <div v-for="q in reviewList" :key="q.id" class="card">
            <LearnQuestionCard
              :question="q"
              :signs="data.signs"
              mode="exam"
              :number="`Question ${questions.indexOf(q) + 1}`"
              :selected="byId.get(q.id)?.selected ?? []"
              :review="byId.get(q.id) ? { correctIds: byId.get(q.id)!.correctIds, explanation: byId.get(q.id)!.explanation } : null"
            />
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.examp { display: grid; gap: 18px; min-height: 100dvh; background: var(--paper); }
.intro, .exam, .result { width: 100%; max-width: 860px; margin: 0 auto; }
.intro { width: calc(100% - 2 * var(--gutter)); }
.intro { display: grid; gap: 14px; justify-items: start; margin-top: 16px; padding: 28px; border-radius: var(--radius-xl); background: var(--card); box-shadow: var(--shadow); }
.intro__kicker { font-size: 0.875rem; font-weight: 600; color: var(--accent); }
.intro h1 { font-size: clamp(1.75rem, 4vw, 2.5rem); }
.intro__desc, .intro__note, .muted { color: var(--muted); }
.intro__facts { display: flex; flex-wrap: wrap; gap: 32px; margin: 0; }
.intro__facts dt { font-size: 0.8125rem; color: var(--muted); }
.intro__facts dd { margin: 0; font-family: var(--font-display); font-size: 2rem; font-weight: 600; color: var(--ink); }
.exam-bar { position: sticky; top: 8px; width: calc(100% - 2 * var(--gutter)); max-width: 860px; margin: 8px auto 0; z-index: 5; display: flex; align-items: center; gap: 12px; padding: 8px 10px; border-radius: 980px; }
.exam-bar__nav { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border: 0; border-radius: 980px; background: var(--card-2); color: var(--ink); font-weight: 600; }
.exam-bar__clock { display: flex; align-items: center; gap: 6px; margin-left: auto; font-variant-numeric: tabular-nums; font-weight: 600; color: var(--ink); }
.exam-bar__clock.low { color: var(--stop-text); }
.exam { display: grid; gap: 14px; padding: 16px var(--gutter) 40px; }
.exam__progress { height: 4px; border-radius: 2px; background: var(--card-2); overflow: hidden; }
.exam__progress i { display: block; height: 100%; background: var(--accent); transition: width 0.3s; }
.card { padding: 22px; border-radius: var(--radius-lg); background: var(--card); box-shadow: var(--shadow); }
.exam__foot { display: flex; justify-content: space-between; gap: 10px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); gap: 8px; }
.grid button { aspect-ratio: 1; border: 0; border-radius: 12px; background: var(--card-2); color: var(--ink); font-weight: 600; }
.grid button.done { background: var(--accent-soft); color: var(--accent); }
.grid button.now { box-shadow: inset 0 0 0 2px var(--accent); }
.confirm { display: grid; gap: 12px; }
.confirm__actions { display: flex; justify-content: flex-end; gap: 10px; }
.result { display: grid; gap: 18px; padding: 16px var(--gutter) 64px; }
.verdict { display: grid; gap: 8px; padding: 28px; border-radius: var(--radius-xl); background: #000; color: #f5f5f7; }
.verdict__kicker { font-weight: 600; color: #ff6961; }
.verdict.pass .verdict__kicker { color: #30d158; }
.verdict__score { display: flex; align-items: baseline; gap: 8px; }
.verdict__score strong { font-family: var(--font-display); font-size: 4.5rem; line-height: 1; }
.verdict__score span { font-size: 1.5rem; color: var(--muted-dark); }
.verdict__actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 6px; }
.review { display: grid; gap: 12px; }
.review__head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.review__head h2 { font-size: 1.5rem; }
</style>

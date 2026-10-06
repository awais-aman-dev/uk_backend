<script setup lang="ts">
definePageMeta({ layout: 'learn', middleware: 'auth', focus: true })
useHead({ title: 'Mock test — 1Theory' })

const route = useRoute()
const toast = useToast()
const { data, error, refresh } = await useFetch(() => `/api/learn/mock/${route.params.id}`)

const answers = ref<Record<string, string[]>>({})
const flagged = ref<number[]>([])
watch(data, (d) => {
  answers.value = { ...(d?.answers ?? {}) }
  flagged.value = [...(d?.flagged ?? [])]
}, { immediate: true })

const running = computed(() => data.value?.status === 'in_progress')
const index = ref(0)
const questions = computed(() => data.value?.questions ?? [])
const current = computed(() => questions.value[index.value])
const inCase = computed(() => !!current.value && !!data.value?.caseStudy?.ids.includes(current.value.id))
const answeredCount = computed(() => questions.value.filter((q) => answers.value[q.id]?.length === q.pick).length)

/* ---------- Clock ---------- */
const now = ref(Date.now())
const remaining = computed(() => (data.value ? Math.max(0, new Date(data.value.deadlineAt).getTime() - now.value) : 0))
const clock = computed(() => {
  const s = Math.floor(remaining.value / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
})
let tick: ReturnType<typeof setInterval> | undefined
onMounted(() => (tick = setInterval(() => (now.value = Date.now()), 1000)))
onBeforeUnmount(() => clearInterval(tick))
watch(remaining, (r) => {
  if (running.value && r === 0) finish(true)
})

/* ---------- Autosave ---------- */
let saveTimer: ReturnType<typeof setTimeout> | undefined
const saving = ref(false)
function save() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    saving.value = true
    try {
      await $fetch(`/api/learn/mock/${route.params.id}`, { method: 'PATCH', body: { answers: answers.value, flagged: flagged.value } })
    } catch {
      toast.show('Couldn’t save — check your connection', 'error')
    } finally {
      saving.value = false
    }
  }, 400)
}
function setAnswer(qid: number, sel: string[]) {
  answers.value = { ...answers.value, [qid]: sel }
  save()
}
function toggleFlag(qid: number) {
  flagged.value = flagged.value.includes(qid) ? flagged.value.filter((f) => f !== qid) : [...flagged.value, qid]
  save()
}

/* ---------- Navigation & finish ---------- */
const navOpen = ref(false)
const confirming = ref(false)
const finishing = ref(false)
function go(i: number) {
  index.value = Math.max(0, Math.min(questions.value.length - 1, i))
  navOpen.value = false
}
async function finish(auto = false) {
  finishing.value = true
  try {
    clearTimeout(saveTimer)
    if (!auto) await $fetch(`/api/learn/mock/${route.params.id}`, { method: 'PATCH', body: { answers: answers.value, flagged: flagged.value } }).catch(() => {})
    await $fetch(`/api/learn/mock/${route.params.id}/finish`, { method: 'POST' })
    if (auto) toast.show('Time’s up — your test has been marked', 'info')
    confirming.value = false
    await refresh()
    window.scrollTo({ top: 0 })
  } finally {
    finishing.value = false
  }
}

/* ---------- Review ---------- */
const filter = ref<'all' | 'wrong' | 'flagged'>('wrong')
const reviewById = computed(() => new Map((data.value?.result?.review ?? []).map((r) => [r.id, r])))
const reviewList = computed(() =>
  questions.value.filter((q) => {
    if (filter.value === 'wrong') return !reviewById.value.get(q.id)?.correct
    if (filter.value === 'flagged') return flagged.value.includes(q.id)
    return true
  })
)
const mins = (s: number) => `${Math.floor(s / 60)} min ${s % 60} s`
</script>

<template>
  <div class="mock">
    <LearnLocked v-if="error?.statusCode === 402" />
    <UiAlert v-else-if="error">This mock test couldn’t be found. <NuxtLink to="/learn/mock">Back</NuxtLink></UiAlert>

    <!-- ===================== Exam ===================== -->
    <template v-else-if="data && running && current">
      <header class="exam-bar glass">
        <BackButton fallback="/learn/mock" label="Exit" />
        <button type="button" class="exam-bar__nav" @click="navOpen = true">
          <AppIcon name="grid" :size="16" /> {{ index + 1 }} / {{ questions.length }}
        </button>
        <span class="exam-bar__clock" :class="{ low: remaining < 5 * 60_000 }"><AppIcon name="timer" :size="16" /> {{ clock }}</span>
        <span class="exam-bar__saved">{{ saving ? 'Saving…' : 'Saved' }}</span>
        <UiButton variant="primary" size="sm" @click="confirming = true">Finish</UiButton>
      </header>

      <div class="exam">
        <div class="exam__progress"><i :style="{ width: `${(answeredCount / questions.length) * 100}%` }" /></div>

        <aside v-if="inCase && data.caseStudy" class="casebox">
          <p class="casebox__kicker">Case study · {{ data.caseStudy.title }}</p>
          <p>{{ data.caseStudy.scenario }}</p>
        </aside>

        <Transition name="slide" mode="out-in">
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
        </Transition>

        <div class="exam__foot">
          <UiButton variant="ghost" :disabled="index === 0" @click="go(index - 1)">Previous</UiButton>
          <button type="button" class="flagbtn" :class="{ on: flagged.includes(current.id) }" :aria-pressed="flagged.includes(current.id)" @click="toggleFlag(current.id)">
            <AppIcon name="flag" :size="16" /> {{ flagged.includes(current.id) ? 'Flagged' : 'Flag' }}
          </button>
          <UiButton v-if="index < questions.length - 1" variant="primary" @click="go(index + 1)">Next</UiButton>
          <UiButton v-else variant="primary" @click="confirming = true">Review & finish</UiButton>
        </div>
      </div>

      <!-- Navigator -->
      <UiModal v-model:open="navOpen" title="Questions">
        <div class="grid">
          <button
            v-for="(q, i) in questions"
            :key="q.id"
            type="button"
            :class="{ done: answers[q.id]?.length === q.pick, flag: flagged.includes(q.id), now: i === index, case: data.caseStudy?.ids.includes(q.id) }"
            @click="go(i)"
          >{{ i + 1 }}</button>
        </div>
        <p class="legend"><span><i class="done" /> Answered</span><span><i class="flag" /> Flagged</span><span><i class="case" /> Case study</span></p>
      </UiModal>

      <!-- Finish confirmation -->
      <UiModal v-model:open="confirming">
        <div class="confirm">
          <h2>Finish the test?</h2>
          <p>{{ answeredCount }} of {{ questions.length }} answered<template v-if="flagged.length"> · {{ flagged.length }} flagged</template>.</p>
          <UiAlert v-if="answeredCount < questions.length" variant="info">Unanswered questions count as wrong.</UiAlert>
          <div class="confirm__actions">
            <UiButton variant="ghost" @click="confirming = false">Keep going</UiButton>
            <UiButton variant="primary" :loading="finishing" @click="finish()">Finish & mark</UiButton>
          </div>
        </div>
      </UiModal>
    </template>

    <!-- ===================== Result ===================== -->
    <div v-else-if="data?.result" class="result">
      <BackButton fallback="/learn/mock" label="Mock tests" class="result__back" />
      <section class="verdict" :class="data.result.passed ? 'pass' : 'fail'">
        <div class="verdict__glow" aria-hidden="true" />
        <p class="verdict__kicker">{{ data.result.passed ? 'Pass' : 'Not this time' }}</p>
        <div class="verdict__score"><strong>{{ data.result.score }}</strong><span>/ {{ data.result.total }}</span></div>
        <p>{{ data.result.passed ? `You beat the pass mark of ${data.pass}. Do it again on the day.` : `You needed ${data.pass}. ${data.pass - data.result.score} more correct and you’d have passed.` }}</p>
        <p class="verdict__time">Time taken: {{ mins(data.result.seconds) }}</p>
        <div class="verdict__actions">
          <NuxtLink to="/learn/mock" class="btn btn--primary">Try another</NuxtLink>
          <NuxtLink to="/learn/practice?mode=mistakes" class="btn btn--ghost-dark">Practise mistakes</NuxtLink>
        </div>
      </section>

      <section class="breakdown">
        <h2>By topic</h2>
        <div v-for="b in data.result.breakdown" :key="b.topic" class="bd">
          <span>{{ b.topic }}</span>
          <UiBar :value="(b.correct / b.total) * 100" :height="8" :color="b.correct / b.total >= 0.86 ? 'var(--go)' : 'var(--stop)'" />
          <b>{{ b.correct }}/{{ b.total }}</b>
        </div>
      </section>

      <section class="review">
        <div class="review__head">
          <h2>Review</h2>
          <UiPills
            v-model="filter"
            label="Show"
            :options="[{ value: 'wrong', label: 'Wrong' }, { value: 'flagged', label: 'Flagged' }, { value: 'all', label: 'All' }]"
          />
        </div>
        <p v-if="!reviewList.length" class="muted">Nothing to show here.</p>
        <div v-for="q in reviewList" :key="q.id" class="card">
          <LearnQuestionCard
            :question="q"
            :signs="data.signs"
            mode="exam"
            :number="`Question ${questions.indexOf(q) + 1}`"
            :selected="answers[q.id] ?? []"
            :review="reviewById.get(q.id) ?? null"
          />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.mock { min-height: 100dvh; background: var(--paper); }
.exam-bar { position: sticky; top: 8px; z-index: 30; display: flex; align-items: center; gap: 10px; margin: 8px; padding: 8px 10px; border-radius: 22px; color: var(--ink); }
.exam-bar__nav { display: inline-flex; gap: 6px; align-items: center; height: 34px; padding: 0 12px; border: 0; border-radius: 980px; background: rgb(127 127 127 / 0.12); color: var(--ink); font-weight: 500; }
.exam-bar__clock { display: inline-flex; gap: 6px; align-items: center; margin-left: auto; font-variant-numeric: tabular-nums; font-weight: 600; }
.exam-bar__clock.low { color: var(--stop-text); animation: blink 1s steps(2) infinite; }
@keyframes blink { 50% { opacity: 0.55; } }
.exam-bar__saved { font-size: 0.75rem; color: var(--muted); }
@media (max-width: 520px) { .exam-bar__saved { display: none; } }
.exam { display: grid; gap: 16px; max-width: 760px; margin: 0 auto; padding: 16px var(--gutter) 40px; }
.exam__progress { height: 4px; border-radius: 2px; background: rgb(127 127 127 / 0.18); overflow: hidden; }
.exam__progress i { display: block; height: 100%; background: var(--accent); transition: width 0.4s var(--ease); }
.casebox { padding: 18px 20px; border-radius: 20px; background: var(--accent-soft); color: var(--ink); }
.casebox__kicker { margin-bottom: 6px; font-size: 0.8125rem; font-weight: 600; color: var(--accent); }
.card { padding: 24px; border-radius: var(--radius-xl); background: var(--card); box-shadow: var(--shadow-lg); }
@media (min-width: 640px) { .card { padding: 32px; } }
.exam__foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.flagbtn { display: inline-flex; gap: 6px; align-items: center; height: 40px; padding: 0 16px; border: 0; border-radius: 980px; background: rgb(127 127 127 / 0.12); color: var(--ink); font-weight: 500; transition: all 0.3s var(--spring); }
.flagbtn.on { background: var(--warn-soft); color: var(--warn-text); transform: scale(1.04); }
.flagbtn.on :deep(path) { fill: currentColor; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); gap: 6px; }
.grid button { position: relative; height: 44px; border: 0; border-radius: 12px; background: rgb(127 127 127 / 0.12); color: var(--ink); font-weight: 600; font-variant-numeric: tabular-nums; }
.grid button.done { background: var(--accent); color: #fff; }
.grid button.case { box-shadow: inset 0 -3px 0 #5e5ce6; }
.grid button.flag::after { content: ''; position: absolute; top: 4px; right: 4px; width: 8px; height: 8px; border-radius: 50%; background: var(--warn); }
.grid button.now { outline: 2px solid var(--ink); outline-offset: 1px; }
.legend { display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: center; margin-top: 14px; font-size: 0.8125rem; color: var(--muted); }
.legend span { display: inline-flex; gap: 6px; align-items: center; }
.legend i { display: inline-block; width: 12px; height: 12px; border-radius: 4px; }
.legend i.done { background: var(--accent); }
.legend i.flag { background: var(--warn); border-radius: 50%; }
.legend i.case { background: #5e5ce6; }
.confirm { display: grid; gap: 12px; }
.confirm h2 { font-size: 1.75rem; }
.confirm p { color: var(--muted); }
.confirm__actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px; }

.result { display: grid; gap: 20px; max-width: 860px; margin: 0 auto; padding: 16px var(--gutter) 64px; }
.result__back { justify-self: start; }
.verdict { position: relative; overflow: hidden; display: grid; gap: 10px; padding: 34px; border-radius: var(--radius-xl); background: #000; color: #f5f5f7; isolation: isolate; }
.verdict__glow { position: absolute; z-index: -1; right: -120px; top: -160px; width: 560px; height: 560px; border-radius: 50%; background: radial-gradient(closest-side, rgb(48 209 88 / 0.4), transparent); }
.fail .verdict__glow { background: radial-gradient(closest-side, rgb(255 55 95 / 0.35), transparent); }
.verdict__kicker { font-weight: 600; color: #30d158; }
.fail .verdict__kicker { color: #ff6961; }
.verdict__score { display: flex; align-items: baseline; gap: 10px; }
.verdict__score strong { font-family: var(--font-display); font-size: 6rem; line-height: 1; letter-spacing: -0.05em; }
.verdict__score span { font-size: 1.75rem; color: var(--muted-dark); }
.verdict p { color: var(--muted-dark); max-width: 520px; }
.verdict__time { font-size: 0.875rem; }
.verdict__actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }
.breakdown { display: grid; gap: 10px; padding: 24px; border-radius: var(--radius-lg); background: var(--card); box-shadow: var(--shadow); color: var(--ink); }
.breakdown h2, .review h2 { font-size: 1.375rem; }
.bd { display: grid; grid-template-columns: 1fr 120px 48px; gap: 12px; align-items: center; font-size: 0.9375rem; }
.bd b { text-align: right; font-weight: 600; }
.review { display: grid; gap: 14px; color: var(--ink); }
.review__head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
.muted { color: var(--muted); }
.slide-enter-active, .slide-leave-active { transition: opacity 0.25s, transform 0.4s var(--ease); }
.slide-enter-from { opacity: 0; transform: translateX(24px); }
.slide-leave-to { opacity: 0; transform: translateX(-24px); }
</style>

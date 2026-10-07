<script setup lang="ts">
import type { AnswerResult, QuestionDto, SignDto } from '#shared/types/learn'

/*
 * One theory question.
 *  - mode "instant": the learner commits, the server checks it and returns the explanation (practice, lessons)
 *  - mode "exam": just records a selection (mock test) — no feedback
 *  - review: show a known result (mock review)
 */
const props = withDefaults(
  defineProps<{
    question: QuestionDto
    signs: Record<string, SignDto>
    mode?: 'instant' | 'exam'
    context?: 'practice' | 'lesson'
    review?: { correctIds: string[]; explanation: string } | null
    saved?: boolean
    number?: string
  }>(),
  { mode: 'instant', context: 'practice', review: null, saved: false, number: '' }
)
const selected = defineModel<string[]>('selected', { default: () => [] })
const emit = defineEmits<{ answered: [AnswerResult]; 'toggle-save': [boolean] }>()

const result = ref<AnswerResult | null>(null)
const checking = ref(false)
const error = ref<string>()
const multi = computed(() => props.question.pick > 1)
const shown = computed(() => props.review ?? result.value)
const locked = computed(() => !!shown.value || checking.value)

function toggle(id: string) {
  if (locked.value) return
  if (!multi.value) {
    selected.value = [id]
    if (props.mode === 'instant') check()
    return
  }
  const set = new Set(selected.value)
  if (set.has(id)) set.delete(id)
  else if (set.size < props.question.pick) set.add(id)
  selected.value = [...set]
}

async function check() {
  if (props.mode !== 'instant' || selected.value.length !== props.question.pick) return
  checking.value = true
  error.value = undefined
  try {
    result.value = await $fetch<AnswerResult>('/api/learn/answer', {
      method: 'POST',
      body: { questionId: props.question.id, selected: selected.value, mode: props.context }
    })
    emit('answered', result.value)
  } catch (e) {
    error.value = apiErrorsOf(e).form
  } finally {
    checking.value = false
  }
}

const state = (id: string) => {
  if (!shown.value) return selected.value.includes(id) ? 'picked' : ''
  if (shown.value.correctIds.includes(id)) return 'right'
  if (selected.value.includes(id)) return 'wrong'
  return 'dim'
}
const isCorrect = computed(() => {
  const s = shown.value
  return !!s && s.correctIds.length === selected.value.length && s.correctIds.every((c) => selected.value.includes(c))
})
const imageAnswers = computed(() => props.question.options.every((o) => o.sign))
</script>

<template>
  <article class="qc">
    <header class="qc__head">
      <span v-if="number" class="qc__num">{{ number }}</span>
      <span v-if="multi" class="qc__pick">Mark {{ question.pick === 2 ? 'two' : question.pick }} answers</span>
      <button
        v-if="mode === 'instant'"
        type="button"
        class="qc__save"
        :class="{ 'is-on': saved }"
        :aria-pressed="saved"
        :aria-label="saved ? 'Remove from saved' : 'Save question'"
        @click="emit('toggle-save', !saved)"
      >
        <AppIcon name="bookmark" :size="18" />
      </button>
    </header>

    <h3 class="qc__prompt">{{ question.prompt }}</h3>
    <div v-if="question.media?.code && signs[question.media.code]" class="qc__media">
      <LearnSignGraphic :spec="signs[question.media.code]!.spec" :label="signs[question.media.code]!.name" :size="128" />
    </div>

    <div class="qc__options" :class="{ 'qc__options--grid': imageAnswers }" role="group" :aria-label="question.prompt">
      <button
        v-for="(o, i) in question.options"
        :key="o.id"
        type="button"
        class="opt"
        :class="[`opt--${state(o.id)}`, { 'opt--sign': o.sign }]"
        :aria-pressed="selected.includes(o.id)"
        :disabled="locked"
        @click="toggle(o.id)"
      >
        <span class="opt__radio" :class="{ 'opt__radio--box': multi }" aria-hidden="true" />
        <LearnSignGraphic v-if="o.sign && signs[o.sign]" :spec="signs[o.sign]!.spec" :label="signs[o.sign]!.name" :size="84" />
        <span v-else class="opt__text"><b class="sr-only">{{ 'ABCD'[i] }}. </b>{{ o.text }}</span>
      </button>
    </div>

    <UiButton
      v-if="mode === 'instant' && multi && !shown"
      variant="primary"
      :disabled="selected.length !== question.pick"
      :loading="checking"
      @click="check"
    >
      Check answer
    </UiButton>
    <UiAlert v-if="error">{{ error }}</UiAlert>

    <Transition name="explain">
      <div v-if="shown" class="qc__explain" :class="isCorrect ? 'is-right' : 'is-wrong'">
        <p class="qc__verdict">{{ isCorrect ? 'Correct' : selected.length ? 'Not quite' : 'Not answered' }}</p>
        <p>{{ shown.explanation }}</p>
        <NuxtLink v-if="result?.lesson && context === 'practice'" :to="`/learn/lessons/${result.lesson.slug}`" class="chevron-link">
          Lesson: {{ result.lesson.title }}
        </NuxtLink>
      </div>
    </Transition>
  </article>
</template>

<style scoped>
.qc { display: grid; gap: 16px; }
.qc__head { display: flex; align-items: center; gap: 10px; min-height: 28px; }
.qc__num { font-size: 0.8125rem; font-weight: 600; color: var(--muted); }
.qc__pick { padding: 3px 10px; border-radius: 980px; background: var(--warn-soft); color: var(--warn-text); font-size: 0.8125rem; font-weight: 600; }
.qc__save { margin-left: auto; display: grid; place-items: center; width: 36px; height: 36px; border: 0; border-radius: 50%; background: rgb(127 127 127 / 0.1); color: var(--muted); transition: color 0.2s, background-color 0.2s, transform 0.3s var(--spring); }
.qc__save:active { transform: scale(0.85); }
.qc__save.is-on { color: var(--accent); background: var(--accent-soft); }
.qc__save.is-on :deep(path) { fill: currentColor; }
.qc__prompt { font-size: clamp(1.3125rem, 3vw, 1.625rem); line-height: 1.22; color: var(--ink); }
.qc__media { display: grid; place-items: center; padding: 16px; border-radius: 18px; background: var(--card-2); }

.qc__options { display: grid; border-radius: 16px; overflow: hidden; background: var(--card-2); }
.qc__options--grid { grid-template-columns: repeat(2, 1fr); gap: 1px; background: var(--line-soft); }
.opt {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 58px;
  padding: 14px 16px;
  border: 0;
  border-bottom: 1px solid var(--line-soft);
  background: var(--card-2);
  color: var(--ink);
  font-size: 1.0625rem;
  text-align: left;
  transition: background-color 0.25s, opacity 0.25s;
}
.opt:last-child { border-bottom: 0; }
.opt:not(:disabled):hover { background: color-mix(in srgb, var(--card-2) 88%, var(--ink)); }
.opt:disabled { cursor: default; }
.opt--sign { flex-direction: column; justify-content: center; padding: 18px 12px 14px; border-bottom: 0; }
.opt--sign .opt__radio { position: absolute; top: 10px; left: 10px; }
.opt__radio {
  flex: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1.5px var(--line);
  transition: box-shadow 0.4s var(--spring), background-color 0.2s;
}
.opt__radio--box { border-radius: 7px; }
.opt--picked { background: var(--accent-soft); }
.opt--picked .opt__radio { box-shadow: inset 0 0 0 7px var(--accent); }
.opt--right { background: var(--go-soft); }
.opt--right .opt__radio { box-shadow: inset 0 0 0 7px var(--go); }
.opt--wrong { background: var(--stop-soft); animation: shake 0.4s; }
.opt--wrong .opt__radio { box-shadow: inset 0 0 0 7px var(--stop); }
.opt--dim { opacity: 0.45; }
@keyframes shake { 25% { transform: translateX(-5px); } 50% { transform: translateX(4px); } 75% { transform: translateX(-2px); } }

.qc__explain { display: grid; gap: 8px; padding: 16px 18px; border-radius: 16px; font-size: 0.9875rem; color: var(--ink); }
.qc__explain.is-right { background: var(--go-soft); }
.qc__explain.is-wrong { background: var(--stop-soft); }
.qc__verdict { font-weight: 700; }
.is-right .qc__verdict { color: var(--go-text); }
.is-wrong .qc__verdict { color: var(--stop-text); }
.explain-enter-active { transition: opacity 0.3s, transform 0.5s var(--spring); }
.explain-enter-from { opacity: 0; transform: translateY(8px) scale(0.98); }
</style>

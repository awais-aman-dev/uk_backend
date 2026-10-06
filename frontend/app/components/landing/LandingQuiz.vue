<script setup lang="ts">
interface Question {
  q: string
  options: string[]
  answer: number
  why: string
}

const questions: Question[] = [
  {
    q: "What's the national speed limit for cars on a motorway?",
    options: ['60 mph', '70 mph', '80 mph'],
    answer: 1,
    why: 'Unless signs say otherwise, cars and motorcycles can do up to 70 mph on motorways and dual carriageways.'
  },
  {
    q: 'What is the minimum legal tread depth for car tyres?',
    options: ['1 mm', '1.6 mm', '2.5 mm'],
    answer: 1,
    why: 'At least 1.6 mm across the central three-quarters of the tread, all the way round the tyre.'
  },
  {
    q: "What's the typical overall stopping distance at 30 mph on a dry road?",
    options: ['12 metres', '23 metres', '36 metres'],
    answer: 1,
    why: '9 m thinking + 14 m braking = 23 m — about six car lengths. It doubles quickly as speed rises.'
  },
  {
    q: 'The amber light is flashing at a pelican crossing. What must you do?',
    options: ['Stop and wait for green', 'Give way to anyone still crossing', 'Speed up to clear the crossing'],
    answer: 1,
    why: 'Flashing amber means pedestrians already on the crossing have priority. Go only when it is clear.'
  },
  {
    q: 'In a built-up area, when must you NOT use your horn?',
    options: ['11.30 pm to 7 am', '10 pm to 6 am', 'Midnight to 8 am'],
    answer: 0,
    why: "Don't sound your horn while driving in a built-up area between 11.30 pm and 7 am — unless another road user poses a danger."
  }
]

const index = ref(0)
const picked = ref<number | null>(null)
const results = ref<boolean[]>([])
const done = computed(() => results.value.length === questions.length)
const score = computed(() => results.value.filter(Boolean).length)
const current = computed(() => questions[index.value]!)

const pick = (i: number) => {
  if (picked.value !== null) return
  picked.value = i
  results.value.push(i === current.value.answer)
}
const next = () => {
  picked.value = null
  if (index.value < questions.length - 1) index.value++
}
const restart = () => {
  index.value = 0
  picked.value = null
  results.value = []
}

const verdict = computed(() => {
  if (score.value === 5) return 'Perfect score. You might be closer to passing than you think.'
  if (score.value >= 3) return 'Not bad! A few weeks with 1Theory and you’ll be test-ready.'
  return "That's exactly why the theory test catches people out. We'll fix that, fast."
})
</script>

<template>
  <section id="quiz" class="section quiz">
    <div class="container quiz__grid">
      <div v-reveal class="section-head">
        <p class="eyebrow">Try it now</p>
        <h2>See how <span class="mark">easy</span> it feels.</h2>
        <p>Five real-style questions. Tap an answer — you’ll see why it’s right straight away.</p>
      </div>

      <div v-reveal="120" class="quiz__card" aria-live="polite">
        <div class="quiz__progress" aria-hidden="true">
          <span
            v-for="(_, i) in questions"
            :key="i"
            :class="{
              'is-right': results[i] === true,
              'is-wrong': results[i] === false,
              'is-current': i === index && !done
            }"
          />
        </div>

        <Transition name="slide" mode="out-in">
          <div v-if="!done" :key="index" class="quiz__q">
            <p class="quiz__count">Question {{ index + 1 }} of {{ questions.length }}</p>
            <h3>{{ current.q }}</h3>

            <div class="quiz__options" role="group" :aria-label="current.q">
              <button
                v-for="(opt, i) in current.options"
                :key="opt"
                type="button"
                class="option"
                :class="{
                  'is-right': picked !== null && i === current.answer,
                  'is-wrong': picked === i && i !== current.answer,
                  'is-dim': picked !== null && i !== current.answer && picked !== i
                }"
                :disabled="picked !== null"
                @click="pick(i)"
              >
                <span class="option__key">{{ 'ABC'[i] }}</span>
                <span>{{ opt }}</span>
                <span v-if="picked !== null && i === current.answer" class="option__mark" aria-hidden="true">✓</span>
                <span v-else-if="picked === i" class="option__mark" aria-hidden="true">✕</span>
              </button>
            </div>

            <Transition name="pop">
              <div v-if="picked !== null" class="explain" :class="picked === current.answer ? 'explain--go' : 'explain--stop'">
                <p>
                  <strong>{{ picked === current.answer ? 'Correct!' : 'Not quite.' }}</strong>
                  {{ current.why }}
                </p>
                <button type="button" class="btn btn--sm" @click="next">
                  {{ index < questions.length - 1 ? 'Next question' : 'See my score' }}
                  <span class="arrow" aria-hidden="true">→</span>
                </button>
              </div>
            </Transition>
          </div>

          <div v-else class="quiz__result">
            <p class="quiz__count">Your score</p>
            <div class="quiz__score"><strong>{{ score }}</strong>/5</div>
            <p class="quiz__verdict">{{ verdict }}</p>
            <div class="quiz__actions">
              <NuxtLink to="/#pricing" class="btn btn--primary btn--lg">
                Get full access <span class="arrow" aria-hidden="true">→</span>
              </NuxtLink>
              <button type="button" class="btn btn--ghost" @click="restart">Try again</button>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </section>
</template>

<style scoped>
.quiz { background: var(--paper); }
.quiz__grid { display: grid; gap: 8px; align-items: start; }

.quiz__card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 470px;
  padding: 24px;
  border-radius: var(--radius-xl);
  background: var(--card);
  box-shadow: var(--shadow-lg);
}
.quiz__progress { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-bottom: 24px; }
.quiz__progress span { height: 4px; border-radius: 2px; background: #e5e5ea; transition: background-color 0.4s; }
.quiz__progress .is-current { background: var(--ink); }
.quiz__progress .is-right { background: var(--go); }
.quiz__progress .is-wrong { background: var(--stop); }

.quiz__count { font-size: 0.8125rem; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.02em; }
.quiz__q h3 { margin-top: 8px; font-size: clamp(1.375rem, 3.2vw, 1.75rem); line-height: 1.18; }

/* iOS grouped list */
.quiz__options {
  display: grid;
  margin-top: 24px;
  border-radius: 16px;
  overflow: hidden;
  background: var(--paper);
  box-shadow: inset 0 0 0 1px var(--line-soft);
}
.option {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 58px;
  padding: 12px 16px;
  border: 0;
  border-bottom: 1px solid var(--line-soft);
  background: transparent;
  text-align: left;
  font-size: 1.0625rem;
  transition: background-color 0.3s, opacity 0.3s;
}
.option:last-child { border-bottom: 0; }
.option:not(:disabled):hover { background: rgb(0 0 0 / 0.035); }
.option:disabled { cursor: default; }
.option__key {
  flex: none;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1.5px #c7c7cc;
  color: transparent;
  font-size: 0;
  transition: box-shadow 0.45s var(--spring), background-color 0.3s;
}
.option__mark { margin-left: auto; font-weight: 600; }
.option.is-right { background: var(--go-soft); }
.option.is-right .option__key { box-shadow: inset 0 0 0 8px var(--go); }
.option.is-right .option__mark { color: var(--go-text); }
.option.is-wrong { background: var(--stop-soft); animation: shake 0.4s; }
.option.is-wrong .option__key { box-shadow: inset 0 0 0 8px var(--stop); }
.option.is-wrong .option__mark { color: var(--stop-text); }
.option.is-dim { opacity: 0.4; }
@keyframes shake {
  25% { transform: translateX(-5px); }
  50% { transform: translateX(4px); }
  75% { transform: translateX(-2px); }
}

.explain { display: grid; gap: 14px; margin-top: 16px; padding: 16px 18px; border-radius: 16px; font-size: 0.9375rem; }
.explain--go { background: var(--go-soft); }
.explain--stop { background: var(--stop-soft); }
.explain .btn { justify-self: start; }

.quiz__result { margin-block: auto; text-align: center; }
.quiz__score { font-family: var(--font-display); font-size: 2rem; font-weight: 600; color: var(--muted); }
.quiz__score strong { font-size: 6.5rem; line-height: 1; letter-spacing: -0.05em; background: var(--gradient); -webkit-background-clip: text; background-clip: text; color: transparent; }
.quiz__verdict { max-width: 380px; margin: 12px auto 28px; font-size: 1.1875rem; color: var(--muted); }
.quiz__actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }

.slide-enter-active, .slide-leave-active { transition: opacity 0.35s var(--ease), transform 0.45s var(--ease), filter 0.35s; }
.slide-enter-from { opacity: 0; transform: translateX(28px); filter: blur(4px); }
.slide-leave-to { opacity: 0; transform: translateX(-28px); filter: blur(4px); }
.pop-enter-active { transition: opacity 0.3s, transform 0.5s var(--spring); }
.pop-enter-from { opacity: 0; transform: translateY(10px) scale(0.97); }

@media (min-width: 900px) {
  .quiz__grid { grid-template-columns: 1fr 1.15fr; gap: 72px; }
  .quiz__grid .section-head { position: sticky; top: calc(var(--header-h) + 48px); }
  .quiz__card { padding: 36px; }
}
</style>

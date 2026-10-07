<script setup lang="ts">
// Three steps beside a sticky traffic light that follows the UK sequence as you scroll:
// red (stop and choose) → red + amber (get ready) → green (go). Switched by useLandingMotion.
const steps = [
  { light: 'red', cue: 'Stop', title: 'Pick your access', text: 'Weekly, monthly or 3 months. One payment, no auto-renewal.' },
  { light: 'red-amber', cue: 'Get ready', title: 'Learn in short bursts', text: 'Watch a one-minute lesson, then answer a few questions on it.' },
  { light: 'green', cue: 'Go', title: 'Walk in ready', text: "When your readiness hits 90%, you're ready to book — and pass." }
] as const
</script>

<template>
  <section class="section steps">
    <div class="container">
      <div v-reveal class="section-head section-head--center">
        <p class="eyebrow">How it works</p>
        <h2>We've made it simple.</h2>
      </div>

      <div class="steps__grid">
        <div class="steps__signal">
          <LandingTrafficLight class="steps__light" state="red" :pole="false" />
          <p class="steps__cue" aria-hidden="true">
            <span v-for="(s, i) in steps" :key="s.cue" :class="{ 'is-on': i === 0 }" :data-cue="i">{{ s.cue }}</span>
          </p>
        </div>

        <ol class="steps__list">
          <li class="steps__lane" role="presentation" aria-hidden="true"><i /></li>
          <li v-for="(s, i) in steps" :key="s.title" class="step" :class="{ 'is-active': i === 0 }" :data-light="s.light">
            <span class="step__dot" aria-hidden="true" />
            <p class="step__cue">{{ i + 1 }} · {{ s.cue }}</p>
            <h3>{{ s.title }}</h3>
            <p>{{ s.text }}</p>
          </li>
        </ol>
      </div>

      <div v-reveal class="steps__cta">
        <NuxtLink to="/#pricing" class="btn btn--primary btn--lg">Choose your access</NuxtLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.steps { background: linear-gradient(#f6f4ee, #fff); }
.steps__grid { display: grid; grid-template-columns: 54px 1fr; gap: 18px; max-width: 900px; margin-inline: auto; }

.steps__signal { position: relative; }
.steps__light { position: sticky; top: calc(var(--header-h) + 40px); width: 46px; }
.steps__cue { display: none; }

.steps__list { position: relative; list-style: none; margin: 0; padding: 0 0 0 30px; display: grid; gap: 18px; }
/* a dashed lane running past the steps, drawn as you scroll */
.steps__lane { position: absolute; left: 8px; top: 18px; bottom: 18px; width: 6px; border-radius: 3px; background: #e6e2d8; }
.steps__lane i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: repeating-linear-gradient(#5d646f 0 18px, transparent 18px 30px);
  transform-origin: 50% 0;
}

.step {
  --c: #c9cfd6;
  position: relative;
  display: grid;
  gap: 6px;
  padding: 26px 26px 28px;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 1px 0 rgb(38 48 59 / 0.04), 0 18px 40px -28px rgb(38 64 99 / 0.3);
  opacity: 0.55;
  transition: opacity 0.5s var(--ease), transform 0.5s var(--ease), box-shadow 0.5s var(--ease);
}
.step[data-light='red'] { --c: #e47c72; }
.step[data-light='red-amber'] { --c: #efc066; }
.step[data-light='green'] { --c: #6cc490; }
.step.is-active { opacity: 1; box-shadow: 0 0 0 2px var(--c), 0 24px 50px -28px rgb(38 64 99 / 0.4); }
.step__dot {
  position: absolute;
  left: -28px; /* centred on the lane: list padding 30 − lane centre 11 + half the dot 9 */
  top: 30px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: inset 0 0 0 4px #c9cfd6;
  transition: box-shadow 0.4s var(--ease);
}
.step.is-active .step__dot { box-shadow: inset 0 0 0 9px var(--c), 0 0 12px var(--c); }
.step__cue { font-size: 0.8125rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); }
.step.is-active .step__cue { color: var(--road-ink); }
.step h3 { font-size: 1.5rem; }
.step p:last-child { color: var(--muted); }

.steps__cta { display: flex; justify-content: center; margin-top: 48px; }

@media (min-width: 768px) {
  .steps__grid { grid-template-columns: 180px 1fr; gap: 40px; }
  .steps__light { width: 78px; margin-inline: auto; }
  .steps__cue {
    position: sticky;
    top: calc(var(--header-h) + 196px);
    display: grid;
    justify-items: center;
    margin-top: 18px;
    height: 28px;
  }
  .steps__cue span {
    grid-area: 1 / 1;
    font-family: var(--font-display);
    font-size: 1.375rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 0.4s var(--ease), transform 0.4s var(--ease);
  }
  .steps__cue span.is-on { opacity: 1; transform: none; }
  .step { padding: 32px 34px 34px; }
}
@media (prefers-reduced-motion: reduce) {
  .step { transition: none; }
}
</style>

<script setup lang="ts">
const steps = [
  { n: '1', icon: 'pound', title: 'Pick your access', text: 'Weekly, monthly or 3 months. One payment, no auto-renewal.' },
  { n: '2', icon: 'clock', title: 'Learn in short bursts', text: 'Watch a one-minute lesson, then answer a few questions on it.' },
  { n: '3', icon: 'check', title: 'Walk in ready', text: "When your readiness hits 90%, you're ready to book — and pass." }
] as const
</script>

<template>
  <section class="section section--white steps">
    <div class="container">
      <div v-reveal class="section-head section-head--center">
        <p class="eyebrow">How it works</p>
        <h2>We've made it simple.</h2>
      </div>

      <ol class="steps__list">
        <li class="steps__line" role="presentation" aria-hidden="true"><i /></li>
        <li v-for="(s, i) in steps" :key="s.n" v-reveal="i * 140" class="step">
          <span class="step__n">{{ s.n }}</span>
          <span class="step__icon"><AppIcon :name="s.icon" :size="26" /></span>
          <h3>{{ s.title }}</h3>
          <p>{{ s.text }}</p>
        </li>
      </ol>

      <div v-reveal class="steps__cta">
        <NuxtLink to="/#pricing" class="btn btn--primary btn--lg">Choose your access</NuxtLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.steps__list {
  position: relative;
  list-style: none;
  margin: 0 auto;
  padding: 0;
  max-width: 980px;
  display: grid;
  gap: 12px;
}
.step {
  position: relative;
  display: grid;
  gap: 8px;
  padding: 32px 28px;
  border-radius: var(--radius-lg);
  background: var(--paper);
  overflow: hidden;
}
.step__n {
  position: absolute;
  right: 18px;
  top: -14px;
  font-family: var(--font-display);
  font-size: 8rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.06em;
  background: linear-gradient(180deg, rgb(0 0 0 / 0.07), transparent 80%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.step__icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  border-radius: 14px;
  background: var(--card);
  color: var(--accent);
  box-shadow: var(--shadow);
}
.step h3 { font-size: 1.5rem; }
.step p { color: var(--muted); }
.steps__cta { display: flex; justify-content: center; margin-top: 48px; }
/* The connecting line (drawn on scroll by useLandingMotion; fully drawn without JS) — desktop only */
.steps__line { display: none; }
@media (min-width: 768px) {
  .steps__list { grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .steps__list { margin-top: 28px; }
  .steps__line { display: block; position: absolute; left: 0; right: 0; top: -22px; height: 4px; border-radius: 2px; background: rgb(0 0 0 / 0.06); pointer-events: none; }
  .steps__line i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--accent), #a259ff 55%, #ff6482); transform-origin: 0 50%; }
}
</style>

<script setup lang="ts">
const reviews = [
  { name: 'Amara', meta: '17 · Leeds', score: '49/50', c: 'linear-gradient(135deg,#ff9f0a,#ff375f)', text: 'Did 10 minutes on the bus every day. Walked in, passed first time. The hazard clips are basically the real test.' },
  { name: 'Callum', meta: '19 · Glasgow', score: '47/50', c: 'linear-gradient(135deg,#64d2ff,#0a84ff)', text: 'Failed once with another app. The explanations here actually made stopping distances click.' },
  { name: 'Priya', meta: '22 · Leicester', score: '50/50', c: 'linear-gradient(135deg,#30d158,#00c7be)', text: 'The readiness score told me when to book. Hit 93%, booked for Friday, got 50 out of 50.' },
  { name: 'Josh', meta: '18 · Bristol', score: '45/50', c: 'linear-gradient(135deg,#ffd60a,#ff9f0a)', text: 'Weekly plan the week before my test. Cramming but make it organised. Worth the fiver.' },
  { name: 'Ellie', meta: '24 · Cardiff', score: '48/50', c: 'linear-gradient(135deg,#bf5af2,#5e5ce6)', text: 'I hate studying, but the videos are so short I kept doing “just one more”.' },
  { name: 'Tomasz', meta: '21 · Manchester', score: '46/50', c: 'linear-gradient(135deg,#66d4cf,#30b0c7)', text: 'English is my second language — the plain-English lessons helped me a lot. Passed first try.' }
]
</script>

<template>
  <section class="section testimonials">
    <div class="container">
      <div v-reveal class="section-head section-head--center">
        <p class="eyebrow">Learners</p>
        <h2>Passed with 1Theory.</h2>
        <p>Real-feeling stories from learners across the UK.</p>
      </div>
    </div>

    <div class="marquee" aria-label="Learner reviews">
      <ul class="marquee__track">
        <!-- Rendered twice for a seamless loop; the copy is hidden from assistive tech -->
        <li
          v-for="(r, i) in [...reviews, ...reviews]"
          :key="i"
          class="review"
          :aria-hidden="i >= reviews.length"
        >
          <div class="review__top">
            <span class="review__avatar" :style="{ background: r.c }">{{ r.name[0] }}</span>
            <div>
              <strong>{{ r.name }}</strong>
              <small>{{ r.meta }}</small>
            </div>
            <span class="review__pass">Passed first time</span>
          </div>
          <p>“{{ r.text }}”</p>
          <div class="review__score">Theory score <b>{{ r.score }}</b></div>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.testimonials { overflow: hidden; background: var(--card); }
.marquee {
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
}
.marquee__track {
  list-style: none;
  margin: 0;
  padding: 8px 0 24px;
  display: flex;
  gap: 20px;
  width: max-content;
  animation: marquee 70s linear infinite;
}
.marquee:hover .marquee__track { animation-play-state: paused; }
@keyframes marquee { to { transform: translateX(calc(-50% - 10px)); } }

.review {
  width: 340px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 28px;
  border-radius: var(--radius-lg);
  background: var(--paper);
}
.review__top { display: flex; align-items: center; gap: 12px; }
.review__top div { display: grid; line-height: 1.25; }
.review__top strong { font-weight: 600; }
.review__top small { color: var(--muted); font-size: 0.875rem; }
.review__avatar {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  color: #fff;
  font-weight: 600;
}
.review__pass { margin-left: auto; font-size: 0.8125rem; font-weight: 500; color: var(--go-text); }
.review p { flex: 1; font-size: 1.0625rem; line-height: 1.45; }
.review__score { font-size: 0.875rem; color: var(--muted); }
.review__score b { color: var(--ink); font-weight: 600; }

@media (prefers-reduced-motion: reduce) {
  .marquee { overflow-x: auto; }
  .marquee__track { animation: none; padding-inline: var(--gutter); }
}
</style>

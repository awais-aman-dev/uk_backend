<script setup lang="ts">
const faqs = [
  {
    q: 'What does the theory test include?',
    a: 'Two parts on the same day: 50 multiple-choice questions in 57 minutes (pass mark 43), then 14 hazard perception clips (pass mark 44 out of 75). 1Theory trains you for both.'
  },
  {
    q: 'Is this a subscription?',
    a: 'No. You pay once for 7, 30 or 90 days of access. Nothing renews automatically — if you need more time, you can extend from your account.'
  },
  {
    q: 'Are these the official DVSA questions?',
    a: 'No — the official question bank is licensed. Our questions are written by us in the same style and cover the same topics, with an explanation for every answer.'
  },
  {
    q: 'Which plan should I choose?',
    a: 'If your test is next week, Weekly. Most learners are ready in 3–4 weeks, so Monthly is the popular choice. If you are just starting out, 3 Months is the best value.'
  },
  {
    q: 'Can I use it on my phone?',
    a: 'Yes. 1Theory is built mobile-first and works in any modern browser on phone, tablet or laptop. Your progress syncs everywhere.'
  },
  {
    q: 'Is the payment real?',
    a: 'This is a demo project. Checkout is simulated — no card details are collected and no money is taken.'
  }
]
</script>

<template>
  <section id="faq" class="section faq">
    <div class="container faq__grid">
      <div v-reveal class="section-head">
        <p class="eyebrow">Help</p>
        <h2>Questions? Answers.</h2>
        <p>Can’t find what you need? <NuxtLink to="/contact">Get in touch</NuxtLink> — we reply within a day.</p>
      </div>
      <div class="faq__list">
        <details v-for="(f, i) in faqs" :key="f.q" v-reveal="i * 60" class="faq__item" name="faq">
          <summary>{{ f.q }}<span aria-hidden="true" /></summary>
          <p>{{ f.a }}</p>
        </details>
      </div>
    </div>
  </section>
</template>

<style scoped>
.faq { background: var(--paper); }
.faq__grid { display: grid; gap: 8px; }
.faq__list { display: grid; border-top: 1px solid var(--line); }
.faq__item { border-bottom: 1px solid var(--line); }
summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 24px 0;
  cursor: pointer;
  list-style: none;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.25rem;
  letter-spacing: -0.02em;
  line-height: 1.25;
}
summary::-webkit-details-marker { display: none; }
summary:hover { color: var(--accent); }
summary span {
  position: relative;
  flex: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgb(0 0 0 / 0.05);
  transition: transform 0.45s var(--spring), background-color 0.3s;
}
summary span::before, summary span::after {
  content: '';
  position: absolute;
  inset: 50% auto auto 50%;
  width: 11px;
  height: 1.5px;
  margin: -0.75px 0 0 -5.5px;
  border-radius: 1px;
  background: var(--ink);
}
summary span::after { transform: rotate(90deg); }
.faq__item[open] summary span { transform: rotate(45deg); background: var(--ink); }
.faq__item[open] summary span::before, .faq__item[open] summary span::after { background: #fff; }
.faq__item p { padding: 0 48px 26px 0; color: var(--muted); font-size: 1.0625rem; max-width: 640px; animation: open 0.5s var(--ease); }
@keyframes open { from { opacity: 0; transform: translateY(-6px); } }
@media (min-width: 900px) {
  .faq__grid { grid-template-columns: 1fr 1.5fr; gap: 72px; }
}
</style>

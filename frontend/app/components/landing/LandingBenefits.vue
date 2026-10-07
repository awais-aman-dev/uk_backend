<script setup lang="ts">
// Three benefits as signs by the roadside: each one swings up on its post as you scroll (useLandingMotion).
const items = [
  { sign: 'video', title: 'Original video lessons', text: 'Short, clear explainers we write and film ourselves.' },
  { sign: 'hazard', title: 'Custom-built hazard perception', text: 'Real UK roads, scored exactly like the real test.' },
  { sign: 'learner', title: 'Made to teach', text: 'Every answer explained, so you understand — not memorise.' }
] as const
</script>

<template>
  <section class="benefits" aria-label="Why 1Theory">
    <div class="container benefits__row">
      <div v-for="item in items" :key="item.title" class="post">
        <article class="board">
          <svg class="board__sign" viewBox="0 0 100 100" aria-hidden="true">
            <template v-if="item.sign === 'video'">
              <rect x="5" y="15" width="90" height="68" rx="11" fill="#5b86bd" stroke="#fff" stroke-width="3" />
              <path d="M41 33 66 49 41 65z" fill="#fff" stroke="#fff" stroke-width="3" stroke-linejoin="round" />
            </template>
            <template v-else-if="item.sign === 'hazard'">
              <path d="M50 10 93 86H7z" fill="#fff" stroke="#d9776f" stroke-width="9" stroke-linejoin="round" />
              <rect x="46" y="36" width="8" height="28" rx="4" fill="#26303b" />
              <circle cx="50" cy="73" r="5" fill="#26303b" />
            </template>
            <template v-else>
              <rect x="10" y="10" width="80" height="80" rx="9" fill="#fff" stroke="#d6dce3" stroke-width="2" />
              <path d="M37 25h13v38h22v12H37z" fill="#d9776f" />
            </template>
          </svg>
          <h3>{{ item.title }}</h3>
          <p>{{ item.text }}</p>
        </article>
        <span class="post__pole" aria-hidden="true" />
      </div>
    </div>
    <div class="benefits__lane" aria-hidden="true"><i /></div>
  </section>
</template>

<style scoped>
.benefits {
  position: relative;
  padding: 56px 0 0;
  background: linear-gradient(#f4f1e9, #f6f4ee);
  overflow: hidden;
}
.benefits__row { display: grid; gap: 28px; perspective: 1100px; }

.post { display: grid; justify-items: center; transform-style: preserve-3d; }
.board {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
  gap: 8px;
  width: 100%;
  max-width: 360px;
  padding: 28px 26px 26px;
  border-radius: 26px;
  text-align: center;
  background: linear-gradient(180deg, #fff, #fbfaf7);
  box-shadow:
    0 1px 0 #fff inset,
    0 2px 0 rgb(38 48 59 / 0.06),
    0 24px 50px -28px rgb(38 64 99 / 0.35);
  transform-origin: 50% 100%;
  transition: transform 0.5s var(--ease), box-shadow 0.5s var(--ease);
}
.board__sign { width: 74px; height: 74px; margin-bottom: 6px; filter: drop-shadow(0 8px 10px rgb(38 48 59 / 0.15)); }
.board h3 { font-size: 1.1875rem; letter-spacing: -0.02em; color: #26303b; }
.board p { max-width: 280px; font-size: 0.9375rem; color: #5d6874; }
.post__pole {
  width: 8px;
  height: 46px;
  border-radius: 0 0 3px 3px;
  background: linear-gradient(90deg, #a9b0b9, #c9cfd6 45%, #9aa1ab);
}

/* the lane at the foot of the posts; its marking is drawn by scroll */
.benefits__lane {
  position: relative;
  height: 64px;
  background: linear-gradient(#cfdfc7 0 10px, #646b76 10px);
}
.benefits__lane i {
  position: absolute;
  left: 0;
  right: 0;
  top: 33px;
  height: 6px;
  background: repeating-linear-gradient(90deg, #f3eee2 0 64px, transparent 64px 112px);
  transform-origin: left;
}

@media (hover: hover) {
  .post:hover .board { transform: translateY(-6px) rotateX(4deg); box-shadow: 0 1px 0 #fff inset, 0 34px 60px -30px rgb(38 64 99 / 0.45); }
}
@media (max-width: 767px) {
  /* stacked: only the last sign keeps its post down to the road */
  .post:not(:last-child) .post__pole { display: none; }
}
@media (min-width: 768px) {
  .benefits { padding-top: 72px; }
  .benefits__row { grid-template-columns: repeat(3, 1fr); gap: 32px; }
  .post__pole { height: 64px; }
}
</style>

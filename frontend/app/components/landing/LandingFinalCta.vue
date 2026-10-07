<script setup lang="ts">
// The last stretch: a dusk road running to the horizon. The light turns green as the section arrives
// (useLandingMotion); the lane markings flow towards you.
</script>

<template>
  <section class="final">
    <div class="final__sky" aria-hidden="true"><span class="final__sun" /></div>
    <div class="final__road" aria-hidden="true">
      <div class="final__plane"><i /></div>
    </div>
    <LandingTrafficLight class="final__lights" state="red" />

    <div class="container final__inner">
      <h2 v-reveal>Your licence <span class="mark">starts here.</span></h2>
      <p v-reveal="120">Start today for less than a coffee. Ten minutes a day is all it takes.</p>
      <div v-reveal="200" class="final__ctas">
        <NuxtLink to="/#pricing" class="btn btn--primary btn--lg">Get started — from £5</NuxtLink>
        <NuxtLink to="/#quiz" class="chevron-link">Try 5 free questions</NuxtLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.final {
  position: relative;
  overflow: hidden;
  padding: 120px 0 300px;
  background: linear-gradient(180deg, #1f2a3d 0%, #34476a 48%, #8d8aa0 74%, #e3b994 100%);
  color: #f5f3ee;
  text-align: center;
}
.final__sky { position: absolute; inset: 0; pointer-events: none; }
.final__sun {
  position: absolute;
  left: 50%;
  bottom: 170px;
  width: 520px;
  height: 260px;
  margin-left: -260px;
  border-radius: 260px 260px 0 0;
  background: radial-gradient(60% 100% at 50% 100%, rgb(255 222 170 / 0.75), rgb(255 200 150 / 0) 70%);
}

/* the road to the horizon */
.final__road { position: absolute; left: 0; right: 0; bottom: 0; height: 190px; perspective: 260px; perspective-origin: 50% 0%; pointer-events: none; }
.final__road::before { content: ''; position: absolute; inset: 0; background: linear-gradient(#9fb59a, #7f9a7c); }
.final__plane {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 420px;
  height: 900px;
  margin-left: -210px;
  transform: rotateX(78deg);
  transform-origin: 50% 100%;
  background:
    linear-gradient(90deg, transparent 0 18px, #efe9dc 18px 26px, transparent 26px calc(100% - 26px), #efe9dc calc(100% - 26px) calc(100% - 18px), transparent calc(100% - 18px)),
    linear-gradient(#4f5662, #636a75);
}
.final__plane i {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 10px;
  margin-left: -5px;
  background: repeating-linear-gradient(#f3eee2 0 60px, transparent 60px 120px);
  animation: flow 1.4s linear infinite;
}
@keyframes flow { to { background-position: 0 120px; } }

.final__lights { position: absolute; left: calc(50% + 240px); bottom: 96px; width: 44px; }

.final__inner { position: relative; display: grid; justify-items: center; gap: 20px; }
h2 { font-size: clamp(2.75rem, 8vw, 5.5rem); font-weight: 700; letter-spacing: -0.04em; max-width: 900px; }
.final .mark { color: #f3d68e; text-decoration-color: #f3eee2; }
p { font-size: clamp(1.125rem, 2vw, 1.3125rem); max-width: 520px; color: #c9d3e2; }
.final__ctas { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 16px 28px; margin-top: 12px; }
.final .chevron-link { color: #f3d68e; }

@media (max-width: 719px) {
  .final { padding-bottom: 240px; }
  .final__road { height: 150px; }
  .final__plane { width: 260px; margin-left: -130px; }
  .final__sun { width: 340px; margin-left: -170px; bottom: 130px; }
  .final__lights { left: auto; right: 10%; bottom: 70px; width: 32px; }
}
@media (prefers-reduced-motion: reduce) {
  .final__plane i { animation: none; }
}
</style>

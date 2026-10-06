<template>
  <section class="final">
    <div class="final__glow" aria-hidden="true" />
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
  padding-block: 120px;
  background: var(--black);
  color: #f5f5f7;
  text-align: center;
}
.final__glow {
  position: absolute;
  left: 50%;
  bottom: -60%;
  width: 120vmax;
  height: 80vmax;
  margin-left: -60vmax;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(162 89 255 / 0.35), rgb(41 151 255 / 0.18) 50%, transparent);
  pointer-events: none;
}
.final__inner { position: relative; display: grid; justify-items: center; gap: 20px; }
h2 { font-size: clamp(2.75rem, 8vw, 5.5rem); font-weight: 700; letter-spacing: -0.04em; max-width: 900px; }
p { font-size: clamp(1.125rem, 2vw, 1.3125rem); max-width: 520px; color: var(--muted-dark); }
.final__ctas { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 16px 28px; margin-top: 12px; }
.final .chevron-link { color: var(--accent-bright); }
</style>

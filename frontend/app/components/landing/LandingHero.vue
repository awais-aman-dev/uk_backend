<template>
  <section id="hero" class="hero">
    <div class="aurora" aria-hidden="true">
      <span class="aurora__a" /><span class="aurora__b" /><span class="aurora__c" />
    </div>

    <div class="container hero__inner">
      <p v-reveal class="hero__badge glass-dark">
        <span class="dot" /> Updated for the 2026 DVSA car theory test
      </p>
      <h1 v-reveal="80">The easy way to <span class="mark">pass</span> your theory test.</h1>
      <p v-reveal="160" class="hero__lead">
        One-minute video lessons, real hazard perception clips and questions that explain every answer.
      </p>
      <div v-reveal="240" class="hero__ctas">
        <NuxtLink to="/#pricing" class="btn btn--primary btn--lg">Get started — from £5</NuxtLink>
        <NuxtLink to="/#quiz" class="chevron-link">Try 5 free questions</NuxtLink>
      </div>

      <div v-reveal="320" class="hero__visual">
        <div class="chip chip--left glass-dark" aria-hidden="true">
          <span class="chip__ring"><span><b>43</b>/50</span></span>
          <span>to pass the<br>multiple choice</span>
        </div>
        <LandingHeroDrive />
        <div class="chip chip--right glass-dark" aria-hidden="true">
          <span class="chip__dot" />
          <span>Hazard spotted<br><b>5 points</b></span>
        </div>
      </div>

      <p v-reveal class="hero__proof">
        Rated <b>4.8</b> by 2,300+ learners · <b>91%</b> pass first time
      </p>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
  margin-top: calc(var(--header-h) * -1);
  padding: calc(var(--header-h) + 56px) 0 64px;
  background: var(--black);
  color: #f5f5f7;
  text-align: center;
}

/* Slow-moving colour fields behind the glass */
.aurora { position: absolute; inset: 0; pointer-events: none; }
.aurora span {
  position: absolute;
  width: 60vmax;
  height: 60vmax;
  border-radius: 50%;
  opacity: 0.55;
  will-change: transform;
}
.aurora__a { left: -20vmax; top: 10%; background: radial-gradient(closest-side, rgb(41 151 255 / 0.55), transparent); animation: float-a 18s ease-in-out infinite; }
.aurora__b { right: -22vmax; top: 25%; background: radial-gradient(closest-side, rgb(162 89 255 / 0.5), transparent); animation: float-b 22s ease-in-out infinite; }
.aurora__c { left: 25%; bottom: -35vmax; background: radial-gradient(closest-side, rgb(255 100 130 / 0.35), transparent); animation: float-a 26s ease-in-out infinite reverse; }
@keyframes float-a { 50% { transform: translate(8vmax, -6vmax) scale(1.1); } }
@keyframes float-b { 50% { transform: translate(-10vmax, 6vmax) scale(0.9); } }

.hero__inner { position: relative; display: grid; justify-items: center; }

.hero__badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px 7px 12px;
  border-radius: 980px;
  font-size: 0.875rem;
  color: rgb(255 255 255 / 0.85);
}
.dot { width: 7px; height: 7px; border-radius: 50%; background: var(--go); box-shadow: 0 0 10px var(--go); }

h1 {
  max-width: 900px;
  margin-top: 22px;
  font-size: clamp(2.75rem, 8.4vw, 5.5rem);
  font-weight: 700;
  line-height: 1.03;
  letter-spacing: -0.04em;
}
.hero__lead {
  max-width: 600px;
  margin-top: 20px;
  font-size: clamp(1.125rem, 2.2vw, 1.4375rem);
  line-height: 1.38;
  color: var(--muted-dark);
}
.hero__ctas {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 16px 28px;
  margin-top: 32px;
}
.hero__ctas .chevron-link { color: var(--accent-bright); font-size: 1.0625rem; }

.hero__visual {
  position: relative;
  margin-top: 56px;
  display: grid;
  place-items: center;
  width: 100%;
}

.chip {
  position: absolute;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px 12px 12px;
  border-radius: 22px;
  text-align: left;
  font-size: 0.875rem;
  line-height: 1.3;
  color: rgb(255 255 255 / 0.8);
  white-space: nowrap; /* two lines, as written — a wider pill instead of wrapped text */
  animation: bob 7s ease-in-out infinite;
}
/* the ring and the dot keep their size: as flex items they were being squeezed into ovals */
.chip__ring, .chip__dot { flex: none; }
.chip b { color: #fff; font-weight: 600; }
.chip { pointer-events: none; }
.chip--left { top: 8%; right: calc(50% + 400px); }
.chip--right { bottom: 22%; left: calc(50% + 400px); animation-delay: -3.5s; }
@media (max-width: 1199px) { .chip { display: none; } }
.chip__ring {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: conic-gradient(var(--go) 0 86%, rgb(255 255 255 / 0.12) 86%);
  font-size: 0.75rem;
  color: var(--muted-dark);
  position: relative;
}
.chip__ring::before { content: ''; position: absolute; inset: 5px; border-radius: 50%; background: #1c1c1e; }
.chip__ring > span { position: relative; }
.chip__ring b { font-size: 1rem; }
.chip__dot {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--warn) 0 6px, rgb(255 159 10 / 0.25) 7px);
  animation: ping 1.8s ease-out infinite;
}
@keyframes ping {
  0% { box-shadow: 0 0 0 0 rgb(255 159 10 / 0.5); }
  100% { box-shadow: 0 0 0 16px rgb(255 159 10 / 0); }
}
@keyframes bob { 50% { transform: translateY(-10px); } }

.hero__proof {
  margin-top: 40px;
  font-size: 0.9375rem;
  color: var(--muted-dark);
}
.hero__proof b { color: #fff; font-weight: 600; }

@media (max-width: 719px) {
  .hero { padding-top: calc(var(--header-h) + 36px); }
  .hero__ctas { flex-direction: column; gap: 14px; }
  .hero__visual { margin-top: 44px; }
  .chip { display: none; }
}
</style>

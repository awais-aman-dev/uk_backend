<script setup lang="ts">
import type { SignSpec } from '#shared/types/learn'

// Softened sign colours: still read as UK signs, without the hi-vis punch
const RED = '#d9776f'
const BLUE = '#5b86bd'

// Background signs: position (% of the hero), size (px), resting tilt and depth (parallax strength).
// `m`: shown on phones too, small, at that edge in the gap between the copy and the clip.
const signs: { spec: SignSpec; label: string; x: number; y: number; size: number; tilt: number; depth: number; m?: 'left' | 'right' }[] = [
  { spec: { shape: 'circle', fill: '#fff', border: RED, symbol: 'text', text: '30' }, label: '30 mph', x: 4, y: 14, size: 92, tilt: 7, depth: 1.2, m: 'left' },
  { spec: { shape: 'triangle', fill: '#fff', border: RED, symbol: 'signals' }, label: 'Traffic signals', x: 60, y: 9, size: 62, tilt: -6, depth: 0.6 },
  { spec: { shape: 'circle', fill: BLUE, symbol: 'mini-roundabout' }, label: 'Mini-roundabout', x: 90, y: 10, size: 78, tilt: -8, depth: 1, m: 'right' },
  { spec: { shape: 'circle', fill: RED, symbol: 'no-entry' }, label: 'No entry', x: 2, y: 58, size: 64, tilt: 8, depth: 0.8 },
  { spec: { shape: 'triangle', fill: '#fff', border: RED, symbol: 'bend-left' }, label: 'Bend', x: 93, y: 52, size: 60, tilt: -7, depth: 1.4 },
  { spec: { shape: 'square', fill: BLUE, symbol: 'P' }, label: 'Parking', x: 46, y: 69, size: 44, tilt: 5, depth: 0.5 }
]

const title = ['The', 'easy', 'way', 'to', 'pass', 'your', 'theory', 'test.']
</script>

<template>
  <section id="hero" class="hero">
    <div class="hero__sky" aria-hidden="true"><i /><i /><i /></div>

    <div class="hero__signs" aria-hidden="true">
      <div
        v-for="s in signs"
        :key="s.label"
        class="float-sign"
        :class="s.m ? `float-sign--m-${s.m}` : 'float-sign--desktop'"
        :data-depth="s.depth"
        :style="{ '--x': `${s.x}%`, '--y': `${s.y}%`, '--size': `${s.size}px`, '--tilt': `${s.tilt}deg` }"
      >
        <div class="float-sign__plate"><LearnSignGraphic :spec="s.spec" /></div>
      </div>
    </div>

    <div class="container hero__grid">
      <div class="hero__copy">
        <p v-reveal class="hero__badge">
          <span class="dot" /> Updated for the 2026 DVSA car theory test
        </p>
        <h1 class="hero__title">
          <template v-for="(w, i) in title" :key="i"><span class="w" :class="{ 'w--mark': w === 'pass' }">{{ w }}</span>{{ ' ' }}</template>
        </h1>
        <p v-reveal="200" class="hero__lead">
          One-minute video lessons, real hazard perception clips and questions that explain every answer.
        </p>
        <div v-reveal="280" class="hero__ctas">
          <NuxtLink to="/#pricing" class="btn btn--primary btn--lg">Get started — from £5</NuxtLink>
          <NuxtLink to="/#quiz" class="chevron-link">Try 5 free questions</NuxtLink>
        </div>
        <p v-reveal="360" class="hero__proof">
          Rated <b>4.8</b> by 2,300+ learners · <b>91%</b> pass first time
        </p>
      </div>

      <div class="hero__visual">
        <LandingHeroDrive />
      </div>
    </div>

    <LandingRoad />
  </section>
</template>

<style scoped>
.hero {
  --hero-ink: #26303b;
  --hero-muted: #5d6874;
  position: relative;
  overflow: hidden;
  margin-top: calc(var(--header-h) * -1);
  padding-top: calc(var(--header-h) + 56px);
  background: linear-gradient(180deg, #e6eef6 0%, #eef2f3 55%, #f4f1e9 100%);
  color: var(--hero-ink);
}

/* soft clouds drifting across */
.hero__sky { position: absolute; inset: 0; pointer-events: none; }
.hero__sky i {
  position: absolute;
  width: 420px;
  height: 120px;
  border-radius: 50%;
  background: #fff;
  filter: blur(28px);
  opacity: 0.75;
  animation: drift 60s linear infinite;
}
.hero__sky i:nth-child(1) { top: 12%; left: -10%; }
.hero__sky i:nth-child(2) { top: 34%; left: 40%; width: 300px; animation-duration: 80s; animation-delay: -30s; }
.hero__sky i:nth-child(3) { top: 6%; left: 70%; width: 360px; animation-duration: 70s; animation-delay: -50s; }
@keyframes drift { from { transform: translateX(-30vw); } to { transform: translateX(60vw); } }

/* road signs floating in 3D behind the content */
.hero__signs { position: absolute; inset: 0; perspective: 900px; pointer-events: none; }
.float-sign { position: absolute; left: var(--x); top: var(--y); width: var(--size); transform-style: preserve-3d; }
.float-sign__plate {
  transform: rotateY(var(--tilt));
  filter: drop-shadow(0 18px 18px rgb(38 48 59 / 0.16)) drop-shadow(2px 2px 0 rgb(38 48 59 / 0.12));
  opacity: 0.9;
  animation: hover 9s ease-in-out infinite;
}
.float-sign:nth-child(2n) .float-sign__plate { animation-duration: 11s; animation-delay: -4s; }
.float-sign:nth-child(3n) .float-sign__plate { animation-duration: 13s; animation-delay: -7s; }
@keyframes hover { 50% { translate: 0 -12px; } }

.hero__grid { position: relative; display: grid; gap: 40px; align-items: center; }
.hero__copy { display: grid; justify-items: center; text-align: center; }

.hero__badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px 7px 12px;
  border-radius: 980px;
  background: rgb(255 255 255 / 0.7);
  box-shadow: 0 1px 0 rgb(255 255 255 / 0.9) inset, 0 6px 20px rgb(38 48 59 / 0.08);
  backdrop-filter: blur(10px);
  font-size: 0.875rem;
  color: var(--hero-muted);
}
.dot { width: 7px; height: 7px; border-radius: 50%; background: #6cc490; box-shadow: 0 0 8px #6cc490; }

.hero__title {
  max-width: 640px;
  margin-top: 22px;
  font-size: clamp(2.6rem, 7.4vw, 4.6rem);
  font-weight: 700;
  line-height: 1.04;
  letter-spacing: -0.04em;
}
.w { display: inline-block; }
.w--mark { position: relative; color: #3f74b8; }
/* a lane-marking underline under "pass" */
.w--mark::after {
  content: '';
  position: absolute;
  left: 2%;
  right: 2%;
  bottom: 0.02em;
  height: 0.09em;
  border-radius: 4px;
  background: repeating-linear-gradient(90deg, #efc066 0 0.42em, transparent 0.42em 0.62em);
  transform-origin: left;
  transform: scaleX(var(--mark, 1));
}
/* JS on: the words wait for GSAP; a CSS fallback shows them anyway if it never arrives */
:global(html.js) .hero__title .w { opacity: 0; animation: w-fallback 0.01s 2.5s forwards; }
@keyframes w-fallback { to { opacity: 1; } }

.hero__lead {
  max-width: 540px;
  margin-top: 20px;
  font-size: clamp(1.0625rem, 2vw, 1.3125rem);
  line-height: 1.42;
  color: var(--hero-muted);
}
.hero__ctas {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 16px 28px;
  margin-top: 30px;
}
.hero__ctas .btn--primary { box-shadow: 0 10px 30px -8px rgb(0 113 227 / 0.45); }
.hero__ctas .chevron-link { color: #3f74b8; font-size: 1.0625rem; }
.hero__proof { margin-top: 26px; font-size: 0.9375rem; color: var(--hero-muted); }
.hero__proof b { color: var(--hero-ink); font-weight: 600; }

.hero__visual { position: relative; perspective: 1400px; }

@media (min-width: 1024px) {
  .hero { padding-top: calc(var(--header-h) + 72px); }
  .hero__grid { grid-template-columns: 1fr 1.08fr; gap: 56px; }
  .hero__copy { justify-items: start; text-align: left; }
  .hero__ctas { justify-content: flex-start; }
}
@media (max-width: 1023px) {
  .float-sign--desktop { display: none; }
}
@media (max-width: 719px) {
  .hero { padding-top: calc(var(--header-h) + 36px); }
  .hero__ctas { flex-direction: column; gap: 14px; }
  /* phones: two small signs at the edges, in the gap between the copy and the clip */
  .float-sign { top: 566px; width: 48px; }
  .float-sign--m-left { left: 16px; }
  .float-sign--m-right { left: auto; right: 16px; }
}
@media (prefers-reduced-motion: reduce) {
  .hero__sky i, .float-sign__plate { animation: none; }
  :global(html.js) .hero__title .w { opacity: 1; animation: none; }
}
</style>

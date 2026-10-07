<script setup lang="ts">
const features = [
  { kind: 'video', dark: true, eyebrow: 'Video lessons', title: 'Every topic in under a minute.' },
  { kind: 'hazard', dark: true, eyebrow: 'Hazard perception', title: 'Real roads. Scored 5 to 1, like the test.' },
  { kind: 'practice', dark: false, eyebrow: 'Practice & mock tests', title: 'Quick mock tests. Every answer explained.' },
  { kind: 'book', dark: false, eyebrow: 'Highway Code e-book', title: 'The rules that matter, in plain English.' },
  { kind: 'progress', dark: true, eyebrow: 'Progress', title: 'Know exactly when you’re test-ready.' }
] as const

const track = ref<HTMLElement>()
const atStart = ref(true)
const atEnd = ref(false)
const lane = ref<HTMLElement>()
const onScroll = () => {
  const el = track.value
  if (!el) return
  atStart.value = el.scrollLeft < 8
  atEnd.value = el.scrollLeft + el.clientWidth > el.scrollWidth - 8
  // the car below drives along with the strip; its wheels (r 12 of the 170-unit-wide car) turn by the distance covered
  const max = el.scrollWidth - el.clientWidth
  const progress = max > 0 ? el.scrollLeft / max : 0
  const road = lane.value
  const car = road?.querySelector<HTMLElement>('.lane__car')
  if (road && car) {
    const travel = progress * (road.clientWidth - car.offsetLeft * 2 - car.offsetWidth)
    road.style.setProperty('--car-x', `${travel}px`)
    road.style.setProperty('--spin', `${(travel / (2 * Math.PI * 12 * (90 / 170))) * 360}deg`)
  }
}
const scroll = (dir: 1 | -1) => {
  const el = track.value
  const card = el?.querySelector<HTMLElement>('.card')
  el?.scrollBy({ left: dir * ((card?.offsetWidth ?? 300) + 20), behavior: 'smooth' })
}
</script>

<template>
  <section id="features" class="section features">
    <div class="container">
      <div v-reveal class="section-head">
        <p class="eyebrow">Everything in one app</p>
        <h2>Everything you need to pass.</h2>
      </div>
    </div>

    <div ref="track" class="gallery" tabindex="0" aria-label="Features" @scroll.passive="onScroll">
      <article
        v-for="(f, i) in features"
        :key="f.kind"
        v-reveal="i * 80"
        class="card"
        :class="[`card--${f.kind}`, f.dark ? 'card--dark' : 'card--light']"
      >
        <header>
          <p class="card__eyebrow">{{ f.eyebrow }}</p>
          <h3>{{ f.title }}</h3>
        </header>

        <div class="art" aria-hidden="true">
          <template v-if="f.kind === 'video'">
            <div class="player">
              <span class="player__blur" />
              <span class="player__play glass"><AppIcon name="play" :size="26" /></span>
              <span class="player__bar"><i /></span>
            </div>
          </template>

          <template v-else-if="f.kind === 'hazard'">
            <div class="hz">
              <span class="hz__lines" />
              <span class="hz__ring" />
              <span class="hz__score glass-dark"><b>5</b> pts</span>
            </div>
          </template>

          <template v-else-if="f.kind === 'practice'">
            <div class="ios-list">
              <span><i />Give way</span>
              <span class="is-on"><i />Stop and give way</span>
              <span><i />No entry</span>
            </div>
          </template>

          <template v-else-if="f.kind === 'book'">
            <div class="signs">
              <svg viewBox="0 0 64 56"><path d="M32 4 60 52H4z" fill="#fff" stroke="#d9776f" stroke-width="5" stroke-linejoin="round" /><path d="M32 20v14M32 41v1" stroke="#1d1d1f" stroke-width="4" stroke-linecap="round" /></svg>
              <svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" fill="#fff" stroke="#d9776f" stroke-width="7" /><text x="32" y="41" text-anchor="middle" font-size="24" font-weight="700" font-family="-apple-system, Inter, sans-serif" fill="#1d1d1f">30</text></svg>
              <svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="29" fill="#5b86bd" /><path d="M32 46V20m-10 10 10-10 10 10" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </div>
          </template>

          <template v-else>
            <div class="stats">
              <svg class="stats__rings" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" /><circle class="v v1" cx="60" cy="60" r="50" pathLength="100" />
                <circle cx="60" cy="60" r="34" /><circle class="v v2" cx="60" cy="60" r="34" pathLength="100" />
              </svg>
              <div class="stats__bars"><i style="--h: 40%" /><i style="--h: 58%" /><i style="--h: 52%" /><i style="--h: 76%" /><i style="--h: 92%" /></div>
            </div>
          </template>
        </div>

        <span class="card__plus glass" aria-hidden="true"><AppIcon name="plus" :size="18" /></span>
      </article>
    </div>

    <div ref="lane" class="lane" aria-hidden="true">
      <span class="lane__dashes" />
      <div class="lane__car"><LandingCar color="#e3a96b" css-spin /></div>
    </div>

    <div class="container gallery__nav">
      <button type="button" class="glass" aria-label="Previous" :disabled="atStart" @click="scroll(-1)">
        <AppIcon name="arrowLeft" :size="18" />
      </button>
      <button type="button" class="glass" aria-label="Next" :disabled="atEnd" @click="scroll(1)">
        <AppIcon name="arrowLeft" :size="18" style="transform: scaleX(-1)" />
      </button>
    </div>
  </section>
</template>

<style scoped>
.features { overflow: hidden; }
/* Desktop scroll-scrub (useLandingMotion): scrolling the page moves the strip, so no snapping and no arrows */
.features--scrub .gallery { scroll-snap-type: none; }
.features--scrub .gallery__nav { visibility: hidden; }

.gallery {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: min(80vw, 372px);
  gap: 20px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: max(var(--gutter), calc((100vw - var(--max)) / 2));
  padding: 4px max(var(--gutter), calc((100vw - var(--max)) / 2)) 28px;
  scrollbar-width: none;
}
.gallery::-webkit-scrollbar { display: none; }

.card {
  position: relative;
  scroll-snap-align: start;
  aspect-ratio: 372 / 560;
  display: flex;
  flex-direction: column;
  padding: 30px 28px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: transform 0.6s var(--ease), box-shadow 0.6s var(--ease);
}
.card:hover { transform: scale(1.015); box-shadow: var(--shadow-lg); }
.card--dark { background: linear-gradient(165deg, #2f4160, #1f2a3d); color: #f3f1ec; }
.card--light { background: #fff; color: var(--ink); box-shadow: 0 24px 50px -32px rgb(38 64 99 / 0.35); }
.card__eyebrow { font-size: 0.875rem; font-weight: 600; color: var(--muted); }
.card--dark .card__eyebrow { color: #a9bad3; }
.card h3 { margin-top: 8px; font-size: clamp(1.5rem, 3.4vw, 1.75rem); line-height: 1.14; }

.art { flex: 1; display: grid; place-items: center; margin-top: 16px; }

.card__plus {
  position: absolute;
  right: 18px;
  bottom: 18px;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: var(--ink);
  transition: transform 0.4s var(--spring);
}
.card:hover .card__plus { transform: rotate(90deg); }
.card--dark .card__plus { background: rgb(255 255 255 / 0.16); border-color: rgb(255 255 255 / 0.18); color: #fff; box-shadow: none; }

/* video */
.player {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: 18px;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: #1a2433;
}
.player__blur {
  position: absolute;
  inset: -20%;
  background:
    radial-gradient(40% 50% at 30% 40%, #5b86bd, transparent 70%),
    radial-gradient(40% 50% at 70% 60%, #6cc490, transparent 70%),
    radial-gradient(30% 40% at 55% 30%, #efc066, transparent 70%);
  filter: blur(20px);
  animation: drift 9s ease-in-out infinite alternate;
}
@keyframes drift { to { transform: rotate(25deg) scale(1.15); } }
.player__play {
  display: grid;
  place-items: center;
  width: 68px;
  height: 68px;
  border-radius: 50%;
  color: #fff;
  background: rgb(255 255 255 / 0.2);
  border-color: rgb(255 255 255 / 0.35);
  padding-left: 4px;
  transition: transform 0.4s var(--spring);
}
.player__play :deep(path) { fill: #fff; stroke: none; }
.card:hover .player__play { transform: scale(1.1); }
.player__bar { position: absolute; left: 14px; right: 14px; bottom: 12px; height: 4px; border-radius: 2px; background: rgb(255 255 255 / 0.3); overflow: hidden; }
.player__bar i { display: block; width: 38%; height: 100%; background: #fff; border-radius: 2px; }

/* hazard */
.hz { position: relative; width: 100%; height: 100%; min-height: 200px; }
.hz__lines {
  position: absolute;
  inset: 20% 0 0;
  background:
    linear-gradient(to top right, transparent calc(50% - 1px), rgb(255 255 255 / 0.35) 50%, transparent calc(50% + 1px)) left / 50% 100% no-repeat,
    linear-gradient(to top left, transparent calc(50% - 1px), rgb(255 255 255 / 0.35) 50%, transparent calc(50% + 1px)) right / 50% 100% no-repeat;
}
.hz__lines::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 2px;
  margin-left: -1px;
  background: repeating-linear-gradient(rgb(255 255 255 / 0.7) 0 12px, transparent 12px 30px);
  -webkit-mask-image: linear-gradient(transparent, #000);
  mask-image: linear-gradient(transparent, #000);
  animation: lane 0.9s linear infinite;
}
@keyframes lane { to { background-position: 0 30px; } }
.hz__ring {
  position: absolute;
  left: 26%;
  top: 46%;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  border: 2px solid #efc066;
  animation: ring 2s var(--ease) infinite;
}
@keyframes ring {
  0% { transform: scale(0.6); opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }
}
.hz__score { position: absolute; right: 8%; top: 22%; padding: 8px 14px; border-radius: 14px; font-size: 0.875rem; }
.hz__score b { font-family: var(--font-display); font-size: 1.375rem; color: #efc066; }

/* practice */
.ios-list { width: 100%; display: grid; gap: 1px; border-radius: 16px; overflow: hidden; background: var(--line-soft); box-shadow: var(--shadow); }
.ios-list span { display: flex; align-items: center; gap: 12px; padding: 16px; background: #fff; font-weight: 500; }
.ios-list i { width: 22px; height: 22px; border-radius: 50%; box-shadow: inset 0 0 0 1.5px #c7c7cc; transition: box-shadow 0.4s var(--spring); }
.ios-list .is-on { background: #e4edf7; }
.ios-list .is-on i { box-shadow: inset 0 0 0 7px #5b86bd; }

/* book */
.signs { display: flex; gap: 14px; align-items: center; }
.signs svg { width: 76px; height: 76px; filter: drop-shadow(0 8px 16px rgb(0 0 0 / 0.12)); transition: transform 0.6s var(--spring); }
.card:hover .signs svg:nth-child(1) { transform: translateY(-8px) rotate(-6deg); }
.card:hover .signs svg:nth-child(2) { transform: translateY(-14px); }
.card:hover .signs svg:nth-child(3) { transform: translateY(-8px) rotate(6deg); }

/* progress */
.stats { display: flex; gap: 22px; align-items: flex-end; }
.stats__rings { width: 130px; transform: rotate(-90deg); }
.stats__rings circle { fill: none; stroke: rgb(255 255 255 / 0.12); stroke-width: 12; stroke-linecap: round; }
.stats__rings .v { stroke-dasharray: 100; stroke-dashoffset: 100; }
.stats__rings .v1 { stroke: #6cc490; }
.stats__rings .v2 { stroke: #8fb3e0; }
[data-shown] .stats__rings .v1, .card--progress:not([data-reveal]) .v1 { animation: fill1 1.6s 0.3s var(--ease) forwards; }
[data-shown] .stats__rings .v2, .card--progress:not([data-reveal]) .v2 { animation: fill2 1.6s 0.45s var(--ease) forwards; }
@keyframes fill1 { to { stroke-dashoffset: 12; } }
@keyframes fill2 { to { stroke-dashoffset: 26; } }
.stats__bars { display: flex; gap: 6px; align-items: flex-end; height: 110px; }
.stats__bars i { width: 10px; height: var(--h); border-radius: 5px; background: linear-gradient(#8fb3e0, #5b86bd); }

/* the road under the strip; the car's position comes from the strip's scroll (--car-x) */
.lane {
  position: relative;
  height: 54px;
  margin: 4px 0 18px;
  background: linear-gradient(#cfdfc7 0 8px, #646b76 8px 50px, #e6e2d8 50px);
}
.lane__dashes {
  position: absolute;
  left: 0;
  right: 0;
  top: 28px;
  height: 5px;
  background: repeating-linear-gradient(90deg, #f3eee2 0 54px, transparent 54px 96px);
}
.lane__car {
  position: absolute;
  left: max(var(--gutter), calc((100vw - var(--max)) / 2));
  bottom: 6px;
  width: 90px;
  transform: translateX(var(--car-x, 0px));
}

.gallery__nav { display: flex; justify-content: flex-end; gap: 12px; }
.gallery__nav button {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  color: var(--ink);
  transition: opacity 0.3s, transform 0.3s var(--ease);
}
.gallery__nav button:hover:not(:disabled) { transform: scale(1.06); }
.gallery__nav button:disabled { opacity: 0.35; cursor: default; }
</style>

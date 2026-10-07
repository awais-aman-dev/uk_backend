<script setup lang="ts">
import { isVideoClip, type AnyHazardClip, type HazardResult, type SignDto } from '#shared/types/learn'

/*
 * Plays a hazard clip like the real test: click/tap (or Space) when you see a developing hazard.
 * The server scores the clicks and only then reveals the hazard windows, which drive the review.
 * Two kinds of clip: our animated scenes (time runs on requestAnimationFrame) and filmed videos from the
 * Django backend (time is read from the <video> itself, so clicks stay exact even while it buffers).
 */
const props = withDefaults(
  defineProps<{
    clip: AnyHazardClip
    signs: Record<string, SignDto>
    next?: string | null
    index?: number
    total?: number
    /** Landing-page demo: compact cards, public scoring, the scene idles behind the start card, CTA to pricing */
    demo?: boolean
  }>(),
  { next: null, index: 0, total: 1, demo: false }
)
const scoreUrl = computed(() => (props.demo ? '/api/demo/hazard' : `/api/learn/hazard/${props.clip.slug}/attempt`))

type Phase = 'ready' | 'countdown' | 'playing' | 'scoring' | 'result' | 'review'
const phase = ref<Phase>('ready')
const t = ref(0)
const clicks = ref<number[]>([])
const countdown = ref(3)
const result = ref<HazardResult | null>(null)
const error = ref<string>()
const playing = ref(false)
const pulses = ref<{ id: number; x: number; y: number }[]>([])

const video = computed(() => (isVideoClip(props.clip) ? props.clip : null))
const scene = computed(() => (isVideoClip(props.clip) ? null : props.clip.scene))
const videoEl = ref<HTMLVideoElement>()
const videoMs = ref(0) // length from the video's metadata, when Django doesn't say
const videoReady = ref(false)
const videoFailed = ref(false)
const canStart = computed(() => !video.value || videoReady.value)
// A cached video can load before the page hydrates, so its loadedmetadata / canplay events are missed — read its state
onMounted(() => {
  const v = videoEl.value
  if (!v) return
  if (v.readyState >= 1 && Number.isFinite(v.duration)) videoMs.value = Math.round(v.duration * 1000)
  if (v.readyState >= 3) videoReady.value = true
  if (v.error) videoFailed.value = true
})

const D = computed(() => props.clip.durationMs ?? videoMs.value)
let raf = 0
let last = 0
let countdownTimer: ReturnType<typeof setInterval> | undefined

function loop(now: number) {
  const v = videoEl.value
  if (v) t.value = Math.min(D.value, v.currentTime * 1000)
  else if (last) t.value = Math.min(D.value, t.value + (now - last))
  last = now
  if ((v ? v.ended : false) || (D.value > 0 && t.value >= D.value)) {
    playing.value = false
    if (phase.value === 'playing') submit()
    return
  }
  if (playing.value) raf = requestAnimationFrame(loop)
}
function play() {
  playing.value = true
  videoEl.value?.play().catch(() => (videoFailed.value = true))
  last = 0
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(loop)
}
function pause() {
  playing.value = false
  videoEl.value?.pause()
  cancelAnimationFrame(raf)
}
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  cancelAnimationFrame(idleRaf)
  clearInterval(countdownTimer)
})

// Demo: before the attempt the clip plays silently behind the start card — only while on screen, never with
// reduced motion — so the landing hero is alive without costing anything off-screen.
const root = ref<HTMLElement>()
let idleRaf = 0
let idleLast = 0
const IDLE_TO = 9000 // loop the calm opening only, so the idle preview doesn't give the hazard away
function idle(now: number) {
  if (idleLast) t.value = (t.value + (now - idleLast)) % IDLE_TO
  idleLast = now
  idleRaf = requestAnimationFrame(idle)
}
function stopIdle() {
  cancelAnimationFrame(idleRaf)
  idleLast = 0
}
onMounted(() => {
  if (!props.demo || video.value || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const io = new IntersectionObserver(([e]) => {
    stopIdle()
    if (e?.isIntersecting && phase.value === 'ready') idleRaf = requestAnimationFrame(idle)
  })
  io.observe(root.value!)
  onBeforeUnmount(() => io.disconnect())
})

function start() {
  stopIdle()
  clicks.value = []
  result.value = null
  error.value = undefined
  t.value = 0
  if (videoEl.value) {
    videoEl.value.pause()
    videoEl.value.currentTime = 0
  }
  phase.value = 'countdown'
  countdown.value = 3
  clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value === 0) {
      clearInterval(countdownTimer)
      phase.value = 'playing'
      play()
    }
  }, 700)
}

let pulseId = 0
function flag(e?: PointerEvent) {
  if (phase.value !== 'playing') return
  clicks.value.push(Math.round(t.value))
  if (e) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const id = pulseId++
    pulses.value.push({ id, x: e.clientX - rect.left, y: e.clientY - rect.top })
    setTimeout(() => (pulses.value = pulses.value.filter((p) => p.id !== id)), 700)
  }
}

async function submit() {
  phase.value = 'scoring'
  try {
    result.value = await $fetch<HazardResult>(scoreUrl.value, { method: 'POST', body: { clicks: clicks.value } })
    phase.value = 'result'
  } catch (e) {
    error.value = apiErrorsOf(e).form
    phase.value = 'result'
  }
}

function review() {
  phase.value = 'review'
  seek((result.value?.windows[0]?.startMs ?? 0) - 4000)
  play()
}
function seek(ms: number) {
  t.value = Math.min(D.value, Math.max(0, ms))
  if (videoEl.value) videoEl.value.currentTime = t.value / 1000
}
function togglePlay() {
  if (playing.value) pause()
  else {
    if (t.value >= D.value) seek(0)
    play()
  }
}

onMounted(() => {
  const onKey = (e: KeyboardEvent) => {
    if (e.code !== 'Space' && e.code !== 'Enter') return
    if (phase.value === 'playing') {
      e.preventDefault()
      flag()
    } else if (phase.value === 'review' && e.code === 'Space') {
      e.preventDefault()
      togglePlay()
    }
  }
  window.addEventListener('keydown', onKey)
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
})

// Review: highlight the hazard while its window is open (and a moment before)
const activeWindow = computed(() =>
  phase.value === 'review' ? result.value?.windows.find((w) => t.value >= w.startMs - 1200 && t.value <= w.endMs + 600) ?? null : null
)
// Filmed clips: more clicks than maxClicks voids the whole attempt — warn in the last few
const clicksLeft = computed(() => (video.value ? video.value.maxClicks - clicks.value.length : null))
const clickWarning = computed(() => {
  const left = clicksLeft.value
  if (left === null || phase.value !== 'playing' || left > 3) return ''
  if (left < 0) return 'Too many clicks — this attempt will score zero'
  if (left === 0) return 'Click limit reached — one more voids this attempt'
  return `${left} ${left === 1 ? 'click' : 'clicks'} left before this attempt is voided`
})

const pct = (ms: number) => `${D.value > 0 ? (ms / D.value) * 100 : 0}%`
const fmt = (ms: number) => `${(ms / 1000).toFixed(1)}s`
const bandColors = ['#30d158', '#a8e04a', '#ffd60a', '#ff9f0a', '#ff6b3d']
</script>

<template>
  <div ref="root" class="hp" :class="[`hp--${phase}`, { 'hp--demo': demo }]">
    <!-- Stage -->
    <div class="hp__stage" @pointerdown="flag">
      <video
        v-if="video"
        ref="videoEl"
        class="hp__video"
        :src="video.url"
        playsinline
        muted
        preload="auto"
        disablepictureinpicture
        @loadedmetadata="videoMs = Math.round(($event.target as HTMLVideoElement).duration * 1000) || 0"
        @canplay="videoReady = true"
        @error="videoFailed = true"
      />
      <LearnHazardStage v-else-if="scene" :scene="scene" :t="t" :signs="signs" :highlight="activeWindow?.actor ?? null" />
      <span v-for="p in pulses" :key="p.id" class="hp__pulse" :style="{ left: `${p.x}px`, top: `${p.y}px` }" />

      <Transition name="chip">
        <div v-if="activeWindow" class="hp__label glass-dark">
          <AppIcon name="hazard" :size="16" /> {{ activeWindow.label }} · you scored {{ activeWindow.score }}
        </div>
      </Transition>

      <!-- Overlays -->
      <Transition name="fade">
        <div v-if="phase === 'ready'" class="hp__overlay">
          <div v-if="demo" class="hp__card glass-dark">
            <p class="hp__kicker">Live demo · {{ Math.round(D / 1000) }} seconds</p>
            <h2>Can you spot the hazard?</h2>
            <p>Tap the road the moment you see a hazard <b>developing</b>. The earlier, the more points.</p>
            <button type="button" class="btn btn--primary" @click.stop="start" @pointerdown.stop>
              <AppIcon name="play" :size="14" /> Try a real clip
            </button>
          </div>
          <div v-else class="hp__card glass-dark">
            <p class="hp__kicker">Clip {{ index + 1 }} of {{ total }}</p>
            <h1>{{ clip.title }}</h1>
            <p>{{ clip.description }}</p>
            <ul class="hp__rules">
              <li><AppIcon name="flag" :size="18" /> Click, tap or press <kbd>Space</kbd> when you see a hazard <b>developing</b>.</li>
              <li><AppIcon name="target" :size="18" /> The earlier you respond, the more points — up to 5 per hazard.</li>
              <li><AppIcon name="hazard" :size="18" /> Clicking constantly or in a pattern scores zero.</li>
            </ul>
            <p v-if="clip.hazardCount > 1" class="hp__two">This clip has {{ clip.hazardCount }} hazards.</p>
            <UiAlert v-if="videoFailed">The video couldn’t be loaded. Check your connection and reload the page.</UiAlert>
            <button type="button" class="btn btn--primary btn--lg" :disabled="!canStart" @click.stop="start" @pointerdown.stop>
              <template v-if="canStart"><AppIcon name="play" :size="16" /> Start clip</template>
              <template v-else><span class="hp__mini-spinner" aria-hidden="true" /> Loading video…</template>
            </button>
          </div>
        </div>
      </Transition>
      <Transition name="fade">
        <div v-if="phase === 'countdown'" class="hp__overlay hp__overlay--clear">
          <Transition name="count" mode="out-in"><span :key="countdown" class="hp__count">{{ countdown }}</span></Transition>
        </div>
      </Transition>
      <Transition name="fade">
        <div v-if="phase === 'scoring'" class="hp__overlay"><span class="hp__spinner" /></div>
      </Transition>

      <Transition name="fade">
        <div v-if="phase === 'result'" class="hp__overlay" @pointerdown.stop>
          <div class="hp__card glass-dark">
            <template v-if="result">
              <p class="hp__kicker">{{ clip.title }}</p>
              <div class="hp__score"><strong>{{ result.score }}</strong><span>/ {{ result.maxScore }}</span></div>
              <UiAlert v-if="result.flagged">{{ video ? `Attempt voided: more than ${video.maxClicks} clicks. In the real test this clip would score zero — click only when you see a hazard developing.` : 'Too many clicks, or a clicking pattern was detected — this clip scores zero, just like the real test.' }}</UiAlert>
              <ul class="hp__hazards">
                <li v-for="w in result.windows" :key="w.id">
                  <span class="hp__dots" :aria-label="`${w.score} out of 5`">
                    <i v-for="n in 5" :key="n" :class="{ on: n <= w.score }" />
                  </span>
                  <span>
                    <b>{{ w.label }}</b>
                    <small>{{ w.clickMs !== null ? `You responded at ${fmt(w.clickMs)}` : 'No response during the hazard' }}</small>
                  </span>
                </li>
              </ul>
            </template>
            <UiAlert v-else>{{ error ?? 'Could not score this clip.' }}</UiAlert>
            <div class="hp__actions">
              <NuxtLink v-if="demo" to="/#pricing" class="btn btn--primary">Unlock all clips</NuxtLink>
              <button v-if="result" type="button" class="btn hp__review" :class="demo ? 'btn--ghost-dark' : 'btn--primary'" @click="review"><AppIcon name="play" :size="14" /> Watch review</button>
              <button type="button" class="btn btn--ghost-dark" @click="start"><AppIcon name="replay" :size="16" /> Try again</button>
              <NuxtLink v-if="next" :to="`/learn/hazard/${next}`" class="btn btn--ghost-dark">Next clip <AppIcon name="chevronRight" :size="14" /></NuxtLink>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Bottom bar: flags like the real test, or the review timeline -->
    <div class="hp__bar">
      <template v-if="phase === 'review' && result">
        <button type="button" class="hp__play" :aria-label="playing ? 'Pause' : 'Play'" @click="togglePlay">
          <AppIcon :name="playing ? 'pause' : 'play'" :size="18" />
        </button>
        <div class="hp__timeline">
          <div v-for="w in result.windows" :key="w.id" class="hp__window" :style="{ left: pct(w.startMs), width: pct(w.endMs - w.startMs) }">
            <i v-for="(c, n) in bandColors" :key="n" :style="{ background: c }" :title="`${5 - n} points`" />
          </div>
          <span v-for="(c, i) in result.clicks" :key="i" class="hp__flag" :style="{ left: pct(c) }"><AppIcon name="flag" :size="14" /></span>
          <span class="hp__head" :style="{ left: pct(t) }" />
          <input type="range" min="0" :max="D" step="10" :value="t" aria-label="Seek" @input="seek(+($event.target as HTMLInputElement).value)">
        </div>
        <button type="button" class="btn btn--ghost-dark btn--sm" @click="phase = 'result'; pause()">Done</button>
      </template>
      <template v-else>
        <div class="hp__progress"><i :style="{ width: pct(t) }" /></div>
        <div class="hp__flags" aria-live="polite">
          <span v-for="(_, i) in clicks" :key="i" class="hp__flag hp__flag--bar"><AppIcon name="flag" :size="16" /></span>
          <span v-if="!clicks.length" class="hp__hint">{{ phase === 'playing' ? 'Click when you see a hazard developing' : '' }}</span>
          <span v-if="clickWarning" class="hp__warn" :class="{ 'hp__warn--over': (clicksLeft ?? 1) <= 0 }">{{ clickWarning }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.hp { display: grid; grid-template-rows: 1fr auto; height: 100%; background: #000; color: #f5f5f7; }
.hp__stage { position: relative; display: grid; place-items: center; overflow: hidden; touch-action: manipulation; cursor: crosshair; }
.hp__stage > :deep(.hazard-stage),
.hp__video { width: 100%; height: 100%; max-height: calc(100dvh - 140px); aspect-ratio: 16 / 9; }
.hp__video { display: block; object-fit: contain; background: #000; pointer-events: none; }
.hp__mini-spinner { width: 16px; height: 16px; border-radius: 50%; border: 2px solid currentColor; border-right-color: transparent; animation: spin 0.8s linear infinite; }
.hp--ready .hp__stage, .hp--result .hp__stage, .hp--review .hp__stage { cursor: default; }

.hp__pulse { position: absolute; width: 60px; height: 60px; margin: -30px 0 0 -30px; border-radius: 50%; border: 3px solid #ff375f; pointer-events: none; animation: pulse 0.7s var(--ease) forwards; }
@keyframes pulse { from { transform: scale(0.3); opacity: 1; } to { transform: scale(1.6); opacity: 0; } }

.hp__overlay { position: absolute; inset: 0; display: grid; place-items: center; padding: 16px; background: rgb(0 0 0 / 0.45); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
.hp__overlay--clear { background: transparent; backdrop-filter: none; -webkit-backdrop-filter: none; }
.hp__card { display: grid; gap: 14px; width: min(520px, 100%); max-height: 100%; overflow-y: auto; padding: 28px; border-radius: 28px; cursor: default; }
.hp__card h1 { font-size: clamp(1.75rem, 4vw, 2.25rem); }
.hp__card > p { color: var(--muted-dark); }
.hp__kicker { font-size: 0.8125rem; font-weight: 600; color: #2997ff !important; }
.hp__rules { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; font-size: 0.9375rem; }
.hp__rules li { display: flex; gap: 10px; align-items: flex-start; }
.hp__rules :deep(.icon) { flex: none; margin-top: 2px; color: #2997ff; }
.hp__rules kbd { padding: 1px 6px; border-radius: 6px; background: rgb(255 255 255 / 0.15); font: inherit; font-size: 0.8125rem; }
.hp__two { color: #ffb340 !important; font-weight: 500; }
.hp__card .btn :deep(path) { fill: currentColor; }

.hp__count { font-family: var(--font-display); font-size: 9rem; font-weight: 700; color: #fff; text-shadow: 0 10px 40px rgb(0 0 0 / 0.5); }
.count-enter-active, .count-leave-active { transition: transform 0.35s var(--spring), opacity 0.3s; }
.count-enter-from { transform: scale(1.6); opacity: 0; }
.count-leave-to { transform: scale(0.6); opacity: 0; }
.hp__spinner { width: 44px; height: 44px; border-radius: 50%; border: 3px solid #fff; border-right-color: transparent; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.hp__score { display: flex; align-items: baseline; gap: 8px; }
.hp__score strong { font-family: var(--font-display); font-size: 5rem; line-height: 1; background: var(--gradient); -webkit-background-clip: text; background-clip: text; color: transparent; }
.hp__score span { font-size: 1.5rem; color: var(--muted-dark); }
.hp__hazards { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.hp__hazards li { display: flex; gap: 14px; align-items: center; }
.hp__hazards li > span:last-child { display: grid; line-height: 1.3; }
.hp__hazards small { color: var(--muted-dark); }
.hp__dots { display: flex; gap: 3px; }
.hp__dots i { width: 8px; height: 22px; border-radius: 4px; background: rgb(255 255 255 / 0.15); }
.hp__dots i.on { background: #30d158; }
.hp__actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
.hp__actions .btn { min-height: 40px; padding: 9px 16px; font-size: 0.9375rem; }
.hp__actions .btn :deep(path) { fill: currentColor; }

.hp__label { position: absolute; top: 14px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; align-items: center; padding: 8px 14px; border-radius: 980px; font-size: 0.875rem; white-space: nowrap; }
.hp__label :deep(.icon) { color: #ffb000; }
.chip-enter-active, .chip-leave-active { transition: opacity 0.3s, transform 0.4s var(--spring); }
.chip-enter-from, .chip-leave-to { opacity: 0; transform: translate(-50%, -10px); }

.hp__bar { display: flex; align-items: center; gap: 14px; min-height: 64px; padding: 10px 16px calc(10px + env(safe-area-inset-bottom)); background: #0b0b0d; border-top: 1px solid rgb(255 255 255 / 0.08); }
/* the progress line runs along the top edge of the bar (between the picture and the hint), never through the text */
.hp__progress { position: absolute; top: 0; left: 0; right: 0; height: 3px; background: rgb(255 255 255 / 0.1); }
.hp__progress i { display: block; height: 100%; background: #2997ff; }
.hp__bar { position: relative; }
.hp__flags { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; min-height: 28px; }
.hp__flag { color: #ff375f; }
.hp__flag--bar { animation: drop 0.45s var(--spring); }
@keyframes drop { from { transform: translateY(-14px) scale(0.5); opacity: 0; } }
.hp__flag :deep(path) { fill: currentColor; }
.hp__hint { color: var(--muted-dark); font-size: 0.875rem; }
.hp__warn { margin-left: 6px; padding: 3px 10px; border-radius: 980px; background: rgb(255 179 64 / 0.16); color: #ffb340; font-size: 0.8125rem; font-weight: 600; }
.hp__warn--over { background: rgb(255 69 58 / 0.18); color: #ff6961; }

.hp__play { display: grid; place-items: center; flex: none; width: 40px; height: 40px; border: 0; border-radius: 50%; background: rgb(255 255 255 / 0.12); color: #fff; }
.hp__play :deep(path) { fill: currentColor; }
.hp__timeline { position: relative; flex: 1; height: 36px; border-radius: 10px; background: rgb(255 255 255 / 0.06); }
.hp__window { position: absolute; top: 8px; bottom: 8px; display: flex; border-radius: 4px; overflow: hidden; }
.hp__window i { flex: 1; opacity: 0.85; }
.hp__timeline .hp__flag { position: absolute; top: -2px; transform: translateX(-3px); }
.hp__head { position: absolute; top: -4px; bottom: -4px; width: 2px; margin-left: -1px; border-radius: 1px; background: #fff; box-shadow: 0 0 8px rgb(255 255 255 / 0.8); pointer-events: none; }
.hp__timeline input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.35s; }

/* Demo on the landing page: sized by its container; compact cards that fit a phone-width 16:9 frame */
.hp--demo { height: auto; }
.hp--demo .hp__stage > :deep(.hazard-stage) { height: auto; max-height: none; }
.hp--demo .hp__overlay { padding: 10px; }
.hp--ready.hp--demo .hp__overlay { background: rgb(0 0 0 / 0.2); -webkit-backdrop-filter: none; backdrop-filter: none; }
.hp--demo .hp__card { gap: 10px; width: min(400px, 100%); padding: 20px 22px; border-radius: 22px; text-align: left; }
.hp--demo .hp__card h2 { font-size: clamp(1.25rem, 3vw, 1.6rem); color: #fff; }
.hp--demo .hp__card > p { font-size: 0.9375rem; line-height: 1.4; }
.hp--demo .hp__score strong { font-size: 3.25rem; }
.hp--demo .hp__bar { min-height: 56px; padding-top: 14px; padding-bottom: calc(16px + env(safe-area-inset-bottom)); }
.hp--demo .hp__count { font-size: 6rem; }
@media (max-width: 559px) {
  .hp--demo .hp__card { padding: 14px 16px; gap: 8px; }
  /* phone: score + "Unlock" + "Try again" only — the review timeline needs a bigger screen */
  .hp--demo .hp__card > p, .hp--demo .hp__hazards, .hp--demo .hp__review { display: none; }
  .hp--demo .hp__score strong { font-size: 2.5rem; }
  .hp--demo .hp__actions .btn { min-height: 34px; padding: 6px 12px; font-size: 0.8125rem; }
}
.fade-enter-active .hp__card { transition: transform 0.5s var(--spring); }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.fade-enter-from .hp__card { transform: scale(0.95) translateY(10px); }
</style>

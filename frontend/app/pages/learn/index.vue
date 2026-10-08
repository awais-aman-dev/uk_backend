<script setup lang="ts">
definePageMeta({ layout: 'learn', middleware: 'auth' })
useHead({ title: 'Today — 1Theory' })

const user = useAuthUser()
const toast = useToast()
const { data: raw, refresh } = await useFetch('/api/learn/overview', { lazy: true })
// Django mode: the dashboard is Django's own topics + progress; otherwise our local "Today"
const dashboard = computed(() => (raw.value?.source === 'django' ? raw.value : null))
const data = computed(() => (raw.value?.source === 'local' ? raw.value : null))

const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Europe/London' }).format(new Date()))
const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
const firstName = computed(() => user.value?.name.split(' ')[0])

const daysToTest = computed(() => {
  if (!data.value?.testDate) return null
  const diff = new Date(`${data.value.testDate}T09:00:00`).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86_400_000))
})
const planDone = computed(() => data.value?.plan.items.filter((i) => i.done).length ?? 0)
const goalPct = computed(() => (data.value ? Math.min(100, Math.round((data.value.goal.done / data.value.goal.target) * 100)) : 0))

const editingDate = ref(false)
const dateInput = ref('')
async function saveDate() {
  await $fetch('/api/learn/settings', { method: 'PATCH', body: { testDate: dateInput.value || null } })
  editingDate.value = false
  await refresh()
  toast.show(dateInput.value ? 'Test date saved. You’ve got this.' : 'Test date cleared', 'success')
}

const weekday = (iso: string) => new Intl.DateTimeFormat('en-GB', { weekday: 'narrow', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`))

const actions = computed(() => [
  { to: '/learn/practice?mode=random', icon: 'target', title: 'Quick practice', sub: '10 random questions', tone: '#0a84ff' },
  data.value?.resumeMock
    ? { to: `/learn/mock/${data.value.resumeMock}`, icon: 'timer', title: 'Resume mock test', sub: 'Your clock is still running', tone: '#ff9f0a' }
    : { to: '/learn/mock', icon: 'timer', title: 'Mock test', sub: '10 questions · 12 minutes', tone: '#ff9f0a' },
  { to: '/learn/hazard', icon: 'hazard', title: 'Hazard perception', sub: 'Six clips, scored 5 to 1', tone: '#ff375f' },
  { to: '/learn/ebook', icon: 'book', title: 'Highway Code', sub: 'Read or download the PDF', tone: '#30d158' }
])
</script>

<template>
  <LearnSkeleton v-if="!raw" variant="dashboard" />
  <LearnDjangoDashboard v-else-if="dashboard" :dashboard="dashboard" :title="`${greeting}, ${firstName}.`" />
  <div v-else-if="data" class="today">
    <LearnHead :eyebrow="new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/London' }).format(new Date())" :title="`${greeting}, ${firstName}.`" />

    <LearnLocked v-if="!data.hasAccess" title="Your plan has ended" />

    <!-- Readiness hero -->
    <section class="hero">
      <div class="hero__glow" aria-hidden="true" />
      <LearnReadinessRings v-bind="data.readiness" :size="190" />
      <div class="hero__copy">
        <p class="hero__kicker">
          Test readiness
          <span v-if="data.prediction.ready" class="ready-badge"><AppIcon name="check" :size="12" /> Ready to book</span>
        </p>
        <h2>{{ data.prediction.ready || data.readiness.overall >= 90 ? 'You’re test-ready.' : data.readiness.overall >= 60 ? 'Getting close.' : 'Let’s build it up.' }}</h2>
        <ul class="hero__legend">
          <li><i style="background: #ff375f" /> Theory <b>{{ data.readiness.theory }}%</b></li>
          <li><i style="background: #30d158" /> Mock tests <b>{{ data.readiness.mock }}%</b></li>
          <li><i style="background: #0a84ff" /> Hazard perception <b>{{ data.readiness.hazard }}%</b></li>
        </ul>
        <NuxtLink v-if="data.nextLesson" :to="`/learn/lessons/${data.nextLesson.slug}`" class="hero__next glass-dark">
          <span class="hero__play"><AppIcon name="play" :size="16" /></span>
          <span>
            <small>Up next · {{ data.nextLesson.topic }} · {{ data.nextLesson.minutes }} min</small>
            <b>{{ data.nextLesson.title }}</b>
          </span>
          <AppIcon name="chevronRight" :size="18" />
        </NuxtLink>
      </div>
    </section>

    <!-- Tiles -->
    <section class="tiles">
      <div class="tile">
        <UiRing :value="goalPct"><AppIcon name="target" :size="22" class="tile__goal" /></UiRing>
        <div>
          <p class="tile__label">Daily goal</p>
          <p class="tile__value">{{ data.goal.done }}<small> / {{ data.goal.target }}</small></p>
          <p class="tile__sub">{{ goalPct >= 100 ? 'Goal reached — nice work' : 'questions answered today' }}</p>
        </div>
      </div>

      <div class="tile">
        <div class="tile__flame" :class="{ 'is-lit': data.streak > 0 }"><AppIcon name="flame" :size="26" /></div>
        <div class="tile__grow">
          <p class="tile__label">Streak</p>
          <p class="tile__value">{{ data.streak }}<small> {{ data.streak === 1 ? 'day' : 'days' }}</small></p>
          <div class="week">
            <span v-for="d in data.week" :key="d.day" :class="{ on: d.n > 0 }" :title="d.day">{{ weekday(d.day) }}</span>
          </div>
        </div>
      </div>

      <div class="tile">
        <div class="tile__cal"><AppIcon name="flag" :size="22" /></div>
        <div class="tile__grow">
          <p class="tile__label">Theory test</p>
          <template v-if="!editingDate">
            <p class="tile__value">
              <template v-if="daysToTest !== null">{{ daysToTest }}<small> days to go</small></template>
              <template v-else><small>Not booked yet</small></template>
            </p>
            <button type="button" class="linkbtn" @click="editingDate = true; dateInput = data.testDate ?? ''">
              {{ data.testDate ? 'Change date' : 'Set your test date' }}
            </button>
          </template>
          <form v-else class="datef" @submit.prevent="saveDate">
            <input v-model="dateInput" type="date" aria-label="Test date">
            <button type="submit" class="btn btn--primary btn--sm">Save</button>
          </form>
        </div>
      </div>
    </section>

    <!-- Coach: today's plan + pass prediction -->
    <section class="coach">
      <div class="plan">
        <header class="plan__head">
          <div>
            <p class="tile__label">Today’s plan</p>
            <h2>{{ planDone === data.plan.items.length ? 'All done for today.' : `${data.plan.minutesLeft} minutes left today` }}</h2>
          </div>
          <span class="pace" :class="`pace--${data.plan.pace}`">
            {{ data.plan.pace === 'no-date' ? 'Set a test date for a plan' : data.plan.pace === 'tight' ? `Tight · ${data.plan.daysLeft} days` : `On track · ${data.plan.daysLeft} days` }}
          </span>
        </header>
        <ol class="plan__list">
          <li v-for="item in data.plan.items" :key="item.key" :class="{ 'is-done': item.done }">
            <NuxtLink :to="item.to" class="plan__item">
              <span class="plan__check" :aria-label="item.done ? 'Done' : 'To do'"><AppIcon v-if="item.done" name="check" :size="14" /></span>
              <span class="plan__text">
                <b>{{ item.label }}</b>
                <small>{{ item.detail }}<template v-if="item.progress"> · {{ item.progress.done }}/{{ item.progress.target }}</template></small>
              </span>
              <span class="plan__min">{{ item.minutes }} min</span>
            </NuxtLink>
          </li>
        </ol>
      </div>

      <div class="predict">
        <p class="tile__label">Chance to pass</p>
        <div class="predict__main">
          <UiRing :value="data.prediction.percent" :size="96" :thickness="9" :color="data.prediction.percent >= 80 ? 'var(--go)' : data.prediction.percent >= 50 ? 'var(--warn)' : 'var(--stop)'">
            <strong class="predict__pct">{{ data.prediction.percent }}<small>%</small></strong>
          </UiRing>
          <ul class="predict__parts">
            <li>Pass theory <b>{{ data.prediction.theory }}%</b></li>
            <li>Pass hazard <b>{{ data.prediction.hazard }}%</b></li>
          </ul>
        </div>
        <p class="predict__tip">{{ data.prediction.tip }}</p>
        <p v-if="data.prediction.confidence === 'low'" class="predict__note">Early estimate — it sharpens as you take mocks and clips.</p>
        <p v-if="data.review.seen" class="predict__note">{{ data.review.learned }} of {{ data.review.seen }} questions in long-term memory.</p>
      </div>
    </section>

    <!-- Quick actions -->
    <section class="actions">
      <NuxtLink v-for="a in actions" :key="a.title" :to="a.to" class="action" :style="{ '--tone': a.tone }">
        <span class="action__icon"><AppIcon :name="a.icon" :size="22" /></span>
        <b>{{ a.title }}</b>
        <small>{{ a.sub }}</small>
      </NuxtLink>
    </section>

    <!-- Topics -->
    <section class="topics">
      <div class="topics__head">
        <h2>Your topics</h2>
        <NuxtLink to="/learn/progress" class="chevron-link">Progress</NuxtLink>
      </div>
      <div v-if="data.weakTopics.length" class="weak">
        <p class="tile__label">Focus on these</p>
        <NuxtLink v-for="t in data.weakTopics" :key="t.slug" :to="`/learn/practice?topic=${t.slug}`" class="weak__item">
          <AppIcon :name="t.icon" :size="20" />
          <span>{{ t.title }}</span>
          <UiBar :value="t.mastery" color="var(--stop)" class="weak__bar" />
          <b>{{ t.mastery }}%</b>
        </NuxtLink>
      </div>
      <div class="tgrid">
        <NuxtLink v-for="t in data.topics" :key="t.slug" :to="`/learn/practice?topic=${t.slug}`" class="tgrid__item">
          <UiRing :value="t.mastery" :size="40" :thickness="4" color="var(--go)"><AppIcon :name="t.icon" :size="18" /></UiRing>
          <span class="tgrid__title">{{ t.title }}</span>
          <small>{{ t.answered ? `${t.mastery}% mastered` : 'Not started' }}</small>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.today { display: grid; gap: 20px; }

.hero {
  position: relative;
  overflow: hidden;
  display: grid;
  justify-items: center;
  gap: 24px;
  padding: 28px;
  border-radius: var(--radius-xl);
  background: #000;
  color: #f5f5f7;
  isolation: isolate;
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.08);
}
.hero__glow {
  position: absolute;
  inset: -40% -10% auto auto;
  z-index: -1;
  width: 640px;
  height: 640px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(41 151 255 / 0.35), rgb(162 89 255 / 0.18) 55%, transparent);
}
.hero :deep(.rings__center strong) { color: #fff; }
.hero__copy { display: grid; gap: 12px; width: 100%; }
.hero__kicker { font-size: 0.875rem; color: var(--muted-dark); }
.hero h2 { font-size: clamp(1.75rem, 4vw, 2.5rem); }
.hero__legend { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; color: var(--muted-dark); }
.hero__legend li { display: flex; align-items: center; gap: 10px; }
.hero__legend i { width: 10px; height: 10px; border-radius: 50%; }
.hero__legend b { margin-left: auto; color: #fff; font-weight: 600; }
.hero__next { display: flex; align-items: center; gap: 12px; margin-top: 6px; padding: 12px 14px; border-radius: 18px; color: #fff; text-decoration: none; transition: transform 0.4s var(--spring); }
.hero__next:hover { transform: scale(1.015); text-decoration: none; }
.hero__next > span:nth-child(2) { display: grid; flex: 1; line-height: 1.3; }
.hero__next small { color: var(--muted-dark); }
.hero__play { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; background: #0a84ff; }
.hero__play :deep(path) { fill: #fff; stroke: none; }
@media (min-width: 760px) {
  .hero { grid-template-columns: auto 1fr; justify-items: start; align-items: center; gap: 40px; padding: 36px 40px; }
  .hero__copy { max-width: 460px; }
}

.tiles { display: grid; gap: 12px; }
@media (min-width: 760px) { .tiles { grid-template-columns: repeat(3, 1fr); } }
.tile { display: flex; gap: 14px; align-items: flex-start; padding: 20px; border-radius: var(--radius-lg); background: var(--card); box-shadow: var(--shadow); }
.tile__grow { flex: 1; min-width: 0; }
.tile__label { font-size: 0.8125rem; font-weight: 500; color: var(--muted); }
.tile__value { font-family: var(--font-display); font-size: 2rem; font-weight: 600; line-height: 1.15; color: var(--ink); }
.tile__value small { font-family: var(--font-body); font-size: 0.9375rem; font-weight: 400; color: var(--muted); }
.tile__sub { font-size: 0.8125rem; color: var(--muted); }
.tile__goal { color: var(--accent); }
.tile__flame, .tile__cal { display: grid; place-items: center; flex: none; width: 52px; height: 52px; border-radius: 16px; background: rgb(127 127 127 / 0.12); color: var(--muted); }
.tile__flame.is-lit { background: linear-gradient(160deg, #ffd60a, #ff375f); color: #fff; }
.tile__flame.is-lit :deep(path) { fill: rgb(255 255 255 / 0.3); }
.tile__cal { background: var(--accent-soft); color: var(--accent); }
.week { display: flex; gap: 4px; margin-top: 8px; }
.week span { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: rgb(127 127 127 / 0.12); color: var(--muted); font-size: 0.6875rem; font-weight: 600; }
.week span.on { background: var(--go); color: #fff; }
.linkbtn { padding: 0; border: 0; background: none; color: var(--accent); font-size: 0.875rem; font-weight: 500; }
.datef { display: flex; gap: 8px; margin-top: 6px; }
.datef input { flex: 1; min-width: 0; padding: 6px 10px; border: 1px solid var(--line); border-radius: 10px; background: var(--card); color: var(--ink); font: inherit; }

.ready-badge { display: inline-flex; align-items: center; gap: 4px; margin-left: 8px; padding: 2px 10px; border-radius: 980px; background: var(--go); color: #fff; font-size: 0.75rem; font-weight: 600; vertical-align: 1px; }

.coach { display: grid; gap: 12px; }
@media (min-width: 900px) { .coach { grid-template-columns: 1.6fr 1fr; } }
.plan, .predict { padding: 20px; border-radius: var(--radius-lg); background: var(--card); box-shadow: var(--shadow); }
.plan__head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 8px 12px; margin-bottom: 8px; }
.plan__head h2 { font-size: 1.25rem; color: var(--ink); }
.pace { padding: 4px 10px; border-radius: 980px; font-size: 0.75rem; font-weight: 600; white-space: nowrap; }
.pace--on-track { background: var(--go-soft); color: var(--go-text); }
.pace--tight { background: var(--warn-soft); color: var(--warn-text); }
.pace--no-date { background: rgb(127 127 127 / 0.12); color: var(--muted); }
.plan__list { list-style: none; margin: 0; padding: 0; display: grid; }
.plan__item { display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: center; padding: 10px 0; border-top: 1px solid var(--line-soft); color: var(--ink); text-decoration: none; }
.plan__item:hover { text-decoration: none; }
.plan__item:hover b { color: var(--accent); }
.plan__check { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--line); color: #fff; }
.is-done .plan__check { border-color: var(--go); background: var(--go); }
.plan__text { display: grid; min-width: 0; line-height: 1.3; }
.plan__text b { font-weight: 500; font-size: 0.9375rem; transition: color 0.2s; }
.is-done .plan__text b { color: var(--muted); text-decoration: line-through; }
.plan__text small, .plan__min { color: var(--muted); font-size: 0.8125rem; }
.plan__min { white-space: nowrap; }
.predict { display: grid; align-content: start; gap: 10px; }
.predict__main { display: flex; align-items: center; gap: 18px; }
.predict__pct { font-family: var(--font-display); font-size: 1.625rem; color: var(--ink); }
.predict__pct small { font-size: 0.875rem; color: var(--muted); }
.predict__parts { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; color: var(--muted); font-size: 0.875rem; }
.predict__parts b { margin-left: 6px; color: var(--ink); }
.predict__tip { color: var(--ink); font-size: 0.9375rem; }
.predict__note { color: var(--muted); font-size: 0.8125rem; }

.actions { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
@media (min-width: 900px) { .actions { grid-template-columns: repeat(4, 1fr); } }
.action { display: grid; gap: 4px; padding: 18px; border-radius: var(--radius-lg); background: var(--card); box-shadow: var(--shadow); color: var(--ink); text-decoration: none; transition: transform 0.4s var(--spring), box-shadow 0.3s; }
.action:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); text-decoration: none; }
.action__icon { display: grid; place-items: center; width: 44px; height: 44px; margin-bottom: 8px; border-radius: 14px; background: var(--tone); color: #fff; }
.action small { color: var(--muted); font-size: 0.8125rem; }

.topics { display: grid; gap: 14px; margin-top: 8px; }
.topics__head { display: flex; justify-content: space-between; align-items: baseline; }
.topics__head h2 { font-size: 1.5rem; color: var(--ink); }
.weak { display: grid; gap: 8px; padding: 18px; border-radius: var(--radius-lg); background: var(--card); box-shadow: var(--shadow); }
.weak__item { display: flex; align-items: center; gap: 12px; padding: 8px 0; color: var(--ink); text-decoration: none; }
.weak__item :deep(.icon) { color: var(--stop); flex: none; }
.weak__item > span:not(.bar) { flex: 1; }
.weak__item b { width: 44px; text-align: right; font-weight: 600; }
.weak__bar { width: 30%; }
.tgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
.tgrid__item { display: grid; gap: 6px; padding: 16px; border-radius: 20px; background: var(--card); box-shadow: var(--shadow); color: var(--ink); text-decoration: none; transition: transform 0.4s var(--spring); }
.tgrid__item:hover { transform: translateY(-2px); text-decoration: none; }
.tgrid__title { font-weight: 500; font-size: 0.9375rem; line-height: 1.25; }
.tgrid__item small { color: var(--muted); font-size: 0.75rem; }
</style>

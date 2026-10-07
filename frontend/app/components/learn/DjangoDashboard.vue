<script setup lang="ts">
import type { DjangoDashboard } from '#shared/types/learn'

/*
 * The learning dashboard in Django mode — the Learning API guide's Flow A: GET /api/learn/topics/ +
 * GET /api/learn/progress/. Shows only what those return; `null` is "hasn't happened yet", never 0.
 */
const props = withDefaults(defineProps<{ dashboard: DjangoDashboard; title: string; variant?: 'today' | 'progress' }>(), { variant: 'today' })

const p = computed(() => props.dashboard.progress)
const topics = computed(() => props.dashboard.topics)
// "Continue": the first lesson not done yet, in course order
const next = computed(() => {
  for (const t of topics.value) {
    const l = t.lessons.find((x) => !x.done)
    if (l) return { ...l, topic: t.title }
  }
  return null
})
const lessonsTotal = computed(() => topics.value.reduce((n, t) => n + t.lessons.length, 0))
const fmtDay = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'Europe/London' }).format(new Date(`${iso}T12:00:00Z`))
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const today = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/London' }).format(new Date())

const links = [
  { to: '/learn/practice?mode=random', icon: 'target', title: 'Practice', tone: '#0a84ff' },
  { to: '/learn/mock', icon: 'timer', title: 'Exams', tone: '#ff9f0a' },
  { to: '/learn/hazard', icon: 'hazard', title: 'Hazard perception', tone: '#ff375f' },
  { to: '/learn/ebook', icon: 'book', title: 'Highway Code', tone: '#30d158' }
] as const
</script>

<template>
  <div class="dash">
    <LearnHead :eyebrow="variant === 'today' ? today : 'Progress'" :title="title" />
    <LearnLocked v-if="variant === 'today' && !dashboard.hasAccess" title="A plan unlocks every lesson" />

    <!-- Continue -->
    <NuxtLink v-if="variant === 'today' && next" :to="`/learn/lessons/${next.slug}`" class="continue">
      <span class="continue__kicker">Continue · {{ next.topic }}</span>
      <b>{{ next.title }}</b>
      <span class="continue__sub">{{ next.summary }}<template v-if="next.minutes"> · {{ next.minutes }} min</template></span>
      <AppIcon name="chevronRight" :size="20" class="continue__go" />
    </NuxtLink>

    <!-- Progress (GET /api/learn/progress/) -->
    <UiAlert v-if="!p">Your progress couldn’t be loaded right now. Your answers are still being saved.</UiAlert>
    <section v-else class="stats" aria-label="Your progress">
      <div class="stat">
        <span>Streak</span>
        <b>{{ plural(p.streak, 'day') }}</b>
        <small>{{ p.lastStudiedOn ? `Last studied ${fmtDay(p.lastStudiedOn)}` : 'Not studied yet' }}</small>
      </div>
      <div class="stat">
        <span>Study days</span>
        <b>{{ p.studyDays }}</b>
      </div>
      <div class="stat">
        <span>Mastery</span>
        <b>{{ p.mastery }}%</b>
        <small>{{ p.questionsLearnt }} learnt of {{ p.questionsAnswered }} answered</small>
      </div>
      <div class="stat">
        <span>Lessons completed</span>
        <b>{{ p.lessonsCompleted }}<small v-if="lessonsTotal"> / {{ lessonsTotal }}</small></b>
      </div>
      <div class="stat">
        <span>Mock tests</span>
        <b>{{ p.bestMockScore === null ? 'Not taken yet' : `Best ${p.bestMockScore}` }}</b>
        <small v-if="p.mockAttempts">{{ plural(p.mockAttempts, 'attempt') }} · {{ p.mocksPassed }} passed</small>
      </div>
      <div class="stat">
        <span>Hazard perception</span>
        <b>{{ p.bestHazardScore === null ? 'Not tried yet' : `Best ${p.bestHazardScore}` }}</b>
        <small v-if="p.hazardAttempts">{{ plural(p.hazardAttempts, 'attempt') }}</small>
      </div>
    </section>

    <nav v-if="variant === 'today'" class="links" aria-label="Study">
      <NuxtLink v-for="l in links" :key="l.to" :to="l.to" class="link">
        <span class="link__icon" :style="{ background: l.tone }"><AppIcon :name="l.icon" :size="18" /></span>
        {{ l.title }}
      </NuxtLink>
    </nav>

    <!-- Course (GET /api/learn/topics/) -->
    <section class="topics">
      <h2>Course</h2>
      <p v-if="!topics.length" class="empty">Lessons are on their way — check back soon.</p>
      <article v-for="t in topics" :key="t.slug" class="topic">
        <div class="topic__head">
          <div>
            <h3>{{ t.title }}</h3>
            <p v-if="t.description" class="topic__desc">{{ t.description }}</p>
          </div>
          <span class="topic__mastery" :title="'Questions answered correctly'">{{ t.mastery }}%</span>
        </div>
        <div class="bar" aria-hidden="true"><i :style="{ width: `${t.mastery}%` }" /></div>
        <p class="topic__meta">
          {{ t.lessons.length ? plural(t.lessons.length, 'lesson') : 'Lessons coming soon' }}
          · {{ t.questions ? plural(t.questions, 'question') : 'no questions yet' }}
        </p>
        <ul v-if="variant === 'progress' && t.lessons.length" class="lessons">
          <li v-for="l in t.lessons" :key="l.slug">
            <NuxtLink :to="`/learn/lessons/${l.slug}`"><span class="tick" :class="{ on: l.done }"><AppIcon v-if="l.done" name="check" :size="12" /></span>{{ l.title }}</NuxtLink>
          </li>
        </ul>
      </article>
    </section>
  </div>
</template>

<style scoped>
.dash { display: grid; gap: 22px; }
.continue { position: relative; display: grid; gap: 4px; padding: 22px 56px 22px 24px; border-radius: var(--radius-lg); background: linear-gradient(135deg, #0a84ff, #5e5ce6); color: #fff; text-decoration: none; box-shadow: var(--shadow); }
.continue__kicker { font-size: 0.8125rem; font-weight: 600; opacity: 0.85; }
.continue b { font-family: var(--font-display); font-size: 1.5rem; letter-spacing: -0.02em; }
.continue__sub { opacity: 0.85; }
.continue__go { position: absolute; right: 20px; top: 50%; transform: translateY(-50%); }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
.stat { display: grid; gap: 4px; align-content: start; padding: 16px 18px; border-radius: 18px; background: var(--card); box-shadow: var(--shadow); }
.stat span { font-size: 0.8125rem; color: var(--muted); }
.stat b { font-family: var(--font-display); font-size: 1.375rem; color: var(--ink); }
.stat b small { font-size: 0.875rem; color: var(--muted); }
.stat > small { font-size: 0.8125rem; color: var(--muted); }
.links { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
.link { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 16px; background: var(--card); box-shadow: var(--shadow); color: var(--ink); font-weight: 600; text-decoration: none; }
.link__icon { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; color: #fff; }
.topics { display: grid; gap: 12px; }
.topics h2 { font-size: 1.375rem; }
.empty { color: var(--muted); }
.topic { display: grid; gap: 8px; padding: 18px 20px; border-radius: var(--radius-lg); background: var(--card); box-shadow: var(--shadow); }
.topic__head { display: flex; justify-content: space-between; gap: 12px; }
.topic h3 { font-size: 1.125rem; }
.topic__desc, .topic__meta { color: var(--muted); font-size: 0.9375rem; }
.topic__mastery { font-family: var(--font-display); font-weight: 700; color: var(--ink); }
.bar { height: 6px; border-radius: 3px; background: rgb(127 127 127 / 0.18); overflow: hidden; }
.bar i { display: block; height: 100%; border-radius: inherit; background: var(--go); }
.lessons { list-style: none; margin: 4px 0 0; padding: 0; display: grid; gap: 6px; }
.lessons a { display: flex; align-items: center; gap: 10px; color: var(--ink); text-decoration: none; }
.tick { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; box-shadow: inset 0 0 0 1.5px var(--line); color: #fff; }
.tick.on { background: var(--go); box-shadow: none; }
</style>

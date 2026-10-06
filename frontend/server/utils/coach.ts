import { and, desc, eq, sql } from 'drizzle-orm'
import { MOCK_MINUTES } from './mock'

/* ---------- Spaced repetition ---------- */

/**
 * Leitner-style review from the answer history (no extra table): the number of correct answers in a row since the
 * last mistake is the "box"; each box waits longer before the question comes back. A wrong answer → due again now.
 */
export const REVIEW_DAYS = [0, 1, 3, 7, 14, 30] as const
const DAY = 86_400_000

export async function reviewState(userId: number, now = new Date()) {
  const db = await useDb()
  const rows = rowsOf<{ question_id: number; last_at: string; streak: number }>(
    await db.execute(sql`
      with a as (
        select question_id, correct, created_at,
               row_number() over (partition by question_id order by created_at desc) as rn
        from ${schema.questionAttempts}
        where user_id = ${userId}
      )
      select a.question_id,
             max(a.created_at) as last_at,
             -- correct answers in a row, counting back from the latest
             coalesce(min(a.rn) filter (where not a.correct) - 1, count(*))::int as streak
      from a
      join ${schema.questions} q on q.id = a.question_id and q.published
      group by a.question_id
    `)
  )
  const cards = rows.map((r) => {
    const box = Math.min(Number(r.streak), REVIEW_DAYS.length - 1)
    const dueAt = new Date(new Date(r.last_at).getTime() + REVIEW_DAYS[box]! * DAY)
    return { questionId: Number(r.question_id), box, dueAt }
  })
  const due = cards.filter((c) => c.dueAt <= now).sort((a, b) => a.box - b.box || a.dueAt.getTime() - b.dueAt.getTime())
  return {
    dueIds: due.map((c) => c.questionId),
    due: due.length,
    seen: cards.length,
    /** answered right 3+ times in a row — in long-term memory */
    learned: cards.filter((c) => c.box >= 3).length
  }
}

/* ---------- Pass prediction ---------- */

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x))

/**
 * A rough chance of passing both parts of the real test, from what we've seen:
 * theory pass mark 86% (43/50), hazard perception 59% (44/75). Recent mocks weigh most for theory.
 * Not a promise — shown with how sure we are.
 */
export function passPrediction(r: { mock: number }, evidence: Evidence) {
  // Ability, not coverage: recent accuracy and mock scores, nudged down when few topics have been practised
  const practice = evidence.answers ? evidence.accuracy : 0.5
  const ability = evidence.mocks ? 0.7 * (r.mock / 100) + 0.3 * practice : 0.9 * practice
  const theoryScore = ability * (0.85 + 0.15 * evidence.coverage)
  // 50 questions: a true 91% scorer has a spread of ~4 points, so the curve around the 86% mark is steep
  // (≈ normal CDF via logistic); flattened a little because our ability estimate is itself uncertain
  const pTheory = evidence.answers || evidence.mocks ? sigmoid((theoryScore - 0.86) * 30) : 0.05
  // Hazard: average score on the clips actually tried, against the 59% (44/75) mark
  const pHazard = evidence.clips ? sigmoid((evidence.hazardAvg - 0.59) * 14) : 0.15
  const percent = Math.round(pTheory * pHazard * 100)
  const enough = evidence.answers >= 30 && evidence.mocks >= 1 && evidence.clips >= 2
  const ready = percent >= 80 && evidence.mocks >= 2 && evidence.clips >= 3

  // The single most useful next step
  const tip = !evidence.mocks
    ? 'Take a mock test — it tells us most about your theory score.'
    : evidence.clips < 3
      ? 'Try a few hazard clips — they’re half of the test.'
      : pTheory < pHazard
        ? 'Theory is holding you back: practise your weak topics.'
        : 'Hazard perception is holding you back: replay clips and click earlier.'
  return { percent, theory: Math.round(pTheory * 100), hazard: Math.round(pHazard * 100), confidence: enough ? ('ok' as const) : ('low' as const), ready, tip: ready ? 'You’re ready to book your test.' : tip }
}

export interface Evidence {
  answers: number
  /** share correct among the last 50 answers */
  accuracy: number
  /** share of topics practised at all */
  coverage: number
  mocks: number
  clips: number
  /** best score / max per clip tried, averaged */
  hazardAvg: number
}

export async function evidenceFor(userId: number): Promise<Evidence> {
  const db = await useDb()
  const [[answers], [recent], [topics], [mocks], [hazard]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(schema.questionAttempts).where(eq(schema.questionAttempts.userId, userId)),
    db.execute(sql`
      select avg(case when correct then 1.0 else 0 end) as acc
      from (select correct from ${schema.questionAttempts} where user_id = ${userId} order by created_at desc limit 50) r
    `).then((r) => rowsOf<{ acc: number | null }>(r)),
    db.execute(sql`
      select (select count(distinct q.topic_id) from ${schema.questionAttempts} a join ${schema.questions} q on q.id = a.question_id where a.user_id = ${userId})::float
           / greatest((select count(*) from ${schema.topics}), 1) as coverage
    `).then((r) => rowsOf<{ coverage: number }>(r)),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.mockAttempts).where(and(eq(schema.mockAttempts.userId, userId), eq(schema.mockAttempts.status, 'finished'))),
    db.execute(sql`
      select count(*)::int as clips, avg(best::float / nullif(max_score, 0)) as avg
      from (select clip_id, max(score) as best, max(max_score) as max_score from ${schema.hazardAttempts} where user_id = ${userId} group by clip_id) c
    `).then((r) => rowsOf<{ clips: number; avg: number | null }>(r))
  ])
  return {
    answers: Number(answers?.n ?? 0),
    accuracy: Number(recent?.acc ?? 0),
    coverage: Number(topics?.coverage ?? 0),
    mocks: Number(mocks?.n ?? 0),
    clips: Number(hazard?.clips ?? 0),
    hazardAvg: Number(hazard?.avg ?? 0)
  }
}

/* ---------- Today's plan ---------- */

export interface PlanItem {
  key: 'lesson' | 'review' | 'practice' | 'mock' | 'hazard'
  label: string
  detail: string
  to: string
  minutes: number
  done: boolean
  progress?: { done: number; target: number }
}

/**
 * Spreads what's left over the days until the test (or a default two-week pace without a date) and turns it into
 * today's to-do list. Everything is recomputed from progress, so it adapts when a day is skipped.
 */
export async function todaysPlan(
  userId: number,
  ctx: {
    testDate: string | null
    dailyGoal: number
    answeredToday: number
    nextLesson: { slug: string; title: string; minutes: number } | null
    lessonsLeft: number
    reviewDue: number
    mastery: Map<number, { mastery: number }>
    topicCount: number
  }
) {
  const db = await useDb()
  const today = ukToday()
  const onToday = (col: ReturnType<typeof sql>) => sql`to_char(${col} at time zone 'Europe/London', 'YYYY-MM-DD') = ${today}`
  const [[lessonToday], [mockToday], [hazardToday], passedMocks, clips, best] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(schema.lessonProgress).where(and(eq(schema.lessonProgress.userId, userId), onToday(sql`${schema.lessonProgress.completedAt}`))),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.mockAttempts).where(and(eq(schema.mockAttempts.userId, userId), onToday(sql`${schema.mockAttempts.finishedAt}`))),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.hazardAttempts).where(and(eq(schema.hazardAttempts.userId, userId), onToday(sql`${schema.hazardAttempts.createdAt}`))),
    db
      .select({ score: schema.mockAttempts.score, total: sql<number>`jsonb_array_length(${schema.mockAttempts.questionIds})` })
      .from(schema.mockAttempts)
      .where(and(eq(schema.mockAttempts.userId, userId), eq(schema.mockAttempts.status, 'finished')))
      .orderBy(desc(schema.mockAttempts.finishedAt))
      .limit(5),
    db.select({ id: schema.hazardClips.id, slug: schema.hazardClips.slug, title: schema.hazardClips.title, hazards: schema.hazardClips.hazards }).from(schema.hazardClips).where(eq(schema.hazardClips.published, true)),
    db
      .select({ clipId: schema.hazardAttempts.clipId, best: sql<number>`max(${schema.hazardAttempts.score})` })
      .from(schema.hazardAttempts)
      .where(eq(schema.hazardAttempts.userId, userId))
      .groupBy(schema.hazardAttempts.clipId)
  ])

  const daysLeft = ctx.testDate ? Math.max(1, Math.ceil((Date.parse(`${ctx.testDate}T09:00:00Z`) - Date.now()) / DAY)) : 14
  // Keep the last two days before the test for revision
  const studyDays = Math.max(1, daysLeft - 2)

  // Topics below 90% (or never practised) need ~10 more good answers each
  const weakTopics = [...ctx.mastery.values()].filter((m) => m.mastery < 0.9).length + Math.max(0, ctx.topicCount - ctx.mastery.size)
  const practiceTarget = Math.max(ctx.dailyGoal, Math.ceil((weakTopics * 10) / studyDays))

  const passes = passedMocks.filter((m) => (m.score ?? 0) >= Math.ceil(Number(m.total) * 0.86)).length
  const mocksLeft = Math.max(0, 3 - passes)
  const bestBy = new Map(best.map((b) => [b.clipId, Number(b.best)]))
  const weakClip = clips.find((c) => (bestBy.get(c.id) ?? 0) < c.hazards.length * 4) ?? null

  const items: PlanItem[] = []
  const lessonsToday = Math.ceil(ctx.lessonsLeft / studyDays)
  if (ctx.nextLesson && lessonsToday > 0) {
    items.push({
      key: 'lesson',
      label: `Lesson: ${ctx.nextLesson.title}`,
      detail: lessonsToday > 1 ? `${lessonsToday} lessons a day to finish on time` : `${ctx.lessonsLeft} lessons left`,
      to: `/learn/lessons/${ctx.nextLesson.slug}`,
      minutes: ctx.nextLesson.minutes * lessonsToday,
      done: Number(lessonToday?.n ?? 0) >= lessonsToday
    })
  }
  if (ctx.reviewDue > 0) {
    const n = Math.min(ctx.reviewDue, 20)
    items.push({ key: 'review', label: `Review ${n} due question${n === 1 ? '' : 's'}`, detail: 'Spaced repetition — before you forget them', to: '/learn/practice?mode=review', minutes: Math.ceil(n * 0.6), done: false })
  }
  items.push({
    key: 'practice',
    label: `Answer ${practiceTarget} questions`,
    detail: weakTopics ? `${weakTopics} topic${weakTopics === 1 ? '' : 's'} still below 90%` : 'Keep every topic sharp',
    to: '/learn/practice?mode=weak',
    minutes: Math.ceil(practiceTarget * 0.6),
    done: ctx.answeredToday >= practiceTarget,
    progress: { done: Math.min(ctx.answeredToday, practiceTarget), target: practiceTarget }
  })
  // A mock every few days, daily in the last week
  if (mocksLeft > 0 && (daysLeft <= 7 || Math.round(daysLeft) % 3 === 0 || !passedMocks.length)) {
    items.push({ key: 'mock', label: 'Take a mock test', detail: `${passes} of 3 passes so far`, to: '/learn/mock', minutes: MOCK_MINUTES, done: Number(mockToday?.n ?? 0) > 0 })
  }
  if (weakClip) {
    items.push({ key: 'hazard', label: `Hazard clip: ${weakClip.title}`, detail: 'Aim for 4+ points per hazard', to: `/learn/hazard/${weakClip.slug}`, minutes: 2, done: Number(hazardToday?.n ?? 0) > 0 })
  }

  const minutes = items.filter((i) => !i.done).reduce((s, i) => s + i.minutes, 0)
  const total = items.reduce((s, i) => s + i.minutes, 0)
  return {
    daysLeft: ctx.testDate ? daysLeft : null,
    items,
    minutesLeft: minutes,
    pace: !ctx.testDate ? ('no-date' as const) : total > 60 ? ('tight' as const) : ('on-track' as const)
  }
}

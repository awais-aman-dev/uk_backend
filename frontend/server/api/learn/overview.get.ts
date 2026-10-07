import { and, asc, desc, eq, sql } from 'drizzle-orm'

// Everything the "Today" screen needs in one round trip.
export default defineEventHandler(async (event) => {
  // Django mode: the dashboard is exactly what Django's Learning API gives (topics + progress)
  if (await useDjangoLearning(event)) return djangoDashboard(event)
  const user = await requireUser(event)
  const db = await useDb()
  const access = await hasAccess(event)

  const [sub, settings, ready, days, topics, done, lessons] = await Promise.all([
    getSubscription(event),
    db.select().from(schema.learnerSettings).where(eq(schema.learnerSettings.userId, user.id)).then((r) => r[0]),
    readiness(user.id),
    activityDays(user.id, 60),
    db.select().from(schema.topics).orderBy(asc(schema.topics.position)),
    db.select({ lessonId: schema.lessonProgress.lessonId }).from(schema.lessonProgress).where(eq(schema.lessonProgress.userId, user.id)),
    db
      .select({ id: schema.lessons.id, slug: schema.lessons.slug, title: schema.lessons.title, minutes: schema.lessons.minutes, topicId: schema.lessons.topicId })
      .from(schema.lessons)
      .where(eq(schema.lessons.published, true))
      .orderBy(asc(schema.lessons.position))
  ])

  const today = ukToday()
  const [answered] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.questionAttempts)
    .where(and(eq(schema.questionAttempts.userId, user.id), sql`to_char(${schema.questionAttempts.createdAt} at time zone 'Europe/London', 'YYYY-MM-DD') = ${today}`))
  const answeredToday = Number(answered?.n ?? 0)

  const doneIds = new Set(done.map((d) => d.lessonId))
  const next = lessons.find((l) => !doneIds.has(l.id)) ?? null
  const topicById = new Map(topics.map((t) => [t.id, t]))

  const topicStats = topics.map((t) => ({
    slug: t.slug,
    title: t.title,
    icon: t.icon,
    mastery: Math.round((ready.mastery.get(t.id)?.mastery ?? 0) * 100),
    answered: ready.mastery.get(t.id)?.answered ?? 0
  }))
  const weak = [...topicStats].filter((t) => t.answered > 0).sort((a, b) => a.mastery - b.mastery).slice(0, 3)

  // Coach: spaced-repetition queue, pass prediction, today's plan towards the test date
  const [review, evidence] = await Promise.all([reviewState(user.id), evidenceFor(user.id)])
  const prediction = passPrediction(ready, evidence)
  const plan = await todaysPlan(user.id, {
    testDate: settings?.testDate ?? null,
    dailyGoal: settings?.dailyGoal ?? 20,
    answeredToday,
    nextLesson: next,
    lessonsLeft: lessons.length - doneIds.size,
    reviewDue: review.due,
    mastery: ready.mastery,
    topicCount: topics.length
  })

  const [lastMock] = await db
    .select({ id: schema.mockAttempts.id, status: schema.mockAttempts.status })
    .from(schema.mockAttempts)
    .where(and(eq(schema.mockAttempts.userId, user.id), eq(schema.mockAttempts.status, 'in_progress')))
    .orderBy(desc(schema.mockAttempts.startedAt))
    .limit(1)

  return {
    source: 'local' as const,
    hasAccess: access,
    subscription: subscriptionFromDjango(sub),
    readiness: { overall: ready.overall, theory: ready.theory, mock: ready.mock, hazard: ready.hazard },
    streak: streakFrom(days),
    week: Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.now() - (6 - i) * 86_400_000)
      const key = ukToday(d)
      return { day: key, n: days.find((x) => x.day === key)?.n ?? 0 }
    }),
    goal: { done: answeredToday, target: settings?.dailyGoal ?? 20 },
    testDate: settings?.testDate ?? null,
    nextLesson: next ? { ...next, topic: topicById.get(next.topicId)?.title ?? '' } : null,
    lessonsDone: doneIds.size,
    lessonsTotal: lessons.length,
    resumeMock: lastMock?.id ?? null,
    weakTopics: weak,
    topics: topicStats,
    review: { due: review.due, learned: review.learned, seen: review.seen },
    prediction,
    plan
  }
})

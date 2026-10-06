import { and, eq, gte, sql } from 'drizzle-orm'

// Study statistics: activity calendar, study time (from visit tracking), totals and accuracy.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = await useDb()
  const weekAgo = new Date(Date.now() - 7 * 86_400_000)
  const [days, totals, visits, week, lessons, ready] = await Promise.all([
    activityDays(user.id, 84),
    db
      .select({ answered: sql<number>`count(*)::int`, correct: sql<number>`sum(case when ${schema.questionAttempts.correct} then 1 else 0 end)::int` })
      .from(schema.questionAttempts)
      .where(eq(schema.questionAttempts.userId, user.id))
      .then((r) => r[0]),
    db
      .select({ n: sql<number>`count(*)::int`, secs: sql<number>`coalesce(sum(extract(epoch from (${schema.visits.lastSeenAt} - ${schema.visits.startedAt}))), 0)::int` })
      .from(schema.visits)
      .where(eq(schema.visits.userId, user.id))
      .then((r) => r[0]),
    db
      .select({ secs: sql<number>`coalesce(sum(extract(epoch from (${schema.visits.lastSeenAt} - ${schema.visits.startedAt}))), 0)::int` })
      .from(schema.visits)
      .where(and(eq(schema.visits.userId, user.id), gte(schema.visits.startedAt, weekAgo)))
      .then((r) => r[0]),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.lessonProgress).where(eq(schema.lessonProgress.userId, user.id)).then((r) => r[0]),
    readiness(user.id)
  ])
  const byDay = new Map(days.map((d) => [d.day, d.n]))
  const calendar = Array.from({ length: 84 }, (_, i) => {
    const day = ukToday(new Date(Date.now() - (83 - i) * 86_400_000))
    return { day, n: byDay.get(day) ?? 0 }
  })
  const answered = Number(totals?.answered ?? 0)
  const [evidence, review] = await Promise.all([evidenceFor(user.id), reviewState(user.id)])
  return {
    readiness: { overall: ready.overall, theory: ready.theory, mock: ready.mock, hazard: ready.hazard },
    prediction: passPrediction(ready, evidence),
    review: { due: review.due, learned: review.learned, seen: review.seen },
    streak: streakFrom(days),
    calendar,
    answered,
    accuracy: answered ? Math.round((Number(totals?.correct ?? 0) / answered) * 100) : 0,
    lessonsDone: Number(lessons?.n ?? 0),
    visits: Number(visits?.n ?? 0),
    studyMinutes: Math.round(Number(visits?.secs ?? 0) / 60),
    weekMinutes: Math.round(Number(week?.secs ?? 0) / 60)
  }
})

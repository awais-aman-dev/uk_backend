import { desc, eq, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = await useDb()
  const rows = await db
    .select({
      id: schema.mockAttempts.id,
      status: schema.mockAttempts.status,
      score: schema.mockAttempts.score,
      total: sql<number>`jsonb_array_length(${schema.mockAttempts.questionIds})`,
      startedAt: schema.mockAttempts.startedAt,
      finishedAt: schema.mockAttempts.finishedAt
    })
    .from(schema.mockAttempts)
    .where(eq(schema.mockAttempts.userId, user.id))
    .orderBy(desc(schema.mockAttempts.startedAt))
    .limit(20)
  return {
    pass: MOCK_PASS,
    minutes: MOCK_MINUTES,
    questions: MOCK_QUESTIONS,
    attempts: rows.map((r) => ({
      ...r,
      total: Number(r.total),
      passed: r.score !== null && r.score >= passMark(Number(r.total)),
      startedAt: r.startedAt.toISOString(),
      finishedAt: r.finishedAt?.toISOString() ?? null
    }))
  }
})

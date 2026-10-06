import { and, eq, inArray } from 'drizzle-orm'

// A short mock (the real test is 50 questions in 57 minutes, pass mark 43 = 86%).
export const MOCK_QUESTIONS = 10
export const MOCK_CASE_QUESTIONS = 3
export const MOCK_MINUTES = 12
/** Same 86% bar as the real test, scaled to the attempt's size (so older 50-question attempts still grade correctly). */
export const passMark = (total: number) => Math.ceil(total * 0.86)
export const MOCK_PASS = passMark(MOCK_QUESTIONS)

type Attempt = typeof schema.mockAttempts.$inferSelect

export async function loadAttempt(userId: number, id: number) {
  const db = await useDb()
  const [attempt] = await db
    .select()
    .from(schema.mockAttempts)
    .where(and(eq(schema.mockAttempts.id, id), eq(schema.mockAttempts.userId, userId)))
  if (!attempt) throw createError({ statusCode: 404, statusMessage: 'Mock test not found' })
  return attempt
}

/** Grades and closes an attempt. Safe to call twice. */
export async function finishAttempt(attempt: Attempt) {
  if (attempt.status === 'finished') return attempt
  const db = await useDb()
  const rows = await db.select().from(schema.questions).where(inArray(schema.questions.id, attempt.questionIds))
  const byId = new Map(rows.map((r) => [r.id, r]))
  let score = 0
  const records: (typeof schema.questionAttempts.$inferInsert)[] = []
  for (const qid of attempt.questionIds) {
    const q = byId.get(qid)
    const selected = attempt.answers[String(qid)] ?? []
    const ok = !!q && sameAnswer(selected, q.correct)
    if (ok) score++
    if (q && selected.length) records.push({ userId: attempt.userId, questionId: qid, selected, correct: ok, mode: 'mock' })
  }
  const [done] = await db
    .update(schema.mockAttempts)
    .set({ status: 'finished', score, finishedAt: new Date() })
    .where(and(eq(schema.mockAttempts.id, attempt.id), eq(schema.mockAttempts.status, 'in_progress')))
    .returning()
  if (done && records.length) await db.insert(schema.questionAttempts).values(records)
  return done ?? (await loadAttempt(attempt.userId, attempt.id))
}

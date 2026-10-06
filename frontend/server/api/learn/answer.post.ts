import { and, eq, gt, sql } from 'drizzle-orm'
import { z } from 'zod'

// Practice / lesson checks: the answer is only revealed after the learner commits.
export default defineEventHandler(async (event) => {
  const user = await requireAccess(event)
  const body = await readValidated(
    event,
    z.object({ questionId: z.number().int(), selected: z.array(z.string().max(4)).min(1).max(4), mode: z.enum(['practice', 'lesson']) })
  )
  const db = await useDb()
  const [q] = await db.select().from(schema.questions).where(eq(schema.questions.id, body.questionId))
  if (!q) throw createError({ statusCode: 404, statusMessage: 'Question not found' })

  // A running mock test keeps its answers secret until it's submitted — no peeking through this endpoint.
  const m = schema.mockAttempts
  const [running] = await db
    .select({ id: m.id })
    .from(m)
    .where(and(eq(m.userId, user.id), eq(m.status, 'in_progress'), gt(m.deadlineAt, new Date()), sql`${m.questionIds} @> ${JSON.stringify([q.id])}::jsonb`))
    .limit(1)
  if (running) throw createError({ statusCode: 409, statusMessage: 'This question is in your mock test — finish it first' })

  const correct = sameAnswer(body.selected, q.correct)
  await db.insert(schema.questionAttempts).values({ userId: user.id, questionId: q.id, selected: body.selected, correct, mode: body.mode })

  const lesson = q.lessonId
    ? await db.select({ slug: schema.lessons.slug, title: schema.lessons.title }).from(schema.lessons).where(eq(schema.lessons.id, q.lessonId)).then((r) => r[0] ?? null)
    : null
  return { correct, correctIds: q.correct, explanation: q.explanation, lesson }
})

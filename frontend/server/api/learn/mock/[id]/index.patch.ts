import { eq } from 'drizzle-orm'
import { z } from 'zod'

// Autosave of answers / flags while the clock is running.
export default defineEventHandler(async (event) => {
  const user = await requireAccess(event)
  const attempt = await loadAttempt(user.id, Number(getRouterParam(event, 'id')))
  if (attempt.status !== 'in_progress' || attempt.deadlineAt < new Date()) {
    throw createError({ statusCode: 409, statusMessage: 'This mock test has ended' })
  }
  const body = await readValidated(
    event,
    z.object({
      answers: z.record(z.string(), z.array(z.string().max(4)).max(4)).optional(),
      flagged: z.array(z.number().int()).max(60).optional()
    })
  )
  const allowed = new Set(attempt.questionIds.map(String))
  const answers = body.answers
    ? Object.fromEntries(Object.entries({ ...attempt.answers, ...body.answers }).filter(([k]) => allowed.has(k)))
    : attempt.answers
  const flagged = body.flagged ? body.flagged.filter((id) => allowed.has(String(id))) : attempt.flagged
  const db = await useDb()
  await db.update(schema.mockAttempts).set({ answers, flagged }).where(eq(schema.mockAttempts.id, attempt.id))
  return { ok: true }
})

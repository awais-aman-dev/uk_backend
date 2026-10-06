import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readValidated(
    event,
    z.object({
      testDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date').nullable().optional(),
      dailyGoal: z.number().int().min(5).max(100).optional()
    })
  )
  const db = await useDb()
  await db
    .insert(schema.learnerSettings)
    .values({ userId: user.id, ...body })
    .onConflictDoUpdate({ target: schema.learnerSettings.userId, set: body })
  return { ok: true }
})

import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const b = await readValidated(event, z.object({ kind: z.enum(['question', 'lesson', 'sign', 'chapter']), ref: z.string().min(1).max(80), on: z.boolean() }))
  if (await useDjangoLearning(event)) {
    // Django saves questions only (by key): POST / DELETE /api/learn/questions/{key}/saved/ → { saved }
    if (b.kind !== 'question') throw createError({ statusCode: 404, statusMessage: 'Only questions can be saved' })
    const r = await djangoLearn<{ saved: boolean }>(event, b.on ? 'POST' : 'DELETE', `/api/learn/questions/${encodeURIComponent(b.ref)}/saved/`)
    return { ok: r.saved === b.on }
  }
  const user = await requireAccess(event)
  const db = await useDb()
  if (b.on) {
    await db.insert(schema.bookmarks).values({ userId: user.id, kind: b.kind, ref: b.ref }).onConflictDoNothing()
  } else {
    await db
      .delete(schema.bookmarks)
      .where(and(eq(schema.bookmarks.userId, user.id), eq(schema.bookmarks.kind, b.kind), eq(schema.bookmarks.ref, b.ref)))
  }
  return { ok: true }
})

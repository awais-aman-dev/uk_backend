import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event)
  const b = await readValidated(event, z.object({ kind: z.enum(['question', 'lesson', 'sign', 'chapter']), ref: z.string().min(1).max(80), on: z.boolean() }))
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

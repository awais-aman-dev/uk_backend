import { desc, eq } from 'drizzle-orm'

/** A new visit starts after this much silence */
const VISIT_GAP_MS = 30 * 60 * 1000

// Heartbeat from an open tab (see plugins/heartbeat.client.ts): extends the current visit or starts a new one.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = await useDb()
  const now = new Date()
  const [visit] = await db.select().from(schema.visits).where(eq(schema.visits.userId, user.id)).orderBy(desc(schema.visits.lastSeenAt)).limit(1)
  if (visit && now.getTime() - visit.lastSeenAt.getTime() < VISIT_GAP_MS) {
    await db.update(schema.visits).set({ lastSeenAt: now }).where(eq(schema.visits.id, visit.id))
  } else {
    await db.insert(schema.visits).values({ userId: user.id, startedAt: now, lastSeenAt: now })
  }
  setResponseStatus(event, 204)
  return null
})

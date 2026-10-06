import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event)
  const slug = getRouterParam(event, 'slug')!
  const db = await useDb()
  const [settings] = await db.select().from(schema.learnerSettings).where(eq(schema.learnerSettings.userId, user.id))
  const read = [...new Set([...(settings?.ebookRead ?? []), slug])]
  await db
    .insert(schema.learnerSettings)
    .values({ userId: user.id, ebookRead: read })
    .onConflictDoUpdate({ target: schema.learnerSettings.userId, set: { ebookRead: read } })
  return { ok: true }
})

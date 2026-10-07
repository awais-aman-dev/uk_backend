import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  // Material from the Django backend once it has some (see server/utils/django-learn.ts)
  if (await useDjangoLearning(event)) {
    // Django: an e-book section is marked read with the lesson completion endpoint
    const r = await djangoLearn<{ done: boolean }>(event, 'POST', `/api/learn/lessons/${encodeURIComponent(getRouterParam(event, 'slug')!)}/complete/`)
    return { ok: r.done }
  }
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

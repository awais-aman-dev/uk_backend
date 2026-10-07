import { asc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  // Material from the Django backend once it has some (see server/utils/django-learn.ts)
  if (await useDjangoLearning(event)) return djangoLearn(event, 'GET', '/api/learn/signs/')
  await requireAccess(event)
  const db = await useDb()
  const rows = await db.select().from(schema.signs).orderBy(asc(schema.signs.position))
  return { signs: rows.map(toSignDto) }
})

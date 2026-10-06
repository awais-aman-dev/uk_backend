import { asc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireAccess(event)
  const db = await useDb()
  const rows = await db.select().from(schema.signs).orderBy(asc(schema.signs.position))
  return { signs: rows.map(toSignDto) }
})

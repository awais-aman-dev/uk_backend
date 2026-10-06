import { contactSchema } from '#shared/schemas/contact'

export default defineEventHandler(async (event) => {
  const input = await readValidated(event, contactSchema)
  const user = await getSessionUser(event)
  const db = await useDb()
  await db.insert(schema.contactMessages).values({ ...input, userId: user?.id ?? null })
  return { ok: true }
})

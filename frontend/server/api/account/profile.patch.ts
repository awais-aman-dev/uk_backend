import { profileSchema } from '#shared/schemas/auth'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const input = await readValidated(event, profileSchema)
  const res = await djangoFetch(event, 'PATCH', '/api/cabinet/profile/', {
    auth: true,
    body: { first_name: input.firstName, last_name: input.lastName, phone: input.phone }
  })
  if (!res.ok) throwDjangoError(res)
  forgetCached(event)
  return { ok: true }
})

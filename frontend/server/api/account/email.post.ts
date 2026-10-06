import { emailChangeSchema } from '#shared/schemas/auth'

// Django emails a confirmation link to the new address (/account/email/confirm?token=…);
// the email changes only when that link is opened.
export default defineEventHandler(async (event) => {
  await requireUser(event)
  const { email } = await readValidated(event, emailChangeSchema)
  const res = await djangoFetch<{ detail: string }>(event, 'POST', '/api/cabinet/email/change/', { auth: true, body: { new_email: email } })
  if (!res.ok) {
    if (res.status === 409 || res.status === 400) throw fieldError(res.status, { email: res.data.detail })
    throwDjangoError(res)
  }
  return { message: res.data.detail }
})

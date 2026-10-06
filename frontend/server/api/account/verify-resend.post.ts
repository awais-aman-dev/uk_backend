// Send the email-verification link again.
export default defineEventHandler(async (event) => {
  await requireUser(event)
  const res = await djangoFetch<{ detail: string }>(event, 'POST', '/api/auth/email/verify/resend/', { auth: true })
  if (!res.ok) throwDjangoError(res)
  return { message: res.data.detail }
})

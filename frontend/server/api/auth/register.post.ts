import { registerSchema } from '#shared/schemas/auth'

// Sign-up in Django; the learner is signed in straight away (Django returns a token pair).
// Email verification is sent by Django but not required to use the site.
export default defineEventHandler(async (event) => {
  const input = await readValidated(event, registerSchema)
  const res = await djangoFetch<{ access: string; refresh: string; message: string }>(event, 'POST', '/api/auth/register/', {
    body: { email: input.email, first_name: input.firstName, password: input.password, confirm_password: input.confirmPassword }
  })
  if (!res.ok) {
    // Django answers "already exists" as a form-level 409 — show it next to the email field
    if (res.status === 409) throw fieldError(409, { email: String((res.data as unknown as { detail?: string }).detail ?? 'An account with this email already exists') }, 'Account already exists')
    throwDjangoError(res)
  }
  setTokens(event, res.data)
  const user = await getSessionUser(event)
  return { user }
})

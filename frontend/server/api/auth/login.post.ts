import { loginSchema } from '#shared/schemas/auth'

// Sign-in in Django. "Remember me" = a 30-day session, otherwise 24 hours (Django's rule).
// Django doesn't say whether the email or the password was wrong — on purpose, so neither do we.
export default defineEventHandler(async (event) => {
  const input = await readValidated(event, loginSchema)
  const res = await djangoFetch<{ access: string; refresh: string }>(event, 'POST', '/api/auth/login/', {
    body: { email: input.email, password: input.password, remember_me: input.remember ?? true }
  })
  if (!res.ok) {
    if (res.status === 401) throw fieldError(401, { form: 'Email or password is incorrect.' }, 'Invalid credentials')
    throwDjangoError(res)
  }
  setTokens(event, res.data)
  const user = await getSessionUser(event)
  return { user }
})

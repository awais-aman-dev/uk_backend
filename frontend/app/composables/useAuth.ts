import type { LoginInput, RegisterInput } from '#shared/schemas/auth'
import type { SessionUser } from '#shared/types/auth'

export const useAuthUser = () => useState<SessionUser | null>('auth:user', () => null)

export function useAuth() {
  const user = useAuthUser()

  async function login(input: LoginInput) {
    const res = await $fetch('/api/auth/login', { method: 'POST', body: input })
    user.value = res.user
    return res
  }

  async function register(input: RegisterInput) {
    const res = await $fetch('/api/auth/register', { method: 'POST', body: input })
    user.value = res.user
    return res
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    await navigateTo('/')
  }

  return { user, loggedIn: computed(() => !!user.value), login, register, logout }
}

/** Where to send a user after login when nothing else was requested. */
export const homeFor = (_user: SessionUser) => '/account'

/** Only allow same-site relative redirects (no `//evil.com`). */
export const safeNext = (next: unknown) =>
  typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : null

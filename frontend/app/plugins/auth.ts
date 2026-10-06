import type { SessionUser } from '#shared/types/auth'

// The server middleware has already resolved the session for this page request — hand it to the app state.
export default defineNuxtPlugin(() => {
  if (!import.meta.server) return
  const ctx = useRequestEvent()?.context as { auth?: { user: SessionUser | null } } | undefined
  useAuthUser().value = ctx?.auth?.user ?? null
})

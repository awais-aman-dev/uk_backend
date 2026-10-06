export type LearnTheme = 'auto' | 'light' | 'dark'

/** Theme for the learning app. A cookie (not localStorage) so the server renders the right theme — no flash. */
export function useLearnTheme() {
  const theme = useCookie<LearnTheme>('learn-theme', { default: () => 'auto', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
  return theme
}

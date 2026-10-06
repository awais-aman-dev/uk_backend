// Login page: already signed in → go where they were heading.
export default defineNuxtRouteMiddleware((to) => {
  const user = useAuthUser().value
  // `replace` so the browser Back button doesn't bounce straight back here
  if (user) return navigateTo(safeNext(to.query.next) ?? homeFor(user), { replace: true })
})

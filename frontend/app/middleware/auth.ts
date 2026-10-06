export default defineNuxtRouteMiddleware((to) => {
  if (!useAuthUser().value) return navigateTo({ path: '/login', query: { next: to.fullPath } }, { replace: true })
})

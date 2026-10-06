// While a signed-in learner has the tab open and visible, tell the server once a minute. It records
// study time (Progress page) and, as a side effect, keeps the Django session fresh: the access token
// is refreshed by this single request before several page requests could race to do it.
export default defineNuxtPlugin(() => {
  const user = useAuthUser()
  const ping = () => {
    if (user.value && document.visibilityState === 'visible') {
      $fetch('/api/learn/ping', { method: 'POST' }).catch((e) => {
        if (e?.statusCode === 401) user.value = null // signed out elsewhere, or the session ended
      })
    }
  }
  setInterval(ping, 60_000)
  document.addEventListener('visibilitychange', ping)
})

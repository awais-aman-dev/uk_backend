export default defineEventHandler(async (event) => {
  const user = await requireAccess(event)
  const attempt = await finishAttempt(await loadAttempt(user.id, Number(getRouterParam(event, 'id'))))
  return { id: attempt.id, score: attempt.score }
})

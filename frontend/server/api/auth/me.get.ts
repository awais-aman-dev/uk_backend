export default defineEventHandler(async (event) => ({ user: await getSessionUser(event) }))

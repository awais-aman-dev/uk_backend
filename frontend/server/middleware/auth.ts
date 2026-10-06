// Resolve the session for page requests so SSR knows who's signed in (and the visit is recorded).
// API routes resolve it lazily themselves; assets are skipped.
export default defineEventHandler(async (event) => {
  // Match on the pathname only: a query like ?q=jo@example.com must not look like a file extension
  const path = event.path.split('?')[0]!
  if (path.startsWith('/api/') || path.startsWith('/_') || /\.[a-z0-9]+$/i.test(path)) return
  await getSessionUser(event)
})

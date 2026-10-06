// Packages on sale (from Django). Public; briefly cacheable.
export default defineEventHandler(async (event) => {
  const packages = await listPackages(event)
  setHeader(event, 'cache-control', 'public, max-age=60, s-maxage=60')
  return { packages }
})

// Where the learning material comes from right now: Django's Learning API, or our own (until Django has content).
// Pages use it to show only what the active source offers.
export default defineEventHandler(async (event) => ({ source: (await useDjangoLearning(event)) ? ('django' as const) : ('local' as const) }))

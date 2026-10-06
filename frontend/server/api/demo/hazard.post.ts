import type { HazardResult } from '#shared/types/learn'

// Public: scores a landing-page attempt with the same rules as the real clips. Nothing is stored.
export default defineEventHandler(async (event): Promise<HazardResult> => {
  const clip = await loadDemoClip()
  const { clicks } = await readValidated(event, hazardClicks(clip.scene.durationMs))
  return scoreHazard(clip, clicks)
})

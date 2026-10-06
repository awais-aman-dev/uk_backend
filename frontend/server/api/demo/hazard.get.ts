// Public: the landing-page demo clip. Like the paid clips, hazard windows are not sent until the attempt is scored.
export default defineEventHandler(async (event) => {
  const clip = await loadDemoClip()
  setHeader(event, 'cache-control', 'public, max-age=300, s-maxage=300')
  return { clip: toClipDto(clip), signs: await signsForScenes([clip.scene]) }
})

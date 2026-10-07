/**
 * Django's video/document URLs are signed and expire after about an hour (Learning API guide §3.4): if a page
 * stays open that long, re-fetch the resource that carries them. Quietly refreshes every 50 minutes while mounted.
 */
const EVERY_MS = 50 * 60_000

export function useSignedUrlRefresh(refresh: () => Promise<unknown>) {
  let timer: ReturnType<typeof setInterval> | undefined
  onMounted(() => (timer = setInterval(() => void refresh(), EVERY_MS)))
  onBeforeUnmount(() => clearInterval(timer))
}

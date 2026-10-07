/**
 * Whether the learning area runs on Django's Learning API. In that mode the pages offer exactly what the API
 * offers — features of our own material (PDF, search, spaced repetition…) are hidden. Fetched once per visit.
 */
export function useLearnSource() {
  const { data } = useFetch('/api/learn/source', { key: 'learn-source', dedupe: 'defer' })
  return { isDjango: computed(() => data.value?.source === 'django') }
}

/** Live width of an element (charts redraw to their container, so there's no stretched SVG text). */
export function useElementWidth(fallback = 600) {
  const el = ref<HTMLElement>()
  const width = ref(fallback)
  onMounted(() => {
    const ro = new ResizeObserver(([e]) => (width.value = Math.max(200, Math.round(e!.contentRect.width))))
    ro.observe(el.value!)
    onBeforeUnmount(() => ro.disconnect())
  })
  return { el, width }
}

/** 0 + "nice" round ticks covering max (0 / 5 / 10 …, 0 / 2,500 / 5,000 …) */
export function niceTicks(max: number, count = 4) {
  if (max <= 0) return [0, 1]
  const raw = max / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => +(i * step).toFixed(6))
}

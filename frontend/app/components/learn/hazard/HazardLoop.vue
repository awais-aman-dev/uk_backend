<script setup lang="ts">
import type { HazardScene, SignDto } from '#shared/types/learn'

// A muted, looping preview of a clip. Only animates while on screen — and, in "hover" mode (clip cards), only while
// hovered, so a page full of previews doesn't re-render several 3D scenes every frame.
const props = withDefaults(
  defineProps<{ scene: HazardScene; signs?: Record<string, SignDto>; from?: number; to?: number; still?: boolean; mode?: 'auto' | 'hover' }>(),
  { signs: () => ({}), from: 0, to: undefined, still: false, mode: 'auto' }
)
const end = computed(() => props.to ?? props.scene.durationMs)
const t = ref(props.still || props.mode === 'hover' ? props.from + (end.value - props.from) * 0.45 : props.from)
const el = ref<HTMLElement>()
let raf = 0
let last = 0
let visible = false
let hovered = false
const shouldRun = () => visible && (props.mode === 'auto' || hovered)

function frame(now: number) {
  if (last) t.value += now - last
  if (t.value > end.value) t.value = props.from
  last = now
  raf = requestAnimationFrame(frame)
}
onMounted(() => {
  if (props.still || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const sync = () => {
    cancelAnimationFrame(raf)
    last = 0
    if (shouldRun()) raf = requestAnimationFrame(frame)
  }
  const io = new IntersectionObserver(([e]) => {
    visible = !!e?.isIntersecting
    sync()
  })
  io.observe(el.value!)
  if (props.mode === 'hover') {
    // hover the whole card, not just the preview
    const host = el.value!.closest('a, article') ?? el.value!
    const enter = () => ((hovered = true), sync())
    const leave = () => ((hovered = false), sync())
    host.addEventListener('pointerenter', enter)
    host.addEventListener('pointerleave', leave)
    onBeforeUnmount(() => {
      host.removeEventListener('pointerenter', enter)
      host.removeEventListener('pointerleave', leave)
    })
  }
  onBeforeUnmount(() => {
    io.disconnect()
    cancelAnimationFrame(raf)
  })
})
</script>

<template>
  <div ref="el" class="loop">
    <LearnHazardStage :scene="scene" :t="t" :signs="signs" />
  </div>
</template>

<style scoped>
.loop { aspect-ratio: 16 / 9; overflow: hidden; border-radius: inherit; background: #000; }
</style>

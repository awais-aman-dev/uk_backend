<script setup lang="ts">
// Reading progress as a little car driving down a road along the right edge (wide screens only).
const root = ref<HTMLElement>()
onMounted(() => {
  let frame = 0
  const update = () => {
    frame = 0
    const el = root.value
    if (!el) return
    const max = document.documentElement.scrollHeight - window.innerHeight
    el.style.setProperty('--p', String(max > 0 ? Math.min(1, window.scrollY / max) : 0))
  }
  const queue = () => (frame ||= requestAnimationFrame(update))
  update()
  window.addEventListener('scroll', queue, { passive: true })
  window.addEventListener('resize', queue)
  onBeforeUnmount(() => {
    window.removeEventListener('scroll', queue)
    window.removeEventListener('resize', queue)
    cancelAnimationFrame(frame)
  })
})
</script>

<template>
  <div ref="root" class="progress-road" aria-hidden="true">
    <span class="progress-road__done" />
    <!-- seen from above, nose down the road -->
    <svg class="progress-road__car" viewBox="0 0 24 40">
      <rect x="1" y="1" width="22" height="38" rx="8" fill="#5b86bd" stroke="#fff" stroke-width="1.5" />
      <path d="M5 25h14l-2 6H7z" fill="#e9f1f8" />
      <path d="M6 9h12l-1.5 4h-9z" fill="#e9f1f8" opacity="0.8" />
      <rect x="4" y="35" width="5" height="3" rx="1.5" fill="#fbe7a8" />
      <rect x="15" y="35" width="5" height="3" rx="1.5" fill="#fbe7a8" />
    </svg>
  </div>
</template>

<style scoped>
.progress-road {
  --p: 0;
  position: fixed;
  z-index: 40;
  right: 14px;
  top: calc(var(--header-h) + 40px);
  bottom: 40px;
  width: 12px;
  border-radius: 6px;
  background:
    linear-gradient(90deg, transparent 5px, #f3eee2 5px 7px, transparent 7px) 0 0 / 100% 22px,
    rgb(93 100 111 / 0.55);
  box-shadow: 0 0 0 3px rgb(255 255 255 / 0.5);
  backdrop-filter: blur(6px);
  pointer-events: none;
  display: none;
}
/* the stretch already driven, tinted green */
.progress-road__done {
  position: absolute;
  inset: 0 0 auto;
  height: calc(var(--p) * 100%);
  border-radius: inherit;
  background: rgb(108 196 144 / 0.55);
}
.progress-road__car {
  position: absolute;
  left: 50%;
  top: calc(var(--p) * (100% - 30px));
  width: 18px;
  height: 30px;
  transform: translateX(-50%);
  filter: drop-shadow(0 3px 4px rgb(30 40 55 / 0.3));
}
@media (min-width: 1200px) {
  .progress-road { display: block; }
}
</style>

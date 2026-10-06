<script setup lang="ts">
// Mobile-only bottom CTA in the thumb zone. Shown after the hero, hidden over pricing and the quiz
// (they have their own CTAs and the bar would cover their buttons).
const visible = ref(false)

onMounted(() => {
  const hero = document.querySelector('#hero')
  const zones = [...document.querySelectorAll('#pricing, #quiz')]
  if (!hero) return

  let pastHero = false
  const inZone = new Set<Element>()

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.target === hero) pastHero = !e.isIntersecting && e.boundingClientRect.top < 0
      else if (e.isIntersecting) inZone.add(e.target)
      else inZone.delete(e.target)
    }
    visible.value = pastHero && inZone.size === 0
  })
  io.observe(hero)
  zones.forEach((z) => io.observe(z))
  onBeforeUnmount(() => io.disconnect())
})
</script>

<template>
  <div class="sticky-cta glass-dark" :class="{ 'is-visible': visible }" :aria-hidden="!visible">
    <div>
      <strong>Pass first time</strong>
      <span>Full access from £5</span>
    </div>
    <NuxtLink to="/#pricing" class="btn btn--primary" :tabindex="visible ? 0 : -1">
      Get started
    </NuxtLink>
  </div>
</template>

<style scoped>
.sticky-cta {
  position: fixed;
  z-index: 40;
  left: 12px;
  right: 12px;
  bottom: calc(12px + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 8px 8px 20px;
  border-radius: 980px;
  transform: translateY(160%) scale(0.9);
  transition: transform 0.6s var(--spring);
}
.sticky-cta.is-visible { transform: none; }
.sticky-cta div { display: grid; line-height: 1.25; }
.sticky-cta strong { font-weight: 600; font-size: 0.9375rem; }
.sticky-cta span { font-size: 0.8125rem; color: var(--muted-dark); }
@media (min-width: 900px) { .sticky-cta { display: none; } }
</style>

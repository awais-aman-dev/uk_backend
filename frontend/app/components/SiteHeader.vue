<script setup lang="ts">
const open = ref(false)
const route = useRoute()
const user = useAuthUser()
watch(() => route.fullPath, () => (open.value = false))

const links = [
  { label: 'Home', to: '/' },
  { label: 'Pricing', to: '/#pricing' },
  { label: 'Help', to: '/#faq' },
  { label: 'Contact', to: '/contact' }
]
const accountLink = computed(() =>
  user.value ? { label: 'My account', to: homeFor(user.value) } : { label: 'Log in', to: '/login' }
)
// Signed-in users already have "My account"; inside the sign-up / payment funnel the CTA would pull people out of it
const funnel = ['/register', '/login', '/checkout', '/payment/success']
const showCta = computed(() => !user.value && !funnel.includes(route.path))

// Real liquid glass on the island (edge refraction in Chromium; frosted glass elsewhere)
const island = ref<HTMLElement>()
useLiquidGlass(island, { bezel: 20, strength: 40, blur: 4 })

// Like Apple's bars, the glass adapts to what's under it: light glass with dark text over light sections,
// dark glass over the dark ones (hero, pricing, final CTA). Sampled on scroll, once per frame.
const DARK = '.hero, .section--dark, .final, [data-surface="dark"]'
const onLight = ref(false)
onMounted(() => {
  let frame = 0
  const sample = () => {
    frame = 0
    const el = island.value
    if (!el) return
    const r = el.getBoundingClientRect()
    const under = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2).find((n) => !n.closest('.header'))
    onLight.value = !!under && !under.closest(DARK)
  }
  const queue = () => (frame ||= requestAnimationFrame(sample))
  sample()
  window.addEventListener('scroll', queue, { passive: true })
  window.addEventListener('resize', queue)
  watch(() => route.fullPath, () => nextTick(queue))
  onBeforeUnmount(() => {
    window.removeEventListener('scroll', queue)
    window.removeEventListener('resize', queue)
    cancelAnimationFrame(frame)
  })
})
</script>

<template>
  <header class="header" :class="{ 'header--open': open }">
    <!-- Floating "island" — toasts drip out of it (see AppToasts) -->
    <div ref="island" class="island liquid" :class="{ 'island--light': onLight }">
      <AppLogo />

      <nav class="island__nav" aria-label="Main">
        <NuxtLink v-for="l in links" :key="l.label" :to="l.to">{{ l.label }}</NuxtLink>
      </nav>

      <div class="island__actions">
        <NuxtLink :to="accountLink.to" class="island__login" :class="{ 'island__login--always': !showCta }">
          {{ accountLink.label }}
        </NuxtLink>
        <NuxtLink v-if="showCta" to="/#pricing" class="btn btn--primary btn--sm">Start now</NuxtLink>
        <button
          class="island__burger"
          type="button"
          :aria-expanded="open"
          aria-controls="mobile-nav"
          @click="open = !open"
        >
          <span class="sr-only">Menu</span>
          <span /><span />
        </button>
      </div>

      <nav id="mobile-nav" class="island__mobile" aria-label="Mobile" :hidden="!open">
        <NuxtLink v-for="l in links" :key="l.label" :to="l.to">{{ l.label }}</NuxtLink>
        <NuxtLink :to="accountLink.to">{{ accountLink.label }}</NuxtLink>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 50;
  height: var(--header-h);
  padding: 10px var(--gutter) 0;
  pointer-events: none;
}
@media (min-width: 768px) { .header { padding-top: 14px; } }

.island {
  pointer-events: auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 20px;
  max-width: 980px;
  min-height: 52px;
  margin-inline: auto;
  padding: 6px 6px 6px 16px;
  border-radius: 26px;
  transition: border-radius 0.4s var(--ease), background-color 0.45s var(--ease), color 0.45s var(--ease), box-shadow 0.45s var(--ease);
}
.header--open .island { border-radius: 26px; }

/* Light glass over light sections: clear pane, dark text, brighter rim */
.island--light {
  --liquid-tint: rgb(255 255 255 / 0.48);
  color: #1d1d1f;
  box-shadow:
    inset 0 1px 0.5px rgb(255 255 255 / 0.9),
    inset 0 -1px 0.5px rgb(255 255 255 / 0.4),
    inset 0 0 22px rgb(255 255 255 / 0.35),
    0 14px 40px -14px rgb(0 0 0 / 0.22),
    0 2px 6px rgb(0 0 0 / 0.06);
}
.island--light::after { background: linear-gradient(135deg, rgb(255 255 255 / 0.95), rgb(255 255 255 / 0.3) 30%, rgb(0 0 0 / 0.06) 55%, rgb(255 255 255 / 0.4) 80%, rgb(255 255 255 / 0.9)); }
.island--light .island__nav a,
.island--light .island__login { color: rgb(0 0 0 / 0.72); }
.island--light .island__nav a:hover,
.island--light .island__login:hover { color: #000; background: rgb(0 0 0 / 0.06); }
.island--light .island__nav a.router-link-exact-active:not([href*='#']) { color: #000; }
.island--light .island__burger { background: rgb(0 0 0 / 0.06); }
.island--light .island__burger span:not(.sr-only) { background: #1d1d1f; }
.island--light .island__mobile a { color: #1d1d1f; border-color: rgb(0 0 0 / 0.08); }

.island__nav { display: none; gap: 2px; margin-inline: auto; }
.island__nav a,
.island__login {
  padding: 7px 14px;
  border-radius: 980px;
  font-size: 0.875rem;
  font-weight: 400;
  color: rgb(255 255 255 / 0.82);
  text-decoration: none;
  transition: color 0.2s, background-color 0.2s;
}
.island__nav a:hover,
.island__login:hover { color: #fff; background: rgb(255 255 255 / 0.1); text-decoration: none; }
.island__nav a.router-link-exact-active:not([href*='#']) { color: #fff; }

.island__actions { display: flex; align-items: center; gap: 4px; margin-left: auto; }
.island__actions .btn { font-size: 0.875rem; min-height: 38px; padding: 8px 16px; }

.island__burger {
  display: grid;
  gap: 5px;
  place-content: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 50%;
  background: rgb(255 255 255 / 0.1);
}
.island__burger span:not(.sr-only) {
  width: 16px;
  height: 1.5px;
  border-radius: 2px;
  background: #fff;
  transition: transform 0.4s var(--ease);
}
.header--open .island__burger span:nth-of-type(2) { transform: translateY(3.25px) rotate(45deg); }
.header--open .island__burger span:nth-of-type(3) { transform: translateY(-3.25px) rotate(-45deg); }

.island__mobile {
  flex-basis: 100%;
  display: grid;
  padding: 4px 10px 10px 0;
  animation: drop 0.45s var(--ease);
}
.island__mobile[hidden] { display: none; }
.island__mobile a {
  padding: 12px 0;
  border-bottom: 1px solid var(--line-dark);
  color: #f5f5f7;
  font-family: var(--font-display);
  font-size: 1.375rem;
  font-weight: 600;
  text-decoration: none;
}
.island__mobile a:last-child { border-bottom: 0; }
@keyframes drop { from { opacity: 0; transform: translateY(-8px); } }

@media (max-width: 420px) {
  .island__login:not(.island__login--always) { display: none; }
}
@media (min-width: 900px) {
  .island__nav { display: flex; }
  .island__actions { margin-left: 0; }
  .island__burger, .island__mobile { display: none !important; }
}
</style>

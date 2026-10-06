<script setup lang="ts">
const year = new Date().getFullYear()
const columns = [
  {
    title: 'Learn',
    links: [
      { label: 'Video lessons', to: '/#features' },
      { label: 'Hazard perception', to: '/#features' },
      { label: 'Try 5 questions', to: '/#quiz' }
    ]
  },
  {
    title: '1Theory',
    links: [
      { label: 'Pricing', to: '/#pricing' },
      { label: 'Help & FAQ', to: '/#faq' },
      { label: 'Contact us', to: '/contact' },
      { label: 'Log in', to: '/login' }
    ]
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of use', to: '/terms' },
      { label: 'Privacy policy', to: '/privacy' },
      { label: 'Cookie policy', to: '/cookies' }
    ]
  }
]
</script>

<template>
  <footer class="footer">
    <div class="container">
      <div class="footer__top">
        <div class="footer__brand">
          <AppLogo />
          <p>The easy way to pass your UK theory test. Made to teach, not just to test.</p>
        </div>
        <nav v-for="col in columns" :key="col.title" class="footer__col" :aria-label="col.title">
          <h3>{{ col.title }}</h3>
          <NuxtLink v-for="l in col.links" :key="l.label" :to="l.to">{{ l.label }}</NuxtLink>
        </nav>
      </div>
      <div class="footer__bottom">
        <p>© {{ year }} 1Theory. Demo project — not a real service, no real payments.</p>
        <p>Not affiliated with the DVSA. Questions are our own, written in the style of the theory test.</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  background: var(--paper);
  color: var(--muted);
  padding: 48px 0 calc(28px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--line-soft);
  font-size: 0.8125rem;
}
.footer__top { display: grid; gap: 32px; grid-template-columns: repeat(2, 1fr); }
.footer__brand { grid-column: 1 / -1; max-width: 320px; color: var(--ink); }
.footer__brand p { margin-top: 12px; color: var(--muted); font-size: 0.875rem; }
.footer__col { display: grid; gap: 8px; align-content: start; }
.footer__col h3 { font-family: var(--font-body); font-size: 0.8125rem; font-weight: 600; letter-spacing: 0; color: var(--ink); margin-bottom: 4px; }
.footer__col a { color: var(--muted); font-size: 0.8125rem; }
.footer__col a:hover { color: var(--ink); text-decoration: underline; }
.footer__bottom { display: grid; gap: 4px; margin-top: 40px; padding-top: 18px; border-top: 1px solid var(--line); }
@media (min-width: 768px) {
  .footer__top { grid-template-columns: 2fr repeat(3, 1fr); }
  .footer__brand { grid-column: auto; }
}
</style>

<script setup lang="ts">
const props = defineProps<{ title: string; updated: string; intro: string }>()
useHead({ title: `${props.title} — 1Theory` })

const legal = [
  { label: 'Terms of use', to: '/terms' },
  { label: 'Privacy policy', to: '/privacy' },
  { label: 'Cookie policy', to: '/cookies' }
]
</script>

<template>
  <div>
    <header class="legal-hero">
      <div class="container">
        <BackButton dark class="legal-hero__back" />
        <p class="eyebrow">Legal</p>
        <h1>{{ title }}</h1>
        <p class="legal-hero__intro">{{ intro }}</p>
        <p class="legal-hero__updated">Last updated {{ updated }}</p>
      </div>
    </header>
    <div class="container legal">
      <nav class="legal__nav" aria-label="Legal pages">
        <NuxtLink v-for="l in legal" :key="l.to" :to="l.to">{{ l.label }}</NuxtLink>
        <NuxtLink to="/contact">Contact us</NuxtLink>
      </nav>
      <article class="prose">
        <UiAlert variant="info">
          1Theory is a demo project. These documents are illustrative, not legal advice, and no real service is provided.
        </UiAlert>
        <slot />
      </article>
    </div>
  </div>
</template>

<style scoped>
.legal-hero {
  margin-top: calc(var(--header-h) * -1);
  padding: calc(var(--header-h) + 28px) 0 48px;
  background: radial-gradient(600px 300px at 85% 0%, rgb(41 151 255 / 0.3), transparent 70%), var(--black);
  color: #f5f5f7;
}
.legal-hero__back { margin-bottom: 28px; }
.legal-hero h1 { font-size: clamp(2.75rem, 7vw, 4.25rem); font-weight: 700; letter-spacing: -0.04em; }
.legal-hero__intro { margin-top: 16px; max-width: 620px; font-size: 1.125rem; color: var(--muted-dark); }
.legal-hero__updated { margin-top: 20px; font-size: 0.875rem; color: var(--muted-dark); }
.legal { display: grid; gap: 32px; padding-block: 48px 96px; }
.legal__nav { display: flex; flex-wrap: wrap; gap: 8px; align-self: start; }
.legal__nav a {
  padding: 8px 14px;
  border-radius: 999px;
  background: var(--card);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9375rem;
  box-shadow: inset 0 0 0 1.5px var(--line);
}
.legal__nav a.router-link-exact-active { background: var(--ink); color: #fff; box-shadow: none; }
.legal__nav a { color: var(--ink); }
.legal__nav a:hover { text-decoration: none; }
@media (min-width: 900px) {
  .legal { grid-template-columns: 220px 1fr; gap: 64px; }
  .legal__nav { position: sticky; top: calc(var(--header-h) + 24px); flex-direction: column; }
  .legal__nav a { background: none; box-shadow: none; border-radius: 10px; }
  .legal__nav a:hover { background: var(--card); }
}

.prose { max-width: 720px; display: grid; gap: 16px; }
.prose :deep(h2) { margin-top: 24px; font-size: 1.625rem; }
.prose :deep(p), .prose :deep(li) { color: #2b3240; }
.prose :deep(ul) { margin: 0; padding-left: 22px; display: grid; gap: 6px; }
.prose :deep(a) { font-weight: 600; }
.prose :deep(table) { width: 100%; border-collapse: collapse; font-size: 0.9375rem; }
.prose :deep(th), .prose :deep(td) { padding: 10px 12px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
.prose :deep(th) { font-weight: 600; background: var(--card); }
.prose :deep(code) { padding: 1px 6px; border-radius: 6px; background: var(--card); font-size: 0.875em; }
</style>

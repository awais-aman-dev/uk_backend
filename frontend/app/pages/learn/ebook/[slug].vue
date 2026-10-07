<script setup lang="ts">
definePageMeta({ layout: 'learn', middleware: 'auth' })
const route = useRoute()
const { data, error, refresh } = await useFetch(() => `/api/learn/ebook/${route.params.slug}`)
useSignedUrlRefresh(refresh) // signed video/document URLs from Django expire after ~1 h
const { isDjango } = useLearnSource()
useHead({ title: () => `${data.value?.chapter.title ?? 'Highway Code'} — 1Theory` })

// Mark as read when the reader reaches the end of the chapter
const end = ref<HTMLElement>()
onMounted(() => {
  const io = new IntersectionObserver(([e]) => {
    if (e?.isIntersecting) {
      $fetch(`/api/learn/ebook/${route.params.slug}/read`, { method: 'POST' }).catch(() => {})
      io.disconnect()
    }
  })
  watchEffect(() => end.value && io.observe(end.value))
  onBeforeUnmount(() => io.disconnect())
})
const tocOpen = ref(false)
</script>

<template>
  <div>
    <LearnLocked v-if="error?.statusCode === 402" />
    <div v-else-if="data" class="reader">
      <aside class="reader__toc" :class="{ open: tocOpen }">
        <NuxtLink to="/learn/ebook" class="reader__home"><AppIcon name="book" :size="18" /> The Highway Code</NuxtLink>
        <ol>
          <li v-for="c in data.toc" :key="c.slug">
            <NuxtLink :to="`/learn/ebook/${c.slug}`" :class="{ on: c.slug === data.chapter.slug }" @click="tocOpen = false"><span>{{ c.number }}</span>{{ c.title }}</NuxtLink>
          </li>
        </ol>
        <a v-if="!isDjango" href="/api/learn/ebook.pdf" class="btn btn--ghost btn--sm" download><AppIcon name="download" :size="16" /> PDF</a>
      </aside>

      <article class="chapter">
        <div class="chapter__top">
          <BackButton fallback="/learn/ebook" label="Contents" />
          <button type="button" class="chapter__tocbtn" @click="tocOpen = !tocOpen"><AppIcon name="lessons" :size="16" /> Chapters</button>
        </div>
        <p class="chapter__n">Chapter {{ data.chapter.number }}</p>
        <h1>{{ data.chapter.title }}</h1>
        <p class="chapter__summary">{{ data.chapter.summary }}</p>
        <LearnBlockRenderer :blocks="data.chapter.blocks" :signs="data.signs" :questions="data.questions" :clips="data.clips" />
        <nav ref="end" class="chapter__nav">
          <NuxtLink v-if="data.prev" :to="`/learn/ebook/${data.prev.slug}`"><small>Previous</small><b>{{ data.prev.title }}</b></NuxtLink>
          <NuxtLink v-if="data.next" :to="`/learn/ebook/${data.next.slug}`" class="next"><small>Next chapter</small><b>{{ data.next.title }}</b></NuxtLink>
        </nav>
      </article>
    </div>
  </div>
</template>

<style scoped>
.reader { display: grid; gap: 28px; }
@media (min-width: 1180px) { .reader { grid-template-columns: 240px 1fr; } }
.reader__toc { display: none; align-content: start; gap: 12px; color: var(--ink); }
.reader__toc.open { display: grid; padding: 16px; border-radius: var(--radius-lg); background: var(--card); }
@media (min-width: 1180px) { .reader__toc { display: grid; position: sticky; top: 32px; height: max-content; } .chapter__tocbtn { display: none !important; } }
.reader__home { display: flex; gap: 8px; align-items: center; color: var(--ink); font-weight: 600; text-decoration: none; }
.reader__toc ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
.reader__toc ol a { display: flex; gap: 10px; padding: 8px 10px; border-radius: 10px; color: var(--muted); font-size: 0.875rem; text-decoration: none; }
.reader__toc ol a span { width: 16px; color: var(--muted); }
.reader__toc ol a:hover { background: rgb(127 127 127 / 0.1); }
.reader__toc ol a.on { background: var(--accent-soft); color: var(--accent); font-weight: 500; }
.reader__toc .btn { justify-self: start; }
.chapter { display: grid; gap: 18px; max-width: 720px; color: var(--ink); }
.chapter__top { display: flex; justify-content: space-between; align-items: center; }
.chapter__tocbtn { display: inline-flex; gap: 6px; align-items: center; height: 36px; padding: 0 14px; border: 0; border-radius: 980px; background: rgb(127 127 127 / 0.12); color: var(--ink); }
.chapter__n { margin-top: 12px; color: var(--accent); font-weight: 600; font-size: 0.875rem; }
.chapter h1 { font-size: clamp(2.25rem, 6vw, 3.25rem); }
.chapter__summary { font-size: 1.25rem; color: var(--muted); margin-bottom: 8px; }
.chapter :deep(.blocks) { font-family: var(--font-body); font-size: 1.125rem; line-height: 1.65; }
.chapter__nav { display: grid; gap: 10px; margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--line-soft); }
@media (min-width: 640px) { .chapter__nav { grid-template-columns: 1fr 1fr; } }
.chapter__nav a { display: grid; padding: 16px 18px; border-radius: 18px; background: var(--card); box-shadow: var(--shadow); color: var(--ink); text-decoration: none; }
.chapter__nav small { color: var(--muted); }
.chapter__nav .next { grid-column: -2; text-align: right; }
</style>

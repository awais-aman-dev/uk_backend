<script setup lang="ts">
definePageMeta({ layout: 'learn', middleware: 'auth' })
useHead({ title: 'Highway Code — 1Theory' })
const { data } = await useFetch('/api/learn/ebook')
const { isDjango } = useLearnSource()
const read = computed(() => data.value?.chapters.filter((c) => c.read).length ?? 0)
const resume = computed(() => data.value?.chapters.find((c) => c.slug === data.value?.current) ?? data.value?.chapters[0])
</script>

<template>
  <div v-if="data">
    <LearnHead eyebrow="E-book" title="The Highway Code, in plain English." />
    <section class="book">
      <div class="cover" aria-hidden="true">
        <span class="cover__mark"><svg viewBox="0 0 24 24"><path d="M8 5h3.2v11H17v3H8z" /></svg></span>
        <b>The Highway Code</b>
        <span>in plain English</span>
        <small>1Theory study guide</small>
      </div>
      <div class="book__info">
        <p class="book__meta">{{ data.chapters.length ? `${data.chapters.length} chapters · ${read} read` : "Chapters are on their way — check back soon." }}</p>
        <div v-if="data.chapters.length" class="book__bar"><i :style="{ width: `${(read / data.chapters.length) * 100}%` }" /></div>
        <p>Every rule you need for the theory test, rewritten so it actually makes sense. Read it here — we remember where you got to<template v-if="!isDjango"> — or download it to read offline</template>.</p>
        <div class="book__actions">
          <NuxtLink v-if="resume" :to="`/learn/ebook/${resume.slug}`" class="btn btn--primary btn--lg">{{ data.current ? 'Continue reading' : 'Start reading' }}</NuxtLink>
          <a v-if="!isDjango" href="/api/learn/ebook.pdf" class="btn btn--ghost btn--lg" download><AppIcon name="download" :size="18" /> Download PDF</a>
        </div>
      </div>
    </section>

    <ol class="toc">
      <li v-for="c in data.chapters" :key="c.slug">
        <NuxtLink :to="`/learn/ebook/${c.slug}`" :class="{ current: c.slug === data.current }">
          <span class="toc__n">{{ c.number }}</span>
          <span class="toc__t"><b>{{ c.title }}</b><small>{{ c.summary }}</small></span>
          <AppIcon v-if="c.read" name="check" :size="18" class="toc__read" />
        </NuxtLink>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.book { display: grid; gap: 28px; align-items: center; padding: 28px; border-radius: var(--radius-xl); background: var(--card); box-shadow: var(--shadow); color: var(--ink); }
@media (min-width: 760px) { .book { grid-template-columns: 220px 1fr; padding: 36px; } }
.cover {
  position: relative;
  display: grid;
  align-content: end;
  gap: 2px;
  aspect-ratio: 3 / 4;
  width: 220px;
  justify-self: center;
  padding: 22px;
  border-radius: 8px 18px 18px 8px;
  background: radial-gradient(120% 80% at 80% 0%, #1c3d7a, #000 60%);
  color: #fff;
  box-shadow: inset 6px 0 0 rgb(255 255 255 / 0.08), 0 30px 60px -20px rgb(0 0 0 / 0.5);
  transform: perspective(900px) rotateY(-12deg);
  transition: transform 0.8s var(--spring);
}
.book:hover .cover { transform: perspective(900px) rotateY(0); }
.cover__mark { position: absolute; top: 20px; left: 20px; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 9px; background: #fff; }
.cover__mark svg { width: 24px; fill: #ff3b30; }
.cover b { font-family: var(--font-display); font-size: 1.5rem; line-height: 1.05; }
.cover span { color: #2997ff; font-family: var(--font-display); font-size: 1.25rem; font-weight: 600; }
.cover small { margin-top: 10px; color: var(--muted-dark); font-size: 0.6875rem; }
.book__info { display: grid; gap: 12px; }
.book__meta { color: var(--muted); font-size: 0.875rem; }
.book__bar { height: 6px; border-radius: 3px; background: rgb(127 127 127 / 0.15); overflow: hidden; }
.book__bar i { display: block; height: 100%; background: var(--gradient); }
.book__info > p:not(.book__meta) { color: var(--muted); }
.book__actions { display: flex; flex-wrap: wrap; gap: 10px; }
.toc { list-style: none; margin: 20px 0 0; padding: 0; display: grid; gap: 1px; border-radius: var(--radius-lg); overflow: hidden; background: var(--line-soft); box-shadow: var(--shadow); }
.toc a { display: flex; align-items: center; gap: 16px; padding: 16px 20px; background: var(--card); color: var(--ink); text-decoration: none; }
.toc a:hover { background: var(--card-2); text-decoration: none; }
.toc a.current { box-shadow: inset 3px 0 0 var(--accent); }
.toc__n { flex: none; width: 28px; font-family: var(--font-display); font-size: 1.25rem; font-weight: 600; color: var(--muted); }
.toc__t { display: grid; flex: 1; line-height: 1.3; }
.toc__t small { color: var(--muted); }
.toc__read { color: var(--go); }
</style>

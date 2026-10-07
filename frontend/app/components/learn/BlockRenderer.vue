<script setup lang="ts">
import { isVideoClip, type AnyHazardClip, type Block, type HazardClipDto, type QuestionDto, type SignDto } from '#shared/types/learn'

const props = defineProps<{
  blocks: Block[]
  signs: Record<string, SignDto>
  questions?: Record<string, QuestionDto>
  clips?: Record<string, AnyHazardClip>
}>()
// an animated clip (our scene) for a `scene` block; filmed clips come with `hazard` blocks
const sceneClip = (slug: string) => { const c = props.clips?.[slug]; return c && !isVideoClip(c) ? (c as HazardClipDto) : null }
const filmed = (slugs: string[]) => slugs.map((s) => props.clips?.[s]).filter((c): c is AnyHazardClip => !!c && isVideoClip(c))
const emit = defineEmits<{ checked: [correct: boolean] }>()
const checkQuestions = (keys: string[]) => keys.map((k) => props.questions?.[k]).filter((q): q is QuestionDto => !!q)
</script>

<template>
  <div class="blocks">
    <template v-for="(b, i) in blocks" :key="i">
      <LearnRichText v-if="b.type === 'text'" :text="b.text" />
      <h2 v-else-if="b.type === 'heading'" class="blocks__h">{{ b.text }}</h2>

      <section v-else-if="b.type === 'keypoints'" class="kp">
        <h3 v-if="b.title">{{ b.title }}</h3>
        <ul>
          <li v-for="(item, j) in b.items" :key="j"><AppIcon name="check" :size="18" /><LearnRichText :text="item" tag="span" /></li>
        </ul>
      </section>

      <aside v-else-if="b.type === 'callout'" class="callout" :class="`callout--${b.tone}`">
        <AppIcon :name="b.tone === 'warning' ? 'hazard' : b.tone === 'rule' ? 'document' : 'sparkle'" :size="20" />
        <div>
          <b v-if="b.title">{{ b.title }}</b>
          <LearnRichText :text="b.text" />
        </div>
      </aside>

      <figure v-else-if="b.type === 'figure'" class="fig">
        <LearnFigureStoppingDistances v-if="b.figure === 'stopping-distances'" />
        <LearnFigureSignShapes v-else-if="b.figure === 'sign-shapes'" />
        <LearnFigureTwoSecondRule v-else-if="b.figure === 'two-second-rule'" />
        <LearnFigureMirrorSignal v-else-if="b.figure === 'mirror-signal'" />
        <figcaption v-if="b.caption">{{ b.caption }}</figcaption>
      </figure>

      <figure v-else-if="b.type === 'signs'" class="fig">
        <div class="sgrid">
          <NuxtLink v-for="code in b.codes.filter((c) => signs[c])" :key="code" :to="`/learn/signs?sign=${code}`" class="sgrid__item">
            <LearnSignGraphic :spec="signs[code]!.spec" :label="signs[code]!.name" />
            <span>{{ signs[code]!.name }}</span>
          </NuxtLink>
        </div>
        <figcaption v-if="b.caption">{{ b.caption }}</figcaption>
      </figure>

      <figure v-else-if="b.type === 'scene' && sceneClip(b.clip)" class="fig">
        <div class="scene">
          <LearnHazardLoop :scene="sceneClip(b.clip)!.scene" :signs="signs" />
          <NuxtLink :to="`/learn/hazard/${b.clip}`" class="scene__cta glass-dark">
            <AppIcon name="play" :size="14" /> Try this clip
          </NuxtLink>
        </div>
        <figcaption v-if="b.caption">{{ b.caption }}</figcaption>
      </figure>

      <section v-else-if="b.type === 'check' && checkQuestions(b.questions).length" class="check">
        <h3><AppIcon name="target" :size="20" /> {{ b.title || 'Check your understanding' }}</h3>
        <div v-for="q in checkQuestions(b.questions)" :key="q.id" class="check__q">
          <LearnQuestionCard :question="q" :signs="signs" context="lesson" @answered="(r) => emit('checked', r.correct)" />
        </div>
      </section>

      <!-- Theory from the Django admin: HTML, already sanitised by our server -->
      <section v-else-if="b.type === 'html'" class="html-block">
        <h2 v-if="b.title" class="blocks__h">{{ b.title }}</h2>
        <div class="html-block__body" v-html="b.html" />
      </section>

      <!-- Django media blocks: signed URLs, used directly and never stored -->
      <figure v-else-if="b.type === 'video'" class="media">
        <h2 v-if="b.title" class="blocks__h">{{ b.title }}</h2>
        <video class="media__video" :src="b.url" controls playsinline preload="metadata" />
      </figure>
      <a v-else-if="b.type === 'document'" class="doc" :href="b.url" target="_blank" rel="noopener noreferrer">
        <AppIcon name="document" :size="22" />
        <span><b>{{ b.title || 'Open the document' }}</b><small>Opens in a new tab</small></span>
        <AppIcon name="download" :size="18" />
      </a>
      <section v-else-if="b.type === 'hazard' && filmed(b.clips).length" class="hz">
        <h2 v-if="b.title" class="blocks__h">{{ b.title }}</h2>
        <NuxtLink v-for="c in filmed(b.clips)" :key="c.slug" :to="`/learn/hazard/${c.slug}`" class="hz__clip">
          <span class="hz__play"><AppIcon name="play" :size="16" /></span>
          <span><b>{{ c.title }}</b><small>Hazard perception · {{ c.hazardCount }} {{ c.hazardCount === 1 ? 'hazard' : 'hazards' }}</small></span>
        </NuxtLink>
      </section>
    </template>
  </div>
</template>

<style scoped>
.blocks { display: grid; gap: 22px; color: var(--ink); font-size: 1.0625rem; line-height: 1.6; }
.media { display: grid; gap: 10px; margin: 0; }
.media__video { width: 100%; aspect-ratio: 16 / 9; border-radius: 18px; background: #000; }
.doc, .hz__clip { display: flex; align-items: center; gap: 14px; padding: 16px 18px; border-radius: 18px; background: var(--card); box-shadow: var(--shadow); color: var(--ink); text-decoration: none; }
.doc span, .hz__clip > span:last-child { display: grid; flex: 1; line-height: 1.3; }
.doc small, .hz__clip small { color: var(--muted); font-size: 0.875rem; }
.doc :deep(.icon) { color: var(--accent); }
.hz { display: grid; gap: 10px; }
.hz__play { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; background: #000; color: #fff; }
.hz__play :deep(path) { fill: currentColor; }
.blocks :deep(.rich strong) { font-weight: 600; }
.html-block { display: grid; gap: 12px; }
.html-block__body :deep(p) { margin: 0 0 0.8em; }
.html-block__body :deep(:is(h2, h3, h4)) { margin: 1em 0 0.4em; color: var(--ink); }
.html-block__body :deep(:is(ul, ol)) { margin: 0 0 0.8em; padding-left: 1.4em; }
.html-block__body :deep(li) { margin: 0.25em 0; }
.html-block__body :deep(a) { color: var(--accent); }
.html-block__body :deep(img) { max-width: 100%; height: auto; border-radius: 14px; }
.html-block__body :deep(table) { width: 100%; border-collapse: collapse; font-size: 0.9375rem; }
.html-block__body :deep(:is(td, th)) { padding: 8px 10px; border-bottom: 1px solid var(--line); text-align: left; }
.html-block__body :deep(blockquote) { margin: 0; padding: 12px 16px; border-left: 3px solid var(--accent); background: var(--accent-soft); border-radius: 0 12px 12px 0; }
.blocks__h { margin-top: 12px; font-size: 1.5rem; }
.kp { padding: 20px 22px; border-radius: 20px; background: var(--card-2); }
.kp h3 { margin-bottom: 12px; font-size: 1.125rem; }
.kp ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.kp li { display: flex; gap: 10px; align-items: flex-start; }
.kp li :deep(.icon) { flex: none; margin-top: 3px; color: var(--accent); }
.callout { display: flex; gap: 12px; padding: 16px 18px; border-radius: 18px; }
.callout :deep(.icon) { flex: none; margin-top: 2px; }
.callout b { display: block; margin-bottom: 2px; }
.callout--tip { background: var(--accent-soft); }
.callout--tip :deep(.icon) { color: var(--accent); }
.callout--warning { background: var(--warn-soft); }
.callout--warning :deep(.icon) { color: var(--warn); }
.callout--rule { background: var(--stop-soft); }
.callout--rule :deep(.icon) { color: var(--stop); }
.fig { margin: 0; display: grid; gap: 10px; }
.fig figcaption { font-size: 0.875rem; color: var(--muted); }
.sgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 10px; }
.sgrid__item { display: grid; justify-items: center; gap: 8px; padding: 14px 10px; border-radius: 16px; background: var(--card-2); color: var(--ink); font-size: 0.8125rem; text-align: center; text-decoration: none; transition: transform 0.4s var(--spring); }
.sgrid__item:hover { transform: translateY(-3px); text-decoration: none; }
.sgrid__item :deep(.sign) { width: 64px; }
.scene { position: relative; border-radius: 20px; overflow: hidden; }
.scene__cta { position: absolute; right: 12px; bottom: 12px; display: inline-flex; gap: 6px; align-items: center; padding: 8px 14px; border-radius: 980px; color: #fff; font-size: 0.875rem; font-weight: 500; text-decoration: none; }
.scene__cta :deep(path) { fill: currentColor; }
.check { display: grid; gap: 16px; padding: 22px; border-radius: 22px; background: var(--card); box-shadow: var(--shadow); }
.check h3 { display: flex; gap: 8px; align-items: center; font-size: 1.125rem; }
.check h3 :deep(.icon) { color: var(--accent); }
.check__q + .check__q { padding-top: 18px; border-top: 1px solid var(--line-soft); }
</style>

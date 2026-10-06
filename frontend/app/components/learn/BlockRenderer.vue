<script setup lang="ts">
import type { Block, HazardClipDto, QuestionDto, SignDto } from '#shared/types/learn'

const props = defineProps<{
  blocks: Block[]
  signs: Record<string, SignDto>
  questions?: Record<string, QuestionDto>
  clips?: Record<string, HazardClipDto>
}>()
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

      <figure v-else-if="b.type === 'scene' && clips?.[b.clip]" class="fig">
        <div class="scene">
          <LearnHazardLoop :scene="clips[b.clip]!.scene" :signs="signs" />
          <NuxtLink :to="`/learn/hazard/${b.clip}`" class="scene__cta glass-dark">
            <AppIcon name="play" :size="14" /> Try this clip
          </NuxtLink>
        </div>
        <figcaption v-if="b.caption">{{ b.caption }}</figcaption>
      </figure>

      <section v-else-if="b.type === 'check' && checkQuestions(b.questions).length" class="check">
        <h3><AppIcon name="target" :size="20" /> Check your understanding</h3>
        <div v-for="q in checkQuestions(b.questions)" :key="q.id" class="check__q">
          <LearnQuestionCard :question="q" :signs="signs" context="lesson" @answered="(r) => emit('checked', r.correct)" />
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.blocks { display: grid; gap: 22px; color: var(--ink); font-size: 1.0625rem; line-height: 1.6; }
.blocks :deep(.rich strong) { font-weight: 600; }
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

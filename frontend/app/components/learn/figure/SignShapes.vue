<script setup lang="ts">
import type { SignSpec } from '#shared/types/learn'

const RED = '#d4021d'
const BLUE = '#005eb8'
const groups: { title: string; text: string; spec: SignSpec }[] = [
  { title: 'Red circles', text: 'Tell you what you must not do.', spec: { shape: 'circle', fill: '#fff', border: RED, symbol: 'text', text: '30' } },
  { title: 'Blue circles', text: 'Tell you what you must do.', spec: { shape: 'circle', fill: BLUE, symbol: 'arrow-left' } },
  { title: 'Triangles', text: 'Warn you about what’s ahead.', spec: { shape: 'triangle', fill: '#fff', border: RED, symbol: 'children' } },
  { title: 'Rectangles', text: 'Give you information.', spec: { shape: 'rect', fill: BLUE, symbol: 'one-way' } }
]
</script>

<template>
  <div class="shapes">
    <div v-for="g in groups" :key="g.title" class="shapes__item">
      <div class="shapes__sign"><LearnSignGraphic :spec="g.spec" :label="g.title" /></div>
      <b>{{ g.title }}</b>
      <span>{{ g.text }}</span>
    </div>
  </div>
</template>

<style scoped>
.shapes { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
@media (min-width: 700px) { .shapes { grid-template-columns: repeat(4, 1fr); } }
.shapes__item { display: grid; justify-items: center; gap: 4px; padding: 18px 12px; border-radius: 18px; background: var(--card-2); text-align: center; }
.shapes__sign { width: 72px; margin-bottom: 8px; transition: transform 0.5s var(--spring); }
.shapes__item:hover .shapes__sign { transform: scale(1.08) rotate(-4deg); }
.shapes__item b { color: var(--ink); }
.shapes__item span { font-size: 0.875rem; color: var(--muted); }
</style>

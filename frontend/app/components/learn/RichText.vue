<script setup lang="ts">
// Paragraphs with **bold** — rendered as nodes (no v-html), since content is editable in the admin.
const props = defineProps<{ text: string; tag?: string }>()
const paragraphs = computed(() =>
  props.text.split(/\n\n+/).map((p) => p.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((part) => ({ bold: part.startsWith('**'), text: part.replace(/\*\*/g, '') })))
)
</script>

<template>
  <component :is="tag ?? 'p'" v-for="(p, i) in paragraphs" :key="i" class="rich">
    <template v-for="(seg, j) in p" :key="j"><strong v-if="seg.bold">{{ seg.text }}</strong><template v-else>{{ seg.text }}</template></template>
  </component>
</template>

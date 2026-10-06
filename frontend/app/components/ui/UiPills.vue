<script setup lang="ts" generic="T extends string">
// Compact segmented switch (plain, no liquid effect) — theme picker, filters, road conditions.
defineProps<{ options: readonly { value: T; label?: string; icon?: string; title?: string }[]; label: string }>()
const model = defineModel<T>({ required: true })
</script>

<template>
  <div class="pills" role="radiogroup" :aria-label="label">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      role="radio"
      :aria-checked="model === o.value"
      :title="o.title ?? o.label"
      :class="{ 'is-on': model === o.value }"
      @click="model = o.value"
    >
      <AppIcon v-if="o.icon" :name="o.icon" :size="16" />
      <span v-if="o.label">{{ o.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.pills { display: flex; padding: 3px; border-radius: 12px; background: rgb(127 127 127 / 0.14); }
.pills button {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 30px;
  padding: 4px 12px;
  border: 0;
  border-radius: 9px;
  background: none;
  color: var(--muted);
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  transition: background-color 0.25s, color 0.25s, box-shadow 0.25s;
}
.pills button.is-on { background: var(--card); color: var(--ink); box-shadow: 0 1px 4px rgb(0 0 0 / 0.15); }
</style>

<script setup lang="ts">
defineProps<{
  label?: string
  error?: string
  autocomplete?: 'current-password' | 'new-password'
  /** Show a live checklist of password rules (for sign-up) */
  showRules?: boolean
}>()
const model = defineModel<string>({ default: '' })
const emit = defineEmits<{ blur: [] }>()

const visible = ref(false)
const input = ref<{ focus: () => void }>()
defineExpose({ focus: () => input.value?.focus() })

const rules = computed(() => [
  { label: '8+ characters', ok: model.value.length >= 8 },
  { label: 'A capital letter', ok: /[A-Z]/.test(model.value) },
  { label: 'A number', ok: /\d/.test(model.value) }
])
</script>

<template>
  <div class="password">
    <UiInput
      ref="input"
      v-model="model"
      :label="label ?? 'Password'"
      :type="visible ? 'text' : 'password'"
      :error="error"
      :autocomplete="autocomplete ?? 'current-password'"
      required
      @blur="emit('blur')"
    >
      <template #suffix>
        <button
          type="button"
          class="password__toggle"
          :aria-pressed="visible"
          :aria-label="visible ? 'Hide password' : 'Show password'"
          @click="visible = !visible"
        >
          {{ visible ? 'Hide' : 'Show' }}
        </button>
      </template>
    </UiInput>
    <ul v-if="showRules" class="password__rules" aria-label="Password requirements">
      <li v-for="r in rules" :key="r.label" :class="{ ok: r.ok }">{{ r.label }}</li>
    </ul>
  </div>
</template>

<style scoped>
.password__toggle {
  margin-right: 6px;
  padding: 8px 12px;
  border: 0;
  border-radius: 10px;
  background: var(--paper);
  font-size: 0.8125rem;
  font-weight: 600;
}
.password__toggle:hover { background: var(--line); }
.password__rules {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 0 0;
  padding: 0;
  font-size: 0.8125rem;
  color: var(--muted);
}
.password__rules li {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 6px;
  border-radius: 999px;
  background: var(--paper);
  transition: background-color 0.2s, color 0.2s;
}
.password__rules li::before {
  content: '';
  width: 14px;
  height: 14px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1.5px currentColor;
}
.password__rules li.ok { background: var(--go-soft); color: var(--go-text); }
.password__rules li.ok::before { content: '✓'; display: grid; place-items: center; background: var(--go); color: #fff; box-shadow: none; font-size: 0.5625rem; font-weight: 800; }
</style>

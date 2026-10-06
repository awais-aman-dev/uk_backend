<script setup lang="ts">
defineProps<{ error?: string }>()
const model = defineModel<boolean>({ default: false })
const emit = defineEmits<{ change: [] }>()
const id = useId()
</script>

<template>
  <div class="field" :class="{ 'field--invalid': error }">
    <label :for="id" class="checkbox">
      <input
        :id="id"
        v-model="model"
        type="checkbox"
        :aria-invalid="!!error"
        :aria-describedby="error ? `${id}-error` : undefined"
        @change="emit('change')"
      >
      <span class="checkbox__box" aria-hidden="true" />
      <span class="checkbox__label"><slot /></span>
    </label>
    <p v-if="error" :id="`${id}-error`" class="field__error">{{ error }}</p>
  </div>
</template>

<style scoped>
.checkbox { display: flex; gap: 12px; align-items: flex-start; cursor: pointer; font-size: 0.9375rem; }
.checkbox input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.checkbox__box {
  flex: none;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  margin-top: 1px;
  border-radius: 7px;
  background: var(--card);
  box-shadow: inset 0 0 0 1.5px #c7c7cc;
  transition: background-color 0.2s, box-shadow 0.2s;
}
.checkbox__box::after {
  content: '';
  width: 6px;
  height: 11px;
  margin-top: -3px;
  border-right: 2.2px solid #fff;
  border-bottom: 2.2px solid #fff;
  transform: rotate(45deg) scale(0);
  transition: transform 0.2s var(--ease);
}
.checkbox input:checked + .checkbox__box { background: var(--accent); box-shadow: none; }
.checkbox input:checked + .checkbox__box::after { transform: rotate(45deg) scale(1); }
.checkbox input:focus-visible + .checkbox__box { outline: 3px solid var(--sky); outline-offset: 2px; }
.field--invalid .checkbox__box { box-shadow: inset 0 0 0 2px var(--stop); }
.checkbox__label :deep(a) { color: var(--accent); }
</style>

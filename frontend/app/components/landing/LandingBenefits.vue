<script setup lang="ts">
const items = [
  { icon: 'video', title: 'Original video lessons', text: 'Short, clear explainers we write and film ourselves.' },
  { icon: 'eye', title: 'Custom-built hazard perception', text: 'Real UK roads, scored exactly like the real test.' },
  { icon: 'cap', title: 'Made to teach', text: 'Every answer explained, so you understand — not memorise.' }
] as const
</script>

<template>
  <section class="benefits" aria-label="Why 1Theory">
    <div class="container benefits__row">
      <div v-for="(item, i) in items" :key="item.title" v-reveal="i * 100" class="benefit">
        <span class="benefit__icon"><AppIcon :name="item.icon" :size="28" /></span>
        <h3>{{ item.title }}</h3>
        <p>{{ item.text }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.benefits { background: var(--card); padding-block: 56px; border-bottom: 1px solid var(--line-soft); }
.benefits__row { display: grid; gap: 36px; }
.benefit { display: grid; justify-items: center; text-align: center; gap: 8px; }
.benefit__icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  margin-bottom: 6px;
  border-radius: 16px;
  background: var(--paper);
  color: var(--accent);
}
.benefit h3 { font-size: 1.1875rem; letter-spacing: -0.02em; }
.benefit p { max-width: 300px; font-size: 0.9375rem; color: var(--muted); }
@media (min-width: 768px) {
  .benefits { padding-block: 72px; }
  .benefits__row { grid-template-columns: repeat(3, 1fr); }
}
</style>

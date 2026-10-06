<script setup lang="ts">
// Two cars pass a tree; the gap is measured in seconds. Toggle wet to see why it doubles.
const wet = ref(false)
</script>

<template>
  <div class="tsr" :class="{ 'tsr--wet': wet }">
    <div class="tsr__road" aria-hidden="true">
      <span class="tsr__tree" />
      <span class="tsr__car tsr__car--lead" />
      <span class="tsr__car tsr__car--you" />
      <span class="tsr__count"><b>1</b><b>2</b><b v-if="wet">3</b><b v-if="wet">4</b></span>
    </div>
    <div class="tsr__foot">
      <p>
        <strong>{{ wet ? 'Four' : 'Two' }} seconds</strong> between the car ahead passing the tree and you reaching it.
      </p>
      <label class="tsr__toggle"><input v-model="wet" type="checkbox"> Wet road</label>
    </div>
  </div>
</template>

<style scoped>
.tsr { --gap: 2s; --cycle: 5s; display: grid; gap: 14px; padding: 20px; border-radius: 20px; background: var(--card-2); }
.tsr--wet { --gap: 4s; --cycle: 7s; }
.tsr__road { position: relative; height: 90px; border-radius: 14px; overflow: hidden; background: linear-gradient(#4a4a50, #3a3a3e); }
.tsr__road::after { content: ''; position: absolute; left: 0; right: 0; top: 50%; height: 3px; background: repeating-linear-gradient(90deg, #fff 0 24px, transparent 24px 48px); opacity: 0.7; }
.tsr__tree { position: absolute; left: 62%; top: 4px; width: 18px; height: 18px; border-radius: 50%; background: #30d158; box-shadow: 0 0 0 4px rgb(48 209 88 / 0.3); }
.tsr__car { position: absolute; top: 56px; width: 46px; height: 22px; border-radius: 6px; left: -60px; animation: drive var(--cycle) linear infinite; }
.tsr__car--lead { background: #8e8e93; }
.tsr__car--you { background: var(--accent); animation-delay: var(--gap); }
@keyframes drive { to { left: calc(100% + 60px); } }
.tsr__count { position: absolute; right: 12px; top: 10px; display: flex; gap: 6px; }
.tsr__count b { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; background: rgb(255 255 255 / 0.15); color: #fff; font-size: 0.8125rem; }
.tsr__foot { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; color: var(--ink); }
.tsr__toggle { display: inline-flex; gap: 8px; align-items: center; font-size: 0.9375rem; }
.tsr__toggle input { accent-color: var(--accent); width: 18px; height: 18px; }
</style>

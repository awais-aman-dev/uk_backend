<script setup lang="ts">
// A soft UK traffic light. `state` sets the lit lamp; useLandingMotion may also switch it through data-light.
// Red + amber together is the real UK "get ready" phase.
withDefaults(defineProps<{ state?: 'red' | 'red-amber' | 'amber' | 'green' | 'off'; pole?: boolean }>(), { state: 'red', pole: true })
</script>

<template>
  <div class="lights" :data-light="state" aria-hidden="true">
    <svg :viewBox="pole ? '0 0 60 190' : '0 0 60 112'" class="lights__svg">
      <rect v-if="pole" x="27" y="92" width="6" height="98" rx="3" fill="#8b929c" />
      <rect x="8" y="4" width="44" height="104" rx="14" fill="#3f454e" />
      <rect x="8" y="4" width="44" height="104" rx="14" fill="#fff" fill-opacity="0.06" />
      <rect x="9" y="5" width="20" height="102" rx="10" fill="#fff" fill-opacity="0.05" />
      <circle class="lamp lamp--red" cx="30" cy="27" r="11" />
      <circle class="lamp lamp--amber" cx="30" cy="56" r="11" />
      <circle class="lamp lamp--green" cx="30" cy="85" r="11" />
    </svg>
  </div>
</template>

<style scoped>
.lights__svg { display: block; width: 100%; overflow: visible; filter: drop-shadow(0 10px 14px rgb(30 40 55 / 0.18)); }
.lamp { fill: #2a2f36; transition: fill 0.25s ease, filter 0.25s ease; }
.lights[data-light='red'] .lamp--red,
.lights[data-light='red-amber'] .lamp--red { fill: #e47c72; filter: drop-shadow(0 0 6px #e47c72); }
.lights[data-light='amber'] .lamp--amber,
.lights[data-light='red-amber'] .lamp--amber { fill: #efc066; filter: drop-shadow(0 0 6px #efc066); }
.lights[data-light='green'] .lamp--green { fill: #6cc490; filter: drop-shadow(0 0 7px #6cc490); }
</style>

<script setup lang="ts">
import type { SignCategory, SignDto } from '#shared/types/learn'

definePageMeta({ layout: 'learn', middleware: 'auth' })
useHead({ title: 'Road signs — 1Theory' })

const route = useRoute()
const { data, error } = await useFetch('/api/learn/signs')
const CATS: { id: SignCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'warning', label: 'Warning' },
  { id: 'regulatory', label: 'Orders' },
  { id: 'information', label: 'Information' },
  { id: 'motorway', label: 'Motorway' }
]
const cat = ref<SignCategory | 'all'>('all')
const list = computed(() => (data.value?.signs ?? []).filter((s) => cat.value === 'all' || s.category === cat.value))
const open = ref<SignDto | null>(null)
onMounted(() => {
  const code = route.query.sign
  if (code) open.value = data.value?.signs.find((s) => s.code === code) ?? null
})

/* Flashcards */
const cards = ref(false)
const deck = ref<SignDto[]>([])
const flipped = ref(false)
const known = ref(0)
function startCards() {
  deck.value = [...list.value].sort(() => Math.random() - 0.5)
  known.value = 0
  flipped.value = false
  cards.value = true
}
function nextCard(gotIt: boolean) {
  if (gotIt) known.value++
  flipped.value = false
  setTimeout(() => deck.value.shift(), 180)
}
</script>

<template>
  <div>
    <LearnHead eyebrow="Road signs" title="Read the road." sub="Tap a sign for its meaning, or test yourself with flashcards.">
      <UiButton variant="primary" @click="startCards">Flashcards</UiButton>
    </LearnHead>
    <LearnLocked v-if="error?.statusCode === 402" />
    <template v-else-if="data">
      <div class="cats" role="tablist">
        <button v-for="c in CATS" :key="c.id" type="button" role="tab" :aria-selected="cat === c.id" :class="{ on: cat === c.id }" @click="cat = c.id">{{ c.label }}</button>
      </div>
      <TransitionGroup tag="div" name="grid" class="signs">
        <button v-for="s in list" :key="s.code" type="button" class="tile" @click="open = s">
          <LearnSignGraphic :spec="s.spec" :label="s.name" />
          <span>{{ s.name }}</span>
        </button>
      </TransitionGroup>
    </template>

    <!-- Detail -->
    <UiModal :open="!!open" width="min(420px, 100%)" @update:open="(v) => !v && (open = null)">
      <div v-if="open" class="detail">
        <div class="detail__sign"><LearnSignGraphic :spec="open.spec" :label="open.name" /></div>
        <p class="detail__cat">{{ CATS.find((c) => c.id === open!.category)?.label }}</p>
        <h2>{{ open.name }}</h2>
        <p>{{ open.meaning }}</p>
        <UiButton variant="ghost" @click="open = null">Close</UiButton>
      </div>
    </UiModal>

    <!-- Flashcards -->
    <Transition name="fade">
      <div v-if="cards" class="overlay" @click.self="cards = false">
        <div class="deck">
          <div class="deck__top"><span>{{ deck.length }} left · {{ known }} known</span><button type="button" class="x" aria-label="Close" @click="cards = false"><AppIcon name="close" :size="18" /></button></div>
          <div v-if="deck[0]" class="flip" :class="{ 'is-flipped': flipped }" @click="flipped = !flipped">
            <div class="flip__face flip__front glass">
              <div class="flip__sign"><LearnSignGraphic :spec="deck[0].spec" label="Which sign is this?" /></div>
              <p>Tap to reveal</p>
            </div>
            <div class="flip__face flip__back glass">
              <h2>{{ deck[0].name }}</h2>
              <p>{{ deck[0].meaning }}</p>
            </div>
          </div>
          <div v-if="deck[0]" class="deck__actions">
            <UiButton variant="ghost" @click="nextCard(false)">Still learning</UiButton>
            <UiButton variant="primary" @click="nextCard(true)">Got it</UiButton>
          </div>
          <div v-else class="deck__done glass">
            <h2>{{ known }} / {{ known + 0 + (list.length - known) }}</h2>
            <p>signs you knew. {{ known === list.length ? 'Perfect!' : 'Go again to lock them in.' }}</p>
            <UiButton variant="primary" @click="startCards">Shuffle again</UiButton>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.cats { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
.cats button { padding: 8px 16px; border: 0; border-radius: 980px; background: var(--card); color: var(--ink); font-weight: 500; box-shadow: var(--shadow); transition: all 0.25s; }
.cats button.on { background: var(--ink); color: var(--paper); }
.signs { display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 10px; }
.tile { display: grid; justify-items: center; gap: 10px; padding: 18px 12px 14px; border: 0; border-radius: 22px; background: var(--card); box-shadow: var(--shadow); color: var(--ink); font-size: 0.875rem; text-align: center; transition: transform 0.45s var(--spring); }
.tile:hover { transform: translateY(-4px) scale(1.02); }
.tile :deep(.sign) { width: 76px; }
.grid-move, .grid-enter-active, .grid-leave-active { transition: all 0.45s var(--ease); }
.grid-enter-from, .grid-leave-to { opacity: 0; transform: scale(0.85); }
.grid-leave-active { position: absolute; }

.overlay { position: fixed; inset: 0; z-index: 70; display: grid; place-items: center; padding: 16px; background: rgb(0 0 0 / 0.4); }
.detail { display: grid; justify-items: center; gap: 10px; padding: 10px 6px 2px; text-align: center; }
.detail__sign { width: 160px; margin-bottom: 8px; animation: pop 0.6s var(--spring); }
.detail__cat { font-size: 0.8125rem; font-weight: 600; color: var(--accent); }
.detail h2 { font-size: 1.75rem; }
.detail p { color: var(--muted); }
@keyframes pop { from { transform: scale(0.6) rotate(-8deg); opacity: 0; } }

.deck { display: grid; gap: 16px; width: min(400px, 100%); }
.deck__top { display: flex; justify-content: space-between; align-items: center; color: #fff; }
.x { display: grid; place-items: center; width: 34px; height: 34px; border: 0; border-radius: 50%; background: rgb(255 255 255 / 0.2); color: #fff; }
.flip { position: relative; aspect-ratio: 3 / 4; perspective: 1200px; cursor: pointer; }
.flip__face { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: 14px; padding: 28px; border-radius: 32px; text-align: center; color: var(--ink); backface-visibility: hidden; transition: transform 0.7s var(--spring); }
.flip__front p { color: var(--muted); }
.flip__sign { width: 180px; }
.flip__back { transform: rotateY(180deg); }
.flip__back h2 { font-size: 1.75rem; }
.flip__back p { color: var(--muted); }
.flip.is-flipped .flip__front { transform: rotateY(-180deg); }
.flip.is-flipped .flip__back { transform: rotateY(0); }
.deck__actions { display: flex; justify-content: space-between; }
.deck__done { display: grid; justify-items: center; gap: 10px; padding: 32px; border-radius: 30px; text-align: center; color: var(--ink); }
.deck__done h2 { font-size: 3rem; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>

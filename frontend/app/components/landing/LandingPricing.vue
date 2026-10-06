<script setup lang="ts">
import { formatGBP } from '#shared/money'

// Packages are managed in Django Admin; the badges follow from the data
const { packages, featured } = await usePackages()
const perDay = (p: PackageDto) => `${Math.round(p.pricePence / p.days)}p`
// Saving vs paying the featured package's daily rate for the same number of days
const saving = (p: PackageDto) => (featured.value ? Math.round((1 - p.pricePence / ((featured.value.pricePence / featured.value.days) * p.days)) * 100) : 0)
const badge = (p: PackageDto) => {
  if (p.featured) return 'Most popular'
  const byDays = [...packages.value].sort((a, b) => a.days - b.days)
  if (p === byDays.at(-1) && saving(p) > 0) return `Best value · save ${saving(p)}%`
  if (p === byDays[0]) return 'Last-minute'
  return ''
}

const trust = [
  { icon: 'pound', text: 'One-off payment' },
  { icon: 'repeat', text: 'No auto-renewal' },
  { icon: 'bolt', text: 'Instant access' },
  { icon: 'phone', text: 'Any device' }
] as const
</script>

<template>
  <section id="pricing" class="section section--dark pricing">
    <div class="pricing__glow" aria-hidden="true"><span /><span /></div>
    <div class="container pricing__inner">
      <div v-reveal class="section-head section-head--center">
        <p class="eyebrow">Pricing</p>
        <h2>Choose your access.</h2>
        <p>Everything included on every plan. Pay once — no subscription traps.</p>
      </div>

      <div class="plans">
        <article
          v-for="(plan, i) in packages"
          :key="plan.slug"
          v-reveal="i * 120"
          class="plan glass-dark"
          :class="{ 'plan--rec': plan.featured, 'plan--value': badge(plan).startsWith('Best value') }"
        >
          <span v-if="badge(plan)" class="plan__badge">{{ badge(plan) }}</span>
          <h3 class="plan__name">{{ plan.name }}</h3>
          <p class="plan__tagline">{{ plan.description }}</p>

          <div class="plan__price">
            <strong>{{ formatGBP(plan.pricePence) }}</strong>
            <span>{{ plan.days }} days</span>
          </div>
          <p class="plan__perday">Just {{ perDay(plan) }} a day</p>

          <NuxtLink
            :to="{ path: '/register', query: { plan: plan.slug } }"
            class="btn btn--lg btn--block"
            :class="plan.featured ? 'btn--primary' : 'btn--ghost-dark'"
          >
            Choose {{ plan.name }}
          </NuxtLink>

          <ul class="plan__features">
            <li v-for="f in plan.materials" :key="f"><AppIcon name="check" :size="18" />{{ f }}</li>
          </ul>
        </article>
        <p v-if="!packages.length" class="plans__empty">Plans are being updated — please check back in a minute.</p>
      </div>

      <ul v-reveal class="trust">
        <li v-for="t in trust" :key="t.text"><AppIcon :name="t.icon" :size="20" />{{ t.text }}</li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.pricing { position: relative; overflow: hidden; }
.pricing__glow { position: absolute; inset: 0; pointer-events: none; }
.pricing__glow span {
  position: absolute;
  width: 70vmax;
  height: 70vmax;
  border-radius: 50%;
  opacity: 0.5;
}
.pricing__glow span:first-child { left: 50%; top: 20%; margin-left: -35vmax; background: radial-gradient(closest-side, rgb(41 151 255 / 0.45), transparent); }
.pricing__glow span:last-child { right: -30vmax; bottom: -40vmax; background: radial-gradient(closest-side, rgb(162 89 255 / 0.4), transparent); }
.pricing__inner { position: relative; }

.plans { display: grid; gap: 16px; max-width: 1040px; margin-inline: auto; }

.plan {
  display: flex;
  flex-direction: column;
  padding: 32px 28px;
  border-radius: var(--radius-xl);
  transition: transform 0.6s var(--ease), box-shadow 0.6s var(--ease);
}
.plan:hover { transform: translateY(-6px); }
.plan--rec {
  order: -1; /* recommended plan first on mobile */
  border-color: rgb(41 151 255 / 0.6);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.2),
    0 0 0 1px rgb(41 151 255 / 0.4),
    0 30px 80px -20px rgb(41 151 255 / 0.45);
  background: linear-gradient(180deg, rgb(41 151 255 / 0.18), rgb(28 28 30 / 0.7) 45%);
}

.plan__badge {
  align-self: flex-start;
  padding: 5px 12px;
  border-radius: 980px;
  background: rgb(255 255 255 / 0.1);
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--muted-dark);
}
.plan--rec .plan__badge { background: var(--accent); color: #fff; }
.plan--value .plan__badge { background: rgb(48 209 88 / 0.16); color: #30d158; }
.plans__empty { grid-column: 1 / -1; text-align: center; color: var(--muted-dark); }

.plan__name { margin-top: 20px; font-size: 1.75rem; }
.plan__tagline { margin-top: 6px; color: var(--muted-dark); font-size: 0.9375rem; min-height: 3em; }

.plan__price { display: flex; align-items: baseline; gap: 10px; margin-top: 18px; }
.plan__price strong { font-family: var(--font-display); font-size: 3.75rem; font-weight: 600; line-height: 1; letter-spacing: -0.04em; color: #fff; }
.plan__price span { color: var(--muted-dark); }
.plan__perday { margin: 8px 0 24px; font-size: 0.9375rem; color: var(--muted-dark); }
.plan--rec .plan__perday { color: var(--accent-bright); }

.plan__features {
  list-style: none;
  margin: 28px 0 0;
  padding: 24px 0 0;
  border-top: 1px solid var(--line-dark);
  display: grid;
  gap: 12px;
  font-size: 0.9375rem;
  color: rgb(255 255 255 / 0.85);
}
.plan__features li { display: flex; gap: 10px; align-items: flex-start; }
.plan__features :deep(.icon) { flex: none; margin-top: 1px; color: var(--accent-bright); }

.trust {
  list-style: none;
  margin: 56px auto 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 14px 36px;
  color: var(--muted-dark);
  font-size: 0.9375rem;
}
.trust li { display: flex; align-items: center; gap: 8px; }
.trust :deep(.icon) { color: #f5f5f7; }

@media (min-width: 900px) {
  .plans { grid-template-columns: repeat(3, 1fr); align-items: center; }
  .plan--rec { order: 0; padding-block: 44px; }
}
</style>

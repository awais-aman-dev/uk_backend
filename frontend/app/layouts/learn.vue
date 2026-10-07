<script setup lang="ts">
// App shell for /learn: glass sidebar (desktop), liquid tab bar + "More" sheet (mobile), ⌘K search, themes.
const theme = useLearnTheme()
const route = useRoute()
const user = useAuthUser()
const searchOpen = useState('learn:search', () => false)
const { isDjango } = useLearnSource()
const moreOpen = ref(false)
watch(() => route.fullPath, () => (moreOpen.value = false))

const NAV = [
  { to: '/learn', label: 'Today', icon: 'home', exact: true },
  { to: '/learn/lessons', label: 'Lessons', icon: 'lessons' },
  { to: '/learn/practice', label: 'Practice', icon: 'target' },
  { to: '/learn/mock', label: 'Mock test', icon: 'timer' },
  { to: '/learn/hazard', label: 'Hazard perception', icon: 'hazard' },
  { to: '/learn/signs', label: 'Road signs', icon: 'sign' },
  { to: '/learn/ebook', label: 'Highway Code', icon: 'book' },
  { to: '/learn/progress', label: 'Progress', icon: 'progress' }
]
const TABS = ['/learn', '/learn/lessons', '/learn/practice', '/learn/hazard']
const tabs = NAV.filter((n) => TABS.includes(n.to))
const more = NAV.filter((n) => !TABS.includes(n.to))

const isActive = (n: { to: string; exact?: boolean }) => (n.exact ? route.path === n.to : route.path.startsWith(n.to))
const tabIndex = computed(() => {
  const i = tabs.findIndex(isActive)
  return i === -1 ? tabs.length : i // "More"
})
/** Focus mode (mock exam, hazard clip): hide navigation */
const focus = computed(() => !!route.meta.focus)

const themes = [
  { value: 'auto', label: 'Auto', icon: 'auto' },
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' }
] as const

const initials = computed(() => user.value?.name.split(' ').map((p) => p[0]).slice(0, 2).join('') ?? '')

onMounted(() => {
  const onKey = (e: KeyboardEvent) => {
    if (!isDjango.value && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      searchOpen.value = !searchOpen.value
    }
  }
  window.addEventListener('keydown', onKey)
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
})
</script>

<template>
  <div class="learn" :data-theme="theme" :class="{ 'learn--focus': focus }">
    <!-- Sidebar -->
    <aside v-if="!focus" class="sidebar glass">
      <div class="sidebar__brand">
        <AppLogo />
        <span class="sidebar__tag">Learn</span>
      </div>
      <button v-if="!isDjango" type="button" class="sidebar__search" @click="searchOpen = true">
        <AppIcon name="search" :size="16" /> Search <kbd>⌘K</kbd>
      </button>
      <nav class="sidebar__nav" aria-label="Learning">
        <NuxtLink v-for="n in NAV" :key="n.to" :to="n.to" :class="{ 'is-active': isActive(n) }">
          <AppIcon :name="n.icon" :size="20" />
          {{ n.label }}
        </NuxtLink>
      </nav>
      <div class="sidebar__foot">
        <UiPills v-model="theme" label="Appearance" :options="themes.map((t) => ({ value: t.value, icon: t.icon, title: t.label }))" />
        <NuxtLink to="/account" class="sidebar__me">
          <span class="avatar">{{ initials }}</span>
          <span>
            <b>{{ user?.name }}</b>
            <small>My account</small>
          </span>
        </NuxtLink>
      </div>
    </aside>

    <div class="learn__main">
      <!-- Mobile top bar -->
      <header v-if="!focus" class="topbar">
        <AppLogo />
        <button v-if="!isDjango" type="button" class="topbar__btn" aria-label="Search" @click="searchOpen = true">
          <AppIcon name="search" :size="20" />
        </button>
        <NuxtLink to="/account" class="avatar" aria-label="My account">{{ initials }}</NuxtLink>
      </header>

      <main class="learn__content">
        <slot />
      </main>
    </div>

    <!-- Mobile tab bar with a liquid indicator -->
    <nav v-if="!focus" class="tabbar glass" aria-label="Learning" :style="{ '--i': tabIndex, '--n': tabs.length + 1 }">
      <svg class="sr-only" aria-hidden="true">
        <filter id="tab-goo" color-interpolation-filters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" />
          <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9" result="g" />
          <feComposite in="SourceGraphic" in2="g" operator="atop" />
        </filter>
      </svg>
      <div class="tabbar__goo" aria-hidden="true">
        <span class="tabbar__blob" /><span class="tabbar__blob tabbar__blob--tail" />
      </div>
      <NuxtLink v-for="n in tabs" :key="n.to" :to="n.to" class="tabbar__item" :class="{ 'is-active': isActive(n) }">
        <AppIcon :name="n.icon" :size="22" />
        <span>{{ n.label === 'Hazard perception' ? 'Hazard' : n.label }}</span>
      </NuxtLink>
      <button type="button" class="tabbar__item" :class="{ 'is-active': tabIndex === tabs.length }" @click="moreOpen = true">
        <AppIcon name="grid" :size="22" />
        <span>More</span>
      </button>
    </nav>

    <!-- "More" sheet -->
    <Transition name="sheet">
      <div v-if="moreOpen" class="sheet-wrap" @click.self="moreOpen = false">
        <div class="sheet glass" role="dialog" aria-label="More">
          <span class="sheet__grip" />
          <NuxtLink v-for="n in more" :key="n.to" :to="n.to" class="sheet__item">
            <AppIcon :name="n.icon" :size="22" /> {{ n.label }}
            <AppIcon name="chevronRight" :size="16" class="sheet__chev" />
          </NuxtLink>
          <NuxtLink to="/account" class="sheet__item">
            <AppIcon name="person" :size="22" /> My account
            <AppIcon name="chevronRight" :size="16" class="sheet__chev" />
          </NuxtLink>
          <div class="sheet__theme">
            <span>Appearance</span>
            <UiPills v-model="theme" label="Appearance" :options="themes" />
          </div>
        </div>
      </div>
    </Transition>

    <LearnSearch v-if="!isDjango" v-model:open="searchOpen" />
    <AppToasts />
  </div>
</template>

<style scoped>
.learn {
  --side: 264px;
  --header-h: 4px; /* toasts drip from the top edge here */
  min-height: 100dvh;
  background: var(--paper);
  color: var(--text);
  transition: background-color 0.3s;
}

/* Sidebar */
.sidebar {
  position: fixed;
  z-index: 30;
  top: 12px;
  bottom: 12px;
  left: 12px;
  width: var(--side);
  display: none;
  flex-direction: column;
  gap: 14px;
  padding: 18px 14px;
  border-radius: 24px;
}
.sidebar__brand { display: flex; align-items: center; gap: 10px; padding: 0 6px; color: var(--ink); }
.sidebar__tag { padding: 2px 8px; border-radius: 980px; background: var(--accent-soft); color: var(--accent); font-size: 0.75rem; font-weight: 600; }
.sidebar__search {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 10px;
  border: 0;
  border-radius: 12px;
  background: rgb(127 127 127 / 0.12);
  color: var(--muted);
  font-size: 0.9375rem;
  text-align: left;
}
.sidebar__search kbd { margin-left: auto; font: inherit; font-size: 0.75rem; padding: 1px 6px; border-radius: 6px; background: rgb(127 127 127 / 0.15); }
.sidebar__nav { display: grid; gap: 2px; }
.sidebar__nav a {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 10px;
  border-radius: 12px;
  color: var(--ink);
  font-size: 0.9375rem;
  font-weight: 500;
  text-decoration: none;
  transition: background-color 0.2s;
}
.sidebar__nav a :deep(.icon) { color: var(--accent); }
.sidebar__nav a:hover { background: rgb(127 127 127 / 0.1); }
.sidebar__nav a.is-active { background: var(--accent); color: #fff; }
.sidebar__nav a.is-active :deep(.icon) { color: #fff; }
.sidebar__foot { margin-top: auto; display: grid; gap: 12px; }
.sidebar__me { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 14px; color: var(--ink); text-decoration: none; }
.sidebar__me:hover { background: rgb(127 127 127 / 0.1); }
.sidebar__me span:last-child { display: grid; line-height: 1.2; min-width: 0; }
.sidebar__me b { font-size: 0.875rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sidebar__me small { color: var(--muted); font-size: 0.75rem; }

.avatar {
  display: grid;
  place-items: center;
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--gradient);
  color: #fff;
  font-size: 0.8125rem;
  font-weight: 600;
  text-decoration: none;
}


/* Main */
.learn__main { min-height: 100dvh; }
.learn__content { padding: 12px var(--gutter) calc(110px + env(safe-area-inset-bottom)); max-width: 1180px; margin-inline: auto; }
.learn--focus .learn__content { max-width: none; padding: 0; }

.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px var(--gutter);
  background: color-mix(in srgb, var(--paper) 78%, transparent);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  color: var(--ink);
}
.topbar .logo { margin-right: auto; }
.topbar__btn { display: grid; place-items: center; width: 38px; height: 38px; border: 0; border-radius: 50%; background: rgb(127 127 127 / 0.14); color: var(--ink); }

/* Tab bar */
.tabbar {
  position: fixed;
  z-index: 40;
  left: 12px;
  right: 12px;
  bottom: calc(10px + env(safe-area-inset-bottom));
  display: grid;
  grid-template-columns: repeat(var(--n), 1fr);
  padding: 6px;
  border-radius: 30px;
}
.tabbar__goo { position: absolute; inset: 6px; filter: url(#tab-goo); pointer-events: none; }
.tabbar__blob {
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(100% / var(--n) * var(--i));
  width: calc(100% / var(--n));
  border-radius: 24px;
  background: var(--accent-soft);
  transition: left 0.45s var(--spring);
}
.tabbar__blob--tail { width: calc(100% / var(--n) * 0.6); margin-left: calc(100% / var(--n) * 0.2); transition: left 0.75s var(--ease); }
.tabbar__item {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 2px;
  padding: 8px 0 6px;
  border: 0;
  background: none;
  color: var(--muted);
  font-size: 0.6875rem;
  font-weight: 500;
  text-decoration: none;
  transition: color 0.3s;
}
.tabbar__item.is-active { color: var(--accent); }
.tabbar__item:hover { text-decoration: none; }

/* More sheet */
.sheet-wrap { position: fixed; inset: 0; z-index: 60; display: flex; align-items: flex-end; background: rgb(0 0 0 / 0.35); }
.sheet {
  width: 100%;
  display: grid;
  gap: 2px;
  padding: 10px 14px calc(20px + env(safe-area-inset-bottom));
  border-radius: 28px 28px 0 0;
  color: var(--ink);
}
.sheet__grip { justify-self: center; width: 40px; height: 5px; margin-bottom: 8px; border-radius: 3px; background: rgb(127 127 127 / 0.4); }
.sheet__item { display: flex; align-items: center; gap: 14px; padding: 14px 8px; border-bottom: 1px solid var(--line-soft); color: var(--ink); font-size: 1.0625rem; text-decoration: none; }
.sheet__item :deep(.icon:first-child) { color: var(--accent); }
.sheet__chev { margin-left: auto; color: var(--muted); }
.sheet__theme { display: grid; gap: 8px; padding: 14px 8px 0; color: var(--muted); font-size: 0.875rem; }
.sheet-enter-active, .sheet-leave-active { transition: background-color 0.3s; }
.sheet-enter-active .sheet, .sheet-leave-active .sheet { transition: transform 0.45s var(--spring); }
.sheet-enter-from, .sheet-leave-to { background-color: transparent; }
.sheet-enter-from .sheet, .sheet-leave-to .sheet { transform: translateY(100%); }

@media (min-width: 1024px) {
  .sidebar { display: flex; }
  .topbar, .tabbar { display: none; }
  .learn__main { padding-left: calc(var(--side) + 24px); }
  .learn--focus .learn__main { padding-left: 0; }
  .learn__content { padding: 32px 40px 64px; }
  .learn--focus .learn__content { padding: 0; }
}
</style>

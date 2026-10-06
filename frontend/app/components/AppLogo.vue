<template>
  <NuxtLink to="/" class="logo" aria-label="1Theory home">
    <span class="logo__mark" aria-hidden="true">
      <svg viewBox="0 0 24 24"><path d="M8 5h3.2v11H17v3H8z" /></svg>
    </span>
    <span class="logo__word">1Theory</span>
  </NuxtLink>
</template>

<style scoped>
.logo {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  color: inherit;
  text-decoration: none;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.1875rem;
  letter-spacing: -0.02em;
}
.logo:hover { text-decoration: none; }
/* The learner "L" plate, refined: white tile, red L */
.logo__mark {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #fff;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.08), 0 1px 2px rgb(0 0 0 / 0.2);
  transition: transform 0.5s var(--spring);
}
.logo__mark svg { width: 20px; height: 20px; fill: #ff3b30; }
.logo:hover .logo__mark { transform: rotate(-8deg) scale(1.05); }
</style>

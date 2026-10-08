<template>
  <!-- a thin progress bar on every navigation, so a slow page never looks frozen -->
  <NuxtLoadingIndicator color="#0071e3" :height="3" />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

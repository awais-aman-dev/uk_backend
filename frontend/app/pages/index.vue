<script setup lang="ts">
const root = ref<HTMLElement>()
useLandingMotion(root)
</script>

<template>
  <div ref="root">
    <LandingHero />
    <LandingBenefits />
    <LandingFeatures />
    <LandingSteps />
    <LandingPricing />
    <LandingQuiz />
    <LandingTestimonials />
    <LandingFaq />
    <LandingFinalCta />
    <StickyCta />
  </div>
</template>

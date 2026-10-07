<script setup lang="ts">
const root = ref<HTMLElement>()
useLandingMotion(root)
</script>

<template>
  <div ref="root" class="landing">
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
    <LandingProgress />
  </div>
</template>

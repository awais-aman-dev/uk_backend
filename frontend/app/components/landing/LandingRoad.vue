<script setup lang="ts">
// The hero's road: a tilted 3D road surface with lane markings, a car and a traffic light.
// Static and complete in SSR; useLandingMotion plays the lights, rolls the car in and drives it on scroll.
</script>

<template>
  <div class="road" aria-hidden="true">
    <div class="road__hills"><i /><i /><i /></div>

    <div class="road__stage">
      <div class="road__plane">
        <span class="road__edge road__edge--far" />
        <span class="road__dashes" />
        <span class="road__edge road__edge--near" />
      </div>

      <LandingTrafficLight class="road__lights" />

      <!-- the car: the track is driven by scroll, the car itself rolls in on load -->
      <div class="car-track">
        <div class="car"><LandingCar /></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.road { position: relative; height: 230px; margin-top: 8px; pointer-events: none; }

/* soft rolling hills behind the road */
.road__hills { position: absolute; inset: 0 0 92px; overflow: hidden; }
.road__hills i { position: absolute; bottom: -60%; border-radius: 50%; }
.road__hills i:nth-child(1) { left: -10%; width: 60%; height: 150%; background: #dbe8d4; }
.road__hills i:nth-child(2) { left: 35%; width: 55%; height: 120%; background: #d1e2c9; }
.road__hills i:nth-child(3) { right: -15%; width: 50%; height: 160%; background: #e2ecdc; }

.road__stage { position: absolute; inset: 0; perspective: 700px; perspective-origin: 50% 0%; }

/* the road surface, tilted away from the viewer */
.road__plane {
  position: absolute;
  left: -10%;
  right: -10%;
  bottom: 0;
  height: 200px;
  transform: rotateX(58deg);
  transform-origin: 50% 100%;
  background:
    linear-gradient(#cfdfc7, #cfdfc7) top / 100% 18px no-repeat,
    linear-gradient(#5d646f, #6a717c);
  box-shadow: inset 0 -30px 60px rgb(0 0 0 / 0.12);
}
.road__edge { position: absolute; left: 0; right: 0; height: 6px; background: #efe9dc; opacity: 0.85; }
.road__edge--far { top: 32px; }
.road__edge--near { bottom: 14px; }
.road__dashes {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(50% + 6px);
  height: 7px;
  background: repeating-linear-gradient(90deg, #f3eee2 0 70px, transparent 70px 130px);
}

.road__lights { position: absolute; right: 12%; bottom: 112px; width: 46px; }

/* the car, in the near lane */
.car-track { position: absolute; left: 4%; bottom: 26px; width: 190px; }
.car { animation: idle 1.6s ease-in-out infinite; }
@keyframes idle { 50% { transform: translateY(-1px); } }

@media (max-width: 767px) {
  .road { height: 170px; }
  .road__hills { bottom: 70px; }
  .road__plane { height: 150px; }
  .road__edge--far { top: 24px; }
  .road__lights { width: 32px; right: 8%; bottom: 84px; }
  .car-track { width: 128px; bottom: 18px; }
}
@media (prefers-reduced-motion: reduce) {
  .car { animation: none; }
}
</style>

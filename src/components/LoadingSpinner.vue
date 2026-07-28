<template>
  <div
    class="loading-state"
    role="status"
    aria-live="polite"
  >
    <span
      class="loading-state__indicator"
      aria-hidden="true"
    ></span>
    <span class="loading-state__text">{{ label }}</span>
  </div>
</template>

<script setup>
defineProps({
  label: {
    type: String,
    required: true
  }
})
</script>

<style scoped>
.loading-state {
  display: grid;
  place-content: center;
  width: 100%;
  min-height: clamp(360px, 65dvh, 720px);
  margin: 0;
  padding: clamp(24px, 5vw, 60px);
  box-sizing: border-box;
  color: var(--color-text-primary);
  font-size: clamp(
    var(--font-size-body),
    1.2vw,
    var(--font-size-heading-md)
  );
  letter-spacing: 0.04em;
}

.loading-state__indicator,
.loading-state__text {
  grid-area: 1 / 1;
  place-self: center;
}

.loading-state__indicator {
  width: clamp(150px, 18vw, 220px);
  aspect-ratio: 1;
  border: clamp(2px, 0.25vw, 4px) solid var(--color-brand-primary);
  border-top-color: transparent;
  border-radius: 50%;
  box-sizing: border-box;
  animation: loading-circle-spin 2.4s linear infinite;
}

.loading-state__text {
  position: relative;
  z-index: 1;
  max-width: 120px;
  line-height: 1.4;
  text-align: center;
}

@keyframes loading-circle-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 700px) {
  .loading-state {
    min-height: clamp(320px, 58dvh, 520px);
    padding: 24px 16px;
  }

  .loading-state__indicator {
    width: clamp(140px, 46vw, 175px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .loading-state__indicator {
    animation: none;
  }
}
</style>

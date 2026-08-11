<template>
  <span
    class="brand-logo"
    :class="`brand-logo--${logoShape}`"
    :data-logo-shape="logoShape"
    :style="{ '--brand-logo-position': resolvedPosition }"
  >
    <img
      v-if="!hasError"
      class="brand-logo__image"
      :src="displaySrc"
      :alt="resolvedAlt"
      decoding="async"
      @load="handleLogoLoad"
      @error="handleLogoError"
    >
    <span
      v-else
      class="brand-logo__fallback"
      role="img"
      :aria-label="resolvedAlt"
    >
      {{ brandName }}
    </span>
  </span>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { brand } from '../config/brand'

const props = defineProps({
  src: {
    type: String,
    default: ''
  },
  alt: {
    type: String,
    default: ''
  },
  position: {
    type: String,
    default: ''
  },
  trimWhitespace: {
    type: Boolean,
    default: true
  }
})

const MAX_PROCESSING_SIZE = 1000
const BACKGROUND_DISTANCE_THRESHOLD = 34
const ALPHA_THRESHOLD = 18
const logoProcessingCache = new Map()

const resolvedSrc = computed(() => props.src || brand.logo.src)
const resolvedAlt = computed(() => props.alt || brand.logo.alt || brand.name)
const resolvedPosition = computed(() => props.position || brand.logo.position)
const displaySrc = ref(resolvedSrc.value)
const hasError = ref(false)
const contentRatio = ref(1)

const brandName = computed(() => brand.name || props.alt)
const logoShape = computed(() => {
  if (contentRatio.value > 3) return 'wide'
  if (contentRatio.value < 0.8) return 'tall'
  return 'standard'
})

watch(
  resolvedSrc,
  nextSrc => {
    displaySrc.value = nextSrc
    hasError.value = false
    contentRatio.value = 1
  }
)

const getCornerBackgroundColor = (pixels, width, height) => {
  const sampleSize = Math.max(2, Math.min(12, Math.round(Math.min(width, height) * 0.02)))
  const corners = [
    [0, 0],
    [width - sampleSize, 0],
    [0, height - sampleSize],
    [width - sampleSize, height - sampleSize]
  ]
  const totals = [0, 0, 0]
  let sampleCount = 0

  corners.forEach(([startX, startY]) => {
    for (let y = startY; y < startY + sampleSize; y += 1) {
      for (let x = startX; x < startX + sampleSize; x += 1) {
        const pixelIndex = (y * width + x) * 4
        if (pixels[pixelIndex + 3] < ALPHA_THRESHOLD) continue

        totals[0] += pixels[pixelIndex]
        totals[1] += pixels[pixelIndex + 1]
        totals[2] += pixels[pixelIndex + 2]
        sampleCount += 1
      }
    }
  })

  if (!sampleCount) return [255, 255, 255]
  return totals.map(total => total / sampleCount)
}

const normalizeLogo = image => {
  const naturalWidth = image.naturalWidth
  const naturalHeight = image.naturalHeight

  if (!naturalWidth || !naturalHeight) {
    return { src: resolvedSrc.value, ratio: 1 }
  }

  const scale = Math.min(1, MAX_PROCESSING_SIZE / Math.max(naturalWidth, naturalHeight))
  const width = Math.max(1, Math.round(naturalWidth * scale))
  const height = Math.max(1, Math.round(naturalHeight * scale))
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })

  if (!context) {
    return { src: resolvedSrc.value, ratio: naturalWidth / naturalHeight }
  }

  canvas.width = width
  canvas.height = height
  context.drawImage(image, 0, 0, width, height)

  let imageData
  try {
    imageData = context.getImageData(0, 0, width, height)
  } catch {
    return { src: resolvedSrc.value, ratio: naturalWidth / naturalHeight }
  }

  const pixels = imageData.data
  let hasTransparency = false

  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index] < 245) {
      hasTransparency = true
      break
    }
  }

  const background = getCornerBackgroundColor(pixels, width, height)
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = (y * width + x) * 4
      const alpha = pixels[pixelIndex + 3]
      let isContent = alpha > ALPHA_THRESHOLD

      if (!hasTransparency && isContent) {
        const redDistance = pixels[pixelIndex] - background[0]
        const greenDistance = pixels[pixelIndex + 1] - background[1]
        const blueDistance = pixels[pixelIndex + 2] - background[2]
        const colorDistance = Math.sqrt(
          redDistance ** 2 + greenDistance ** 2 + blueDistance ** 2
        )
        isContent = colorDistance > BACKGROUND_DISTANCE_THRESHOLD
      }

      if (!isContent) continue

      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }

  if (maxX < minX || maxY < minY) {
    return { src: resolvedSrc.value, ratio: naturalWidth / naturalHeight }
  }

  const detectedWidth = maxX - minX + 1
  const detectedHeight = maxY - minY + 1
  const padding = Math.max(2, Math.round(Math.max(detectedWidth, detectedHeight) * 0.035))
  const cropX = Math.max(0, minX - padding)
  const cropY = Math.max(0, minY - padding)
  const cropRight = Math.min(width, maxX + padding + 1)
  const cropBottom = Math.min(height, maxY + padding + 1)
  const cropWidth = cropRight - cropX
  const cropHeight = cropBottom - cropY
  const ratio = cropWidth / cropHeight
  const retainedArea = (cropWidth * cropHeight) / (width * height)

  if (!props.trimWhitespace || retainedArea > 0.94) {
    return { src: resolvedSrc.value, ratio }
  }

  const croppedCanvas = document.createElement('canvas')
  const croppedContext = croppedCanvas.getContext('2d')

  if (!croppedContext) {
    return { src: resolvedSrc.value, ratio }
  }

  croppedCanvas.width = cropWidth
  croppedCanvas.height = cropHeight
  croppedContext.drawImage(
    canvas,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight
  )

  return {
    src: croppedCanvas.toDataURL('image/webp', 0.92),
    ratio
  }
}

const handleLogoLoad = async event => {
  const image = event.currentTarget

  if (displaySrc.value !== resolvedSrc.value) {
    return
  }

  if (!props.trimWhitespace) {
    contentRatio.value = image.naturalWidth / image.naturalHeight
    return
  }

  if (!logoProcessingCache.has(resolvedSrc.value)) {
    logoProcessingCache.set(
      resolvedSrc.value,
      Promise.resolve().then(() => normalizeLogo(image))
    )
  }

  const normalizedLogo = await logoProcessingCache.get(resolvedSrc.value)
  contentRatio.value = normalizedLogo.ratio

  if (normalizedLogo.src !== resolvedSrc.value) {
    displaySrc.value = normalizedLogo.src
  }
}

const handleLogoError = () => {
  hasError.value = true
}
</script>

<style scoped>
.brand-logo {
  --brand-logo-inline-size: min(var(--brand-logo-size, 220px), 100%);
  --brand-logo-block-size: min(var(--brand-logo-size, 180px), 160px);
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  width: var(--brand-logo-inline-size);
  height: var(--brand-logo-block-size);
  max-width: 100%;
  overflow: hidden;
  line-height: 1;
}

.brand-logo__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: var(--brand-logo-position, left center);
}

.brand-logo__fallback {
  max-width: 100%;
  overflow: hidden;
  color: var(--color-text-strong);
  font-size: clamp(var(--font-size-body), 2.2vw, var(--font-size-2xl));
  font-weight: var(--font-weight-semibold);
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

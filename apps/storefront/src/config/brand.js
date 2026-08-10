import { reactive } from 'vue'
import logoSrc from '../assets/logo1.png'

export const brand = reactive({
  name: 'GlowField',
  logo: {
    src: logoSrc,
    alt: 'GlowField',
    position: 'left center'
  }
})

const COLOR_VARIABLES = Object.freeze({
  primary: '--color-brand-primary',
  secondary: '--color-brand-secondary',
  surface: '--color-brand-tertiary',
  text: '--color-brand-quaternary',
  contrast: '--color-brand-quinary'
})

const isValidColor = value => (
  typeof value === 'string' &&
  value.length <= 64 &&
  globalThis.CSS?.supports?.('color', value)
)

export function applyStorefrontDesign(settings = {}) {
  const brandSettings = settings.brand || {}
  const logoSettings = brandSettings.logo || {}

  if (typeof brandSettings.name === 'string' && brandSettings.name.trim()) {
    brand.name = brandSettings.name.trim().slice(0, 120)
  }

  if (typeof logoSettings.url === 'string' && logoSettings.url.trim()) {
    brand.logo.src = logoSettings.url.trim()
  }

  if (typeof logoSettings.alt === 'string' && logoSettings.alt.trim()) {
    brand.logo.alt = logoSettings.alt.trim().slice(0, 160)
  } else {
    brand.logo.alt = brand.name
  }

  if (
    typeof logoSettings.position === 'string' &&
    /^(left|center|right) (top|center|bottom)$/.test(logoSettings.position)
  ) {
    brand.logo.position = logoSettings.position
  }

  const root = document.documentElement
  const colors = brandSettings.colors || {}

  Object.entries(COLOR_VARIABLES).forEach(([key, cssVariable]) => {
    const value = colors[key]

    if (isValidColor(value)) root.style.setProperty(cssVariable, value)
  })
}

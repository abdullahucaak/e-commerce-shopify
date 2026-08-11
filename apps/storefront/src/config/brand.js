import { reactive } from 'vue'
import logoSrc from '../assets/logo1.png'

export const brand = reactive({
  name: 'GlowField',
  logo: {
    src: logoSrc,
    alt: 'GlowField',
    position: 'left center',
    size: 180
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
  const logoUrl = logoSettings.url || brandSettings.logoUrl
  const hasLogoUrl = Object.prototype.hasOwnProperty.call(logoSettings, 'url') ||
    Object.prototype.hasOwnProperty.call(brandSettings, 'logoUrl')

  if (typeof brandSettings.name === 'string' && brandSettings.name.trim()) {
    brand.name = brandSettings.name.trim().slice(0, 120)
  }

  if (hasLogoUrl) {
    brand.logo.src = typeof logoUrl === 'string' ? logoUrl.trim() : ''
  }

  if (typeof logoSettings.alt === 'string' && logoSettings.alt.trim()) {
    brand.logo.alt = logoSettings.alt.trim().slice(0, 160)
  } else {
    brand.logo.alt = brand.name
  }

  brand.logo.position = 'left center'

  const logoSize = Number(logoSettings.size)
  if (Number.isInteger(logoSize) && logoSize >= 80 && logoSize <= 320) {
    brand.logo.size = logoSize
    document.documentElement.style.setProperty('--brand-logo-size', `${logoSize}px`)
  }

  const root = document.documentElement
  const colors = brandSettings.colors || {}

  Object.entries(COLOR_VARIABLES).forEach(([key, cssVariable]) => {
    const value = colors[key]

    if (isValidColor(value)) root.style.setProperty(cssVariable, value)
  })
}

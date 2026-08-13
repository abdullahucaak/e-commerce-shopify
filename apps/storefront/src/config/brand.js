import { reactive } from 'vue'
import logoSrc from '../assets/logo1.png'
import aboutImageSrc from '../assets/about_us.webp'
import heroImageSrc from '../assets/banner-tea-plantation.jpg'

export const brand = reactive({
  name: 'GlowField',
  logo: {
    src: logoSrc,
    alt: 'GlowField',
    position: 'left center',
    size: 180
  },
  announcement: {
    enabled: true,
    text: "Until October 20th, enjoy a 10% discount on every product with the code '1A18NM'!"
  },
  content: {
    home: {
      heroTitle: 'Meet Assam Golden Tippy',
      heroSubtitle: 'A new, limited quantity, golden tipped black tea for the spring.',
      statement: 'We source organic and biodynamic teas, directly from people and planet-friendly farms in India.',
      heroImageUrl: heroImageSrc
    },
    shop: {
      description: 'We source our teas from organic estates and farms that are building soil health and going back to regenerative practices: no tilling, no pesticides, and no synthetic inputs. All our teas come from biodynamic estates. All our herbals come from organic farms, which have transitioned to regenerative agriculture. Picked fresh and sent in small batches, our products celebrate simple and pure ingredients free of pesticides or added flavorings.'
    },
    about: {
      title: 'A note from our Founders',
      imageUrl: aboutImageSrc,
      imageAlt: 'Our founders',
      body: `Alaya comes from “Himalaya,” the region that inspired us to build a tea company. After growing up drinking chai and traversing this mountainous area in India’s Northeast, visiting small farmers and tea estates, we were keen to build a company that respects these communities and addresses the environmental challenges we face through agriculture.

In the eastern Indian state of West Bengal, Darjeeling, a community famous for producing the Champagne of tea, sits amidst the Himalayas. Here, time unravels more slowly. An iconic train makes its way up the mountains, over hours, to this old British outpost. As the fog lifts, women can be seen hugging the sloping tea estates each morning, plucking two leaves and a bud, or tea, by hand. Meanwhile, they sing. It's magical.

Nearby, fields of chamomile flowers grace the valleys. Mint grows abundantly. These are the bounties of nature, cultivated by women, resulting in the highest quality teas and herbs. Women are the backbone of agriculture in so many of these communities, be it in Darjeeling, Assam, or Uttar Pradesh. We are a company that celebrates the beauty of these women in the tea growing regions of the world.

Thanks for coming along our journey,

Esha Chhabra and Smita Satiani Co-founders, Alaya Tea

Photo credit: Justin Bettman`
    },
    footer: {
      emails: ['info@alayatea.co', 'press@alayatea.co', 'wholesale@alayatea.co'],
      social: { facebookUrl: '', instagramUrl: '' }
    }
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

  if (settings.announcement && typeof settings.announcement === 'object') {
    brand.announcement.enabled = settings.announcement.enabled !== false
    if (typeof settings.announcement.text === 'string') {
      brand.announcement.text = settings.announcement.text.trim().slice(0, 240)
    }
  }

  if (settings.content && typeof settings.content === 'object') {
    const content = settings.content
    Object.assign(brand.content.home, content.home || {})
    if (!brand.content.home.heroImageUrl) brand.content.home.heroImageUrl = heroImageSrc
    Object.assign(brand.content.shop, content.shop || {})
    Object.assign(brand.content.about, content.about || {})
    if (!brand.content.about.imageUrl) brand.content.about.imageUrl = aboutImageSrc
    if (Array.isArray(content.footer?.emails)) {
      brand.content.footer.emails = content.footer.emails.slice(0, 3)
    }
    Object.assign(brand.content.footer.social, content.footer?.social || {})
  }

  Object.entries(COLOR_VARIABLES).forEach(([key, cssVariable]) => {
    const value = colors[key]

    if (isValidColor(value)) root.style.setProperty(cssVariable, value)
  })
}

import {
  publishScopedCmsDraft,
  readScopedCmsConfig,
  saveScopedCmsDraft
} from './cms-config-versions.mjs'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const DEFAULT_STOREFRONT_CONTENT = Object.freeze({
  home: {
    heroTitle: 'Meet Assam Golden Tippy',
    heroSubtitle: 'A new, limited quantity, golden tipped black tea for the spring.',
    statement: 'We source organic and biodynamic teas, directly from people and planet-friendly farms in India.',
    heroImageUrl: null
  },
  shop: {
    description: 'We source our teas from organic estates and farms that are building soil health and going back to regenerative practices: no tilling, no pesticides, and no synthetic inputs. All our teas come from biodynamic estates. All our herbals come from organic farms, which have transitioned to regenerative agriculture. Picked fresh and sent in small batches, our products celebrate simple and pure ingredients free of pesticides or added flavorings.'
  },
  about: {
    title: 'A note from our Founders',
    imageUrl: null,
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
})

function requiredText(value, maximum) {
  const text = String(value || '').trim()
  if (!text || text.length > maximum) throw new Error('invalid_content_settings')
  return text
}

function optionalHttpsUrl(value, allowedHosts = null) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (text.length > 500) throw new Error('invalid_content_settings')
  let url
  try {
    url = new URL(text)
  } catch {
    throw new Error('invalid_content_settings')
  }
  const hostname = url.hostname.toLowerCase().replace(/^www[.]/, '')
  if (url.protocol !== 'https:' || (allowedHosts && !allowedHosts.includes(hostname))) {
    throw new Error('invalid_content_settings')
  }
  return url.toString()
}

export function normalizeContentSettings(input) {
  const emails = Array.isArray(input?.footer?.emails)
    ? input.footer.emails.map(value => String(value || '').trim()).filter(Boolean)
    : []
  if (emails.length > 3 || emails.some(email => email.length > 254 || !EMAIL.test(email))) {
    throw new Error('invalid_content_settings')
  }

  return {
    home: {
      heroTitle: requiredText(input?.home?.heroTitle, 32),
      heroSubtitle: requiredText(input?.home?.heroSubtitle, 80),
      statement: requiredText(input?.home?.statement, 120),
      heroImageUrl: optionalHttpsUrl(input?.home?.heroImageUrl) || null
    },
    shop: { description: requiredText(input?.shop?.description, 450) },
    about: {
      title: requiredText(input?.about?.title, 40),
      imageUrl: optionalHttpsUrl(input?.about?.imageUrl) || null,
      imageAlt: requiredText(input?.about?.imageAlt || input?.about?.title, 120),
      body: requiredText(input?.about?.body, 4000)
    },
    footer: {
      emails,
      social: {
        facebookUrl: optionalHttpsUrl(input?.footer?.social?.facebookUrl, ['facebook.com', 'fb.com']),
        instagramUrl: optionalHttpsUrl(input?.footer?.social?.instagramUrl, ['instagram.com'])
      }
    }
  }
}

function contentWithDefaults(stored = {}) {
  return {
    home: { ...DEFAULT_STOREFRONT_CONTENT.home, ...(stored.home || {}) },
    shop: { ...DEFAULT_STOREFRONT_CONTENT.shop, ...(stored.shop || {}) },
    about: { ...DEFAULT_STOREFRONT_CONTENT.about, ...(stored.about || {}) },
    footer: {
      ...DEFAULT_STOREFRONT_CONTENT.footer,
      ...(stored.footer || {}),
      social: {
        ...DEFAULT_STOREFRONT_CONTENT.footer.social,
        ...(stored.footer?.social || {})
      }
    }
  }
}

function normalizeStoredContentScope(settings) {
  return { content: normalizeContentSettings(contentWithDefaults(settings?.content)) }
}

export async function readContentConfig({ database, userId, storefrontId }) {
  const config = await readScopedCmsConfig({
    database, userId, storefrontId, scope: 'content'
  })
  if (!config) return null
  return {
    ...config,
    settings: contentWithDefaults(config.settings?.content)
  }
}

export async function saveContentDraft({ database, userId, storefrontId, settings }) {
  const normalized = normalizeContentSettings(settings)
  const result = await saveScopedCmsDraft({
    database,
    userId,
    storefrontId,
    scope: 'content',
    permission: 'contentWrite',
    normalizedScope: { content: normalized }
  })
  return { ...result, settings: normalized }
}

export async function publishContentConfig({ database, userId, storefrontId }) {
  const result = await publishScopedCmsDraft({
    database,
    userId,
    storefrontId,
    scope: 'content',
    permission: 'contentWrite',
    normalizeStoredScope: normalizeStoredContentScope
  })
  return {
    ...result,
    settings: contentWithDefaults(result.settings?.content)
  }
}

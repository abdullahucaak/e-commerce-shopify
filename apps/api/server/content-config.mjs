import { readDesignConfig } from './design-config.mjs'

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

export async function readContentConfig({ database, userId, storefrontId }) {
  const config = await readDesignConfig({ database, userId, storefrontId })
  if (!config) return null
  const stored = config.settings?.content || {}
  return {
    version: config.version || null,
    settings: {
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
}

export async function publishContentConfig({ database, userId, storefrontId, settings }) {
  const normalized = normalizeContentSettings(settings)
  const client = await database.connect()
  try {
    await client.query('begin')
    const access = await client.query(
      `select membership.role::text
       from public.storefronts storefront
       join public.shopify_stores store on store.id = storefront.shopify_store_id
       join public.workspace_memberships membership on membership.workspace_id = store.workspace_id
       where storefront.id = $1 and membership.user_id = $2
       for update of storefront`,
      [storefrontId, userId]
    )
    if (!access.rows[0]) throw new Error('storefront_access_denied')
    if (!['owner', 'admin', 'editor'].includes(access.rows[0].role)) {
      throw new Error('storefront_write_denied')
    }

    const current = await client.query(
      `select settings from public.storefront_config_versions
       where storefront_id = $1 and status = 'published'
       order by version desc limit 1 for update`,
      [storefrontId]
    )
    const versionResult = await client.query(
      `select coalesce(max(version), 0) + 1 as next_version
       from public.storefront_config_versions where storefront_id = $1`,
      [storefrontId]
    )
    const version = Number(versionResult.rows[0].next_version)
    const mergedSettings = { ...(current.rows[0]?.settings || {}), content: normalized }

    await client.query(
      `update public.storefront_config_versions set status = 'archived'
       where storefront_id = $1 and status = 'published'`,
      [storefrontId]
    )
    await client.query(
      `insert into public.storefront_config_versions
       (storefront_id, version, status, settings, created_by, published_at)
       values ($1, $2, 'published', $3, $4, now())`,
      [storefrontId, version, mergedSettings, userId]
    )
    await client.query('commit')
    return { version, settings: normalized }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

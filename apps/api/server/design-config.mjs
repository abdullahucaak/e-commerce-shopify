import {
  publishScopedCmsDraft,
  readScopedCmsConfig,
  saveScopedCmsDraft
} from './cms-config-versions.mjs'

const HEX_COLOR = /^#[0-9a-f]{6}$/i

function cleanText(value, maxLength) {
  const text = String(value || '').trim()
  if (!text || text.length > maxLength) throw new Error('invalid_design_settings')
  return text
}

export function normalizeDesignSettings(input) {
  const primary = String(input?.colors?.primary || '').trim()
  const secondary = String(input?.colors?.secondary || '').trim()
  if (!HEX_COLOR.test(primary) || !HEX_COLOR.test(secondary)) {
    throw new Error('invalid_design_settings')
  }

  let logoUrl = String(input?.logoUrl || '').trim()
  if (logoUrl) {
    const parsed = new URL(logoUrl)
    if (parsed.protocol !== 'https:' || logoUrl.length > 1000) {
      throw new Error('invalid_design_settings')
    }
  }
  const logoSize = Number(input?.logoSize || 180)
  if (!Number.isInteger(logoSize) || logoSize < 80 || logoSize > 320) {
    throw new Error('invalid_design_settings')
  }

  const announcementEnabled = input?.announcement?.enabled !== false
  const announcementText = String(input?.announcement?.text || '').trim()
  if ((announcementEnabled && !announcementText) || announcementText.length > 240) {
    throw new Error('invalid_design_settings')
  }

  return {
    brand: {
      name: cleanText(input?.name, 120),
      logo: {
        url: logoUrl || null,
        alt: cleanText(input?.name, 120),
        position: 'left center',
        size: logoSize
      },
      colors: { primary: primary.toLowerCase(), secondary: secondary.toLowerCase() }
    },
    announcement: {
      enabled: announcementEnabled,
      text: announcementText
    }
  }
}

function designInputFromStoredSettings(settings) {
  const brand = settings?.brand || {}
  return {
    name: brand.name,
    logoUrl: brand.logo?.url,
    logoSize: brand.logo?.size,
    colors: brand.colors,
    announcement: settings?.announcement
  }
}

function normalizeStoredDesignScope(settings) {
  return normalizeDesignSettings(designInputFromStoredSettings(settings))
}

export async function readDesignConfig({ database, userId, storefrontId }) {
  return readScopedCmsConfig({ database, userId, storefrontId, scope: 'design' })
}

export async function saveDesignDraft({ database, userId, storefrontId, settings }) {
  const normalized = normalizeDesignSettings(settings)
  const result = await saveScopedCmsDraft({
    database,
    userId,
    storefrontId,
    scope: 'design',
    permission: 'designWrite',
    normalizedScope: normalized
  })
  return { ...result, settings: normalized }
}

export async function publishDesignConfig({ database, userId, storefrontId }) {
  const result = await publishScopedCmsDraft({
    database,
    userId,
    storefrontId,
    scope: 'design',
    permission: 'designWrite',
    normalizeStoredScope: normalizeStoredDesignScope
  })
  return {
    ...result,
    settings: normalizeStoredDesignScope(result.settings)
  }
}

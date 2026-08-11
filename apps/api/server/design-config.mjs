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

export async function readDesignConfig({ database, userId, storefrontId }) {
  const result = await database.query(
    `select config.version, config.settings
     from public.storefronts storefront
     join public.shopify_stores store on store.id = storefront.shopify_store_id
     join public.workspace_memberships membership
       on membership.workspace_id = store.workspace_id and membership.user_id = $1
     left join lateral (
       select version, settings
       from public.storefront_config_versions
       where storefront_id = storefront.id and status = 'published'
       order by version desc limit 1
     ) config on true
     where storefront.id = $2`,
    [userId, storefrontId]
  )
  return result.rows[0] || null
}

export async function publishDesignConfig({ database, userId, storefrontId, settings }) {
  const normalized = normalizeDesignSettings(settings)
  const client = await database.connect()
  try {
    await client.query('begin')
    const access = await client.query(
      `select membership.role::text
       from public.storefronts storefront
       join public.shopify_stores store on store.id = storefront.shopify_store_id
       join public.workspace_memberships membership
         on membership.workspace_id = store.workspace_id
       where storefront.id = $1 and membership.user_id = $2
       for update of storefront`,
      [storefrontId, userId]
    )
    if (!access.rows[0]) throw new Error('storefront_access_denied')
    if (!['owner', 'admin', 'editor'].includes(access.rows[0].role)) {
      throw new Error('storefront_write_denied')
    }

    const versionResult = await client.query(
      `select coalesce(max(version), 0) + 1 as next_version
       from public.storefront_config_versions where storefront_id = $1`,
      [storefrontId]
    )
    const version = Number(versionResult.rows[0].next_version)
    await client.query(
      `update public.storefront_config_versions
       set status = 'archived' where storefront_id = $1 and status = 'published'`,
      [storefrontId]
    )
    await client.query(
      `insert into public.storefront_config_versions
       (storefront_id, version, status, settings, created_by, published_at)
       values ($1, $2, 'published', $3, $4, now())`,
      [storefrontId, version, normalized, userId]
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

const STEP_ORDER = [
  'shopify_connection',
  'niche_selection',
  'banner_selection',
  'brand_setup',
  'store_preview',
  'domain_setup',
  'plan_selection',
  'publish'
]

const REQUIRED_SETUP_STEPS = [
  'shopify_connection',
  'niche_selection',
  'banner_selection',
  'brand_setup',
  'store_preview',
  'domain_setup'
]

export async function completeStorePreview({ database, userId, storefrontId }) {
  const storefront = await assertStorefrontAccess({ database, userId, storefrontId })
  if (!storefront) throw new Error('storefront_access_denied')
  await database.query(
    `insert into public.onboarding_progress (storefront_id, step_key, status, completed_at)
     values ($1, 'store_preview', 'completed', now())
     on conflict (storefront_id, step_key) do update set
       status = 'completed', completed_at = now(), updated_at = now()`,
    [storefrontId]
  )
  return { completed: true }
}

export async function completeDomainSetup({ database, userId, storefrontId }) {
  const storefront = await assertStorefrontAccess({ database, userId, storefrontId })
  if (!storefront) throw new Error('storefront_access_denied')

  const activeCustomDomain = await database.query(
    `select hostname
     from public.store_domains
     where storefront_id = $1 and kind = 'custom' and status = 'active'
     order by is_primary desc, created_at asc
     limit 1`,
    [storefrontId]
  )
  if (!activeCustomDomain.rows[0]) {
    return { completed: false, hostname: null }
  }

  await database.query(
    `insert into public.onboarding_progress (storefront_id, step_key, status, completed_at, data)
     values ($1, 'domain_setup', 'completed', now(), jsonb_build_object('hostname', $2::text))
     on conflict (storefront_id, step_key) do update set
       status = 'completed', completed_at = now(), data = excluded.data, updated_at = now()`,
    [storefrontId, activeCustomDomain.rows[0].hostname]
  )
  return { completed: true, hostname: activeCustomDomain.rows[0].hostname }
}

export async function completeBrandSetup({ database, userId, storefrontId }) {
  const storefront = await assertStorefrontAccess({ database, userId, storefrontId })
  if (!storefront) throw new Error('storefront_access_denied')
  await database.query(
    `insert into public.onboarding_progress (storefront_id, step_key, status, completed_at)
     values ($1, 'brand_setup', 'completed', now())
     on conflict (storefront_id, step_key) do update set
       status = 'completed', completed_at = now(), updated_at = now()`,
    [storefrontId]
  )
  return { completed: true }
}

async function assertStorefrontAccess({ database, userId, storefrontId }) {
  const result = await database.query(
    `select storefront.id, storefront.niche_id::text, store.shop_name, store.current_myshopify_domain
     from public.storefronts storefront
     join public.shopify_stores store on store.id = storefront.shopify_store_id
     join public.workspace_memberships membership on membership.workspace_id = store.workspace_id
     where storefront.id = $1 and membership.user_id = $2
     limit 1`,
    [storefrontId, userId]
  )
  return result.rows[0] || null
}

export async function completeOnboarding({ database, userId, storefrontId }) {
  const storefront = await assertStorefrontAccess({ database, userId, storefrontId })
  if (!storefront) throw new Error('storefront_access_denied')

  const progressResult = await database.query(
    `select step_key
     from public.onboarding_progress
     where storefront_id = $1
       and status = 'completed'
       and step_key = any($2::text[])`,
    [storefrontId, REQUIRED_SETUP_STEPS]
  )
  const completedSteps = new Set(progressResult.rows.map(row => row.step_key))
  const missingSteps = REQUIRED_SETUP_STEPS.filter(step => !completedSteps.has(step))

  if (missingSteps.length) {
    const error = new Error('onboarding_incomplete')
    error.missingSteps = missingSteps
    throw error
  }

  const client = await database.connect()
  try {
    await client.query('begin')
    await client.query(
      `update public.storefronts
       set status = 'active', updated_at = now()
       where id = $1`,
      [storefrontId]
    )
    await client.query(
      `insert into public.onboarding_progress (storefront_id, step_key, status, completed_at)
       values ($1, 'publish', 'completed', now())
       on conflict (storefront_id, step_key) do update set
         status = 'completed', completed_at = now(), updated_at = now()`,
      [storefrontId]
    )
    await client.query('commit')
    return { completed: true, status: 'active' }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

export async function readOnboarding({ database, userId, storefrontId }) {
  const storefront = await assertStorefrontAccess({ database, userId, storefrontId })
  if (!storefront) return null

  const [details, steps, subscription, niches, bannerPresets] = await Promise.all([
    database.query(
      `select niche_id::text, selected_banner_preset_id::text, template_key
       from public.storefronts where id = $1`,
      [storefrontId]
    ),
    database.query(
      `select step_key, status::text, completed_at, data
       from public.onboarding_progress where storefront_id = $1`,
      [storefrontId]
    ),
    database.query(
      `select plan_key, status::text, unit_amount, currency_code
       from public.store_subscriptions where storefront_id = $1 limit 1`,
      [storefrontId]
    ),
    database.query(
      `select id::text, key, name, description
       from public.niches where is_active = true order by display_order, name`
    ),
    database.query(
      `select id::text, niche_id::text, name, title, subtitle, image_url,
              primary_color, secondary_color
       from public.banner_presets where is_active = true order by display_order, name`
    )
  ])

  const progressByKey = new Map(steps.rows.map(step => [step.step_key, step]))
  return {
    storefront: {
      id: storefront.id,
      name: storefront.shop_name,
      myshopifyDomain: storefront.current_myshopify_domain,
      nicheId: details.rows[0]?.niche_id || null,
      bannerPresetId: details.rows[0]?.selected_banner_preset_id || null,
      templateKey: details.rows[0]?.template_key || 'glowfield_v1'
    },
    subscription: subscription.rows[0] || null,
    steps: STEP_ORDER.map(key => progressByKey.get(key) || {
      step_key: key, status: 'not_started', completed_at: null, data: {}
    }),
    niches: niches.rows,
    bannerPresets: bannerPresets.rows.map(preset => ({
      id: preset.id, nicheId: preset.niche_id, name: preset.name,
      title: preset.title, subtitle: preset.subtitle, imageUrl: preset.image_url,
      primaryColor: preset.primary_color, secondaryColor: preset.secondary_color
    }))
  }
}

export async function selectBannerPreset({ database, userId, storefrontId, bannerPresetId }) {
  const storefront = await assertStorefrontAccess({ database, userId, storefrontId })
  if (!storefront) throw new Error('storefront_access_denied')
  const preset = await database.query(
    `select preset.id, preset.title, preset.subtitle, preset.image_url
     from public.banner_presets preset
     join public.storefronts storefront on storefront.niche_id = preset.niche_id
     where storefront.id = $1 and preset.id = $2 and preset.is_active = true limit 1`,
    [storefrontId, bannerPresetId]
  )
  if (!preset.rows[0]) throw new Error('invalid_banner_preset')
  const client = await database.connect()
  try {
    await client.query('begin')
    await client.query('update public.storefronts set selected_banner_preset_id = $2 where id = $1', [storefrontId, bannerPresetId])

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
    const currentSettings = current.rows[0]?.settings || {}
    const currentContent = currentSettings.content || {}
    const selectedPreset = preset.rows[0]
    const mergedSettings = {
      ...currentSettings,
      content: {
        ...currentContent,
        home: {
          ...(currentContent.home || {}),
          heroTitle: selectedPreset.title,
          heroSubtitle: selectedPreset.subtitle,
          heroImageUrl: selectedPreset.image_url
        }
      }
    }

    await client.query(
      `update public.storefront_config_versions set status = 'archived'
       where storefront_id = $1 and status = 'published'`,
      [storefrontId]
    )
    await client.query(
      `insert into public.storefront_config_versions
       (storefront_id, version, status, settings, created_by, published_at)
       values ($1, $2, 'published', $3, $4, now())`,
      [storefrontId, Number(versionResult.rows[0].next_version), mergedSettings, userId]
    )
    await client.query(
      `insert into public.onboarding_progress (storefront_id, step_key, status, completed_at)
       values ($1, 'banner_selection', 'completed', now())
       on conflict (storefront_id, step_key) do update set
         status = 'completed', completed_at = now(), updated_at = now()`, [storefrontId]
    )
    await client.query('commit')
    return {
      bannerPresetId,
      banner: {
        title: selectedPreset.title,
        subtitle: selectedPreset.subtitle,
        imageUrl: selectedPreset.image_url
      }
    }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally { client.release() }
}

export async function selectNiche({ database, userId, storefrontId, nicheId }) {
  const storefront = await assertStorefrontAccess({ database, userId, storefrontId })
  if (!storefront) throw new Error('storefront_access_denied')

  const niche = await database.query(
    `select id from public.niches where id = $1 and is_active = true limit 1`,
    [nicheId]
  )
  if (!niche.rows[0]) throw new Error('invalid_niche')

  const client = await database.connect()
  try {
    await client.query('begin')
    const nicheChanged = storefront.niche_id !== nicheId
    await client.query(
      `update public.storefronts set
         niche_id = $2,
         selected_banner_preset_id = case when niche_id is distinct from $2 then null else selected_banner_preset_id end
       where id = $1`,
      [storefrontId, nicheId]
    )
    await client.query(
      `insert into public.onboarding_progress (storefront_id, step_key, status, completed_at)
       values ($1, 'niche_selection', 'completed', now())
       on conflict (storefront_id, step_key) do update set
         status = 'completed', completed_at = now(), updated_at = now()`,
      [storefrontId]
    )
    if (nicheChanged) {
      await client.query(
        `insert into public.onboarding_progress (storefront_id, step_key, status, completed_at)
         values ($1, 'banner_selection', 'not_started', null)
         on conflict (storefront_id, step_key) do update set
           status = 'not_started', completed_at = null, updated_at = now()`,
        [storefrontId]
      )
    }
    await client.query('commit')
    return { nicheId }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

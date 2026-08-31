import { isDeepStrictEqual } from 'node:util'
import { assertStorefrontAdminPermission } from './cms-roles.mjs'

const SCOPE_KEYS = Object.freeze({
  design: Object.freeze(['brand', 'announcement']),
  content: Object.freeze(['content'])
})

function scopeKeys(scope) {
  const keys = SCOPE_KEYS[scope]
  if (!keys) throw new Error('invalid_config_scope')
  return keys
}

function projectScope(settings, scope) {
  const source = settings || {}
  return Object.fromEntries(scopeKeys(scope).map(key => [key, source[key]]))
}

function mergeScope(settings, scope, scopedSettings) {
  const merged = { ...(settings || {}) }
  for (const key of scopeKeys(scope)) {
    if (scopedSettings[key] === undefined) delete merged[key]
    else merged[key] = scopedSettings[key]
  }
  return merged
}

function scopeChanged(draftSettings, publishedSettings, scope) {
  return !isDeepStrictEqual(
    projectScope(draftSettings, scope),
    projectScope(publishedSettings, scope)
  )
}

async function lockStorefrontAccess(client, { userId, storefrontId, permission }) {
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
  assertStorefrontAdminPermission(access.rows[0].role, permission)
}

async function readLockedVersions(client, storefrontId) {
  const result = await client.query(
    `select version, status::text, settings, published_at, updated_at
     from public.storefront_config_versions
     where storefront_id = $1 and status in ('draft', 'published')
     for update`,
    [storefrontId]
  )
  return {
    published: result.rows.find(row => row.status === 'published') || null,
    draft: result.rows.find(row => row.status === 'draft') || null
  }
}

function responseState({ scope, published, draft, effectiveSettings }) {
  const hasUnpublishedChanges = Boolean(
    draft && scopeChanged(draft.settings, published?.settings || {}, scope)
  )
  return {
    version: hasUnpublishedChanges ? Number(draft.version) : (published ? Number(published.version) : null),
    publishedVersion: published ? Number(published.version) : null,
    draftVersion: hasUnpublishedChanges ? Number(draft.version) : null,
    hasUnpublishedChanges,
    publishedAt: published?.published_at || null,
    draftUpdatedAt: hasUnpublishedChanges ? (draft.updated_at || null) : null,
    settings: effectiveSettings
  }
}

export async function readScopedCmsConfig({ database, userId, storefrontId, scope }) {
  const result = await database.query(
    `select
       published.version as published_version,
       published.settings as published_settings,
       published.published_at,
       draft.version as draft_version,
       draft.settings as draft_settings,
       draft.updated_at as draft_updated_at
     from public.storefronts storefront
     join public.shopify_stores store on store.id = storefront.shopify_store_id
     join public.workspace_memberships membership
       on membership.workspace_id = store.workspace_id and membership.user_id = $1
     left join lateral (
       select version, settings, published_at
       from public.storefront_config_versions
       where storefront_id = storefront.id and status = 'published'
       order by version desc limit 1
     ) published on true
     left join lateral (
       select version, settings, updated_at
       from public.storefront_config_versions
       where storefront_id = storefront.id and status = 'draft'
       order by version desc limit 1
     ) draft on true
     where storefront.id = $2`,
    [userId, storefrontId]
  )
  const row = result.rows[0]
  if (!row) return null

  const published = row.published_version == null ? null : {
    version: row.published_version,
    settings: row.published_settings || {},
    published_at: row.published_at
  }
  const draft = row.draft_version == null ? null : {
    version: row.draft_version,
    settings: row.draft_settings || {},
    updated_at: row.draft_updated_at
  }
  const hasUnpublishedChanges = Boolean(
    draft && scopeChanged(draft.settings, published?.settings || {}, scope)
  )
  const effectiveSettings = hasUnpublishedChanges
    ? mergeScope(published?.settings || {}, scope, projectScope(draft.settings, scope))
    : (published?.settings || {})

  return responseState({ scope, published, draft, effectiveSettings })
}

export async function saveScopedCmsDraft({
  database,
  userId,
  storefrontId,
  scope,
  permission,
  normalizedScope
}) {
  const client = await database.connect()
  try {
    await client.query('begin')
    await lockStorefrontAccess(client, { userId, storefrontId, permission })
    const versions = await readLockedVersions(client, storefrontId)
    const publishedSettings = versions.published?.settings || {}
    const draftSettings = mergeScope(
      versions.draft?.settings || publishedSettings,
      scope,
      normalizedScope
    )
    const hasAnyDraftChanges = !isDeepStrictEqual(draftSettings, publishedSettings)
    let draft = versions.draft

    if (!hasAnyDraftChanges) {
      if (draft) {
        await client.query(
          `delete from public.storefront_config_versions
           where storefront_id = $1 and status = 'draft'`,
          [storefrontId]
        )
      }
      draft = null
    } else if (draft) {
      await client.query(
        `update public.storefront_config_versions
         set settings = $2, created_by = $3, updated_at = now(), published_at = null
         where storefront_id = $1 and status = 'draft'`,
        [storefrontId, draftSettings, userId]
      )
      draft = { ...draft, settings: draftSettings, updated_at: null }
    } else {
      const versionResult = await client.query(
        `select coalesce(max(version), 0) + 1 as next_version
         from public.storefront_config_versions where storefront_id = $1`,
        [storefrontId]
      )
      const version = Number(versionResult.rows[0].next_version)
      await client.query(
        `insert into public.storefront_config_versions
         (storefront_id, version, status, settings, created_by)
         values ($1, $2, 'draft', $3, $4)`,
        [storefrontId, version, draftSettings, userId]
      )
      draft = { version, settings: draftSettings, updated_at: null }
    }

    await client.query('commit')
    const effectiveSettings = draft
      ? mergeScope(publishedSettings, scope, projectScope(draft.settings, scope))
      : publishedSettings
    return responseState({
      scope,
      published: versions.published,
      draft,
      effectiveSettings
    })
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

export async function publishScopedCmsDraft({
  database,
  userId,
  storefrontId,
  scope,
  permission,
  normalizeStoredScope
}) {
  const client = await database.connect()
  try {
    await client.query('begin')
    await lockStorefrontAccess(client, { userId, storefrontId, permission })
    const versions = await readLockedVersions(client, storefrontId)
    const publishedSettings = versions.published?.settings || {}
    if (!versions.draft || !scopeChanged(versions.draft.settings, publishedSettings, scope)) {
      throw new Error('storefront_no_draft_changes')
    }

    const normalizedScope = normalizeStoredScope(projectScope(versions.draft.settings, scope))
    const nextPublishedSettings = mergeScope(publishedSettings, scope, normalizedScope)
    const rebasedDraftSettings = mergeScope(versions.draft.settings, scope, normalizedScope)
    const hasRemainingDraftChanges = !isDeepStrictEqual(rebasedDraftSettings, nextPublishedSettings)

    await client.query(
      `update public.storefront_config_versions set status = 'archived'
       where storefront_id = $1 and status = 'published'`,
      [storefrontId]
    )

    let publishedVersion
    let remainingDraft = null
    if (!hasRemainingDraftChanges) {
      publishedVersion = Number(versions.draft.version)
      await client.query(
        `update public.storefront_config_versions
         set status = 'published', settings = $2, created_by = $3,
             updated_at = now(), published_at = now()
         where storefront_id = $1 and status = 'draft'`,
        [storefrontId, nextPublishedSettings, userId]
      )
    } else {
      const versionResult = await client.query(
        `select coalesce(max(version), 0) + 1 as next_version
         from public.storefront_config_versions where storefront_id = $1`,
        [storefrontId]
      )
      publishedVersion = Number(versionResult.rows[0].next_version)
      const remainingDraftVersion = publishedVersion + 1
      await client.query(
        `insert into public.storefront_config_versions
         (storefront_id, version, status, settings, created_by, published_at)
         values ($1, $2, 'published', $3, $4, now())`,
        [storefrontId, publishedVersion, nextPublishedSettings, userId]
      )
      await client.query(
        `update public.storefront_config_versions
         set version = $2, settings = $3, updated_at = now(), published_at = null
         where storefront_id = $1 and status = 'draft'`,
        [storefrontId, remainingDraftVersion, rebasedDraftSettings]
      )
      remainingDraft = {
        version: remainingDraftVersion,
        settings: rebasedDraftSettings,
        updated_at: null
      }
    }

    await client.query('commit')
    return responseState({
      scope,
      published: {
        version: publishedVersion,
        settings: nextPublishedSettings,
        published_at: null
      },
      draft: remainingDraft,
      effectiveSettings: nextPublishedSettings
    })
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

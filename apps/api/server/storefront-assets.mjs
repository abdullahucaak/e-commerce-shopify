import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { assertStorefrontAdminPermission } from './cms-roles.mjs'

const BUCKET = 'storefront-assets'
const MEBIBYTE = 1024 * 1024
const MAX_INPUT_PIXELS = 20_000_000

export const STOREFRONT_ASSET_QUOTA_BYTES = 25 * MEBIBYTE
export const STOREFRONT_ASSET_RULES = Object.freeze({
  logo: Object.freeze({
    folder: 'logos',
    permission: 'designWrite',
    maxBytes: 2 * MEBIBYTE,
    minWidth: 64,
    minHeight: 32,
    maxWidth: 2400,
    maxHeight: 1200
  }),
  hero: Object.freeze({
    folder: 'hero',
    permission: 'contentWrite',
    maxBytes: 8 * MEBIBYTE,
    minWidth: 1200,
    minHeight: 400,
    maxWidth: 4096,
    maxHeight: 4096
  }),
  about: Object.freeze({
    folder: 'about',
    permission: 'contentWrite',
    maxBytes: 5 * MEBIBYTE,
    minWidth: 400,
    minHeight: 400,
    maxWidth: 3000,
    maxHeight: 3000
  })
})

const FORMATS = Object.freeze({
  jpeg: Object.freeze({ mimeType: 'image/jpeg', extension: 'jpg' }),
  png: Object.freeze({ mimeType: 'image/png', extension: 'png' }),
  webp: Object.freeze({ mimeType: 'image/webp', extension: 'webp' })
})

function detectedRasterFormat(buffer) {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) return 'png'
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg'
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) return 'webp'
  return null
}

function assetError(code, details = null) {
  const error = new Error(code)
  if (details) error.details = details
  return error
}

function ruleFor(purpose) {
  const rule = STOREFRONT_ASSET_RULES[String(purpose || '')]
  if (!rule) throw assetError('invalid_asset_purpose')
  return rule
}

function orientedDimensions(metadata) {
  const rotates = [5, 6, 7, 8].includes(metadata.orientation)
  return {
    width: rotates ? metadata.height : metadata.width,
    height: rotates ? metadata.width : metadata.height
  }
}

export async function inspectStorefrontAsset({ buffer, claimedMimeType, purpose }) {
  const rule = ruleFor(purpose)
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw assetError('invalid_asset_file')
  if (buffer.length > rule.maxBytes) {
    throw assetError('asset_too_large', { maxBytes: rule.maxBytes })
  }

  const detectedFormat = detectedRasterFormat(buffer)
  const detected = FORMATS[detectedFormat]
  if (!detected || claimedMimeType !== detected.mimeType) {
    throw assetError('invalid_asset_type')
  }

  let metadata
  try {
    metadata = await sharp(buffer, {
      failOn: 'error',
      limitInputPixels: MAX_INPUT_PIXELS,
      sequentialRead: true
    }).metadata()
  } catch {
    throw assetError('invalid_asset_type')
  }

  const format = FORMATS[metadata.format]
  if (
    !format ||
    metadata.format !== detectedFormat ||
    !metadata.width ||
    !metadata.height ||
    Number(metadata.pages || 1) !== 1
  ) {
    throw assetError('invalid_asset_type')
  }

  const { width, height } = orientedDimensions(metadata)
  if (
    width < rule.minWidth ||
    height < rule.minHeight ||
    width > rule.maxWidth ||
    height > rule.maxHeight
  ) {
    throw assetError('invalid_asset_dimensions', {
      width,
      height,
      minWidth: rule.minWidth,
      minHeight: rule.minHeight,
      maxWidth: rule.maxWidth,
      maxHeight: rule.maxHeight
    })
  }

  return {
    byteSize: buffer.length,
    width,
    height,
    mimeType: format.mimeType,
    extension: format.extension,
    folder: rule.folder,
    permission: rule.permission
  }
}

function validAssetPath(storefrontId, path) {
  const escapedStorefrontId = String(storefrontId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = String(path || '').match(
    new RegExp(
      `^${escapedStorefrontId}/(logos|hero|about)/` +
      '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}' +
      '[.](jpg|png|webp)$'
    )
  )
  if (!match) throw assetError('invalid_asset_path')
  return match[1]
}

function permissionForFolder(folder) {
  return folder === 'logos' ? 'designWrite' : 'contentWrite'
}

async function lockStorefrontAccess(client, { userId, storefrontId, permission }) {
  const access = await client.query(
    `select store.workspace_id::text, membership.role::text
     from public.storefronts storefront
     join public.shopify_stores store on store.id = storefront.shopify_store_id
     join public.workspace_memberships membership
       on membership.workspace_id = store.workspace_id
     where storefront.id = $1 and membership.user_id = $2
     for update of storefront`,
    [storefrontId, userId]
  )
  if (!access.rows[0]) throw assetError('storefront_access_denied')
  assertStorefrontAdminPermission(access.rows[0].role, permission)
  return access.rows[0]
}

async function storefrontAssetUsage(client, storefrontId) {
  const result = await client.query(
    `select coalesce(sum(objects.byte_size), 0)::bigint as used_bytes
     from (
       select source.storage_path, max(source.byte_size)::bigint as byte_size
       from (
         select asset.storage_path, asset.byte_size
         from public.design_assets asset
         where asset.storefront_id = $1
         union all
         select object.name as storage_path,
                case
                  when object.metadata ->> 'size' ~ '^[0-9]+$'
                    then (object.metadata ->> 'size')::bigint
                  else 0
                end as byte_size
         from storage.objects object
         where object.bucket_id = $2 and object.name like $3
       ) source
       group by source.storage_path
     ) objects`,
    [storefrontId, BUCKET, `${storefrontId}/%`]
  )
  return Number(result.rows[0]?.used_bytes || 0)
}

async function removeUploadReservation(database, storagePath) {
  await Promise.allSettled([
    database.query(
      `delete from private.storefront_asset_write_permits
       where storage_path = $1 and operation = 'upload'`,
      [storagePath]
    ),
    database.query(
      `delete from public.design_assets where storage_bucket = $1 and storage_path = $2`,
      [BUCKET, storagePath]
    )
  ])
}

export function createStorefrontAssetService({
  database,
  storageGateway,
  idGenerator = randomUUID,
  permitLifetimeSeconds = 60
}) {
  if (!database?.connect || !database?.query) throw new Error('database is required')
  if (!storageGateway?.upload || !storageGateway?.remove || !storageGateway?.publicUrl) {
    throw new Error('storageGateway is required')
  }

  async function upload({ userId, accessToken, storefrontId, purpose, claimedMimeType, buffer }) {
    const inspected = await inspectStorefrontAsset({ buffer, claimedMimeType, purpose })
    const storagePath = `${storefrontId}/${inspected.folder}/${idGenerator()}.${inspected.extension}`
    const publicUrl = storageGateway.publicUrl(storagePath)
    const client = await database.connect()
    let usedBytes = 0

    try {
      await client.query('begin')
      const access = await lockStorefrontAccess(client, {
        userId,
        storefrontId,
        permission: inspected.permission
      })
      usedBytes = await storefrontAssetUsage(client, storefrontId)
      if (usedBytes + inspected.byteSize > STOREFRONT_ASSET_QUOTA_BYTES) {
        throw assetError('storefront_asset_quota_exceeded', {
          usedBytes,
          requestedBytes: inspected.byteSize,
          quotaBytes: STOREFRONT_ASSET_QUOTA_BYTES
        })
      }

      await client.query(
        `insert into public.design_assets (
           storefront_id, purpose, source, storage_bucket, storage_path, public_url,
           mime_type, byte_size, width, height, created_by
         ) values ($1, $2, 'upload', $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          storefrontId,
          purpose,
          BUCKET,
          storagePath,
          publicUrl,
          inspected.mimeType,
          inspected.byteSize,
          inspected.width,
          inspected.height,
          userId
        ]
      )
      await client.query(
        `delete from private.storefront_asset_write_permits where expires_at <= now()`
      )
      await client.query(
        `insert into private.storefront_asset_write_permits (
           storage_path, user_id, operation, expires_at
         ) values ($1, $2, 'upload', now() + ($3 * interval '1 second'))
         on conflict (storage_path, operation) do update set
           user_id = excluded.user_id,
           expires_at = excluded.expires_at`,
        [storagePath, userId, permitLifetimeSeconds]
      )
      await client.query(
        `insert into private.audit_logs (
           workspace_id, actor_user_id, action, target_type, target_id, metadata
         ) values ($1, $2, 'cms.asset.upload_authorized', 'storefront', $3, $4)`,
        [access.workspace_id, userId, storefrontId, {
          purpose,
          storagePath,
          mimeType: inspected.mimeType,
          byteSize: inspected.byteSize,
          width: inspected.width,
          height: inspected.height
        }]
      )
      await client.query('commit')
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }

    try {
      await storageGateway.upload({
        accessToken,
        path: storagePath,
        buffer,
        mimeType: inspected.mimeType
      })
    } catch {
      await removeUploadReservation(database, storagePath)
      throw assetError('storefront_asset_storage_failed')
    }

    await database.query(
      `delete from private.storefront_asset_write_permits
       where storage_path = $1 and operation = 'upload'`,
      [storagePath]
    ).catch(() => {})

    return {
      asset: {
        purpose,
        path: storagePath,
        publicUrl,
        mimeType: inspected.mimeType,
        byteSize: inspected.byteSize,
        width: inspected.width,
        height: inspected.height
      },
      quota: {
        usedBytes: usedBytes + inspected.byteSize,
        limitBytes: STOREFRONT_ASSET_QUOTA_BYTES
      }
    }
  }

  async function remove({ userId, accessToken, storefrontId, path }) {
    const folder = validAssetPath(storefrontId, path)
    const client = await database.connect()
    try {
      await client.query('begin')
      const access = await lockStorefrontAccess(client, {
        userId,
        storefrontId,
        permission: permissionForFolder(folder)
      })
      await client.query(
        `delete from private.storefront_asset_write_permits where expires_at <= now()`
      )
      await client.query(
        `insert into private.storefront_asset_write_permits (
           storage_path, user_id, operation, expires_at
         ) values ($1, $2, 'delete', now() + ($3 * interval '1 second'))
         on conflict (storage_path, operation) do update set
           user_id = excluded.user_id,
           expires_at = excluded.expires_at`,
        [path, userId, permitLifetimeSeconds]
      )
      await client.query(
        `insert into private.audit_logs (
           workspace_id, actor_user_id, action, target_type, target_id, metadata
         ) values ($1, $2, 'cms.asset.delete_authorized', 'storefront', $3, $4)`,
        [access.workspace_id, userId, storefrontId, { storagePath: path, folder }]
      )
      await client.query('commit')
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }

    try {
      await storageGateway.remove({ accessToken, path })
    } catch {
      await database.query(
        `delete from private.storefront_asset_write_permits
         where storage_path = $1 and operation = 'delete'`,
        [path]
      ).catch(() => {})
      throw assetError('storefront_asset_storage_failed')
    }

    await Promise.all([
      database.query(
        `delete from private.storefront_asset_write_permits
         where storage_path = $1 and operation = 'delete'`,
        [path]
      ),
      database.query(
        `delete from public.design_assets
         where storefront_id = $1 and storage_bucket = $2 and storage_path = $3`,
        [storefrontId, BUCKET, path]
      )
    ])
    return { removed: true, path }
  }

  return { upload, remove }
}

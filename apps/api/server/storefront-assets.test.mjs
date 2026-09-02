import assert from 'node:assert/strict'
import test from 'node:test'
import sharp from 'sharp'
import {
  createStorefrontAssetService,
  inspectStorefrontAsset,
  STOREFRONT_ASSET_QUOTA_BYTES
} from './storefront-assets.mjs'

async function imageBuffer(width, height, format = 'png') {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 24, g: 80, b: 120, alpha: 1 }
    }
  })[format]().toBuffer()
}

function databaseFixture({ role = 'owner', usedBytes = 0 } = {}) {
  const transactionQueries = []
  const poolQueries = []
  const client = {
    async query(sql, parameters = []) {
      transactionQueries.push({ sql, parameters })
      if (sql.includes('select store.workspace_id::text')) {
        return { rows: role ? [{ workspace_id: 'workspace-1', role }] : [] }
      }
      if (sql.includes('coalesce(sum(objects.byte_size)')) {
        return { rows: [{ used_bytes: usedBytes }] }
      }
      return { rows: [] }
    },
    release() {}
  }
  return {
    transactionQueries,
    poolQueries,
    database: {
      async connect() { return client },
      async query(sql, parameters = []) {
        poolQueries.push({ sql, parameters })
        return { rows: [] }
      }
    }
  }
}

function storageFixture() {
  const uploads = []
  const removals = []
  return {
    uploads,
    removals,
    gateway: {
      publicUrl: path => `https://project.supabase.co/storage/v1/object/public/storefront-assets/${path}`,
      async upload(input) { uploads.push(input) },
      async remove(input) { removals.push(input) }
    }
  }
}

test('reads the actual raster format and dimensions instead of trusting the filename', async () => {
  const buffer = await imageBuffer(1200, 400, 'webp')
  const result = await inspectStorefrontAsset({
    buffer,
    claimedMimeType: 'image/webp',
    purpose: 'hero'
  })
  assert.deepEqual(result, {
    byteSize: buffer.length,
    width: 1200,
    height: 400,
    mimeType: 'image/webp',
    extension: 'webp',
    folder: 'hero',
    permission: 'contentWrite'
  })
})

test('rejects a forged mime type and SVG input', async () => {
  const png = await imageBuffer(400, 400)
  await assert.rejects(
    inspectStorefrontAsset({ buffer: png, claimedMimeType: 'image/jpeg', purpose: 'about' }),
    /invalid_asset_type/
  )
  await assert.rejects(
    inspectStorefrontAsset({
      buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"></svg>'),
      claimedMimeType: 'image/svg+xml',
      purpose: 'about'
    }),
    /invalid_asset_type/
  )
})

test('enforces purpose-specific image dimensions', async () => {
  const tooSmall = await imageBuffer(1199, 400)
  await assert.rejects(
    inspectStorefrontAsset({
      buffer: tooSmall,
      claimedMimeType: 'image/png',
      purpose: 'hero'
    }),
    error => {
      assert.equal(error.message, 'invalid_asset_dimensions')
      assert.deepEqual(error.details, {
        width: 1199,
        height: 400,
        minWidth: 1200,
        minHeight: 400,
        maxWidth: 4096,
        maxHeight: 4096
      })
      return true
    }
  )
})

test('rejects a purpose-specific file size before image parsing', async () => {
  await assert.rejects(
    inspectStorefrontAsset({
      buffer: Buffer.alloc((2 * 1024 * 1024) + 1),
      claimedMimeType: 'image/png',
      purpose: 'logo'
    }),
    error => {
      assert.equal(error.message, 'asset_too_large')
      assert.equal(error.details.maxBytes, 2 * 1024 * 1024)
      return true
    }
  )
})

test('reserves quota, records metadata and uploads through a one-time permit', async () => {
  const buffer = await imageBuffer(1200, 400, 'webp')
  const fixture = databaseFixture({ role: 'editor', usedBytes: 1000 })
  const storage = storageFixture()
  const service = createStorefrontAssetService({
    database: fixture.database,
    storageGateway: storage.gateway,
    idGenerator: () => '11111111-1111-4111-8111-111111111111'
  })

  const result = await service.upload({
    userId: 'user-1',
    accessToken: 'access-token',
    storefrontId: 'storefront-1',
    purpose: 'hero',
    claimedMimeType: 'image/webp',
    buffer
  })

  assert.equal(result.asset.path, 'storefront-1/hero/11111111-1111-4111-8111-111111111111.webp')
  assert.equal(result.quota.usedBytes, 1000 + buffer.length)
  assert.equal(storage.uploads.length, 1)
  assert.equal(storage.uploads[0].accessToken, 'access-token')
  const assetInsert = fixture.transactionQueries.find(query =>
    query.sql.includes('insert into public.design_assets'))
  assert.equal(assetInsert.parameters[1], 'hero')
  assert.equal(assetInsert.parameters[6], buffer.length)
  assert.equal(assetInsert.parameters[7], 1200)
  assert.equal(assetInsert.parameters[8], 400)
  assert.equal(fixture.transactionQueries.some(query =>
    query.sql.includes('insert into private.storefront_asset_write_permits')), true)
  const audit = fixture.transactionQueries.find(query =>
    query.sql.includes("'cms.asset.upload_authorized'"))
  assert.equal(audit.parameters[0], 'workspace-1')
  assert.equal(audit.parameters[2], 'storefront-1')
  assert.equal(audit.parameters[3].purpose, 'hero')
})

test('denies disallowed roles and a storefront quota overflow before storage', async () => {
  const logo = await imageBuffer(128, 64)
  const editor = databaseFixture({ role: 'editor' })
  const editorStorage = storageFixture()
  const editorService = createStorefrontAssetService({
    database: editor.database,
    storageGateway: editorStorage.gateway
  })
  await assert.rejects(editorService.upload({
    userId: 'user-1',
    accessToken: 'access-token',
    storefrontId: 'storefront-1',
    purpose: 'logo',
    claimedMimeType: 'image/png',
    buffer: logo
  }), /storefront_write_denied/)
  assert.equal(editorStorage.uploads.length, 0)

  const about = await imageBuffer(400, 400)
  const quota = databaseFixture({
    role: 'owner',
    usedBytes: STOREFRONT_ASSET_QUOTA_BYTES - about.length + 1
  })
  const quotaStorage = storageFixture()
  const quotaService = createStorefrontAssetService({
    database: quota.database,
    storageGateway: quotaStorage.gateway
  })
  await assert.rejects(quotaService.upload({
    userId: 'user-1',
    accessToken: 'access-token',
    storefrontId: 'storefront-1',
    purpose: 'about',
    claimedMimeType: 'image/png',
    buffer: about
  }), /storefront_asset_quota_exceeded/)
  assert.equal(quotaStorage.uploads.length, 0)
})

test('denies an asset upload before reservation when storefront membership is missing', async () => {
  const buffer = await imageBuffer(400, 400)
  const fixture = databaseFixture({ role: null })
  const storage = storageFixture()
  const service = createStorefrontAssetService({ database: fixture.database, storageGateway: storage.gateway })

  await assert.rejects(service.upload({
    userId: 'tenant-a-user', accessToken: 'access-token', storefrontId: 'tenant-b',
    purpose: 'about', claimedMimeType: 'image/png', buffer
  }), /storefront_access_denied/)
  assert.equal(storage.uploads.length, 0)
  assert.equal(fixture.transactionQueries.some(query =>
    query.sql.includes('insert into public.design_assets')), false)
})

test('rejects deleting an asset path belonging to another storefront', async () => {
  const fixture = databaseFixture()
  const storage = storageFixture()
  const service = createStorefrontAssetService({
    database: fixture.database,
    storageGateway: storage.gateway
  })
  await assert.rejects(service.remove({
    userId: 'user-1',
    accessToken: 'access-token',
    storefrontId: 'storefront-1',
    path: 'storefront-2/hero/11111111-1111-4111-8111-111111111111.webp'
  }), /invalid_asset_path/)
  assert.equal(storage.removals.length, 0)
  assert.equal(fixture.transactionQueries.length, 0)
})

test('audits an authorized storefront asset deletion before using its one-time permit', async () => {
  const fixture = databaseFixture()
  const storage = storageFixture()
  const service = createStorefrontAssetService({
    database: fixture.database,
    storageGateway: storage.gateway
  })
  const path = 'storefront-1/about/11111111-1111-4111-8111-111111111111.webp'

  const result = await service.remove({
    userId: 'user-1', accessToken: 'access-token', storefrontId: 'storefront-1', path
  })

  assert.deepEqual(result, { removed: true, path })
  assert.equal(storage.removals.length, 1)
  const audit = fixture.transactionQueries.find(query =>
    query.sql.includes("'cms.asset.delete_authorized'"))
  assert.deepEqual(audit.parameters, [
    'workspace-1', 'user-1', 'storefront-1', { storagePath: path, folder: 'about' }
  ])
})

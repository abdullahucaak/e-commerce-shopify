import assert from 'node:assert/strict'
import test from 'node:test'
import { createSupabaseStorageGateway } from './supabase-storage.mjs'

test('uses the user bearer token for a permitted Supabase Storage upload and delete', async () => {
  const calls = []
  const gateway = createSupabaseStorageGateway({
    supabaseUrl: 'https://project.supabase.co/',
    publishableKey: 'publishable-key',
    fetchImpl: async (url, options) => {
      calls.push({ url, options })
      return { ok: true }
    }
  })
  const path = 'storefront-1/hero/file name.webp'

  await gateway.upload({
    accessToken: 'user-token',
    path,
    buffer: Buffer.from('image'),
    mimeType: 'image/webp'
  })
  await gateway.remove({ accessToken: 'user-token', path })

  assert.equal(
    calls[0].url,
    'https://project.supabase.co/storage/v1/object/storefront-assets/storefront-1/hero/file%20name.webp'
  )
  assert.equal(calls[0].options.headers.authorization, 'Bearer user-token')
  assert.equal(calls[0].options.headers['x-upsert'], 'false')
  assert.equal(calls[1].options.method, 'DELETE')
  assert.deepEqual(JSON.parse(calls[1].options.body), { prefixes: [path] })
  assert.equal(
    gateway.publicUrl(path),
    'https://project.supabase.co/storage/v1/object/public/storefront-assets/storefront-1/hero/file%20name.webp'
  )
})


import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertStorefrontAdminPermission,
  storefrontAdminPermissions
} from './cms-roles.mjs'
import { saveContentDraft, DEFAULT_STOREFRONT_CONTENT } from './content-config.mjs'
import { saveDesignDraft } from './design-config.mjs'

function transactionDatabase(role) {
  const queries = []
  const client = {
    async query(sql, parameters = []) {
      queries.push({ sql, parameters })
      if (sql.includes('select membership.role::text')) return { rows: [{ role }] }
      if (sql.includes("status in ('draft', 'published')")) {
        return { rows: [{ version: 1, status: 'published', settings: {} }] }
      }
      if (sql.includes('select coalesce(max(version)')) return { rows: [{ next_version: 2 }] }
      return { rows: [] }
    },
    release() {}
  }
  return {
    queries,
    database: { async connect() { return client } }
  }
}

test('maps storefront-admin roles to explicit capabilities', () => {
  assert.deepEqual(storefrontAdminPermissions('owner'), {
    designWrite: true,
    contentWrite: true,
    domainsWrite: true,
    assetFolders: ['logos', 'hero', 'about']
  })
  assert.deepEqual(storefrontAdminPermissions('admin'), storefrontAdminPermissions('owner'))
  assert.deepEqual(storefrontAdminPermissions('editor'), {
    designWrite: false,
    contentWrite: true,
    domainsWrite: false,
    assetFolders: ['hero', 'about']
  })
  assert.deepEqual(storefrontAdminPermissions('viewer'), {
    designWrite: false,
    contentWrite: false,
    domainsWrite: false,
    assetFolders: []
  })
})

test('fails closed for unknown roles and denied capabilities', () => {
  assert.deepEqual(storefrontAdminPermissions('unexpected'), {
    designWrite: false,
    contentWrite: false,
    domainsWrite: false,
    assetFolders: []
  })
  assert.throws(
    () => assertStorefrontAdminPermission('editor', 'designWrite'),
    /storefront_write_denied/
  )
  assert.throws(
    () => assertStorefrontAdminPermission('viewer', 'contentWrite'),
    /storefront_write_denied/
  )
  assert.doesNotThrow(() => assertStorefrontAdminPermission('editor', 'contentWrite'))
  assert.doesNotThrow(() => assertStorefrontAdminPermission('admin', 'domainsWrite'))
})

test('prevents an editor from saving design changes', async () => {
  const { database, queries } = transactionDatabase('editor')
  await assert.rejects(
    saveDesignDraft({
      database,
      userId: 'user-1',
      storefrontId: 'storefront-1',
      settings: {
        name: 'Example',
        colors: { primary: '#112233', secondary: '#445566' },
        announcement: { enabled: true, text: 'Hello' }
      }
    }),
    /storefront_write_denied/
  )
  assert.equal(queries.some(query => query.sql.includes("values ($1, $2, 'draft'")), false)
  assert.equal(queries.at(-1).sql, 'rollback')
})

test('allows an editor to save content drafts but denies a viewer', async () => {
  const editor = transactionDatabase('editor')
  const result = await saveContentDraft({
    database: editor.database,
    userId: 'user-1',
    storefrontId: 'storefront-1',
    settings: DEFAULT_STOREFRONT_CONTENT
  })
  assert.equal(result.draftVersion, 2)
  assert.equal(
    editor.queries.some(query => query.sql.includes("values ($1, $2, 'draft'")),
    true
  )

  const viewer = transactionDatabase('viewer')
  await assert.rejects(
    saveContentDraft({
      database: viewer.database,
      userId: 'user-2',
      storefrontId: 'storefront-1',
      settings: DEFAULT_STOREFRONT_CONTENT
    }),
    /storefront_write_denied/
  )
  assert.equal(viewer.queries.at(-1).sql, 'rollback')
})

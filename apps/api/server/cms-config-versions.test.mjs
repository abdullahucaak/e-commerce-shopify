import assert from 'node:assert/strict'
import test from 'node:test'
import {
  publishScopedCmsDraft,
  readScopedCmsConfig,
  saveScopedCmsDraft
} from './cms-config-versions.mjs'

function transactionDatabase({ role = 'owner', published = null, draft = null } = {}) {
  const state = {
    published: published ? { ...published, status: 'published' } : null,
    draft: draft ? { ...draft, status: 'draft' } : null,
    archived: []
  }
  const queries = []
  const client = {
    async query(sql, parameters = []) {
      queries.push({ sql, parameters })
      if (sql === 'begin' || sql === 'commit' || sql === 'rollback') return { rows: [] }
      if (sql.includes('select membership.role::text')) {
        return { rows: role ? [{ role }] : [] }
      }
      if (sql.includes("status in ('draft', 'published')")) {
        return { rows: [state.published, state.draft].filter(Boolean).map(row => ({ ...row })) }
      }
      if (sql.includes('select coalesce(max(version)')) {
        const versions = [...state.archived, state.published, state.draft]
          .filter(Boolean).map(row => Number(row.version))
        return { rows: [{ next_version: Math.max(0, ...versions) + 1 }] }
      }
      if (sql.includes("values ($1, $2, 'draft'")) {
        state.draft = {
          version: parameters[1],
          status: 'draft',
          settings: parameters[2],
          created_by: parameters[3]
        }
        return { rows: [] }
      }
      if (sql.includes("values ($1, $2, 'published'")) {
        state.published = {
          version: parameters[1],
          status: 'published',
          settings: parameters[2],
          created_by: parameters[3]
        }
        return { rows: [] }
      }
      if (sql.includes("set status = 'archived'")) {
        if (state.published) state.archived.push({ ...state.published, status: 'archived' })
        state.published = null
        return { rows: [] }
      }
      if (sql.includes("set status = 'published'")) {
        state.published = {
          ...state.draft,
          status: 'published',
          settings: parameters[1],
          created_by: parameters[2]
        }
        state.draft = null
        return { rows: [] }
      }
      if (sql.includes('set version = $2')) {
        state.draft = {
          ...state.draft,
          version: parameters[1],
          settings: parameters[2]
        }
        return { rows: [] }
      }
      if (sql.includes('set settings = $2')) {
        state.draft = {
          ...state.draft,
          settings: parameters[1],
          created_by: parameters[2]
        }
        return { rows: [] }
      }
      if (sql.includes("delete from public.storefront_config_versions")) {
        state.draft = null
        return { rows: [] }
      }
      throw new Error(`Unexpected SQL in test: ${sql}`)
    },
    release() {}
  }
  return {
    state,
    queries,
    database: { async connect() { return client } }
  }
}

const publishedSettings = {
  brand: { name: 'Live brand' },
  announcement: { enabled: true, text: 'Live announcement' },
  content: { home: { heroTitle: 'Live content' } }
}

test('reads only the requested draft scope while preserving live settings', async () => {
  const database = {
    async query() {
      return { rows: [{
        published_version: 4,
        published_settings: publishedSettings,
        published_at: '2026-09-01T10:00:00.000Z',
        draft_version: 5,
        draft_settings: {
          ...publishedSettings,
          brand: { name: 'Draft brand' },
          content: { home: { heroTitle: 'Unrelated draft content' } }
        },
        draft_updated_at: '2026-09-01T11:00:00.000Z'
      }] }
    }
  }
  const result = await readScopedCmsConfig({
    database, userId: 'user-1', storefrontId: 'storefront-1', scope: 'design'
  })
  assert.equal(result.hasUnpublishedChanges, true)
  assert.equal(result.publishedVersion, 4)
  assert.equal(result.draftVersion, 5)
  assert.equal(result.settings.brand.name, 'Draft brand')
  assert.equal(result.settings.content.home.heroTitle, 'Live content')
})

test('saves a draft without replacing the published version', async () => {
  const fixture = transactionDatabase({
    published: { version: 1, settings: publishedSettings }
  })
  const result = await saveScopedCmsDraft({
    database: fixture.database,
    userId: 'user-1',
    storefrontId: 'storefront-1',
    scope: 'design',
    permission: 'designWrite',
    normalizedScope: {
      brand: { name: 'Draft brand' },
      announcement: publishedSettings.announcement
    }
  })
  assert.equal(result.hasUnpublishedChanges, true)
  assert.equal(result.publishedVersion, 1)
  assert.equal(result.draftVersion, 2)
  assert.equal(fixture.state.published.settings.brand.name, 'Live brand')
  assert.equal(fixture.state.draft.settings.brand.name, 'Draft brand')
})

test('publishes only one scope and rebases the remaining draft', async () => {
  const fixture = transactionDatabase({
    published: { version: 1, settings: publishedSettings },
    draft: {
      version: 2,
      settings: {
        ...publishedSettings,
        brand: { name: 'Draft brand' },
        content: { home: { heroTitle: 'Draft content' } }
      }
    }
  })
  const designResult = await publishScopedCmsDraft({
    database: fixture.database,
    userId: 'user-1',
    storefrontId: 'storefront-1',
    scope: 'design',
    permission: 'designWrite',
    normalizeStoredScope: settings => settings
  })
  assert.equal(designResult.publishedVersion, 3)
  assert.equal(designResult.hasUnpublishedChanges, false)
  assert.equal(fixture.state.published.settings.brand.name, 'Draft brand')
  assert.equal(fixture.state.published.settings.content.home.heroTitle, 'Live content')
  assert.equal(fixture.state.draft.version, 4)
  assert.equal(fixture.state.draft.settings.content.home.heroTitle, 'Draft content')

  const contentResult = await publishScopedCmsDraft({
    database: fixture.database,
    userId: 'user-1',
    storefrontId: 'storefront-1',
    scope: 'content',
    permission: 'contentWrite',
    normalizeStoredScope: settings => settings
  })
  assert.equal(contentResult.publishedVersion, 4)
  assert.equal(fixture.state.published.settings.content.home.heroTitle, 'Draft content')
  assert.equal(fixture.state.draft, null)
})

test('reverting one scope to live values preserves another pending scope', async () => {
  const fixture = transactionDatabase({
    published: { version: 7, settings: publishedSettings },
    draft: {
      version: 8,
      settings: {
        ...publishedSettings,
        brand: { name: 'Draft brand' },
        content: { home: { heroTitle: 'Draft content' } }
      }
    }
  })
  const result = await saveScopedCmsDraft({
    database: fixture.database,
    userId: 'user-1',
    storefrontId: 'storefront-1',
    scope: 'content',
    permission: 'contentWrite',
    normalizedScope: { content: publishedSettings.content }
  })
  assert.equal(result.hasUnpublishedChanges, false)
  assert.equal(fixture.state.draft.settings.brand.name, 'Draft brand')
  assert.deepEqual(fixture.state.draft.settings.content, publishedSettings.content)
})

test('rejects publish when the requested scope has no saved draft', async () => {
  const fixture = transactionDatabase({
    published: { version: 1, settings: publishedSettings }
  })
  await assert.rejects(
    publishScopedCmsDraft({
      database: fixture.database,
      userId: 'user-1',
      storefrontId: 'storefront-1',
      scope: 'content',
      permission: 'contentWrite',
      normalizeStoredScope: settings => settings
    }),
    /storefront_no_draft_changes/
  )
  assert.equal(fixture.queries.at(-1).sql, 'rollback')
})

test('does not read or write a storefront outside the user membership', async () => {
  const readResult = await readScopedCmsConfig({
    database: { async query() { return { rows: [] } } },
    userId: 'user-1',
    storefrontId: 'other-storefront',
    scope: 'design'
  })
  assert.equal(readResult, null)

  const fixture = transactionDatabase({
    role: null,
    published: { version: 1, settings: publishedSettings }
  })
  await assert.rejects(
    saveScopedCmsDraft({
      database: fixture.database,
      userId: 'user-1',
      storefrontId: 'other-storefront',
      scope: 'design',
      permission: 'designWrite',
      normalizedScope: {
        brand: { name: 'Forbidden draft' },
        announcement: publishedSettings.announcement
      }
    }),
    /storefront_access_denied/
  )
  assert.equal(fixture.state.draft, null)
  assert.equal(fixture.queries.at(-1).sql, 'rollback')
})

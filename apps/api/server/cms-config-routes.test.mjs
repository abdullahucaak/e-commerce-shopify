import assert from 'node:assert/strict'
import test from 'node:test'
import { buildApp } from './app.mjs'
import { DEFAULT_STOREFRONT_CONTENT } from './content-config.mjs'

function cmsDatabase() {
  const state = {
    published: {
      version: 1,
      status: 'published',
      settings: { content: DEFAULT_STOREFRONT_CONTENT },
      published_at: '2026-09-01T10:00:00.000Z'
    },
    draft: null,
    archived: []
  }
  const client = {
    async query(sql, parameters = []) {
      if (sql === 'begin' || sql === 'commit' || sql === 'rollback') return { rows: [] }
      if (sql.includes('select membership.role::text')) return { rows: [{ role: 'editor' }] }
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
          settings: parameters[2]
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
          settings: parameters[1]
        }
        state.draft = null
        return { rows: [] }
      }
      throw new Error(`Unexpected SQL in route test: ${sql}`)
    },
    release() {}
  }
  return {
    state,
    async connect() { return client },
    async query() { return { rows: [] } }
  }
}

test('saves content as a draft and requires a separate publish request', async t => {
  const database = cmsDatabase()
  const app = buildApp({
    database,
    verifyAccessToken: async token => token === 'valid-token' ? { id: 'user-1' } : null,
    logger: false
  })
  t.after(() => app.close())
  const draftContent = {
    ...DEFAULT_STOREFRONT_CONTENT,
    home: { ...DEFAULT_STOREFRONT_CONTENT.home, heroTitle: 'Saved draft title' }
  }

  const saveResponse = await app.inject({
    method: 'PUT',
    url: '/api/storefronts/storefront-1/content',
    headers: { authorization: 'Bearer valid-token' },
    payload: draftContent
  })
  assert.equal(saveResponse.statusCode, 200)
  assert.equal(saveResponse.json().hasUnpublishedChanges, true)
  assert.equal(database.state.published.settings.content.home.heroTitle, DEFAULT_STOREFRONT_CONTENT.home.heroTitle)
  assert.equal(database.state.draft.settings.content.home.heroTitle, 'Saved draft title')

  const publishResponse = await app.inject({
    method: 'POST',
    url: '/api/storefronts/storefront-1/content/publish',
    headers: { authorization: 'Bearer valid-token' }
  })
  assert.equal(publishResponse.statusCode, 200)
  assert.equal(publishResponse.json().hasUnpublishedChanges, false)
  assert.equal(database.state.published.settings.content.home.heroTitle, 'Saved draft title')
  assert.equal(database.state.draft, null)

  const repeatedPublish = await app.inject({
    method: 'POST',
    url: '/api/storefronts/storefront-1/content/publish',
    headers: { authorization: 'Bearer valid-token' }
  })
  assert.equal(repeatedPublish.statusCode, 409)
  assert.deepEqual(repeatedPublish.json(), { error: 'storefront_no_draft_changes' })
})

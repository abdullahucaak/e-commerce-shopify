import assert from 'node:assert/strict'
import test from 'node:test'
import {
  fetchAdminSession, fetchPlatformOverview, fetchPlatformWorkspaces, resolveAdminAuthStep
} from './adminSession.js'

test('requires login without a session and MFA before admin authorization', () => {
  assert.equal(resolveAdminAuthStep({ session: null }), 'login')
  assert.equal(resolveAdminAuthStep({ session: { access_token: 'a' }, assurance: { currentLevel: 'aal1' } }), 'mfa')
  assert.equal(resolveAdminAuthStep({ session: { access_token: 'a' }, assurance: { currentLevel: 'aal2' } }), 'authorize')
})

test('fetches an authorized aggregate platform overview', async () => {
  const fetchImpl = async (url, options) => {
    assert.equal(url.pathname, '/api/admin/overview')
    assert.equal(options.headers.Authorization, 'Bearer verified-token')
    return {
      ok: true,
      async json() { return { overview: { workspaces: 2, failedWebhooks: 1 } } }
    }
  }
  assert.deepEqual(await fetchPlatformOverview({
    apiUrl: 'https://api.example.com/', accessToken: 'verified-token', fetchImpl
  }), { workspaces: 2, failedWebhooks: 1 })
})

test('surfaces platform admin API denial', async () => {
  const fetchImpl = async () => ({
    ok: false,
    status: 403,
    async json() { return { error: 'platform_admin_access_denied' } }
  })
  await assert.rejects(
    fetchAdminSession({ apiUrl: 'https://api.example.com', accessToken: 'customer', fetchImpl }),
    error => error.message === 'platform_admin_access_denied' && error.status === 403
  )
})

test('fetches a paginated workspace list with the admin bearer token', async () => {
  const fetchImpl = async (url, options) => {
    assert.equal(url.pathname, '/api/admin/workspaces')
    assert.equal(url.search, '?page=2&pageSize=25')
    assert.equal(options.headers.Authorization, 'Bearer verified-token')
    return { ok: true, async json() { return { workspaces: { items: [], total: 0 } } } }
  }
  assert.deepEqual(await fetchPlatformWorkspaces({
    apiUrl: 'https://api.example.com', accessToken: 'verified-token', page: 2, fetchImpl
  }), { items: [], total: 0 })
})

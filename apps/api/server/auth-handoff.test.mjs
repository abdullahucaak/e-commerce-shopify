import assert from 'node:assert/strict'
import test from 'node:test'

import { createAuthHandoffService } from './auth-handoff.mjs'

function handoffDatabase() {
  let row = null
  const client = {
    async query(sql, parameters = []) {
      if (sql.includes('select id, session_ciphertext')) {
        if (!row || row.used || row.code_hash !== parameters[0]) return { rows: [] }
        return { rows: [{ id: 'handoff-1', session_ciphertext: row.session_ciphertext, return_path: row.return_path }] }
      }
      if (sql.includes('set used_at = now()')) row.used = true
      return { rows: [] }
    },
    release() {}
  }
  return {
    database: {
      async query(sql, parameters = []) {
        if (sql.includes('insert into private.customer_auth_handoffs')) {
          row = { code_hash: parameters[1], session_ciphertext: parameters[2], return_path: parameters[3], used: false }
        }
        return { rows: [] }
      },
      async connect() { return client }
    }
  }
}

test('issues an allowlisted one-time handoff and exchanges the encrypted session', async () => {
  const { database } = handoffDatabase()
  const service = createAuthHandoffService({
    database, encryptionSecret: 'test-secret', storefrontAdminUrl: 'https://manage.example.com'
  })
  const issued = await service.issue({
    userId: 'user-1', accessToken: 'access-token', refreshToken: 'refresh-token',
    returnPath: '/design?storefrontId=storefront-1'
  })
  const url = new URL(issued.authorizationUrl)
  assert.equal(url.origin, 'https://manage.example.com')
  assert.equal(url.pathname, '/auth/handoff')
  const code = url.searchParams.get('code')
  const session = await service.exchange({ code })
  assert.deepEqual(session, {
    accessToken: 'access-token', refreshToken: 'refresh-token',
    returnPath: '/design?storefrontId=storefront-1'
  })
  await assert.rejects(service.exchange({ code }), { message: 'invalid_or_expired_auth_handoff' })
})

test('rejects an external or protocol-relative return path', async () => {
  const { database } = handoffDatabase()
  const service = createAuthHandoffService({
    database, encryptionSecret: 'test-secret', storefrontAdminUrl: 'https://manage.example.com'
  })
  for (const returnPath of ['https://evil.example', '//evil.example/path']) {
    await assert.rejects(service.issue({
      userId: 'user-1', accessToken: 'a', refreshToken: 'r', returnPath
    }), { message: 'invalid_auth_handoff_return_path' })
  }
})

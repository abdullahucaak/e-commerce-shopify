import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes
} from 'node:crypto'

const DEFAULT_TTL_SECONDS = 60

function hash(value) {
  return createHash('sha256').update(value).digest('hex')
}

function encryptSession(session, secret) {
  const key = createHash('sha256').update(secret).digest()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(session), 'utf8'),
    cipher.final()
  ])
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), ciphertext.toString('base64url')].join(':')
}

function decryptSession(value, secret) {
  const [version, iv, tag, ciphertext] = String(value || '').split(':')
  if (version !== 'v1' || !iv || !tag || !ciphertext) throw new Error('invalid_auth_handoff_session')
  const key = createHash('sha256').update(secret).digest()
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return JSON.parse(Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64url')),
    decipher.final()
  ]).toString('utf8'))
}

function normalizeReturnPath(value) {
  const path = String(value || '/dashboard')
  if (!/^\/[A-Za-z0-9/_?&=.%~-]*$/.test(path) || path.startsWith('//')) {
    throw new Error('invalid_auth_handoff_return_path')
  }
  return path
}

export function createAuthHandoffService({
  database,
  encryptionSecret,
  storefrontAdminUrl,
  ttlSeconds = DEFAULT_TTL_SECONDS
}) {
  if (!database?.query || !database?.connect) throw new Error('database is required.')
  if (!encryptionSecret) throw new Error('auth handoff encryption secret is required.')
  const adminOrigin = new URL(storefrontAdminUrl).origin

  async function issue({ userId, accessToken, refreshToken, returnPath }) {
    if (!userId || !accessToken || !refreshToken) throw new Error('invalid_auth_handoff_session')
    const safeReturnPath = normalizeReturnPath(returnPath)
    const code = randomBytes(32).toString('base64url')
    const sessionCiphertext = encryptSession({ accessToken, refreshToken }, encryptionSecret)

    await database.query(
      `delete from private.customer_auth_handoffs
       where expires_at <= now() or used_at is not null`
    )
    await database.query(
      `insert into private.customer_auth_handoffs
       (user_id, code_hash, session_ciphertext, return_path, expires_at)
       values ($1, $2, $3, $4, now() + ($5 * interval '1 second'))`,
      [userId, hash(code), sessionCiphertext, safeReturnPath, ttlSeconds]
    )

    const authorizationUrl = new URL('/auth/handoff', adminOrigin)
    authorizationUrl.searchParams.set('code', code)
    return { authorizationUrl: authorizationUrl.toString(), expiresIn: ttlSeconds }
  }

  async function exchange({ code }) {
    if (!/^[A-Za-z0-9_-]{40,100}$/.test(String(code || ''))) {
      throw new Error('invalid_auth_handoff_code')
    }
    const client = await database.connect()
    try {
      await client.query('begin')
      const result = await client.query(
        `select id, session_ciphertext, return_path
         from private.customer_auth_handoffs
         where code_hash = $1 and used_at is null and expires_at > now()
         for update`,
        [hash(code)]
      )
      const handoff = result.rows[0]
      if (!handoff) throw new Error('invalid_or_expired_auth_handoff')
      const session = decryptSession(handoff.session_ciphertext, encryptionSecret)
      await client.query(
        `update private.customer_auth_handoffs set used_at = now() where id = $1`,
        [handoff.id]
      )
      await client.query('commit')
      return { ...session, returnPath: handoff.return_path }
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }

  return { issue, exchange }
}

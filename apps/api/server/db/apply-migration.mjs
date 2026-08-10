import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import pg from 'pg'

const { Pool } = pg
const migrationName = process.argv[2]

if (!migrationName || !/^[0-9]{4}_[a-z0-9_]+[.]sql$/.test(migrationName)) {
  throw new Error('Pass one migration filename, for example 0004_shopify_oauth_states.sql.')
}

const databaseUrl = process.env.DATABASE_URL?.trim()
if (!databaseUrl) throw new Error('DATABASE_URL is required.')

const migrationsDirectory = new URL('./migrations/', import.meta.url).pathname
const migrationPath = resolve(migrationsDirectory, migrationName)
const sql = await readFile(migrationPath, 'utf8')
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === 'false'
    ? false
    : { rejectUnauthorized: false }
})

try {
  await pool.query(sql)
  console.log(`Applied ${migrationName}.`)
} finally {
  await pool.end()
}

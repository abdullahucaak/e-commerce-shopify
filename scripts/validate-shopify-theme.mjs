import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const themeRoot = path.join(repositoryRoot, 'shopify-theme')
const requiredDirectories = [
  'assets',
  'config',
  'layout',
  'locales',
  'sections',
  'snippets',
  'templates'
]

const requiredFiles = [
  'layout/theme.liquid',
  'config/settings_schema.json',
  'config/settings_data.json',
  'templates/index.json',
  'templates/product.json',
  'templates/collection.json',
  'templates/cart.json'
]

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map(async entry => {
    const fullPath = path.join(directory, entry.name)
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath]
  }))
  return files.flat()
}

for (const directory of requiredDirectories) {
  const entries = await readdir(path.join(themeRoot, directory))
  assert.ok(entries.length > 0, `Theme directory is empty: ${directory}`)
}

for (const filename of requiredFiles) {
  await readFile(path.join(themeRoot, filename), 'utf8')
}

const files = await listFiles(themeRoot)
const sectionTypes = new Set(
  files
    .filter(filename => filename.endsWith('.liquid') && path.dirname(filename).endsWith('/sections'))
    .map(filename => path.basename(filename, '.liquid'))
)

for (const filename of files.filter(filename => filename.endsWith('.json'))) {
  const source = await readFile(filename, 'utf8')
  const value = JSON.parse(source)

  if (filename.includes(`${path.sep}templates${path.sep}`) || filename.endsWith('-group.json')) {
    for (const section of Object.values(value.sections || {})) {
      assert.ok(
        sectionTypes.has(section.type),
        `${path.relative(themeRoot, filename)} references missing section: ${section.type}`
      )
    }
  }
}

for (const filename of files.filter(filename => filename.endsWith('.liquid'))) {
  const source = await readFile(filename, 'utf8')
  const schemaMatch = source.match(/{%\s*schema\s*%}([\s\S]*?){%\s*endschema\s*%}/)

  if (schemaMatch) {
    JSON.parse(schemaMatch[1])
  }

  assert.equal(
    /VITE_|STOREFRONT_ACCESS_TOKEN|X-Shopify-Access-Token/.test(source),
    false,
    `Theme must not contain application credentials: ${path.relative(themeRoot, filename)}`
  )
}

console.log(`Validated ${files.length} Shopify theme files.`)


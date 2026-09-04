import { pathToFileURL } from 'node:url'

export const deploymentContracts = Object.freeze({
  api: [
    'API_HOST', 'DATABASE_URL', 'VITE_SUPABASE_URL',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'SHOPIFY_CLIENT_ID', 'SHOPIFY_CLIENT_SECRET', 'SHOPIFY_APP_URL',
    'PLATFORM_APP_URL', 'STOREFRONT_ADMIN_APP_URL',
    'BILLING_PROVIDER'
  ],
  platform: [
    'VITE_API_URL', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'
  ],
  'storefront-admin': [
    'VITE_API_URL', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY',
    'VITE_YOURPROSTORE_AI_URL'
  ],
  'platform-admin': [
    'VITE_API_URL', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'
  ],
  storefront: ['VITE_API_URL', 'VITE_STOREFRONT_HOST']
})

const urlVariables = new Set([
  'VITE_API_URL', 'VITE_SUPABASE_URL', 'VITE_STOREFRONT_PREVIEW_URL',
  'VITE_YOURPROSTORE_AI_URL', 'SHOPIFY_APP_URL',
  'PLATFORM_APP_URL', 'STOREFRONT_ADMIN_APP_URL'
])

export function validateDeploymentEnvironment(target, env = process.env) {
  const required = deploymentContracts[target]
  if (!required) return [`Unknown deployment target: ${target}`]

  const failures = required
    .filter(name => !env[name]?.trim())
    .map(name => `${name} is required for ${target}`)

  for (const name of required.filter(name => urlVariables.has(name))) {
    if (env[name]?.trim() && !/^https:\/\//i.test(env[name].trim())) {
      failures.push(`${name} must use HTTPS`)
    }
  }

  if (target === 'api') {
    const appEnvironment = env.APP_ENV?.trim().toLowerCase() ||
      (env.VERCEL === '1' ? 'production' : '')
    if (!['staging', 'production'].includes(appEnvironment)) {
      failures.push('APP_ENV must be staging or production in an online deployment')
    }
    if (env.API_HOST !== '0.0.0.0') failures.push('API_HOST must be 0.0.0.0')
    if (appEnvironment === 'staging') {
      if (env.BILLING_PROVIDER !== 'mock') failures.push('staging must use mock billing')
      if (env.ALLOW_MOCK_BILLING !== 'true') failures.push('staging mock billing must be explicitly enabled')
    }
    if (appEnvironment === 'production' && env.BILLING_PROVIDER === 'mock') {
      failures.push('mock billing is forbidden in production')
    }
  }

  return failures
}

export function runDeploymentValidation(target, env = process.env) {
  if (env.VERCEL !== '1' && env.DEPLOYMENT_ENV_CHECK !== '1') {
    console.log(`Deployment environment validation skipped locally: ${target}`)
    return
  }
  const failures = validateDeploymentEnvironment(target, env)
  if (failures.length) {
    console.error(failures.map(item => `- ${item}`).join('\n'))
    process.exitCode = 1
    return
  }
  console.log(`Deployment environment valid: ${target}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runDeploymentValidation(process.argv[2])
}

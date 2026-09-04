const env=process.env,fail=[]
const required=['DEPLOYMENT_ENV','NODE_ENV','API_HOST','VITE_API_URL','YOURPROSTORE_AI_APP_URL','STOREFRONT_ADMIN_APP_URL','SHOPIFY_APP_URL','DATABASE_URL','VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY','SUPABASE_SERVICE_ROLE_KEY','SHOPIFY_CLIENT_ID','SHOPIFY_CLIENT_SECRET','AUTH_HANDOFF_ENCRYPTION_KEY','STOREFRONT_PREVIEW_SIGNING_KEY']
for(const name of required)if(!env[name]?.trim())fail.push(`${name} is required`)
for(const name of ['VITE_API_URL','YOURPROSTORE_AI_APP_URL','STOREFRONT_ADMIN_APP_URL','SHOPIFY_APP_URL'])if(env[name]&&!/^https:\/\//.test(env[name]))fail.push(`${name} must use HTTPS`)
if(!['staging','production'].includes(env.DEPLOYMENT_ENV))fail.push('DEPLOYMENT_ENV must be staging or production')
if(env.NODE_ENV!=='production')fail.push('NODE_ENV must be production')
if(env.API_HOST!=='0.0.0.0')fail.push('API_HOST must be 0.0.0.0')
if(env.BILLING_PROVIDER==='mock')fail.push('mock billing is forbidden')
if(env.ALLOW_STOREFRONT_HOST_OVERRIDE!=='false')fail.push('host override must be false')
if(env.TRUST_PROXY!=='true')fail.push('TRUST_PROXY must be true')
for(const name of ['AUTH_HANDOFF_ENCRYPTION_KEY','STOREFRONT_PREVIEW_SIGNING_KEY'])if(env[name]&&env[name].length<32)fail.push(`${name} must be at least 32 characters`)
if(env.AUTH_HANDOFF_ENCRYPTION_KEY&&env.AUTH_HANDOFF_ENCRYPTION_KEY===env.STOREFRONT_PREVIEW_SIGNING_KEY)fail.push('signing and encryption keys must differ')
if(fail.length){console.error(fail.map(item=>`- ${item}`).join('\n'));process.exit(1)}
console.log(`Deployment environment valid: ${env.DEPLOYMENT_ENV}`)

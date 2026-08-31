export const SETUP_STEP_KEYS = Object.freeze([
  'shopify_connection',
  'niche_selection',
  'banner_selection',
  'brand_setup',
  'product_readiness',
  'store_preview',
  'domain_setup',
  'plan_selection',
  'publish'
])

export function calculateSetupProgress(steps, subscriptionStatus) {
  const subscriptionActive = ['active', 'trialing'].includes(subscriptionStatus)
  const completedKeys = new Set((steps || [])
    .filter(step => step.status === 'completed')
    .map(step => step.step_key))

  if (!subscriptionActive) completedKeys.delete('publish')
  const completedCount = SETUP_STEP_KEYS.filter(stepKey => completedKeys.has(stepKey)).length
  return Math.round(completedCount / SETUP_STEP_KEYS.length * 100)
}

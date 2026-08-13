# YourProStore build roadmap

This is the canonical implementation order for the platform. A Shopify store is
the billable unit: one connected Shopify store has one storefront and requires
one YourProStore subscription.

## 0. Foundations (completed)

- [x] 0.1 Supabase authentication and workspace membership
- [x] 0.2 Multi-tenant Shopify store and storefront model
- [x] 0.3 Shopify OAuth connection and encrypted credentials
- [x] 0.4 Shared Vue storefront with live Shopify products
- [x] 0.5 Per-store design and content configuration
- [x] 0.6 Logo and content asset uploads
- [x] 0.7 Domain synchronization and permanent `myshopify.com` identity
- [x] 0.8 Shopify webhooks and cart isolation by Shopify store

## 1. Onboarding data foundation (in progress)

- [x] 1.1 Define the fixed storefront template (`glowfield_v1`)
- [x] 1.2 Add the niche catalogue
- [x] 1.3 Add niche-specific banner presets
- [x] 1.4 Add store-level subscription records
- [x] 1.5 Define the canonical onboarding steps
- [x] 1.6 Run migration `0007_onboarding_and_store_billing.sql` in Supabase
- [ ] 1.7 Add API tests for catalogue, progress and subscription isolation

## 2. Frictionless Shopify connection

- [x] 2.1 Replace the visible `myshopify.com` input with “Continue with Shopify”
- [x] 2.2 Add the secure hand-off for Shopify login and store selection
- [ ] 2.2.1 Configure the Shopify distribution/install link
- [ ] 2.2.2 Run migration `0008_shopify_store_selection.sql` in Supabase
- [ ] 2.3 Read the permanent shop identity automatically from the OAuth callback
- [x] 2.4 Resume the correct onboarding session after returning from Shopify
- [ ] 2.5 Support “Connect another Shopify store” from one customer account
- [ ] 2.6 Handle cancelled, expired and failed authorization clearly

## 3. Customer onboarding wizard

- [ ] 3.1 Create the wizard shell, progress indicator and resumable navigation
- [ ] 3.2 Shopify connection step
- [ ] 3.3 Niche selection step, including “I’m not sure yet”
- [ ] 3.4 Niche-specific hero banner selection step
- [ ] 3.5 Store name, logo and brand colours step
- [ ] 3.6 Shopify active-product readiness check (products stay in Shopify)
- [ ] 3.7 Real storefront preview and readiness checklist
- [ ] 3.8 Optional Shopify-managed domain instructions and domain sync
- [ ] 3.9 Plan/trial step for this specific storefront
- [ ] 3.10 Publish step and hand-off to the customer CMS

## 4. Banner preset management

- [ ] 4.1 Seed launch niches
- [ ] 4.2 Upload and optimize preset images
- [ ] 4.3 Store default title, subtitle and suggested colours per preset
- [ ] 4.4 Apply a preset to the draft config without changing the layout
- [ ] 4.5 Add internal activation, ordering and replacement controls

## 5. Store-level billing

- [ ] 5.1 Create Stripe product and per-store price (initial example: USD 9/month)
- [ ] 5.2 Create one billable subscription item per active storefront
- [ ] 5.3 Require a plan/trial before publishing, not before previewing
- [ ] 5.4 Show per-store price and account-wide monthly total
- [ ] 5.5 Process Stripe webhooks idempotently
- [ ] 5.6 Isolate payment failure, cancellation and suspension to one storefront
- [ ] 5.7 Test one account with three stores and a USD 27 monthly total

## 6. Customer CMS completion

- [ ] 6.1 Add onboarding/readiness status to each store card
- [ ] 6.2 Add “View store”, “Continue setup” and “Connect another store” actions
- [ ] 6.3 Add draft preview that exactly uses the real Vue storefront
- [ ] 6.4 Keep navigation structure fixed for the first template version
- [ ] 6.5 Finish responsive and accessibility checks

## 7. YourProStore public website

- [ ] 7.1 Marketing pages and pricing
- [ ] 7.2 Registration, login and account recovery
- [ ] 7.3 Start/resume onboarding CTA
- [ ] 7.4 Legal pages and clear separation of Shopify and YourProStore billing
- [ ] 7.5 Analytics and conversion events

## 8. Internal admin CMS

- [ ] 8.1 Separate platform-admin authorization
- [ ] 8.2 Customer, workspace and store directory
- [ ] 8.3 Onboarding progress and subscription overview
- [ ] 8.4 OAuth, webhook, domain and last-sync health indicators
- [ ] 8.5 Safe support actions and audit logs (never expose tokens or passwords)
- [ ] 8.6 Niche and banner preset management

## 9. Security and reliability

- [ ] 9.1 Re-test RLS with multiple customers and multiple stores
- [ ] 9.2 Add API and upload rate limits
- [ ] 9.3 Add structured logging, monitoring and alerts
- [ ] 9.4 Add retry/idempotency rules for Shopify and Stripe webhooks
- [ ] 9.5 Add backup, recovery and credential-rotation procedures
- [ ] 9.6 Add privacy/data deletion workflows

## 10. Production and launch

- [ ] 10.1 Deploy storefront, platform and API independently
- [ ] 10.2 Configure production Supabase, secrets and HTTPS
- [ ] 10.3 Configure wildcard/custom-domain routing
- [ ] 10.4 Configure GitHub-based deployments and migration procedure
- [ ] 10.5 Test two customers, three stores, separate products and checkouts
- [ ] 10.6 Pilot launch, observe failures and then open public registration

## Product rules that must not change accidentally

1. Shopify remains the source of truth for products, variants, prices and stock.
2. The permanent Shopify identity is the shop ID plus its `myshopify.com` domain;
   a custom domain is never the tenant key.
3. Customers do not need to type or understand a `myshopify.com` address during
   the normal onboarding flow.
4. Store type is fixed to `glowfield_v1`; niche and banner are content presets,
   not separate store designs.
5. Every connected and published Shopify store requires its own subscription.
6. A payment or connection problem for one store must not affect another store.

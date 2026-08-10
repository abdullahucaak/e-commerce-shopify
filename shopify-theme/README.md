# Store Builder Shopify theme

This directory is the Shopify Online Store 2.0 implementation of the existing Vue
storefront design. The Vue app remains in `src/` as the visual reference while each page
is moved to Shopify Liquid, JSON templates, CSS, and small progressive-enhancement
JavaScript.

## Data ownership

- Products, variants, prices, inventory, cart, checkout, pages, and collections come
  directly from Shopify Liquid objects.
- Theme editor settings provide safe defaults and manual editing inside Shopify.
- The Store Builder CMS will publish selected brand values to shop metafields in the
  `store_builder` namespace. When a CMS value exists, it takes precedence over the theme
  editor fallback.
- Repeating structured content can be moved to metaobjects later. No product or order
  copy is stored by the platform.

## Initial CMS metafield contract

| Namespace/key | Suggested type | Use |
| --- | --- | --- |
| `store_builder.brand_name` | single line text | Header/footer accessible brand name |
| `store_builder.logo` | file reference | Store logo |
| `store_builder.primary_color` | color | Announcement/footer color |
| `store_builder.secondary_color` | color | Buttons and accents |
| `store_builder.surface_color` | color | Main page background |
| `store_builder.text_color` | color | Main text color |
| `store_builder.hero_image` | file reference | Home hero image |
| `store_builder.hero_title` | single line text | Home hero heading |
| `store_builder.hero_copy` | multi-line text | Home hero description |
| `store_builder.brand_message` | multi-line text | Home brand statement |

Theme editor values are used whenever a metafield has no value, so the theme remains
usable before the CMS connection is completed.

## Local checks

Run `npm run test:theme` from the repository root. A real Shopify preview will be added
after Shopify CLI is connected to a development store.


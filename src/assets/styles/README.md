# Alaya Tea design system

Global styles are loaded through `src/assets/base.css`. Component-specific
layout remains in each Vue component, while shared visual decisions live here.

## Files

- `tokens.css`: colors, type scale, spacing, widths, borders, shadows, and motion.
- `typography.css`: headings, body text, links, prices, and savings.
- `components.css`: buttons, form controls, discount badges, alerts, and surfaces.
- `layout.css`: reusable fluid page containers, grids, stacks, and responsive values.

## Common changes

- All primary brand accents: `--color-brand-primary`
- Announcement and footer backgrounds: `--color-brand-secondary`
- Main text: `--color-text-primary`
- Muted text: `--color-text-muted`
- Product-page/home old price: `--color-price-original-muted`
- Cart old price: `--color-price-original-danger`
- Fluid page padding: `--page-padding-inline`
- Section spacing: `--section-spacing`
- Product grid width: `--product-grid-max-width`
- Shop grid width: `--shop-grid-max-width`

## Semantic class examples

```html
<h1 class="text-page-title">Your Cart</h1>
<a class="link-secondary link-underline">Continue Shopping</a>
<span class="price price-current">$18.99</span>
<span class="price price-original price-original--muted">$24.99</span>
<span class="price price-original price-original--danger">$24.99</span>
<span class="discount-badge discount-badge--soft">SAVE 24%</span>
<label class="form-label">How did you hear about us?</label>
```

Use tokens inside scoped component CSS instead of introducing new hard-coded
colors, font sizes, font weights, or repeated layout widths.

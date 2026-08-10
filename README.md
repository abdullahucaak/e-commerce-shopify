# GlowField Commerce Platform

Tek Git deposunda bulunan, ancak ayrı ayrı yayınlanabilen üç uygulama vardır:

- `apps/storefront`: bütün müşterilerin ortak kullandığı Vue mağaza vitrini
- `apps/platform`: hesap, onboarding ve müşteriye özel CMS
- `apps/api`: Supabase, Shopify OAuth/webhook ve storefront API backend'i

Shopify ürün, fiyat, stok, sepet, checkout ve siparişler için ana kaynaktır. Platform
veritabanı ürün kopyası tutmaz. İstek domaini tenant'ı belirler; ortak Vue storefront o
mağazanın yayınlanmış tasarım ayarını ve Shopify ürünlerini kullanır.

- Türkçe sistem tasarımı: [`docs/system-architecture-tr.md`](docs/system-architecture-tr.md)
- Uygulama yol haritası: [`docs/implementation-roadmap-tr.md`](docs/implementation-roadmap-tr.md)
- PostgreSQL şeması: [`apps/api/server/db/migrations/0001_multi_tenant_foundation.sql`](apps/api/server/db/migrations/0001_multi_tenant_foundation.sql)
- Aktif olmayan Liquid prototipi: [`shopify-theme/`](shopify-theme/)

## Kurulum

```sh
npm install
```

### Mağaza vitrini — `http://127.0.0.1:5173`

```sh
npm run dev
```

### Müşteri platformu — `http://127.0.0.1:5174`

```sh
npm run dev:platform
```

### Backend API — `http://127.0.0.1:3000`

```sh
npm run dev:api
```

### Testler

```sh
npm run test:api
npm run test:theme
```

### İki Vue uygulamasını production için derle

```sh
npm run build
```

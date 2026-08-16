# GlowField Commerce Platform

Tek Git deposunda bulunan, ancak ayrı ayrı yayınlanabilen üç uygulama vardır:

- `apps/storefront`: bütün müşterilerin ortak kullandığı Vue mağaza vitrini
- `apps/platform`: mağaza sahibinin vitrini düzenlediği mağaza CMS'i
- `apps/customer-platform`: YourProStore ana sayfası, üyelik, Shopify bağlantısı, onboarding ve abonelikler
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

### Mağaza CMS'i — `http://127.0.0.1:5174`

```sh
npm run dev:platform
```

### YourProStore müşteri platformu — `http://127.0.0.1:5175`

```sh
npm run dev:customer-platform
```

### Backend API — `http://127.0.0.1:3000`

```sh
npm run dev:api
```

### Stripe mağaza abonelikleri

1. Stripe'ta aylık `9 USD` tutarında yinelenen bir Price oluştur.
2. `.env.example` içindeki `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` ve
   `STRIPE_STARTER_MONTHLY_PRICE_ID` değerlerini `.env` dosyasında tanımla.
3. Stripe billing migration'ını çalıştır:

```sh
npm run db:migrate:stripe-billing
```

4. Stripe webhook adresini `https://API-ADRESI/api/stripe/webhooks` olarak ekle ve
   `checkout.session.completed`, `checkout.session.expired`,
   `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.paid` ve `invoice.payment_failed`
   olaylarını seç.
5. Ödeme yöntemi güncelleme ve abonelik iptali için Stripe Customer Portal'ı
   Dashboard'dan etkinleştir.

### Testler

```sh
npm run test:api
npm run test:theme
```

### İki Vue uygulamasını production için derle

```sh
npm run build
```

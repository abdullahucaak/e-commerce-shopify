# YourProStore.ai

YourProStore.ai, Shopify mağazaları için çoklu müşterili bir headless storefront
platformudur. Tek Git deposunda bulunan uygulamalar ayrı ayrı çalıştırılıp
yayınlanabilir.

## Uygulamalar

| Uygulama | Kullanıcı | Sorumluluk | Durum |
| --- | --- | --- | --- |
| `apps/yourprostore-ai` | Mağaza sahibi | YourProStore.ai sitesi, hesap, Shopify bağlantısı, mağazalar, kurulum sihirbazı ve abonelikler | Aktif |
| `apps/yourprostore-ai-admin` | YourProStore.ai ekibi | Müşteri, mağaza, abonelik, kurulum ve sistem operasyonları | Planlandı; henüz kodlanmadı |
| `apps/storefront` | Mağaza ziyaretçisi | Bütün müşterilerin ortak kullandığı canlı Vue mağaza vitrini | Aktif |
| `apps/storefront-admin` | Mağaza sahibi | Kendi storefront'unun tasarım, içerik ve domain yönetimi | Aktif |
| `apps/api` | Uygulamaların tamamı | Supabase, Shopify, Stripe, OAuth, webhook ve public runtime API | Aktif |

`yourprostore-ai-admin` ile `storefront-admin` farklı yetki alanlarıdır. İlki yalnızca
bizim ekibimize, ikincisi mağaza sahibine açıktır. Dahili yönetici paneli mevcut
müşteri uygulamasına eklenmeyecek; ileride ayrı uygulama olarak oluşturulacaktır.

Supabase ayrı bir uygulama klasörü değildir. Auth, PostgreSQL ve Storage sağlayan ortak
altyapıdır. Shopify ürün, fiyat, stok, sepet, checkout ve siparişler için ana kaynaktır;
platform veritabanı ürün kopyası tutmaz. Stripe mağaza başına platform aboneliğini
yönetir.

- Sistem mimarisi: [`docs/system-architecture-tr.md`](docs/system-architecture-tr.md)
- Uygulama yol haritası: [`docs/implementation-roadmap-tr.md`](docs/implementation-roadmap-tr.md)
- PostgreSQL şeması: [`apps/api/server/db/migrations/0001_multi_tenant_foundation.sql`](apps/api/server/db/migrations/0001_multi_tenant_foundation.sql)
- Aktif olmayan Liquid prototipi: [`shopify-theme/`](shopify-theme/)

## Kurulum

```sh
npm install
```

### Storefront — `http://127.0.0.1:5173`

```sh
npm run dev:storefront
```

### Storefront yönetimi — `http://127.0.0.1:5174`

```sh
npm run dev:storefront-admin
```

### YourProStore.ai — `http://127.0.0.1:5175`

```sh
npm run dev:yourprostore-ai
```

### Backend API — `http://127.0.0.1:3000`

```sh
npm run dev:api
```

`apps/yourprostore-ai-admin` henüz oluşturulmadığı için bir geliştirme komutu yoktur.

## Ortam değişkenleri

Yeni adlandırmada kullanılan public uygulama adresleri:

```text
VITE_API_URL
VITE_STOREFRONT_ADMIN_URL
YOURPROSTORE_AI_APP_URL
```

Kod, mevcut yerel `.env` dosyalarını bozmamak için eski `VITE_PLATFORM_API_URL`,
`VITE_STORE_CMS_URL`, `CUSTOMER_PLATFORM_APP_URL` ve `PLATFORM_APP_URL` adlarını
geçici olarak geriye dönük uyumluluk amacıyla kabul eder. Yeni kurulumlarda
`.env.example` içindeki yeni adlar kullanılmalıdır.

Supabase tablo, RLS policy ve migration adları bu uygulama yeniden adlandırmasından
etkilenmez. `DATABASE_URL` ve Supabase anahtarları yalnızca `.env` veya production
secret manager içinde tutulmalıdır.

## Stripe mağaza abonelikleri

Günlük geliştirme ve sihirbaz testlerinde gerçek ödeme yerine aşağıdaki güvenli mock
modu kullanılır:

```text
NODE_ENV=development
BILLING_PROVIDER=mock
```

Mock mod yalnızca seçilen storefront aboneliğini değiştirir; aktivasyon, başarısız
ödeme, duraklatma, iptal ve yeniden etkinleştirme senaryolarını audit log ile kaydeder.
`NODE_ENV=production` ortamında `BILLING_PROVIDER=mock` seçilirse API güvenlik amacıyla
başlamaz.

Gerçek Stripe testlerine geçildiğinde `BILLING_PROVIDER=stripe` kullanılır:

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

## Test ve build

```sh
npm run test:api
npm run test:storefront
npm run test:storefront-admin
npm run test:theme
npm run build
```

`npm run build`, aktif üç Vue uygulamasını production için derler. Backend Node.js
tarafından doğrudan çalıştırılır.

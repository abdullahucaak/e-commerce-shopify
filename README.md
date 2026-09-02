# YourProStore.ai

YourProStore.ai, Shopify mağazaları için çoklu müşterili bir headless storefront
platformudur. Tek Git deposunda bulunan uygulamalar ayrı ayrı çalıştırılıp
yayınlanabilir.

## Uygulamalar

| Uygulama | Kullanıcı | Sorumluluk | Durum |
| --- | --- | --- | --- |
| `apps/yourprostore-ai` | Mağaza sahibi | YourProStore.ai sitesi, hesap, Shopify bağlantısı, mağazalar, kurulum sihirbazı ve abonelikler | Aktif |
| `apps/yourprostore-ai-admin` | YourProStore.ai ekibi | Müşteri, mağaza, abonelik, kurulum ve sistem operasyonları | Genel durum, workspace ve mağaza operasyon listeleri aktif; geliştirme sürüyor |
| `apps/storefront` | Mağaza ziyaretçisi | Bütün müşterilerin ortak kullandığı canlı Vue mağaza vitrini | Aktif |
| `apps/storefront-admin` | Mağaza sahibi | Kendi storefront'unun tasarım, içerik ve domain yönetimi | Aktif |
| `apps/api` | Uygulamaların tamamı | Supabase, Shopify, Stripe, OAuth, webhook ve public runtime API | Aktif |

`yourprostore-ai-admin` ile `storefront-admin` farklı yetki alanlarıdır. İlki yalnızca
bizim ekibimize, ikincisi mağaza sahibine açıktır. Dahili yönetici paneli mevcut
müşteri uygulamasına eklenmemiş, ayrı bir Vue uygulaması olarak oluşturulmuştur.

Dahili admin backend temeli `private.platform_admins` kaydı ile doğrulanmış Supabase
JWT `aal2` claim'ini birlikte zorunlu tutar. Workspace `owner/admin` rolleri veya JWT
metadata alanları platform erişimi vermez. Admin hesapları Auth tarafında yalnız
trusted yönetim işlemiyle `app_metadata.account_type=platform_admin` olarak oluşturulur;
bu hesaplara müşteri workspace'i açılmaz. `0018_platform_admin_foundation.sql` canlı
Supabase'e uygulanmıştır. İlk platform `owner` hesabı provision edilmiş ve bu hesap
için TOTP/AAL2 zorunlu tutulmuştur. Gerçek owner oturumuyla giriş ve salt okunur genel
durum API'si yerel ortamda doğrulanmıştır.

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

### YourProStore.ai dahili yönetim — `http://127.0.0.1:5176`

```sh
npm run dev:yourprostore-ai-admin
```

### Backend API — `http://127.0.0.1:3000`

```sh
npm run dev:api
```

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

Storefront görselleri API üzerinden yüklenir. Backend gerçek JPEG/PNG/WEBP formatını,
dosya boyutunu, kullanım alanına göre piksel ölçülerini ve storefront başına 25 MB
kotayı doğrular. Browser rolleri Supabase Storage'a API tarafından üretilen kısa ömürlü
tek kullanımlık izin olmadan yazamaz.

Storefront-admin tasarım ve içerik değişikliklerini önce mağazaya ait `draft` sürümüne
kaydeder. Canlı mağaza yalnız ayrı yayınlama eylemiyle ve transaction içinde güncellenir.
Tasarım ile içerik ayrı yetki kapsamlarıdır; bir kapsam yayınlanırken diğer kapsamdaki
bekleyen taslak değişiklikler korunur.

CMS gerçek storefront önizlemesi için API'den beş dakika geçerli, imzalı ve mağazaya
bağlı bir token alır. Token URL fragment'ında tutulur ve storefront tarafından özel
Authorization başlığıyla gönderilir; normal ziyaretçiler yalnız yayınlanmış ayarı görür.

API varsayılan olarak IP başına dakikada 300 istekle sınırlandırılır; auth handoff
endpoint'leri daha dar, imzalı webhook endpoint'leri daha geniş limite sahiptir. Genel
JSON gövde limiti 1 MiB, görsel upload limiti ayrıca 8 MiB'dir. Bu değerler
`API_RATE_LIMIT_MAX`, `API_RATE_LIMIT_WINDOW_MS` ve `API_BODY_LIMIT_BYTES` ile
ayarlanabilir. Tek process geliştirme kurulumu bellekte sayaç kullanır; çok instance'lı
production dağıtımında ortak Redis store zorunludur. Authorization, cookie, webhook
imzası ve oturum tokenı alanları yapılandırılmış API loglarında maskelenir.

Shopify webhook abonelikleri `shopify.app.toml` içinde uygulama kapsamlı tanımlanır:
uninstall, mağaza/domain güncellemeleri ve zorunlu `customers/data_request`,
`customers/redact`, `shop/redact` konuları aynı imzalı endpoint'e gelir. Olay kimliği
idempotency anahtarıdır; başarısız teslimatlar yeniden işlenebilir ve sekizinci
başarısızlıktan sonra operasyon incelemesi için dead-letter durumunda tutulur.
`shop/redact`, Storage dosyalarını silmek için yalnız backend'de bulunan
`SUPABASE_SERVICE_ROLE_KEY` değerini gerektirir; platform Shopify müşterisi veya
siparişi tutmadığı için customer privacy payload'ları event ledger'a kopyalanmaz.

`0017_shopify_webhook_resilience.sql` canlı Supabase'e uygulanmıştır. Yeni handler
backend'e dağıtıldıktan sonra Shopify app config ayrıca deploy edilmelidir.

## Parola kurtarma

`yourprostore-ai` ve `storefront-admin` giriş ekranları Supabase Auth parola kurtarma
akışını kullanır. Kullanıcıya hesap bulunup bulunmadığını açıklamayan bir yanıt verilir;
e-postadaki tek kullanımlık bağlantı `/update-password` sayfasında recovery oturumu
oluşturduktan sonra yeni parola iki kez doğrulanarak kaydedilir. Service-role anahtarı
browser'a verilmez.

Supabase Dashboard → Authentication → URL Configuration → Redirect URLs listesinde
geliştirme için aşağıdaki adresler bulunmalıdır:

```text
http://127.0.0.1:5174/update-password
http://127.0.0.1:5175/update-password
```

Production ortamında aynı listenin `https://manage.yourprostore.ai/update-password`
ve `https://yourprostore.ai/update-password` adreslerini de içermesi gerekir.

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
npm run test:yourprostore-ai
npm run test:yourprostore-ai-admin
npm run test:theme
npm run build
```

`npm run build`, aktif dört Vue uygulamasını production için derler. Backend Node.js
tarafından doğrudan çalıştırılır.

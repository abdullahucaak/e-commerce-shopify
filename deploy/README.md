# Deployment temeli

Her uygulama ayrı servis olarak yayınlanır. Frontend servisleri aynı image tarifini
farklı `APP` build argümanıyla kullanır; API ayrı Node image'ıdır.

| Servis | Production domain | Image |
| --- | --- | --- |
| `yourprostore-ai` | `yourprostore.ai` | `Dockerfile.web` |
| `yourprostore-ai-admin` | `admin.yourprostore.ai` | `Dockerfile.web` |
| `storefront-admin` | `manage.yourprostore.ai` | `Dockerfile.web` |
| `storefront` | `preview.yourprostore.ai` ve müşteri domainleri | `Dockerfile.web` |
| `api` | `api.yourprostore.ai` | `Dockerfile.api` |

Örnek frontend build'i:

```sh
docker build -f deploy/Dockerfile.web --build-arg APP=yourprostore-ai \
  --build-arg VITE_API_URL=https://api.yourprostore.ai \
  --build-arg VITE_SUPABASE_URL=https://PROJECT.supabase.co \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=PUBLIC_KEY \
  -t yourprostore-ai .
```

Diğer üç frontend için aynı komutta yalnız `APP` ve gerektiğinde public `VITE_*`
değerleri değiştirilir. Secret değerler Docker build argümanı olarak verilmez.

```sh
docker build -f deploy/Dockerfile.api -t yourprostore-api .
```

API secret'ları image'a yazılmaz; deployment platformunun secret manager'ından runtime
environment olarak bağlanır. `deploy/production.env.example` yalnız secret olmayan
domain/policy değerlerini gösterir.
Deploy öncesinde aynı ortam değişkenleriyle şu kontrol zorunludur:

```sh
npm run validate:deploy-env
```

Doğrulayıcı HTTPS, production Node modu, proxy güveni, kapalı host override, ayrı ve
yeterli uzunluktaki kriptografik anahtarlar, service-role anahtarı ve mock billing
yasağını kontrol eder. Public uygulama aboneliklerinde `BILLING_PROVIDER` yalnız
Shopify App Pricing yapılandırması tamamlandıktan sonra `shopify_app_pricing` olur;
Stripe live mode kullanılmaz.

Static image `/healthz`, API image `/api/health` health check'ini içerir. TLS ve HTTP'den
HTTPS'e yönlendirme edge/load balancer katmanında yapılır. Müşteri custom domain ve TLS
otomasyonu seçilecek hosting/DNS sağlayıcısına bağlı olduğundan bu temel içinde henüz
uygulanmamıştır.

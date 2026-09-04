# YourProStore.ai — Tek Güncel Yol Haritası

Bu belge projenin **tek güncel ilerleme ve devam kaynağıdır**. Yeni bir çalışma
oturumunda önce bu dosya, ardından `docs/system-architecture-tr.md`, `README.md`,
`git status --short` ve ilgili diff'ler okunmalıdır. Başka bir roadmap veya devam
promptu tutulmamalıdır.

## Çalışma kuralları

- Proje yolu: `/Users/abdullah.ucak/Desktop/e-commerce-shopify`
- Kullanıcıyla Türkçe konuş; güvenli ve kapsam içindeki sıradaki işi yalnızca
  raporlamak yerine uygula.
- Working tree'deki kullanıcı değişikliklerini geri alma, resetleme veya üzerine yazma.
- Daha önce planlanmış, uygulanmış veya çalıştığı doğrulanmış bir kullanıcı akışını
  değiştirmeden önce güncel kodu, Git geçmişindeki ilk tasarım kararını, yerel `.env`
  değişken adlarını, hosting ayarlarını ve ilgili dış servis yapılandırmasını birlikte
  doğrula. Bu doğrulama yapılmadan mevcut davranışı geçici bir alternatifle değiştirme.
- Deployment veya secret/config eksikliğini ürün davranışını değiştirerek örtme. Mevcut
  tasarım hâlâ geçerliyse yalnız yapılandırmayı düzelt; mimari veya kullanıcı deneyimi
  değişecekse sebebi, etkisi ve geri dönüş planını açıklayıp önceden onay al.
- Kullanıcının bu proje için verdiği sürekli onay gereği, tamamlanıp test edilen kapsam içi
  değişiklikleri ayrıca sormadan commit ve push et; ilgisiz kullanıcı değişikliklerini dahil etme.
- Secret değerleri mesaja veya Git'e yazma; yalnızca Git tarafından yok sayılan
  `.env` dosyalarında veya hosting secret manager içinde tut.
- Public App Store aboneliklerinde Shopify App Pricing tek gerçek ödeme yöntemidir;
  Stripe live mode açılmayacaktır. Mock billing yalnız yerel development/test ortamında
  kullanılmalı, production ortamında reddedilmelidir.
- Shopify incelemesine nihai gönderim, ödeme veya benzeri geri dönüşü zor işlemleri
  açık kullanıcı onayı olmadan yapma.

## Kesin uygulama ve domain mimarisi

1. `apps/storefront`: Müşterinin ziyaretçilere açık ortak Shopify vitrini.
2. `apps/storefront-admin`: Müşterinin mağazalarını yönettiği CMS —
   `manage.yourprostore.ai`.
3. `apps/yourprostore-ai`: Kayıt, giriş, Shopify bağlantısı, mağazalar, kurulum
   sihirbazı ve abonelik alanı — `yourprostore.ai`.
4. `apps/yourprostore-ai-admin`: Yalnızca platform yöneticisinin kullandığı ayrı
   yönetim uygulaması — `admin.yourprostore.ai`.
5. `apps/api`: Ortak Node/Fastify backend — `api.yourprostore.ai`.

Supabase ayrı bir frontend değildir; Auth, PostgreSQL ve Storage altyapısıdır.
Shopify ürün, varyant, fiyat ve stok için tek kaynaktır. Müşteri workspace rolleri
platform yöneticisi yetkisi vermez. Kalıcı mağaza kimliği Shopify shop ID ve
`myshopify.com` alan adıdır; custom domain tenant anahtarı değildir.

## Güncel durum — 4 Eylül 2026

Production altyapısının ilk kurulumu tamamlandı:

- Vercel Pro takımı `yourprostore-ai` oluşturuldu ve GitHub deposu bağlandı.
- API, platform, storefront yönetimi ve dahili admin ayrı Vercel projeleri olarak deploy edildi.
- `yourprostore.ai`, `api.yourprostore.ai`, `admin.yourprostore.ai` ve
  `manage.yourprostore.ai` adresleri ilgili projelere bağlandı; HTTPS/TLS aktif.
- API'nin Vercel/Fastify başlangıç sorunları giderildi ve `/api/health` yanıtı doğrulandı.
- Production ortam değişkenleri Vercel'e taşındı; secret değerleri Git'e eklenmedi.
- Shopify Partner hesabı ve `YourProStore.ai` public uygulaması oluşturuldu.
- Shopify uygulama URL'si, OAuth callback'i, gerekli Storefront API izinleri,
  istemci bilgileri, dağıtım tipi, İngilizce ana dil ve uygulama ikonu yapılandırıldı.
- Shopify App Store kayıt ücreti tamamlandı ve acil geliştirici iletişim bilgileri kaydedildi.
- Geçici ikinci ortam denemesi tamamen geri alındı; bu denemeye ait Vercel ve Supabase
  kaynakları silindi, production servisleri yeniden sağlık kontrolünden geçti.
- Ayrı bir test ortamı kurulmayacaktır. Ürün gerçek kullanıcıya açılana kadar manuel kabul
  testleri production adreslerinde yalnız test hesapları ve Shopify geliştirme mağazasıyla
  yürütülecektir.

**Kaldığımız kesin nokta:** Production otomatik Shopify mağaza seçim bağlantısı,
repo app config eşleştirmesi ve webhook deployment'ı tamamlandı. Ürün hâlâ ayrı
production güvenlik secret'ları, kullanıcı hesabıyla uçtan uca manuel testler, Sales
Channel sınıflandırması, yasal/destek sayfaları, listing görselleri ve inceleme
materyalleri bakımından gönderime hazır değildir.

**Bir sonraki işlem:** Production auth handoff ve storefront preview için birbirinden ayrı
kriptografik anahtarları tanımla; `shop/redact` Storage temizliği için Supabase service-role
anahtarını güvenli biçimde ekle. Ardından production otomatik Shopify mağaza seçimini test
kullanıcısı ve geliştirme mağazasıyla uçtan uca doğrula. Mock billing yalnız yerelde
kalacaktır. App Pricing'i etkinleştirme ve “Submit for review” işlemleri ayrı açık kullanıcı
onayları gerektirir.

### 4 Eylül 2026 durum denetimi

Kanıtlananlar:

- 153 uygulama testi, 33 tema dosyası ve dört Vue production build'i başarılıdır.
- Dört Vercel production projesi ve dört özel alan adı aktiftir; API health ve database
  readiness kontrolleri başarılıdır.
- Production veritabanında `0012`–`0019` değişikliklerinin tablo, fonksiyon, policy,
  katalog verisi ve constraint göstergeleri doğrulanmıştır.
- Etkin Shopify sürümünün App URL'si, OAuth callback'i, Storefront scope'ları ve API
  sürümü production değerleriyle uyumludur.

Açık yanlışlar ve eksikler:

- Yerel `.env` hâlâ eski GlowField geliştirme uygulamasına bağlıdır; production
  YourProStore.ai kimlikleriyle karıştırılmamalı ve yerel geliştirme düzeni ayrıca
  kesinleştirilmelidir.
- Vercel API projesinde ayrı `AUTH_HANDOFF_ENCRYPTION_KEY`,
  `STOREFRONT_PREVIEW_SIGNING_KEY` ve `SUPABASE_SERVICE_ROLE_KEY` kayıtları yoktur.
  İlk ikisi mevcut kodda Shopify secret'ına geri düşer; sonuncusu olmadan `shop/redact`
  Storage temizliği tamamlanamaz.
- Deployment doğrulama scripti production deployment zincirine bağlı değildir ve Vercel
  projesindeki mevcut değişken kümesi bu sözleşmeyi eksiksiz karşılamamaktadır.
- Migration ledger yoktur; migration scriptleri SQL dosyasını doğrudan çalıştırır. Şema
  göstergeleri doğrulanmış olsa da uygulanma geçmişi güvenilir bir ledger ile izlenmez.
- `apps/storefront` içinde router'da kullanılmayan eski checkout/order ekranları ve
  localhost JSON-server çağrıları bulunur. Aktif sepet Shopify `checkoutUrl` kullanır,
  fakat bu ölü kod ileride yanlışlıkla yeniden bağlanmaması için temizlenmelidir.

Denetim sonrasında giderilenler:

- Vercel Production'a güncel `SHOPIFY_INSTALL_URL` eklendi ve yeni API deployment'ı
  `Ready` olarak doğrulandı.
- Repo `shopify.app.toml` dosyası güncel YourProStore.ai client kimliği, production App
  URL ve callback'iyle eşitlendi; development komutunun production URL'lerini otomatik
  değiştirmesi kapatıldı (`0fe4bce`).
- `yourprostore-ai-3` Shopify sürümü etkinleştirildi; beş uygulama webhook aboneliği ve
  üç zorunlu gizlilik webhook adresi production endpoint'inde doğrulandı.

**3 Eylül 2026 listeleme ilerlemesi:** İngilizce listing'de uygulama adı,
`Store design › Storefronts › Storefronts - Other` kategorisi, geçici İngilizce dil,
giriş ve detay metinleri, üç özellik, kart alt başlığı, beş arama terimi ve satış
kanalı gereksinimi kodla doğrulanarak kaydedildi. Listing uyarı sayısı 19'dan 10'a
düştü. Feature media, üç masaüstü ekran görüntüsü, destek/gizlilik bilgileri,
fiyat planı, inceleme iletişimleri ve test hesabı/video/talimatları bekliyor.
İngilizce dil ve “özel yetenek yok” beyanları nihai değildir; aşağıdaki ürün ve
sınıflandırma ön koşulları tamamlandıktan sonra yeniden doğrulanacaktır.

**3 Eylül 2026 production arayüz güncellemesi:** `yourprostore-ai` ve
`storefront-admin` mağaza sahibi arayüzleri İngilizceleştirildi; ilgili 26 test ve
iki production build geçti. `aa7911d` commit'i GitHub `main` dalına gönderildi,
iki Vercel deployment'ı `Ready` oldu ve `yourprostore.ai` ana sayfası ile
`manage.yourprostore.ai` giriş ekranı canlıda İngilizce doğrulandı. Tam kayıt,
Shopify bağlantısı, onboarding, abonelik ve CMS akış testi Shopify App Pricing
entegrasyonu tamamlandıktan sonra yapılacaktır.

### Devam ederken bilinmesi gereken teknik durum

- Canlı Supabase'te `0012`–`0019` şema göstergeleri doğrulanmıştır. Migration ledger
  bulunmadığı için mevcut migration'lar doğrudan tekrar çalıştırılmamalıdır.
- İki gerçek müşteriyle RLS ve Storage metadata tenant izolasyonu doğrulanmıştır.
- `yourprostore-ai` → `storefront-admin` geçişi 60 saniyelik, tek kullanımlık,
  hash saklanan ve hedef adresi sınırlandırılmış SSO handoff kullanır.
- CMS rol matrisi, güvenli dosya kontrolleri, taslak/yayın ayrımı, gerçek storefront
  önizlemesi, sürüm geçmişi, geri dönüş ve audit log işlemleri tamamlanmıştır.
- API rate limit, request boyutu sınırları, güvenli header/CORS, hassas log
  maskeleme ve webhook retry/dead-letter modeli mevcuttur.
- Production ortam değişkenleri Vercel'dedir; yerel `.env` ve secret dosyalarının
  Git'e eklenmemesi bilinçli ve gereklidir.
- İkinci ortam geri alımından sonraki son kapsamlı yerel doğrulamada 153 uygulama testi,
  33 Shopify tema dosyası ve dört Vue production build'i başarılıydı. Canlı
  `api.yourprostore.ai/api/health` yanıtı `ok`; üç production frontend adresi HTTP 200
  olarak doğrulandı.

## Faz 0 — Headless çoklu mağaza temeli

- [x] Vue storefront'u ortak mağaza vitrini olarak kesinleştir
- [x] Shopify'ı ürün, stok, fiyat, sepet, checkout ve sipariş için tek kaynak yap
- [x] Workspace, Shopify store, storefront, domain ve ayar sürümü SQL modelini oluştur
- [x] Taslak/yayınlanmış CMS ayarlarını ayır
- [x] Ortak release ve feature flag tablolarını oluştur
- [x] Domain üzerinden storefront bulan public runtime endpoint'ini ekle
- [x] Vue Shopify bağlantısını build-time `.env` yerine runtime config'e bağla
- [x] Logo ve izin verilen marka renklerini runtime ayarlarından uygula
- [x] Runtime API için hostname, izolasyon ve hata testlerini ekle
- [x] Supabase geliştirme projesini oluştur
- [x] İlk migration'ı Supabase üzerinde çalıştır
- [x] GlowField geliştirme tenant'ını ve yayınlanmış ilk ayarı oluştur

**Bitti sayılma koşulu:** `glowfield.co` hostuyla yapılan runtime isteği yalnızca GlowField
ayarlarını döndürür ve Vue gerçek Shopify ürünlerini bu mağazadan çeker.

## Faz 1 — Gerçek platform kullanıcı hesabı

- [x] `yourprostore-ai`, `storefront`, `storefront-admin` ve `api` uygulamalarını ayrı çalıştırılabilir birimlere ayır
- [x] Kök projeyi npm workspaces olarak yapılandır
- [x] Supabase Auth istemcisini ekle
- [x] E-posta doğrulamalı kayıt, giriş ve çıkış ekranlarını ekle
- [x] `localStorage.isAdmin` ve sahte `/admins` girişini kaldır
- [x] İlk kullanıcı için workspace oluşturma işlemini ekle
- [x] Workspace üyelik ve rol kontrollerini backend'e ekle
- [x] İki kullanıcının birbirinin mağaza ayarlarını göremediğini test et (Faz 4'teki iki gerçek müşteriyle çift yönlü canlı RLS/Storage doğrulaması ve storefront route fail-closed matrisiyle kanıtlandı; ilgili 9 otomatik test yeniden geçti)

## Faz 2 — Shopify mağaza bağlantısı

- [x] Shopify Dev Dashboard'da platform uygulamasını oluştur
- [x] OAuth başlangıç ve callback endpoint'lerini ekle
- [x] State, HMAC, timestamp ve shop domain doğrulamasını ekle
- [x] Admin tokenını uygulama seviyesinde şifreleyerek kaydet
- [x] Public Storefront API erişimini mağaza için oluştur/kaydet
- [x] `shop { id myshopifyDomain primaryDomain name currencyCode }` sorgusunu çalıştır
- [x] Mağazayı `Shop.id` ile oluştur veya güncelle
- [x] İlk, güncel ve eski `myshopify.com` alias kayıtlarını yönet
- [x] `app/uninstalled`, `shop/update` ve zorunlu gizlilik webhook handler'larını koda ekle
- [x] Webhook aboneliklerini etkin production Shopify sürümüne deploy edip doğrula (`yourprostore-ai-3`)

## Faz 3 — `yourprostore-ai` kurulum sihirbazı

- [x] Hesap ve workspace oluşturma akışını ekle
- [x] Shopify ile devam et ve otomatik mağaza seçme kod akışını ekle
- [x] Production `SHOPIFY_INSTALL_URL` yapılandırmasını güncel uygulamanın install URL'siyle tamamla
- [x] Sektör, banner, marka, önizleme, domain ve paket adımlarını kalıcı olarak kaydet
- [x] Shopify ürün hazır olma kontrolünü ve ürünsüz mağaza yönlendirmesini ekle
- [x] Domain adımını opsiyonel yap ve daha sonra bağlamak üzere atlama desteği ekle
- [x] Geliştirme ve test ortamı için mağaza bazlı mock ödeme durumu simülasyonunu tamamla
- [x] Çoklu mağaza abonelik özeti ve toplam aylık tutar ekranını ekle
- [x] Müşteri hesap özeti ve güvenli çıkış ekranını ekle
- [x] Supabase e-posta bağlantısıyla güvenli parola kurtarma ve yeni parola akışını ekle
- [x] Mağaza kartlarını kurulum, ödeme ve aktif yönetim durumuna göre yönlendir
- [x] `yourprostore-ai` bağlantısından gelen storefront kimliğiyle doğru CMS mağazasını seç
- [x] `yourprostore-ai` ile `storefront-admin` arasında güvenli ve tek kullanımlık SSO handoff ekle

## Faz 4 — `storefront-admin`

- [x] Storefront seçimini ve workspace yetkisini ekle
- [x] Owner/admin, editor ve viewer için CMS rol yetki matrisini API, UI ve Storage RLS katmanlarında uygula
- [x] Marka adı, logo ve izin verilen renk alanlarını ekle
- [x] Hero/banner, duyuru ve footer alanlarını ekle
- [x] Dosya tipi, boyut, görsel ölçüsü ve mağaza kotası doğrulamasını sunucu tarafında ekle
- [x] Taslak kaydetme ile canlı yayınlamayı ayrı API eylemleri olarak uygula
- [x] Tasarım ve içerik kapsamlarını birbirinden izole ederek yayınla işlemini transaction içinde yap
- [x] Gerçek storefront taslağı için mağaza kapsamlı, beş dakikalık güvenli önizleme URL'si oluştur
- [x] Ayar sürüm geçmişini göster ve eski sürümü canlıyı değiştirmeden yeni taslağa geri yükle
- [x] CMS taslak kaydetme, yayınlama ve sürüm geri dönüşlerini private audit log'a yaz
- [x] Storefront kimliği alan API route'larında başka tenant kimliğiyle fail-closed matris testi ekle
- [x] İki gerçek müşteriyle canlı SELECT RLS izolasyonunu ve Storage metadata ayrımını doğrula

## Faz 5 — Domain ve hosting otomasyonu

- [x] Platform, API, storefront yönetimi ve dahili admin uygulamalarını production hosting'e kur
- [ ] Ortak `apps/storefront` vitrini için production Vercel projesini kur
- [x] Platform domainlerini Vercel projelerine bağla ve TLS/SSL'i etkinleştir
- [ ] Kullanıcının domain ekleme ekranını oluştur
- [ ] DNS doğrulama kaydını üret
- [ ] Hosting sağlayıcısında custom hostname oluştur
- [ ] TLS/SSL durumunu takip et
- [ ] Kök domain ve `www` yönlendirme kurallarını ekle
- [ ] Domain değişikliğinde Shopify bağlantısının etkilenmediğini test et

## Faz 6 — Ortak sürüm ve güvenli yayınlama

- [ ] Stable ve beta release pipeline'ını oluştur
- [ ] Veritabanı migration'larını release işlemine bağla
- [ ] Feature flag yönetim ekranı ekle
- [ ] Seçili mağazada beta testi ekle
- [ ] Önceki Vue sürümüne geri dönüş işlemini ekle
- [ ] CMS ayar schema migration'larını ekle

## Faz 7 — `yourprostore-ai-admin`

- [x] Dahili platform yöneticisi yetki modelini müşteri workspace rollerinden ayır
- [x] Ayrı Vue build, Supabase giriş ve zorunlu TOTP MFA akışını ekle
- [x] Toplu sistem sayaçlarını gösteren salt okunur genel durum panelini ekle
- [x] Müşteri ve workspace listeleme ekranlarını ekle
- [x] Mağaza, storefront ve kurulum durumu liste ekranını ekle
- [x] Mağaza başına abonelik durumu ve dönem özetini ekle
- [x] Webhook, audit log ve hata kayıtlarını güvenli özetlerle görüntüle
- [x] Niche ve banner kataloğu yönetimini ekle
- [x] Mağaza askıya alma/etkinleştirme işlemlerini owner/admin, açık onay ve audit ile sınırla

Bu faz, kurulum sihirbazı ve abonelik durum modeli kararlı hale geldikten sonra; ancak
production pilotundan önce tamamlanır.

## Faz 8 — Üretim güvenliği ve operasyon

- [ ] Mock ödeme senaryolarını yerel testlerde aktif, başarısız, duraklatılmış, iptal ve yeniden etkin durumlarıyla çalıştır
- [ ] Secret manager ve token anahtar rotasyonunu ekle
- [ ] Production auth handoff, storefront preview ve veri silme işlemleri için ayrı
  kriptografik/service-role secret'ları tanımla ve fallback kullanılmadığını doğrula
- [x] API rate limit ve kötüye kullanım koruması ekle
- [ ] Hata izleme ve uptime alarmı ekle
- [ ] Veritabanı yedek ve geri yükleme testi yap
- [x] Webhook retry/dead-letter durum modelini ekle
- [ ] Hesap silme, veri saklama ve gizlilik akışlarını tamamla

## Faz 9 — Shopify App Store yayını

- [x] Shopify Partner organizasyonunu ve public uygulamayı oluştur
- [x] Production uygulama URL'si, OAuth callback'i ve API izinlerini yapılandır
- [x] Public distribution, App Store kaydı, İngilizce ana dil ve uygulama ikonunu tamamla
- [x] Acil geliştirici iletişim bilgilerini kaydet
- [x] Platform admin için ayrı şifremi unuttum, recovery oturumunda zorunlu TOTP doğrulama ve yeni şifre belirleme ekranlarını ekle
- [x] `https://admin.yourprostore.ai/update-password` adresini Supabase Auth redirect allowlist'ine ekle
- [ ] Admin şifre kurtarma akışını production'da yeni tek kullanımlık bağlantıyla doğrula

### Faz 9A — Formdan önce zorunlu ürün hazırlığı

- [ ] Kayıt, giriş, parola kurtarma, Shopify bağlantısı, onboarding, mağazalar,
  abonelikler ve CMS akışlarını production adreslerinde test hesaplarıyla uçtan uca test et
- [x] Mağaza sahibinin kullandığı `yourprostore-ai` arayüzünü eksiksiz İngilizceleştir
- [x] Mağaza sahibinin kullandığı `storefront-admin` arayüzünü eksiksiz İngilizceleştir
- [ ] İngilizce arayüzü kayıt, giriş, onboarding, mağazalar, abonelikler ve CMS akışlarında test et
- [x] Shopify App Pricing içinde `Starter` (`starter-monthly`, 9 USD/ay) public planını taslak olarak oluştur; geliştirme mağazalarında ücretsiz testi aç
- [x] Public App Store aboneliği için Stripe yerine Shopify App Pricing modelini uygula
- [x] Partner API Active Subscription sorgusunu ve Shopify plan dönüş URL'sini uygulamaya bağla
- [x] Yalnız `Manage apps` yetkili Partner API istemcisini oluştur ve gerekli Shopify App Pricing değişkenlerini Vercel production ortamına gizli olarak kaydet
- [x] `0019_shopify_app_pricing.sql` migration'ını production veritabanına uygula ve yeni API sürümünü deploy et (`c39575f`, Vercel `Ready`, `/api/health` `ok`)
- [ ] Yerel mock ödeme testlerinden sonra Shopify App Pricing'i geliştirme mağazasında ücretsiz seçim, onay, aktif ve iptal akışlarıyla doğrula
- [ ] Bütün ürün ve ödeme testleri bitene kadar Shopify App Pricing'i etkinleştirme
- [ ] Uygulamanın Sales Channel sayılıp sayılmadığını Shopify Partner Support'tan yazılı teyit et
- [ ] Teyide göre uygulama yetenekleri ve kategori beyanını yeniden doğrula
- [x] Repo `shopify.app.toml` dosyasını etkin production Shopify sürümüyle eşitle (`0fe4bce`, `yourprostore-ai-3`)
- [ ] Production install → OAuth → uygulama arayüzüne yönlendirme akışını yeniden test et
- [ ] `yourprostore.ai/privacy` gizlilik politikası sayfasını oluştur ve production'da yayınla
- [ ] `yourprostore.ai/support` destek sayfasını oluştur ve production'da yayınla
- [ ] Destek ve inceleme iletişim e-postalarını kesinleştir
- [ ] Gerçek müşteri verisi içermeyen listing feature media ve üç masaüstü ekran görüntüsünü hazırla
- [ ] İki aşamalı doğrulama gerektirmeyen, yalnız incelemeye ayrılmış test hesabını hazırla
- [ ] Onboarding ve temel işlevleri gösteren 3–8 dakikalık screencast hazırla
- [ ] İnceleme ekibi için adım adım İngilizce test talimatlarını hazırla

### Faz 9B — Listing ve gönderim

- [ ] İngilizce App Store listing içeriğini tamamla
- [ ] Korumalı müşteri verisi kullanım beyanını son scope ve veri akışlarıyla yeniden doğrula
- [ ] Uygulama yeteneklerini Shopify sınıflandırma teyidine göre son kez seç
- [ ] Test hesabı, ekran kaydı ve inceleme talimatlarını hazırla
- [ ] Otomatik kontrolleri çalıştır ve bütün hataları gider
- [ ] Shopify AI self-review ve App Store Requirements kontrolünü tamamla
- [ ] Son kullanıcı onayından sonra uygulamayı Shopify incelemesine gönder

## Sonraki özellikler

- [ ] AI banner üretimini kuyruklu ve kota kontrollü ekle
- [ ] Production test hesapları ve ücretsiz geliştirme mağazası testleri bittikten sonra açık kullanıcı onayıyla Shopify App Pricing'i etkinleştir
- [ ] Ekip daveti ve gelişmiş roller ekle
- [ ] Analitik ve mağaza sağlık kontrolleri ekle

Secret değerler mesaja veya Git'e yazılmamalıdır. Yalnızca git tarafından yok sayılan
`.env` dosyasında veya production secret manager içinde tutulmalıdır.

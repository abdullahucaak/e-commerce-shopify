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
- Kullanıcının bu proje için verdiği sürekli onay gereği, tamamlanıp test edilen kapsam içi
  değişiklikleri ayrıca sormadan commit ve push et; ilgisiz kullanıcı değişikliklerini dahil etme.
- Secret değerleri mesaja veya Git'e yazma; yalnızca Git tarafından yok sayılan
  `.env` dosyalarında veya hosting secret manager içinde tut.
- Public App Store aboneliklerinde Shopify App Pricing tek gerçek ödeme yöntemidir;
  Stripe live mode açılmayacaktır. Mock billing yalnız erişimi sınırlandırılmış online
  staging/test ortamında kullanılmalı, gerçek production ortamında reddedilmelidir.
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
  Ortak müşteri storefront build'i staging'de aktiftir; production storefront Vercel
  projesi ve müşteri domain yönlendirmesi henüz kurulmamıştır.
- `yourprostore.ai`, `api.yourprostore.ai`, `admin.yourprostore.ai` ve
  `manage.yourprostore.ai` adresleri ilgili projelere bağlandı; HTTPS/TLS aktif.
- API'nin Vercel/Fastify başlangıç sorunları giderildi ve `/api/health` yanıtı doğrulandı.
- Production ortam değişkenleri Vercel'e taşındı; secret değerleri Git'e eklenmedi.
- Shopify Partner hesabı ve `YourProStore.ai` public uygulaması oluşturuldu.
- Shopify uygulama URL'si, OAuth callback'i, gerekli Storefront API izinleri,
  istemci bilgileri, dağıtım tipi, İngilizce ana dil ve uygulama ikonu yapılandırıldı.
- Shopify App Store kayıt ücreti tamamlandı ve acil geliştirici iletişim bilgileri kaydedildi.

**Kaldığımız kesin nokta:** Shopify App Pricing kodu ve production bağlantısı hazır,
ancak Shopify tarafındaki geri dönüşü zor etkinleştirme işlemi yapılmadı. Ürün henüz
online staging ortamı, tarayıcıdan yürütülecek mock ve uçtan uca manuel testler,
Sales Channel sınıflandırması, production app config eşleştirmesi, yasal/destek
sayfaları, listing görselleri ve inceleme materyalleri bakımından gönderime hazır değildir.

**Bir sonraki işlem:** App Store formuna ve gerçek Shopify abonelik aktivasyonuna devam
etmeden önce giriş korumalı online staging ortamını kurmak. Mock ödeme durumları dahil
ürünün tamamı bu ortamda terminal gerektirmeden tarayıcıdan test edilecek. Sonrasında
ücretsiz geliştirme mağazası Shopify App Pricing testi yapılacak. App Pricing'i
etkinleştirme ve “Submit for review” işlemleri ayrı açık kullanıcı onayları gerektirir.

**3 Eylül 2026 online staging ilerlemesi:** Production'dan ayrı
`ecommerce-shopify-staging` Supabase projesi oluşturuldu ve `0001`–`0019`
migration'ları uygulandı. Ayrı Vercel projeleri `staging.yourprostore.ai`,
`api-staging.yourprostore.ai`, `manage-staging.yourprostore.ai`,
`admin-staging.yourprostore.ai` ve `store-staging.yourprostore.ai` adreslerinde HTTPS
üzerinden yayına alındı. Staging API `APP_ENV=staging` ve mock billing kilidiyle ayrı
veritabanına bağlandı; `/api/health` yanıtı `ok` olarak doğrulandı. Supabase Auth site
ve redirect allowlist'i yalnız staging adresleriyle yapılandırıldı. Yetkili test hesabı
oluşturma, yeni kayıtları kapatma ve ayrı Shopify geliştirme mağazası bağlantısı sıradadır.
İnternet kesintisi sonrası yapılan tekrar kontrolde staging web projesindeki eksik
`VITE_API_URL` değeri tamamlandı, proje yeniden deploy edildi ve `/login` ekranı
tarayıcıda konsol hatası olmadan doğrulandı.
Platformdaki bütün API istekleri staging'de mutlak staging API adresini kullanacak
şekilde düzeltildi; süresi dolmuş recovery oturumu artık uygulamayı durdurmak yerine
geçersiz bağlantı açıklamasını gösteriyor (`7249f41`, 14/14 test ve canlı tarayıcı testi).
Staging test hesabıyla giriş doğrulandı. Taslak public Shopify uygulamasının henüz genel
App Store kurulum URL'si olmadığı için bu değer iki Vercel ortamında da bulunmuyor;
platform, Shopify mağaza adını isteyip mevcut güvenli doğrudan OAuth akışına geçecek
şekilde düzenlendi. Listing yayımlandığında genel Shopify mağaza seçim URL'si opsiyonel
olarak tekrar kullanılabilir.

Vercel build'lerine uygulama bazlı ortam sözleşmesi eklendi. API ve dört frontend yalnız
çalışmak için zorunlu değişkenleri doğrular; opsiyonel güvenlik/operasyon anahtarları
uygulamanın belgelenmiş güvenli geri dönüşlerini kullanabilir. Staging mock billing şartları
ile production mock yasağı build sırasında fail-closed kontrol edilir. Production platform projesindeki
eksik public `VITE_API_URL` değeri tamamlandı. Storefront production projesi kurulana kadar
preview URL'si platform/CMS build'lerini durduran zorunlu bir değişken değildir.

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

- Canlı Supabase'e en az `0012`–`0019` migration'ları uygulanmıştır; mevcut
  migration'lar ledger kontrolü yapılmadan tekrar çalıştırılmamalıdır.
- İki gerçek müşteriyle RLS ve Storage metadata tenant izolasyonu doğrulanmıştır.
- `yourprostore-ai` → `storefront-admin` geçişi 60 saniyelik, tek kullanımlık,
  hash saklanan ve hedef adresi sınırlandırılmış SSO handoff kullanır.
- CMS rol matrisi, güvenli dosya kontrolleri, taslak/yayın ayrımı, gerçek storefront
  önizlemesi, sürüm geçmişi, geri dönüş ve audit log işlemleri tamamlanmıştır.
- API rate limit, request boyutu sınırları, güvenli header/CORS, hassas log
  maskeleme ve webhook retry/dead-letter modeli mevcuttur.
- Production ortam değişkenleri Vercel'dedir; yerel `.env` ve secret dosyalarının
  Git'e eklenmemesi bilinçli ve gereklidir.
- Son kapsamlı yerel doğrulamada 150 uygulama testi, 33 Shopify tema dosyası ve dört
  Vue production build'i başarılıydı. Shopify App Pricing değişikliğinden sonra API
  testleri ayrıca 118/118 geçti; `c39575f` production deployment'ı `Ready` ve canlı
  `/api/health` yanıtı `ok` olarak doğrulandı.

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
- [x] `app/uninstalled`, `shop/update` ve zorunlu gizlilik webhook'larını ekle

## Faz 3 — `yourprostore-ai` kurulum sihirbazı

- [x] Hesap ve workspace oluşturma akışını ekle
- [x] Shopify ile devam et ve mağaza seçme akışını ekle
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

- [ ] Storefront, platform, API ve yönetim uygulamalarını production hosting'e kur
  (platform, API, storefront yönetimi ve dahili admin hazır; ortak `apps/storefront`
  production Vercel projesi henüz eksik)
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

- [x] Development, online staging ve production ortamlarını veri, secret ve domain düzeyinde ayır
- [x] Online staging için sabit platform, API, CMS ve storefront adreslerini oluştur
- [ ] Staging erişimini yalnız yetkili test kullanıcılarıyla sınırla; arama motorlarından gizle
- [ ] Staging'e ayrı Supabase proje/veritabanı, Storage alanı ve ayrı Shopify geliştirme mağazası bağla
  (ayrı Supabase ve Storage hazır; yetkili test hesabıyla giriş doğrulandı; Shopify
  geliştirme mağazası bağlantısı sırada)
- [x] Vercel build'lerinde API ve dört frontend için uygulama bazlı zorunlu ortam
  değişkeni sözleşmesini ve staging/production billing kilidi testlerini çalıştır
- [x] `APP_ENV=staging` ve `ALLOW_MOCK_BILLING=true` birlikteyken mock billing'i online staging build'inde açan; `APP_ENV=production` için kesin olarak reddeden ortam kilidini ve testlerini ekle
- [ ] Mock ödeme senaryolarını tarayıcı arayüzünden aktif, başarısız, duraklatılmış, iptal ve yeniden etkin durumlarıyla çalıştır
- [ ] Secret manager ve token anahtar rotasyonunu ekle
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

- [ ] Faz 8'deki giriş korumalı online staging ortamını tamamla
- [ ] Kayıt, giriş, parola kurtarma, Shopify bağlantısı, onboarding, mağazalar, mock abonelikler ve CMS akışlarını yalnız tarayıcıdan uçtan uca test et
- [x] Mağaza sahibinin kullandığı `yourprostore-ai` arayüzünü eksiksiz İngilizceleştir
- [x] Mağaza sahibinin kullandığı `storefront-admin` arayüzünü eksiksiz İngilizceleştir
- [ ] İngilizce arayüzü kayıt, giriş, onboarding, mağazalar, abonelikler ve CMS akışlarında test et
- [x] Shopify App Pricing içinde `Starter` (`starter-monthly`, 9 USD/ay) public planını taslak olarak oluştur; geliştirme mağazalarında ücretsiz testi aç
- [x] Public App Store aboneliği için Stripe yerine Shopify App Pricing modelini uygula
- [x] Partner API Active Subscription sorgusunu ve Shopify plan dönüş URL'sini uygulamaya bağla
- [x] Yalnız `Manage apps` yetkili Partner API istemcisini oluştur ve gerekli Shopify App Pricing değişkenlerini Vercel production ortamına gizli olarak kaydet
- [x] `0019_shopify_app_pricing.sql` migration'ını production veritabanına uygula ve yeni API sürümünü deploy et (`c39575f`, Vercel `Ready`, `/api/health` `ok`)
- [ ] Mock ödeme hata/durum senaryolarını staging'de doğruladıktan sonra Shopify App Pricing'i geliştirme mağazasında ücretsiz seçim, onay, aktif ve iptal akışlarıyla doğrula
- [ ] Bütün ürün ve ödeme testleri bitene kadar Shopify App Pricing'i etkinleştirme
- [ ] Uygulamanın Sales Channel sayılıp sayılmadığını Shopify Partner Support'tan yazılı teyit et
- [ ] Teyide göre uygulama yetenekleri ve kategori beyanını yeniden doğrula
- [ ] Repo `shopify.app.toml` dosyasını etkin production Shopify sürümüyle eşitle
- [ ] App Store listing yayımlandığında Shopify'ın genel kurulum/mağaza seçim URL'sini
  `SHOPIFY_INSTALL_URL` olarak production ve staging API secret manager'larına ekle;
  o zamana kadar doğrulanmış `myshopify.com` adresiyle doğrudan OAuth akışını kullan
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
- [ ] Online staging ve ücretsiz geliştirme mağazası testleri bittikten sonra açık kullanıcı onayıyla Shopify App Pricing'i etkinleştir
- [ ] Ekip daveti ve gelişmiş roller ekle
- [ ] Analitik ve mağaza sağlık kontrolleri ekle

Secret değerler mesaja veya Git'e yazılmamalıdır. Yalnızca git tarafından yok sayılan
`.env` dosyasında veya production secret manager içinde tutulmalıdır.

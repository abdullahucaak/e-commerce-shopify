# Uygulama sırası ve yapılacaklar listesi

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

- [x] Storefront, platform CMS ve backend'i ayrı çalıştırılabilir uygulamalara ayır
- [x] Kök projeyi npm workspaces olarak yapılandır
- [x] Supabase Auth istemcisini ekle
- [x] E-posta doğrulamalı kayıt, giriş ve çıkış ekranlarını ekle
- [x] `localStorage.isAdmin` ve sahte `/admins` girişini kaldır
- [x] İlk kullanıcı için workspace oluşturma işlemini ekle
- [x] Workspace üyelik ve rol kontrollerini backend'e ekle
- [ ] İki kullanıcının birbirinin mağaza ayarlarını göremediğini test et

## Faz 2 — Shopify mağaza bağlantısı

- [ ] Shopify Dev Dashboard'da platform uygulamasını oluştur
- [ ] OAuth başlangıç ve callback endpoint'lerini ekle
- [ ] State, HMAC, timestamp ve shop domain doğrulamasını ekle
- [ ] Admin tokenını uygulama seviyesinde şifreleyerek kaydet
- [ ] Public Storefront API erişimini mağaza için oluştur/kaydet
- [ ] `shop { id myshopifyDomain primaryDomain name currencyCode }` sorgusunu çalıştır
- [ ] Mağazayı `Shop.id` ile oluştur veya güncelle
- [ ] İlk, güncel ve eski `myshopify.com` alias kayıtlarını yönet
- [ ] `app/uninstalled`, `shop/update` ve zorunlu gizlilik webhook'larını ekle

## Faz 3 — Mağazaya özel CMS

- [ ] CMS mağaza seçimini ve yetkisini ekle
- [ ] Marka adı, logo ve izin verilen renk alanlarını ekle
- [ ] Hero/banner, duyuru ve footer alanlarını ekle
- [ ] Dosya tipi, boyut ve görsel ölçüsü doğrulaması ekle
- [ ] Taslağı kaydet ve ayrı önizleme URL'si oluştur
- [ ] Yayınla işlemini transaction içinde yap
- [ ] Ayar geçmişi ve geri dönüş işlemi ekle
- [ ] Değişiklikleri audit log'a yaz

## Faz 4 — Domain ve hosting otomasyonu

- [ ] Storefront'u production hosting'e kur
- [ ] Kullanıcının domain ekleme ekranını oluştur
- [ ] DNS doğrulama kaydını üret
- [ ] Hosting sağlayıcısında custom hostname oluştur
- [ ] TLS/SSL durumunu takip et
- [ ] Kök domain ve `www` yönlendirme kurallarını ekle
- [ ] Domain değişikliğinde Shopify bağlantısının etkilenmediğini test et

## Faz 5 — Ortak sürüm ve güvenli yayınlama

- [ ] Stable ve beta release pipeline'ını oluştur
- [ ] Veritabanı migration'larını release işlemine bağla
- [ ] Feature flag yönetim ekranı ekle
- [ ] Seçili mağazada beta testi ekle
- [ ] Önceki Vue sürümüne geri dönüş işlemini ekle
- [ ] CMS ayar schema migration'larını ekle

## Faz 6 — Üretim güvenliği ve operasyon

- [ ] Development, staging ve production ortamlarını ayır
- [ ] Secret manager ve token anahtar rotasyonunu ekle
- [ ] API rate limit ve kötüye kullanım koruması ekle
- [ ] Hata izleme ve uptime alarmı ekle
- [ ] Veritabanı yedek ve geri yükleme testi yap
- [ ] Webhook retry/dead-letter kuyruğu ekle
- [ ] Hesap silme, veri saklama ve gizlilik akışlarını tamamla

## Sonraki özellikler

- [ ] AI banner üretimini kuyruklu ve kota kontrollü ekle
- [ ] Shopify Billing API ile abonelik sistemi ekle
- [ ] Ekip daveti ve gelişmiş roller ekle
- [ ] Analitik ve mağaza sağlık kontrolleri ekle

Secret değerler mesaja veya Git'e yazılmamalıdır. Yalnızca git tarafından yok sayılan
`.env` dosyasında veya production secret manager içinde tutulmalıdır.

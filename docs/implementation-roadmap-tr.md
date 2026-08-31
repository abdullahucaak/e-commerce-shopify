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

- [x] `yourprostore-ai`, `storefront`, `storefront-admin` ve `api` uygulamalarını ayrı çalıştırılabilir birimlere ayır
- [x] Kök projeyi npm workspaces olarak yapılandır
- [x] Supabase Auth istemcisini ekle
- [x] E-posta doğrulamalı kayıt, giriş ve çıkış ekranlarını ekle
- [x] `localStorage.isAdmin` ve sahte `/admins` girişini kaldır
- [x] İlk kullanıcı için workspace oluşturma işlemini ekle
- [x] Workspace üyelik ve rol kontrollerini backend'e ekle
- [ ] İki kullanıcının birbirinin mağaza ayarlarını göremediğini test et

## Faz 2 — Shopify mağaza bağlantısı

- [x] Shopify Dev Dashboard'da platform uygulamasını oluştur
- [x] OAuth başlangıç ve callback endpoint'lerini ekle
- [x] State, HMAC, timestamp ve shop domain doğrulamasını ekle
- [x] Admin tokenını uygulama seviyesinde şifreleyerek kaydet
- [x] Public Storefront API erişimini mağaza için oluştur/kaydet
- [x] `shop { id myshopifyDomain primaryDomain name currencyCode }` sorgusunu çalıştır
- [x] Mağazayı `Shop.id` ile oluştur veya güncelle
- [x] İlk, güncel ve eski `myshopify.com` alias kayıtlarını yönet
- [ ] `app/uninstalled`, `shop/update` ve zorunlu gizlilik webhook'larını ekle

## Faz 3 — `yourprostore-ai` kurulum sihirbazı

- [x] Hesap ve workspace oluşturma akışını ekle
- [x] Shopify ile devam et ve mağaza seçme akışını ekle
- [x] Sektör, banner, marka, önizleme, domain ve paket adımlarını kalıcı olarak kaydet
- [x] Shopify ürün hazır olma kontrolünü ve ürünsüz mağaza yönlendirmesini ekle
- [x] Domain adımını opsiyonel yap ve daha sonra bağlamak üzere atlama desteği ekle
- [x] Geliştirme ve test ortamı için mağaza bazlı mock ödeme durumu simülasyonunu tamamla
- [x] Çoklu mağaza abonelik özeti ve toplam aylık tutar ekranını ekle
- [x] Müşteri hesap özeti ve güvenli çıkış ekranını ekle
- [x] Mağaza kartlarını kurulum, ödeme ve aktif yönetim durumuna göre yönlendir
- [x] `yourprostore-ai` bağlantısından gelen storefront kimliğiyle doğru CMS mağazasını seç
- [x] `yourprostore-ai` ile `storefront-admin` arasında güvenli ve tek kullanımlık SSO handoff ekle

## Faz 4 — `storefront-admin`

- [x] Storefront seçimini ve workspace yetkisini ekle
- [x] Owner/admin, editor ve viewer için CMS rol yetki matrisini API, UI ve Storage RLS katmanlarında uygula
- [x] Marka adı, logo ve izin verilen renk alanlarını ekle
- [x] Hero/banner, duyuru ve footer alanlarını ekle
- [ ] Dosya tipi, boyut ve görsel ölçüsü doğrulaması ekle
- [ ] Taslağı kaydet ve ayrı önizleme URL'si oluştur
- [ ] Yayınla işlemini transaction içinde yap
- [ ] Ayar geçmişi ve geri dönüş işlemi ekle
- [ ] Değişiklikleri audit log'a yaz

## Faz 5 — Domain ve hosting otomasyonu

- [ ] Storefront'u production hosting'e kur
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

- [ ] Dahili platform yöneticisi yetki modelini müşteri workspace rollerinden ayır
- [ ] Müşteri ve workspace listeleme ekranlarını ekle
- [ ] Mağaza, storefront ve kurulum durumu ekranlarını ekle
- [ ] Mağaza başına abonelik ve ödeme sorunu ekranlarını ekle
- [ ] Webhook, audit log ve hata kayıtlarını görüntüle
- [ ] Niche ve banner kataloğu yönetimini ekle
- [ ] Yetkili destek ve mağaza askıya alma işlemlerini audit log ile sınırla

Bu faz, kurulum sihirbazı ve abonelik durum modeli kararlı hale geldikten sonra; ancak
production pilotundan önce tamamlanır.

## Faz 8 — Üretim güvenliği ve operasyon

- [ ] Development, staging ve production ortamlarını ayır
- [ ] Secret manager ve token anahtar rotasyonunu ekle
- [ ] API rate limit ve kötüye kullanım koruması ekle
- [ ] Hata izleme ve uptime alarmı ekle
- [ ] Veritabanı yedek ve geri yükleme testi yap
- [ ] Webhook retry/dead-letter kuyruğu ekle
- [ ] Hesap silme, veri saklama ve gizlilik akışlarını tamamla

## Sonraki özellikler

- [ ] AI banner üretimini kuyruklu ve kota kontrollü ekle
- [ ] Stripe test-mode doğrulamasından sonra live-mode mağaza aboneliklerini aç
- [ ] Ekip daveti ve gelişmiş roller ekle
- [ ] Analitik ve mağaza sağlık kontrolleri ekle

Secret değerler mesaja veya Git'e yazılmamalıdır. Yalnızca git tarafından yok sayılan
`.env` dosyasında veya production secret manager içinde tutulmalıdır.

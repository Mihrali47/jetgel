# Geliştirme notları

Bu projede çalışan herkes için kurallar ve teknik notlar. Bir değişiklik yapmadan önce bu dosyayı ve `README.md`'yi baştan sona okuyun.

## Proje nedir

**Jetgel** (geçici isim): İstanbul'da tek bir semtten başlayacak, **komisyonsuz, sabit ücretli** yemek ve market teslimat sistemi. Yemeksepeti, Getir ve Trendyol Go'nun yüzde komisyonuna karşı esnafa sabit ücret sunar.

Şu an repoda **kullanılabilir bir prototip** var: müşteri, işletme, kurye ve yönetim için ayrı sayfalar; telefonlar Supabase üzerinden canlı bağlı; gerçek GPS, gerçek yol rotası ve uygulama içi gerçek sesli arama (WebRTC) var. **Ödeme simülasyondur**, kullanıcı girişi yoktur. Ayrıca tek ekranda her şeyi gösteren `simulasyon.html` vardır.

Canlı site: https://mihrali47.github.io/jetgel/ (GitHub Pages, `main` dalının kökünden yayınlanır).

## Çalışma dili

- İş kararlarını proje sahibi verir.
- Yazışmalar ve commit mesajları **Türkçe**; teknik terimler açıklanarak.
- Her değişiklikten sonra ne yapıldığı kısa ve sade bir dille anlatılır; site telefondan test edilir.

## Değişmemesi gereken iş kuralları

Bu kurallar proje sahibinin kararlarıdır. Sahip açıkça istemeden **değiştirme**. Ayrıntılar `README.md` içindeki "Kurallar" tablosunda.

- **Ücret:** Müşteri 50 + 5 TL, işletme 50 + 5 TL öder. Kuryeye 100 TL, platforma 10 TL. Yüzde komisyon yok. İşletme isterse müşterinin payını üstlenir.
- **Ödeme:** Para platformun hesabına uğramaz (alt üye işyeri modeli). Blokaj → onayda çekim → teslimata kadar bekletme → teslimde otomatik bölüştürme.
- **SMS yok.** Teslimat onayı uygulama içi 4 haneli kod veya QR ile; kod yalnızca 100 m içinde geçerli. Serbest "teslim edildi" butonu yok.
- **Arama:** Uygulama içi, internet üzerinden, numaralar gizli, yalnızca aktif sipariş varken.
- **İkaz:** İşletme müşteri aramasını açmaz ve geri aramazsa müşteriye %15 iade; 3 ikazda askıya alma; 90 günde silinir; itiraz hakkı var.
- **Bildirim:** Kurye ve işletme için zorunlu, müşteri için önerilir.
- **KDV/fatura:** Platform ürün satışı yapmaz; ürün şablonlarında KDV sütunu yok.

## Dosya yapısı

| Yol | Ne |
|---|---|
| `index.html` | Giriş sayfası |
| `app/ikon.js` | Çizgi ikonlar (Lucide, ISC). Arayüzde emoji yerine `J.ic('ad')` kullanılır |
| `musteri.html`, `isletme.html`, `kurye.html`, `yonetim.html` | Rol uygulamaları; her biri kendi arayüzünü çizer, iş mantığı `app/core.js`'te |
| `app/core.js` | Veri katmanı (`J.DB`), iş kuralları (`J.FEE`, süreler), sipariş akışı, kurye atama (`J.dispatchTick`), ikaz (`J.strikeTick`), rota/navigasyon, WebRTC arama, uyarılar, harita (`J.Map`) |
| `app/config.js` | Supabase URL + publishable key, ICE/TURN sunucuları. Secret key buraya ASLA yazılmaz |
| `app/app.css` | Ortak stil |
| `app/musteri.css` | Müşteri uygulamasına özel stil (`m-` önekli sınıflar) |
| `app/excel.js` | Dış kütüphanesiz .xlsx/.csv okuyucu (`J.readSheetFile`), şablondan ürün çıkarma (`J.productsFromSheets`), menüyle birleştirme (`J.mergeMenu`). Sadece işletme sayfası yükler |
| `app/panel.css` | İşletme ve kurye uygulamalarının ortak stili (`p-` önekli sınıflar) |
| `supabase/kurulum.sql` | Veritabanı: tek tablo `kayitlar(tbl, id, data jsonb)`, `jg_patch` (alan bazlı güncelleme) ve `jg_claim` (tek seferlik iş) fonksiyonları, realtime |
| `simulasyon.html` | Bağımsız tek dosyalık simülasyon (sürüm 2); kendi kodunu içerir |
| `sw.js`, `manifest-*.webmanifest`, `ikonlar/` | PWA |
| `vendor/` | Leaflet 1.9.4 ve supabase-js 2 yerel kopyaları |
| `sablonlar/` | Excel ürün şablonu |
| `.nojekyll` | GitHub Pages'in dosyaları işlemesini kapatır; silme |
| `uygulama/` | Android uygulaması (Capacitor 8). Canlı siteyi `server.url` ile açar. Yerel kod: `uygulama/android/app/src/main/java/com/jetgel/app/` (`JetgelNativePlugin`, `JetgelService`, `Bildirim`, `MainActivity`) |
| `.github/workflows/android.yml` | `uygulama/**` değişince APK derler, `android-son` sürümüne yükler |

## Android uygulaması notları

- Web tarafı `J.native` (app/core.js) ile uygulamada olup olmadığını anlar; yoksa her şey tarayıcı davranışına düşer. Bu ayrımı koru.
- Site değişiklikleri için APK yeniden derlenmez; sadece `uygulama/` altındaki değişiklikler derleme tetikler.
- APK sabit test anahtarıyla imzalanır ki güncellemeler eskisinin üzerine kurulabilsin; anahtarı değiştirme (kullanıcılar uygulamayı silip yeniden kurmak zorunda kalır).
- Yerel eklentiye yeni metot eklerken JS tarafındaki çağrıyı `if(J.native)` ile koru.

## Test hesapları

Dükkân `test1`…`test9`, kurye `1test`…`9test`, müşteri `test`; hepsinin şifresi `test`. `J.ensureTestAccounts()` (app/core.js) eksik olanları her açılışta oluşturur. Giriş `J.login()` ile yapılır ve **prototip düzeyindedir** (düz metin şifre, açık veritabanı). Sahip istemeden test hesaplarını kaldırma.

## Mimari notlar

- Sunucu yok; her cihaz kendi rolünün işini yapar: **işletme cihazı** kendi siparişleri için kurye atar ve teklif süresini takip eder; **arayan cihaz** cevapsız aramayı işaretler; **ikaz** herhangi bir cihazda `jg_claim` ile tek sefer uygulanır.
- Kayıt güncellemelerinde her zaman `J.DB.patch` kullan (sadece değişen alanlar gönderilir; farklı cihazlar birbirinin alanını ezmesin).
- Süreler `J.D(ms)` ile hızlı test moduna uyarlanır; yeni süre eklerken bunu kullan.
- `J.render` yeniden çizimde odak ve kaydırmayı korur; sayaçlar `data-live` ile güncellenir.
- Harita/rota servisleri erişilemezse uygulama çalışmaya devam etmeli (rota düz çizgiye düşer).

## Çalışma kuralları

1. **Aynı anda tek kişi çalışır.** Başlamadan önce `main` dalının güncel halini çek.
2. **Küçük ve tek amaçlı değişiklikler yap.** Her commit tek bir işi anlatsın; commit mesajları Türkçe olsun.
3. **İş kurallarını bozmadığını kontrol et.** Ücret, ödeme ve teslimat kurallarına dokunan bir değişiklik yaptıysan sahibe açıkça söyle.
4. **README'yi güncel tut.** Yeni bir kural, özellik ya da karar eklediysen `README.md`'deki ilgili bölümü de güncelle. Yol haritasında biten maddeleri işaretle.
5. **Dış bağımlılık eklerken dikkatli ol.** Kütüphaneleri mümkünse `vendor/` altına yerel kopya olarak ekle; site GitHub Pages'te sunucusuz çalışıyor.
6. **Test et.** Değişiklikten sonra en azından şu akışı dört sekmede (demo modu) dene: yönetim → demo işletmelerini yükle; işletme → seç, bildirim izni, aç; kurye → kaydol, bildirim izni, çevrimiçi (demo sürüş); müşteri → profil, sipariş → işletme onayla → kurye kabul → hazır → paketi al → kodla teslim. Bir sesli arama da dene. Telefon genişliğinde (390 px) bak.
7. **Gizli bilgi koyma.** API anahtarı, şifre, kişisel veri repoya girmez.
8. **Commit mesajlarına araç/yazar imzası eklenmez** (Co-Authored-By vb.).

## Henüz yapılmayanlar (bilinçli olarak)

Stok takibi, kasa entegrasyonu, gerçek ödeme, gerçek (güvenli) kullanıcı girişi ve sunucu tarafı (push bildirim) henüz yok. Veritabanı politikası prototip için herkese açıktır. Bunlar `README.md`'deki yol haritasında. Sahip istemeden bunlara başlama.

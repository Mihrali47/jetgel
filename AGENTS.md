# AGENTS.md — Yapay zekâ kodlama asistanları için talimatlar

Bu dosya, bu repoda çalışan her yapay zekâ asistanı (Claude, ChatGPT/Codex, Copilot, Cursor vb.) içindir. Bir değişiklik yapmadan önce bu dosyayı ve `README.md`'yi baştan sona oku.

## Proje nedir

**Jetgel** (geçici isim): İstanbul'da tek bir semtten başlayacak, **komisyonsuz, sabit ücretli** yemek ve market teslimat sistemi. Yemeksepeti, Getir ve Trendyol Go'nun yüzde komisyonuna karşı esnafa sabit ücret sunar.

Şu an repoda **çalışan bir prototip (simülasyon)** var: tek bir `index.html` içinde müşteri, işletme, kurye ekranları ve yönetim paneli. Gerçek sunucu, veritabanı, ödeme ve arama yok; hepsi tarayıcıda simüle ediliyor.

Canlı site: https://mihrali47.github.io/jetgel/ (GitHub Pages, `main` dalının kökünden yayınlanır).

## Proje sahibi hakkında

- Proje sahibi **kod bilmiyor**. Kararları o verir, kodu yapay zekâ asistanları yazar.
- Sahiple **Türkçe** ve teknik terimleri açıklayarak konuş.
- Her değişiklikten sonra ne yaptığını kısa ve sade bir dille anlat; sahibin siteyi telefondan test edeceğini unutma.

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
| `index.html` | Prototipin tamamı: HTML, CSS ve JavaScript tek dosyada |
| `vendor/leaflet/` | Harita kütüphanesi (Leaflet 1.9.4), yerel kopya |
| `sablonlar/` | İşletmeler için ürün yükleme Excel şablonu |
| `README.md` | Kurallar, yol haritası, teknik notlar (tek gerçek kaynak) |
| `.nojekyll` | GitHub Pages'in dosyaları işlemesini kapatır; silme |

## `index.html` içinde yapı

- Üstte `AYARLAR` bloğu: ücretler, süreler, mesafeler sabit olarak tanımlı (`FEE`, `RADIUS_M`, `PIN_RADIUS_M` vb.). Ücret veya süre değişikliği önce buradan yapılır.
- `S` nesnesi: tüm durum (işletmeler, kuryeler, müşteri, siparişler, aramalar, günlük).
- Bölümler başlıklarla ayrılmış: ÖDEME AKIŞI, SİPARİŞ, KURYE ATAMA, NAVİGASYON, UYGULAMA İÇİ ARAMA, ZAMANLAYICI, HARİTA, ekran render fonksiyonları, OLAYLAR.
- Ekranlar her değişiklikte yeniden çizilir (`renderAll`), sık değişen sayaçlar `updateLive` ile güncellenir.
- Harita: Leaflet + CARTO karoları; rota OSRM demo sunucusundan. Erişilemezse otomatik şematik haritaya ve düz çizgi rotasına geçer. Bu yedek davranışı bozma.

## Çalışma kuralları

1. **Aynı anda tek asistan çalışır.** Başlamadan önce `main` dalının güncel halini çek.
2. **Küçük ve tek amaçlı değişiklikler yap.** Her commit tek bir işi anlatsın; commit mesajları Türkçe olsun.
3. **İş kurallarını bozmadığını kontrol et.** Ücret, ödeme ve teslimat kurallarına dokunan bir değişiklik yaptıysan sahibe açıkça söyle.
4. **README'yi güncel tut.** Yeni bir kural, özellik ya da karar eklediysen `README.md`'deki ilgili bölümü de güncelle. Yol haritasında biten maddeleri işaretle.
5. **Dış bağımlılık eklerken dikkatli ol.** Kütüphaneleri mümkünse `vendor/` altına yerel kopya olarak ekle; site GitHub Pages'te sunucusuz çalışıyor.
6. **Test et.** Değişiklikten sonra en azından şu akışı tarayıcıda dene: işletme bildirim izni ver ve aç → kurye bildirim izni ver ve çevrimiçi ol → müşteri Usta Pideci'den sipariş ver → işletme onayla → kurye kabul et → hazır → paketi al → kodla teslim et. Telefon genişliğinde (390 px) de bak.
7. **Gizli bilgi koyma.** API anahtarı, şifre, kişisel veri repoya girmez.

## Henüz yapılmayanlar (bilinçli olarak)

Stok takibi, kasa entegrasyonu, gerçek ödeme, gerçek arama ve sunucu tarafı henüz yok. Bunlar `README.md`'deki yol haritasında. Sahip istemeden bunlara başlama.

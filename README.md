# Jetgel (geçici isim)

Komisyonsuz, sabit ücretli yemek ve market teslimat sistemi. Bu repo, sistemin **çalışan bir prototipini** içerir.

**Canlı site:** https://mihrali47.github.io/jetgel/

> Bu bir simülasyondur: gerçek ödeme ve gerçek arama yoktur. Harita ve yol rotaları gerçektir (OpenStreetMap). Zaman hızlandırılmıştır (üstteki seçiciden ayarlanır). Sayfa yenilenince her şey sıfırlanır.

## Nasıl denenir

Müşteri, işletme ve kurye ekranları aynı anda çalışır; en altta yönetim paneli her şeyi kaydeder. Telefonda ekranlar sekme olarak gelir.

1. **İşletme** ekranında bildirim izni verin ve "Aç"a basın.
2. **Kurye** ekranında bildirim izni verin ve çevrimiçi olun.
3. **Müşteri** ekranından Usta Pideci'den sipariş verin.
4. İşletme olarak hazırlık süresini seçip onaylayın. Kuryeye 30 saniyelik teklif gelir, kabul edin.
5. Kurye ekranında gerçek sokaklar üzerinde rota ve adım adım yol tarifi görünür. "Google Haritalar'da aç" ile gerçek navigasyona geçilebilir.
6. Kurye kapıya varınca müşteri ekranındaki 4 haneli kodu girin.

**İkaz sistemini denemek için:** sipariş aktifken müşteri ekranından işletmeyi arayın, işletme ekranında reddedin ve 15 saniye geri aramayın.

**Müşteriye ulaşılamadı akışını denemek için:** kurye kapıdayken kodu girmeyin; kurye ekranından müşteriyi arayın, 10 dakika (simülasyon) bekleyin, sonra "Müşteriye ulaşılamadı"ya basın.

## Kurallar (sürüm 2)

| Konu | Kural |
|---|---|
| Ücret | Müşteri 50 + 5 TL, işletme 50 + 5 TL öder. Kuryeye 100 TL, platforma 10 TL. İşletme isterse müşterinin payını üstlenir. |
| Komisyon | Yok. Sipariş tutarı ne olursa olsun teslimat ücreti sabittir. |
| Ödeme | Para platformun hesabına uğramaz (lisanslı ödeme kuruluşunun alt üye işyeri modeli varsayılır). Siparişte kartta blokaj → işletme onayında çekim → teslimata kadar bekletme → teslimde otomatik bölüştürme (işletme, kurye, platform). Reddedilen siparişte blokaj kalkar, para çekilmez. |
| Kurye atama | İşletme onaylayınca 3 km içindeki en yakın, boşta ve bildirimi açık kuryeye teklif gider. 30 sn içinde yanıt yoksa ya da reddederse sıradakine geçer. Reddetmenin cezası yoktur. |
| Navigasyon | Gerçek yol rotası ve Türkçe adım adım tarif; kalan mesafe ve süre. Rota alınamazsa düz çizgi yedeği kullanılır. |
| Teslimat onayı | Serbest "teslim edildi" butonu yoktur. Müşterinin 4 haneli kodu veya QR'ı gerekir. Kod yalnızca kurye adrese 100 m'den yakınken kabul edilir. İsteğe bağlı teslimat fotoğrafı. Paket alımı fiş QR'ı ile doğrulanır. |
| Müşteriye ulaşılamazsa | Kurye uygulamadan arar ve 10 dk bekler; sonra sipariş kapanır. İade yapılmaz; kurye ve işletme ücretini alır. |
| Arama | İnternet üzerinden, numaralar gizli, yalnızca aktif sipariş varken. Her arama kayıt altındadır. |
| İkaz | İşletme müşteri aramasını açmaz ve 5 dk içinde geri aramazsa ikaz alır; müşteriye siparişin %15'i işletme payından iade edilir. 3 ikazda askıya alma. İkazlar 90 günde silinir, itiraz hakkı vardır. |
| Bildirim | Kurye ve işletme için zorunlu, müşteri için önerilir. |

## Dosyalar

- `index.html`: Prototipin tamamı
- `vendor/leaflet/`: Harita kütüphanesi (Leaflet 1.9.4)
- `sablonlar/jetgel-urun-yukleme-sablonu.xlsx`: İşletmelerin toplu ürün yükleme şablonu (market ve restoran)

## Teknik notlar

- **Harita:** OpenStreetMap verisi, CARTO harita karoları.
- **Rota:** OSRM'nin herkese açık demo sunucusu (`router.project-osrm.org`). Bu sunucu sadece deneme amaçlıdır; gerçek kullanıma geçmeden önce kendi OSRM sunucumuzu kurmamız ya da ücretli bir servis (Google Maps, Mapbox, HERE vb.) kullanmamız gerekir.
- Harita karoları veya rota servisi erişilemezse sistem otomatik olarak şematik haritaya ve düz çizgi rotasına geçer.

## Yol haritası

- [ ] İsmi kesinleştirmek
- [ ] İlk semti seçmek
- [ ] Yoğun saatlerde aynı yöndeki siparişleri tek kuryeye birleştirme
- [ ] Prototipe Excel ile ürün yükleme
- [ ] Gerçek ödeme altyapısı (alt üye işyeri modeli; PayTR, iyzico vb. ile görüşme)
- [ ] Gerçek uygulama içi arama altyapısı
- [ ] Kurye ve işletme mobil uygulamaları
- [ ] Mali müşavir ile şirket yapısı ve faturalandırma

### İleride

- Barkodlu ortak ürün kataloğu ve kamerayla barkod okutma
- Kasa programlarıyla iki yönlü stok bağlantısı (entegratör ortaklıkları, açık API)
- E-fatura ile otomatik stok girişi
- Restoran menüsünü fotoğraftan okuma

## Araştırmadan alınanlar

- **DoorDash:** En yakın kuryeye teklif, süre dolunca sıradakine geçiş; yoğunlukta sipariş birleştirme.
- **Meituan:** Siparişleri belirli aralıklarla topluca atama, birleşik teslimatla kurye verimini artırma.
- **Wolt, Glovo, Uber:** Teslimatı PIN koduyla onaylama; Wolt'ta işletmenin kendi kuryesi için fiş QR'ı.

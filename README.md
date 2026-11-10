# Jetgel (geçici isim)

Komisyonsuz, sabit ücretli yemek ve market teslimat sistemi. Bu repo, sistemin **çalışan bir prototipini** içerir.

> Bu bir simülasyondur: gerçek ödeme, gerçek arama veya gerçek harita yoktur. Zaman hızlandırılmıştır (1 dakika = 1 saniye). Sayfa yenilenince her şey sıfırlanır.

## Nasıl denenir

`index.html` dosyasını tarayıcıda açın (ya da GitHub Pages linkinden girin). Müşteri, işletme ve kurye ekranları aynı anda çalışır; en altta yönetim paneli her şeyi kaydeder.

1. **İşletme** ekranında bildirim izni verin ve "Aç"a basın.
2. **Kurye** ekranında bildirim izni verin ve çevrimiçi olun.
3. **Müşteri** ekranından Usta Pideci'den sipariş verin.
4. İşletme olarak hazırlık süresini seçip onaylayın. Kuryeye 30 saniyelik teklif gelir, kabul edin.
5. Kurye kapıya varınca müşteri ekranındaki 4 haneli kodu girin.

**İkaz sistemini denemek için:** sipariş aktifken müşteri ekranından işletmeyi arayın, işletme ekranında reddedin ve 15 saniye geri aramayın.

## Sürüm 1 kuralları

| Konu | Kural |
|---|---|
| Ücret | Müşteri 50 + 5 TL, işletme 50 + 5 TL öder. Kuryeye 100 TL, platforma 10 TL. İşletme isterse müşterinin payını üstlenir. |
| Komisyon | Yok. Sipariş tutarı ne olursa olsun teslimat ücreti sabittir. |
| Kurye atama | İşletme onaylayınca 3 km içindeki en yakın, boşta ve bildirimi açık kuryeye teklif gider. 30 sn içinde yanıt yoksa ya da reddederse sıradakine geçer. Reddetmenin cezası yoktur. |
| Teslimat onayı | SMS yok. Müşterinin uygulamasındaki 4 haneli kod veya QR olmadan teslimat tamamlanamaz. Paket alımı fiş QR'ı ile doğrulanır. |
| Arama | İnternet üzerinden, numaralar gizli, yalnızca aktif sipariş varken. Her arama kayıt altındadır. |
| İkaz | İşletme müşteri aramasını açmaz ve 5 dk içinde geri aramazsa ikaz alır; müşteriye siparişin %15'i işletme hesabından iade edilir. 3 ikazda askıya alma. İkazlar 90 günde silinir, itiraz hakkı vardır. |
| Bildirim | Kurye ve işletme için zorunlu, müşteri için önerilir. |
| Ödeme | Online ödeme. Kapıda ödeme ilk 3 başarılı siparişten sonra açılır. |

## Yol haritası

- [ ] İsmi kesinleştirmek
- [ ] Yoğun saatlerde aynı yöndeki siparişleri tek kuryeye birleştirme
- [ ] Gerçek harita ve konum
- [ ] Gerçek uygulama içi arama altyapısı
- [ ] Online ödeme entegrasyonu
- [ ] Kurye ve işletme mobil uygulamaları

## Araştırmadan alınanlar

- **DoorDash:** En yakın kuryeye teklif, süre dolunca sıradakine geçiş; yoğunlukta sipariş birleştirme.
- **Meituan:** Siparişleri belirli aralıklarla topluca atama, birleşik teslimatla kurye verimini artırma.
- **Wolt, Glovo, Uber:** Teslimatı PIN koduyla onaylama; Wolt'ta işletmenin kendi kuryesi için fiş QR'ı.

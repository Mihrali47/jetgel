# Jetgel (geçici isim)

Komisyonsuz, sabit ücretli yemek ve market teslimat sistemi. Bu repo, sistemin **kullanılabilir prototipini** içerir.

**Canlı site:** https://mihrali47.github.io/jetgel/

## Ne var?

| Sayfa | Kim için | Ne yapar |
|---|---|---|
| `musteri.html` | Müşteri | Yemek uygulaması düzeninde: adres çubuğu, arama (restoran ve ürün), kategori filtreleri, "Tekrar sipariş ver", fotoğraf yerine renkli kapaklı restoran kartları (tahmini süre, mesafe, teslimat ücreti açıkça). Restoran sayfasında kategorili menü ve alttan sepet çubuğu; sepette işletmeye not ve gizli ücretsiz tam döküm. Takipte büyük tahmini varış, 4 adımlı ilerleme, harita, kurye/işletme arama, teslimat kodu. Sıralama (önerilen, en yakın, en hızlı, puan), favori işletmeler, birden çok kayıtlı adres (Ev, İş, Diğer). Alt menü: Keşfet · Siparişlerim · Hesabım. Stili `app/musteri.css` |
| `isletme.html` | İşletme | Koyu başlıkta açık/kapalı anahtarı ve bugünün özeti (teslim, aktif, hesaba geçen). Siparişler "Yeni / Hazırlanıyor / Hazır" gruplarında; yeni sipariş kartı yanıp söner, hazırlık süresi büyük düğmelerle seçilir, müşteri notu sarı kutuda. Menüde kategoriye göre ürünler ve satışta/tükendi anahtarı, kategori, açıklama ve seçenekli ürün ekleme ve düzenleme, **Excel/CSV ile toplu ürün yükleme** (şablon indirilebilir; okunan ürünler önce önizlenir, hatalı satırlar ve şablondaki örnek satırlar gösterilir). Kazanç (komisyonlu platformla fark) ve ikazlar. Satış raporu (bugün/7/30 gün, en çok satanlar, saat yoğunluğu, Excel için CSV), sadakat kartı, çalışma saatleri (saatlere göre otomatik aç/kapat), ürün fotoğrafı, işletmeye özel sipariş linki ve yazdırılabilir QR kod, müşteri sorun bildirimlerini inceleme. Alt menü: Siparişler · Menü · Kazanç · Ayarlar. Stili `app/panel.css` |
| `kurye.html` | Kurye | Koyu başlıkta çevrimiçi anahtarı ve bugünkü kazanç. Büyük turuncu teklif kartı (geri sayım, 100 TL, alış/teslim mesafeleri). Boştayken yoğunluk haritası (son 2 saatte sipariş çıkan dükkânlar). Aktif teslimatta 4 adımlı ilerleme, hazır mesajlar, gerçek yol rotası ve adım adım tarif, hedef kartında arama; kapıda büyük kod alanı (harita gizlenir). Alt menü: Görev · Kazanç · Hesap (GPS/demo sürüş seçimi burada). Stili `app/panel.css` |
| `yonetim.html` | Yönetim | Koyu başlıkta canlı özet. Sekmeler: Genel (harita, günlük, siparişler), Şikâyetler (iade ve ikaz itirazları, kesin karar), Başvurular (işletme başvurularını onayla/reddet), İşletmeler, Kuryeler, Aramalar, Ayarlar |
| `yasal.html` | Herkes | KVKK aydınlatma metni, kullanım koşulları, mesafeli satış bilgilendirmesi, işletme ve kurye sözleşme özetleri (**taslak, avukat kontrolü gerekir**) |
| `simulasyon.html` | Esnafa sunum | Tüm sistemi tek ekranda gösteren simülasyon (sürüm 2) |

**Gerçek olanlar:** Telefonlar arası canlı sipariş akışı (Supabase), telefonun GPS konumu, harita ve yol rotası (OpenStreetMap/OSRM), uygulama içi **gerçek sesli arama** (WebRTC), bildirimler ve sesli uyarılar, telefona uygulama gibi yükleme (PWA).

**Simülasyon olanlar:** Ödeme (para çekilmez, sadece durumları gösterilir). Giriş sistemi sadece prototip düzeyinde (aşağıya bakın).

## Test hesapları

| Rol | Kullanıcı adı | Şifre |
|---|---|---|
| Dükkân | `test1` … `test9` | `test` |
| Kurye | `1test` … `9test` | `test` |
| Müşteri | `test` | `test` |

Eksik test hesapları ilk açılışta otomatik oluşur. Yönetim → Ayarlar'dan sıfırlanabilir. Test dükkânları varsayılan olarak Moda/Kadıköy'dedir. Bir müşteri ya da kurye telefonu gerçek konumunu aldığında dükkânlara 5 km'den uzaksa test hesapları **kendiliğinden** o çevreye taşınır (elle: Yönetim → Ayarlar → "Test dükkânlarını bulunduğun yere taşı"). Müşterinin teslimat noktası da ilk girişte telefonun konumundan otomatik alınır. Yeni dükkân yönetim panelinden (kullanıcı adı ve şifreyle), yeni kurye ve müşteri kendi uygulamasından kaydolur.

> ⚠️ **Prototip girişi:** Şifreler veritabanında düz metin durur ve veritabanı herkese açıktır. Bu gerçek bir güvenlik değildir; gerçek kullanımdan önce Supabase Auth ve satır güvenlik kurallarıyla değiştirilmelidir.

## Nasıl denenir (3 telefonla)

1. **1. telefon → İşletme:** `test1` / `test` ile giriş, bildirim izni ver, üstteki anahtarı "Açık" yap.
2. **2. telefon → Kurye:** `1test` / `test` ile giriş, bildirim izni ver, üstteki anahtarı "Açık" yap. Masa başında Hesap sekmesinden "Demo sürüş", sokakta "Gerçek GPS".
3. **3. telefon → Müşteri:** `test` / `test` ile giriş, "Test1 · Pideci"ye gir, ürün ekle, "Sepete git" → "Siparişi onayla".
4. İşletme onaylar → kuryeye teklif düşer → kurye kabul eder, navigasyonla gider → işletme "hazır" der → kurye paketi alır → müşterinin kapısında kodu girer.

Yönetim → Ayarlar'daki **hızlı test modu** açıkken süreler 10 kat kısalır. Gerçek denemede kapatın.

## Modlar

- **Canlı mod:** `app/config.js` içinde Supabase bilgileri varsa tüm cihazlar aynı veritabanına bağlanır.
- **Demo modu:** Supabase bilgisi yoksa (ya da Yönetim → Ayarlar'dan seçilirse) veriler sadece o cihazın tarayıcısında tutulur; aynı cihazdaki sekmeler birbirini görür.

Veritabanı kurulumu: `supabase/kurulum.sql` dosyası Supabase SQL Editor'da bir kez çalıştırılır.

## Android uygulaması

**İndir:** https://github.com/Mihrali47/jetgel/releases/download/android-son/jetgel.apk

- `uygulama/` klasöründe Capacitor ile yapılmış bir Android uygulaması vardır. Uygulama canlı siteyi içeriden açar; **site güncellemeleri uygulamaya kendiliğinden gelir**, yeniden kurmak gerekmez.
- `uygulama/` altında bir değişiklik yapılıp `main`'e gönderildiğinde GitHub Actions (`.github/workflows/android.yml`) APK'yı derler ve yukarıdaki linke yükler.
- Uygulamanın tarayıcıdan farkları (yerel eklenti `JetgelNative`):
  - Aramada **ahize/hoparlör** seçimi (varsayılan ahize; kulaklık takılıysa kulaklık)
  - **Ekran kilitliyken** çalan arama (tam ekran, zil sesi) ve sipariş/teklif bildirimleri
  - İşletme açıkken / kurye çevrimiçiyken çalışan **ön plan servisi**: uygulama arka planda kapanmaz
  - Kuryede **arka planda GPS**
  - Pil kısıtlamasını kaldırma kısayolu
- Uygulama içinde sayfanın üstünde **📱 Uygulama** etiketi görünür.
- Prototip imzası: APK depodaki test anahtarıyla imzalanır (`uygulama/android/app/jetgel-test.keystore`). Play Store'a çıkmadan önce gizli, gerçek bir anahtarla değiştirilmelidir.
- iPhone uygulaması yoktur (Apple geliştirici hesabı ve Mac gerekir); iPhone kullanıcıları siteyi kullanır.

## Sesli arama hakkında

- Ses doğrudan iki telefon arasında akar (WebRTC). Bağlantı bilgisi veritabanındaki arama kaydı üzerinden değiş tokuş edilir.
- Aranan kişinin uygulaması açık olmalıdır (arka planda açık sekme de olur).
- İlk aramada mikrofon izni istenir.
- Bazı ağlarda (mobil veri, bazı modemler) telefonlar doğrudan bağlanamaz; sesi bir aktarma sunucusu (TURN) taşımalıdır. TURN bilgisi **Yönetim → Ayarlar → Sesli arama** alanına yapıştırılır (Metered Open Relay: ücretsiz 20 GB/ay). Tüm telefonlar otomatik kullanır.
- Telefon gelen sesi otomatik çalmazsa arama ekranında **🔊 Sesi aç** butonu çıkar.
- **Ahize/hoparlör:** Tarayıcılar sesin ahizeden çalmasını seçtirmez (ses hoparlörden gelir). **Android uygulamasında** arama ekranındaki butonla ahize/hoparlör seçilir.
- Her aramanın bağlantı teşhisi (doğrudan / aktarma / bağlanamadı ve aday türleri) **Yönetim → Aramalar** sekmesinde görünür.
- Ses bağlanmasa bile çalma, kayıt ve ikaz kuralı çalışır.

## Kurallar

| Konu | Kural |
|---|---|
| Ücret | Müşteri 50 + 5 TL, işletme 50 + 5 TL öder. Kuryeye 100 TL, platforma 10 TL. İşletme isterse müşterinin payını üstlenir. |
| Bahşiş | İsteğe bağlı; sepette ya da teslimattan sonra (bir kez) verilir. Tamamı kuryeye gider, kesinti yapılmaz. Üst sınır 500 TL. |
| Hızlı teslimat | İsteğe bağlı +25 TL. İşletme siparişi öne alır (listede üstte, kırmızı etiket), kurye teklif süresi 15 sn'ye iner. Hedef 5-10 dk daha erken; ücretin tamamı kuryeye. Gerekçe: kuryeye giden her ek ücret daha çok kurye, daha hızlı teslimat ve memnun işletme demek. |
| Hazırlık süresi | İşletmeye sorulmaz. Sistem hesaplar: işletmenin son 10 siparişteki gerçek ortalaması (en az 3 sipariş yoksa türüne göre başlangıç: yemek 12, market 7, kahve/tatlı 6 dk) + şu an hazırlanan her sipariş için 3 dk; 5-45 dk arası. Müşterinin gördüğü tahmini süre de buna göre değişir. |
| Puanlama | Teslim edilen siparişte müşteri işletmeyi ve kuryeyi 1-5 puanlar (bir kez, isteğe bağlı yorum). Kartlarda sadece gerçek ortalama gösterilir; 3'ten az değerlendirmede "Yeni" yazar. Kurye puanı cezaya dönüşmez. |
| Sorun bildirimi ve iade | Müşteri teslimattan sonra 24 saat içinde, siparişte bir kez eksik/yanlış/bozuk/soğuk ürünü fotoğrafla bildirebilir. İşletme onaylarsa iade işletme payından yapılır. İşletme reddederse müşteri yönetime itiraz eder; son kararı yönetim verir. |
| Sadakat kartı | İşletme isterse açar: her N. teslim edilmiş siparişte X TL indirim, işletmenin payından. Müşteri ilerlemesini menüde görür; indirim sepette kendiliğinden uygulanır. |
| Hazır mesajlar | Sipariş içinde müşteri, işletme ve kurye sadece hazır mesajlarla yazışır (serbest metin yok). |
| İleri saatli sipariş | Müşteri 1 saat sonrasından 2 gün sonrasına kadar, işletmenin çalışma saatlerindeki bir saati seçer. Sipariş, teslim saatinden 45 dk önce işletmeye düşer; o zamana kadar işletmede "Planlı" görünür. |
| Sıralama | "Önerilen" sıralama sadece hizmet kalitesine göre: puan, hız, ikaz almamak (aramaya dönmek), Mahallenin Yıldızı, müşterinin favorileri ve mesafe. **Kampanyaya katılmak ya da katılmamak sıralamayı etkilemez** (1 Nisan 2026 Ticaret Bakanlığı düzenlemesi görünürlük cezasını yasaklar). Kampanyaya katılan işletmeler kuponu olan müşteriye "Kupon geçerli" filtresi ve etiketiyle gösterilir. |
| Mahallenin Yıldızı | Son 7 günde en çok teslim eden, puanı 4,3 ve üzeri (en az 3 değerlendirme) işletme rozet alır ve önerilen sıralamada öne çıkar. |
| Mahalle yarışı | Haftalık (pazartesi-pazar). Mahalle müşterinin konumundan bulunur (OpenStreetMap). Sadece teslim edilmiş, en az 150 TL'lik siparişler sayılır; aynı müşteri-işletme için günde 1 sipariş. İsimler baş harfle gizlenir. Haftanın birincisi "Mahalle Başkanı" olur ve 1000 TL kupon kazanır (30 gün geçerli, siparişte en fazla 100 TL). Kuponu **esnaf karşılar**: sadece kampanyaya kendi isteğiyle katılan işletmelerde geçerlidir, indirim o siparişin işletme payından düşer (zorunlu kampanya yok). Aynı kişi 28 gün içinde ikinci kez başkan olamaz. Reddedilen siparişte kupon bakiyesi geri yüklenir. |
| Komisyon | Yok. Sipariş tutarı ne olursa olsun teslimat ücreti sabittir. |
| Ödeme | Para platformun hesabına uğramaz (lisanslı ödeme kuruluşunun alt üye işyeri modeli varsayılır). Siparişte kartta blokaj → işletme onayında çekim → teslimata kadar bekletme → teslimde otomatik bölüştürme (işletme, kurye, platform). Reddedilen siparişte blokaj kalkar, para çekilmez. |
| Kurye atama | İşletme onaylayınca 3 km içindeki en yakın, boşta ve bildirimi açık kuryeye teklif gider. 30 sn içinde yanıt yoksa ya da reddederse sıradakine geçer. Reddetmenin cezası yoktur. |
| Navigasyon | Gerçek yol rotası ve Türkçe adım adım tarif; kalan mesafe ve süre. Rota alınamazsa düz çizgi yedeği kullanılır. |
| Teslimat onayı | Serbest "teslim edildi" butonu yoktur. Müşterinin 4 haneli kodu veya QR'ı gerekir. Kod yalnızca kurye adrese 100 m'den yakınken kabul edilir. İsteğe bağlı teslimat fotoğrafı. Paket alımı fiş QR'ı ile doğrulanır. |
| Müşteriye ulaşılamazsa | Kurye uygulamadan arar ve 10 dk bekler; sonra sipariş kapanır. İade yapılmaz; kurye ve işletme ücretini alır. |
| Arama | İnternet üzerinden, numaralar gizli, yalnızca aktif sipariş varken. Her arama kayıt altındadır. |
| İkaz | İşletme müşteri aramasını açmaz ve 5 dk içinde geri aramazsa ikaz alır; müşteriye siparişin %15'i işletme payından iade edilir. 3 ikazda askıya alma. İkazlar 90 günde silinir, itiraz hakkı vardır. Bir siparişte en fazla bir ikaz ve bir iade uygulanır (tekrarlanan aramalar cezayı katlamaz). |
| Bildirim | Kurye ve işletme için zorunlu, müşteri için önerilir. |

## Dosyalar

| Yol | Ne |
|---|---|
| `index.html` | Müşteriye dönük ana sayfa (adres arama, kategoriler, işletme ve kurye başvurusu) |
| `demo.html` | Test ve demo sayfası: tüm roller, test hesapları, APK ve kurulum notları |
| `musteri.html`, `isletme.html`, `kurye.html`, `yonetim.html` | Rol uygulamaları |
| `simulasyon.html` | Tek ekranda simülasyon (eski `index.html`) |
| `app/core.js` | Ortak çekirdek: veri katmanı, iş kuralları, kurye atama, navigasyon, sesli arama, uyarılar, harita |
| `app/app.css` | Ortak görünüm |
| `app/config.js` | Supabase bağlantı bilgisi (sadece URL ve publishable key) ve arama sunucuları |
| `supabase/kurulum.sql` | Veritabanı kurulum betiği |
| `manifest-*.webmanifest`, `sw.js`, `ikonlar/` | Telefona yüklenebilir uygulama (PWA) |
| `vendor/` | Leaflet ve Supabase kütüphanelerinin yerel kopyaları |
| `sablonlar/` | Toplu ürün yükleme Excel şablonu |
| `GELISTIRME.md` | Geliştirme kuralları ve teknik notlar |

> **Geliştirmeye başlamadan önce** `GELISTIRME.md` ve bu dosyayı okuyun. Aynı anda tek kişi çalışsın.

## Teknik notlar

- **Harita:** OpenStreetMap verisi, CARTO harita karoları.
- **Rota:** OSRM'nin herkese açık demo sunucusu (`router.project-osrm.org`). Bu sunucu sadece deneme amaçlıdır; gerçek kullanıma geçmeden önce kendi OSRM sunucumuzu kurmamız ya da ücretli bir servis (Google Maps, Mapbox, HERE vb.) kullanmamız gerekir.
- Harita karoları veya rota servisi erişilemezse sistem otomatik olarak şematik haritaya ve düz çizgi rotasına geçer.

## Yol haritası

- [ ] İsmi kesinleştirmek
- [ ] İlk semti seçmek
- [ ] Yoğun saatlerde aynı yöndeki siparişleri tek kuryeye birleştirme
- [x] Müşteri uygulamasının yeni tasarımı (Trendyol Go / Yemeksepeti düzeni, kendi renklerimizle)
- [x] Kurye ve işletme ekranlarının yeni tasarımı
- [x] Yönetim panelinin yeni tasarımı, işletme başvuru ve onay akışı, iade itirazları
- [x] Yasal metin taslakları (avukat kontrolü bekliyor)
- [x] Şifreler düz metin yerine özetle (SHA-256) saklanıyor; gerçek güvenlik için Supabase Auth + RLS hâlâ gerekli
- [x] Ürün seçenekleri (ekstra malzeme, çıkarılacak malzeme, yarım porsiyon; ek ücretli ya da ücretsiz)
- [x] Bahşiş ve hızlı teslimat (tamamı kuryeye)
- [x] Excel ile toplu ürün yükleme (işletme → Menü → "Excel'den toplu ürün yükle"; .xlsx ve .csv, önizleme, aynı isimli ürünleri günceller)
- [ ] Gerçek ödeme altyapısı (alt üye işyeri modeli; PayTR, iyzico vb. ile görüşme)
- [x] Uygulama içi gerçek sesli arama (WebRTC)
- [ ] Mobil veride arama için TURN sunucusu
- [x] Telefonlar arası çalışan prototip (Supabase) ve telefona yüklenebilir sürüm (PWA)
- [ ] Kullanıcı girişi ve veritabanı güvenlik kuralları (gerçek kullanımdan önce şart)
- [ ] Uygulama kapalıyken bildirim (push) için sunucu tarafı
- [x] Android uygulaması (APK): ahize/hoparlör, kilitli ekranda çalan arama ve bildirim, arka plan GPS
- [ ] Play Store'a çıkış (gerçek imza anahtarı, gizlilik politikası, mağaza kaydı)
- [ ] Uygulama tamamen kapalıyken bile bildirim için sunucu taraflı push (FCM)
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

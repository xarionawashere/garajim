<div align="center">
  <img src="icon.png" alt="Garajım uygulama simgesi" width="116" />
  <h1>Garajım</h1>
  <p><strong>Aracının dijital garajı. Sürüşün bileğinde.</strong></p>
  <p>Araç bilgilerini, bakım ve masraflarını, GPS sürüşlerini ve Wear OS kontrollerini tek yerde tut. Garajım Studio ile sıradaki araç projen için planını oluştur.</p>
  <p><strong>Android</strong> · <strong>Wear OS</strong> · <strong>Türkçe</strong> · <strong>Yerel veri odaklı</strong></p>
</div>

---

Garajım, araç sahipliğinin günlük işlerini daha düzenli hâle getirmek için tasarlanmış kişisel araç ve sürüş uygulamasıdır. Garajını oluştur, bakım tarihlerini takip et, yakıt ve masraflarını kaydet, GPS sürüşlerini incele; uyumlu Wear OS saatin varsa temel sürüş kontrollerine bileğinden ulaş.

**Kaynak sürümü: 1.4.6.** Bu depo Android telefon uygulamasını ve ayrı Wear OS uygulamasını üretmek için gereken kaynakları içerir. Telefon ve saat paketleri aynı sürüm numarasıyla üretilir. Etiketli bir sürümün test ve imzalı derleme adımları başarılı olursa iki APK, GitHub Releases sayfasında kalıcı indirme dosyaları olarak yayımlanır.

## Garajım ile neler yapabilirsin?

### Araçlarını tek yerde yönet

Birden fazla araç için plaka, marka, model, yıl, kilometre, fotoğraf, renk, yakıt türü ve not bilgilerini tut. Garaj listende araç ara; bir aracın bakım, yakıt, servis ve masraf geçmişine kendi profilinden ulaş.

Bakım planına periyodik servis, muayene, trafik sigortası, kasko ve mevsimlik lastik bilgilerini ekle. Tarih veya kilometre yaklaştığında uygulamadaki durum ve hatırlatma ekranlarını kullan.

### Yakıtı ve araç masraflarını görünür kıl

Yakıt dolumlarını litre, tutar, tarih, kilometre ve depo dolumu bilgileriyle kaydet. Servis ve diğer harcamaları kategorilere ayır; zaman içindeki toplamları, yakıt tüketimini ve kilometre başına maliyeti grafiklerde incele. Uygulamadaki sağlık skoru ve maliyet tahminleri kayıtlarından hesaplanan yardımcı göstergelerdir.

Fiş fotoğrafından veya kilometre sayacı görüntüsünden OCR ile veri okunması denenebilir. Okunan değerler kaydedilmeden önce senin kontrolüne sunulur; sonucu gözden geçirip düzeltmen gerekir.

### Gerçek sürüşlerini kaydet

Açık Dünya, telefonun GPS/konum verisiyle sürüş rotanı ve ölçümlerini kaydeder:

- Anlık, ortalama ve en yüksek hız
- Mesafe ve geçen süre
- Harita üzerinde rota ve mevcut konum
- Kullanıcı tarafından belirlenen hız limiti uyarıları
- Sürüş özeti, geçmiş, rota tekrar oynatma ve GPX dışa aktarma
- Sürüş karşılaştırması, haftalık kilometre hedefi, yol işaretleri ve Sürüş DNA profilleri

Sürüş puanı ve DNA, uygulamanın topladığı GPS örneklerinden üretilen kişisel eğilim göstergeleridir; profesyonel sürüş değerlendirmesi veya araç teşhisi değildir.

### Navigasyon ve park yerini kullan

Adres veya yer ara, rota seçeneklerini karşılaştır, sıradaki manevraya kalan mesafeyi ve tahmini varış zamanını gör. Navigasyon, sesli yönlendirme ve rota dışına çıkıldığında yeniden rota hesaplama akışlarını içerir. Hedefini Google Haritalar'da açmayı da seçebilirsin.

Park yerini kaydet; daha sonra araçla arandaki yaklaşık mesafeyi ve yönü gör. Park konumuna yaya tarifi için harita uygulamasını aç.

### Wear OS ile sürüşe bileğinden ulaş

Galaxy Watch ve uyumlu Wear OS saatleri için ayrı bir saat uygulaması bulunur. Telefonda Wear OS/Galaxy Wearable üzerinden eşleştirme yaptıktan sonra saatten:

- Kayıtlı araçları görüntüleyip araç seç
- Sürüşü başlat, duraklat, devam ettir veya bitir
- Sürüş ölçümlerini ve özetini gör; uygun akışta kaydetme, silme veya sonra kararını ver
- Hız, GPS ve telefon bağlantısı durumlarını takip et
- Hızlı kilometre/yakıt kaydı, park bilgisi ve müzik kontrollerine eriş
- Navigasyon sırasında sıradaki yönü, manevraya kalan mesafeyi, hedefi ve rota önizlemesini görüntüle

Wear OS mini haritası düşük kaynak kullanımı için rota çizgisini şematik bir arka planda gösterir; sokak adları veya tam sokak haritası sunmaz. Saat, telefonla bağlı olmalı ve gerekli izinler verilmelidir.

### Garajım Studio ile araç projesi planla

Studio'yu kayıtlı bir aracından başlatabilir veya plaka zorunluluğu olmadan bağımsız bir araç profili oluşturabilirsin. Araç fotoğrafını referans olarak ekle, renk varyantlarını genel otomobil maketi üzerinde karşılaştır, modifikasyon fikirlerini listele ve manuel bütçe oluştur.

Parça veya iş kalemlerine ürün adı, marka/kod, kullanıcı tarafından girilen fiyat ve planlandı/sipariş edildi/takıldı durumu ekle. Proje günlüğünde notlarını sakla; özeti paylaş veya projeyi JSON olarak dışa aktar.

Studio, gerçek fotoğrafı otomatik olarak boyamaz ve parçaların araca uyumluluğunu kendiliğinden doğrulamaz. Fiyat ve uyumluluk bilgileri kullanıcı tarafından girilir; teknik uygunluğu satın almadan önce ayrıca kontrol et.

### İlerlemeni takip et, uygulamayı kendine göre düzenle

- **53 başarım rozeti ve 8 Sürüş DNA profili:** Garaj, bakım, yakıt, kilometre, yedekleme, ilk kayıt ve ilk logo değişimi gibi hedeflerdeki ilerlemeni izle.
- **24 tema paketi:** Koyu/açık görünüm ve Wear OS ile eşitlenen renk seçenekleri.
- **15 ek uygulama simgesi:** Özgün Garajım simgesini koruyarak telefon başlatıcısında seçilebilir alternatifler sunar.
- **Android ana ekran widget'ları:** Garajım Kartı (araç listesi ve kilometreler), Bakım Takibi, Yakıt & KM, Rozet Koleksiyonu ve hızlı işlem widget'ı.
- **Hatırlatmalar:** Uygulamaya girilmiş bakım ve belge bilgileri için bildirim akışlarını kullan.
- **Raporlar:** Araç veya genel PDF raporu; masraflar için CSV; desteklenen veriler için JSON yedeği ve sürüş rotası için GPX.
- **Garajım'ı Keşfet:** İlk kullanım turu ve uygulama içinden tekrar açılabilen kısa öneriler.

Sosyal alan, bu kaynak sürümünde cihaz içi bir akıştır. Bu özellik, gönderileri başka kullanıcıların cihazlarına ulaştıran veya hesaplar arasında senkronize eden merkezi bir sosyal ağ değildir.

## Verilerin ve gizliliğin

Garajım, kişisel araç verilerini öncelikle cihazındaki uygulama depolamasında tutar. Bu depoda tüm kullanıcı kayıtlarını saklayan bir Garajım hesabı veya merkezi araç veritabanı tanımlı değildir. Android widget'ı, sürüş servisi ve telefon–saat eşitlemesi için bazı bilgiler Android'in yerel depolama alanlarında da tutulur.

- **Manuel JSON yedeği**, desteklenen araç, sürüş, park, ayar ve Studio verilerini dışa aktarabilir. Fotoğraflar yedeğin boyutunu büyütebilir.
- **Otomatik yerel yedek**, aynı cihazda yalnızca araç listesinin son kopyalarını saklar; tam yedek veya bulut yedeği değildir.
- PIN, uygulama açılışında ek bir kilit ekranıdır; cihazdaki dosyaları şifrelemez.
- Adres arama ve internet üzerinden rota hesaplama için Nominatim/OSRM gibi dış servisler kullanılır. Harita katmanları da ilgili sağlayıcılardan yüklenebilir; bu isteklerde ağ sağlayıcıları IP adresini ve istenen konum/harita bilgisini görebilir.
- Wear OS bağlantısı Android ve Google Play Services eşleştirme altyapısını kullanır.

Yedekleme kapsamı dışa aktarma türüne göre değişir. Telefonu değiştirmeden, uygulama verilerini temizlemeden veya uygulamayı kaldırmadan önce manuel yedek al ve dosyayı cihaz dışında güvenli bir yere kopyala.

## Bilmen gerekenler

Garajım araç yönetimi ve sürüş kaydı için yardımcı bir uygulamadır; araç elektronik kontrol ünitesine/OBD-II sistemine bağlanmaz. Hız ve konum değerleri GPS kalitesine, cihaza ve çevre koşullarına bağlıdır. Navigasyon için internet gerekir; canlı trafik bilgisi sunulmaz. Harita ve rota sağlayıcılarının herkese açık uç noktaları hizmet garantisi vermez.

Arka plan konum takibi Android izinlerine, GPS'in açık olmasına, görünür servis bildirimine ve cihazın pil yönetimine bağlıdır. Telefon uygulamasını zorla durdurmak arka plan servislerini durdurabilir. Bildirim zamanlaması üretici ve Android pil politikalarına göre değişebilir. Sürüş sırasında telefonu veya saati kullanmak yerine işlemleri araç dururken yap.

## Telefon ve saat APK'sını indir

Yayımlanmış sürümleri [GitHub Releases sayfasında](https://github.com/xarionawashere/garajim/releases) bulabilirsin. Bir sürümün dosyalarında telefon ve saat için ayrı APK ile `SHA256SUMS.txt` özeti yer alır. İndirdiğin APK'yı Android'de açıp sistemin istediği bilinmeyen kaynak yükleme iznini vererek kurabilirsin.

Wear OS APK'sı, telefondaki APK gibi GitHub sayfasına tıklayarak saate kurulmaz. Önce telefonu saatinle Wear OS veya Galaxy Wearable üzerinden eşleştir; sonra APK'yı saate aktaran uyumlu bir kurucu ya da ADB kullan. Bu yöntem teknik adımlar ve ek izin gerektirebilir; Play Store'un uzaktan kurulum rahatlığını sağlamaz. İki APK'yı aynı sürümden indir. Bu depo Google Play indirme bağlantısı sağlamaz.

Henüz bir Release yayımlanmamışsa, geliştiriciler [Actions](https://github.com/xarionawashere/garajim/actions/workflows/build-apk.yml) sayfasındaki en güncel başarılı çalıştırmanın süreli Artifacts dosyalarını kullanabilir. Bunlar genel kullanıcılar için kalıcı sürüm indirme yöntemi değildir.

Güncelleme sırasında imza uyumsuzluğu görürsen uygulamayı kaldırmadan önce dur. Telefon uygulamasını kaldırmak yerel verileri silebilir. Güncelleme rehberleri: [Telefon kurulumu](docs/guides/TELEFONDAN-KURULUM.txt) · [Wear OS kurulumu](docs/guides/SAAT-KURULUM.txt) · [GitHub Actions ile APK üretimi](docs/guides/GITHUB-ACTIONS-TELEFON-WEAROS.txt).

## Geliştirici kurulumu

### Gereksinimler

- Node.js 20 ve npm
- Java 17
- Yerel Android derlemesi için Android SDK ve Gradle
- Wear OS testleri için eşleştirilmiş uyumlu bir Android telefon ve Wear OS cihazı

### Web paketi ve kaynak kontrolleri

Depo kökünde sırasıyla çalıştır:

<pre><code>npm install --no-audit --no-fund
npm run build:web
npm test</code></pre>

GitHub Actions bağımlılıkları kurar, yerel web paketini oluşturur ve otomatik kontrolleri çalıştırır. Başarısız testte APK adımlarına geçilmez. Normal derlemeler iki APK'yı süreli Actions Artifacts olarak sunar. `vMAJOR.MINOR.PATCH` etiketi ise testler ve imzalı Android derlemesi başarılı olduktan sonra iki APK'yı SHA-256 özetiyle GitHub Release'e yükler. Telefon ve saat `versionCode`/`versionName` değerleri aynı sürümden üretilir. Kaynak testleri gerçek cihaz GPS'i, izinleri, pil davranışını ve ekran kullanımını doğrulamaz.

### Kaynak yapısı

| Alan | İçerik |
|---|---|
| index.html, src/js/ | Telefon arayüzü ve garaj, bakım, yedekleme, sürüş, navigasyon, Studio ve başarım özellikleri |
| native-android/ | Capacitor Android köprüsü, sürüş foreground servisi, medya kontrolü, widget, hatırlatma ve Wear OS bağlantısı |
| native-wear/ | Wear OS arayüzü, sürüş kontrolleri ve mini rota çizimi |
| build-web.js | Web kaynaklarını derlemeye ve gerekli arayüz kütüphanelerini yerel pakete koymaya hazırlar |
| package.json | Doğrudan uygulama bağımlılıklarını tanımlar |
| scripts/ci-version.py | Telefon ve Wear OS APK sürüm numaralarını tek kaynaktan üretir |
| .github/workflows/build-apk.yml | Testleri çalıştırır, telefon ve Wear OS sürümlerini eşitler, iki APK'yı derler ve etiketli sürümlerde GitHub Release yayımlar |
| tests/ | Kaynak ve özellik sözleşmelerine yönelik otomatik kontroller |

Sürümlere göre değişiklikler için [CHANGELOG.md](CHANGELOG.md), kurulum ve geliştirme notları için [belge dizinini](docs/README.md) incele.

## Proje ve dağıtım

Bu depo kaynak kodu sunar. Kök dizinde şu anda bir LICENSE dosyası bulunmadığından, kodu yeniden dağıtma veya ticari kullanım koşullarını otomatik olarak varsayma; kullanım izni ve lisans durumu ayrıca açıklığa kavuşturulmalıdır.

<div align="center">
  <sub>Garajım · Araçlarını düzenle, sürüşlerini kaydet, projelerini planla.</sub>
</div>


<div align="center">
  <img src="icon.png" alt="Garajım uygulama logosu" width="132" />
  <h1>Garajım</h1>
  <p><strong>Aracının dijital garajı. Sürüşün bileğinde.</strong></p>
  <p>Araçlarını, bakım takvimini, yakıt ve masraflarını, GPS sürüşlerini ve akıllı saat kontrollerini tek bir deneyimde birleştiren kişisel araç yönetim uygulaması.</p>
  <p>
    <strong>Android</strong> · <strong>Capacitor</strong> · <strong>Wear OS</strong> · <strong>GPS sürüş takibi</strong>
  </p>
</div>

---

## Garajım nedir?

Garajım, araç sahiplerinin günlük araç yönetimini tek yerde toplamak için tasarlanmış bir uygulamadır. Araç ve plaka bilgilerini kaydetmekle başlayabilir; muayene ve sigorta tarihlerini takip edebilir, yakıt fişlerini işleyebilir, bakım masraflarını karşılaştırabilir ve gerçek sürüşlerini GPS üzerinden kaydedebilirsin. Uyumlu bir Wear OS saatiyle sürüşün temel kontrollerini bileğinden yönetmek de mümkün.

Garajım'ın yaklaşımı basit: **daha düzenli araç kayıtları, daha görünür maliyetler ve sürüş sırasında daha erişilebilir kontroller.** Büyük ekranlı telefon arayüzü ayrıntılı yönetim için, Galaxy Watch gibi yuvarlak ekranlı saatler ise hızlı sürüş işlemleri için tasarlanmıştır.

> Garajım bir OBD-II/araç ECU okuyucusu değildir. Hız ve rota bilgisi cihazın GPS/konum verisine dayanır; doğruluk GPS sinyaline, cihaza ve çevre koşullarına göre değişebilir.

## Öne çıkanlar

- **Dijital garaj:** Birden fazla araç için plaka, marka, model, yıl, kilometre, fotoğraf, araç tipi ve notlar.
- **Bakım ve resmi tarihler:** Periyodik bakım, muayene, trafik sigortası, kasko ve mevsimlik lastik kayıtları.
- **Yakıt ve masraf takibi:** Yakıt dolumları, litre/tutar/km bilgileri, servis kayıtları, harcama kategorileri ve maliyet grafikleri.
- **Fiş ve kilometre OCR:** Kamera veya galeriden alınan görsellerden veri okumayı dener; kullanıcı kaydetmeden önce sonucu kontrol eder.
- **Açık Dünya sürüşü:** GPS rotası, hız, mesafe, süre, ortalama/maksimum hız, sürüş geçmişi ve rota tekrarı.
- **Navigasyon ve park yeri:** Adres arama, rota yönergeleri, kayıtlı park konumu ve yön/mesafe bilgisi.
- **Wear OS kontrolü:** Saatten araç seçme, sürüşü başlatma/duraklatma/devam ettirme/bitirme ve sürüş özetini yönetme.
- **Kişiselleştirme:** 12 renk teması, karanlık/açık görünüm, dört haneli uygulama PIN'i ve ana ekran widget'ı.
- **Dışa aktarma:** JSON yedekleme/geri yükleme, CSV masraf çıktısı, PDF raporları ve sürüş rotası için GPX çıktısı.
- **İsteğe bağlı yapay zekâ asistanı:** Kullanıcının kendi Gemini veya OpenAI API anahtarıyla çalışır.

## Özellikler ayrıntılı olarak

### 1. Araç profilleri ve dijital garaj

Her araç için aşağıdaki bilgileri bir arada tutabilirsin:

- Plaka, marka, model, yıl, renk, araç tipi ve fotoğraf.
- Güncel kilometre ve notlar.
- Yakıt türü ve referans tüketim bilgisi.
- Muayene, trafik sigortası ve kasko bitiş tarihleri.
- Son bakım, sonraki bakım kilometresi ve bakım aralığı.
- Kış, yaz ve dört mevsim lastiklerinin tarih, marka/ebat ve diş derinliği bilgileri.
- Araca bağlı yakıt, servis, bakım ve diğer maliyet kayıtları.

Garaj listesinde plaka/marka/model/renk üzerinden arama, uyarısı olan araçları filtreleme ve bu ay masraf kaydı bulunan araçları görüntüleme bulunur. Araç detayında kilometre, bakım durumu, masraf ve yakıt bilgileri bir araya getirilir.

### 2. Bakım takvimi ve maliyet görünümü

Garajım, girilmiş tarih ve kilometre bilgilerine göre yaklaşan veya geçmiş bakım kalemlerini işaretler. Bakım planında şu başlıklar desteklenir:

- Periyodik bakım
- Muayene
- Trafik sigortası ve kasko
- Kış, yaz ve dört mevsim lastik kontrolleri

Bakım/masraf kategorileri arasında periyodik bakım, onarım/yedek parça, lastik/jant, yakıt, vergi/resmî gider, otopark/garaj, otoyol/geçiş, aksesuar, trafik cezası, finansman, hasar, sürücü/işletme, sigorta/kasko ve diğer kalemler bulunur.

Uygulamadaki **araç sağlık skoru**, **90 günlük maliyet tahmini**, kilometre başına maliyet ve yakıt tüketimi gibi göstergeler girilmiş kayıtlar üzerinden hesaplanan yardımcı tahminlerdir. Bunlar servis teşhisi, muhasebe kaydı veya gelecekteki giderlerin garantili tahmini değildir; kayıt kalitesi arttıkça anlamlılıkları da artar.

### 3. Yakıt ve fiş okuma

Yakıt kaydında tarih, kilometre, litre, toplam tutar ve depo dolumu bilgisi tutulur. Birden fazla uygun dolum kaydı olduğunda ortalama tüketim ve yakıt maliyeti hesapları üretilebilir.

Fiş fotoğrafı kameradan çekilebilir veya galeriden seçilebilir. OCR, fişteki litre/tutar ve algılanabilen bazı ek bilgileri otomatik doldurmayı dener. **OCR sonucu kesin kabul edilmez:** kaydetmeden önce alanları kontrol edip düzeltmek gerekir.

Kilometre güncelleme, servis kaydı ve yakıt kaydı akışlarında kilometre sayacı fotoğrafından sayı okumayı deneme seçeneği de bulunur. Okunan değeri kullanıcı onaylar; sistem sayacı görür görmez otomatik olarak kaydetmez.

### 4. Açık Dünya: GPS ile sürüş kaydı

Açık Dünya bölümü, sürüş sırasında telefonun konum verisini kullanarak rota ve sürüş ölçümlerini kaydeder. Ekranda şu bilgiler sunulur:

- Anlık GPS hızı, ortalama hız ve en yüksek hız.
- Mesafe ve geçen süre.
- Harita üzerinde izlenen rota ve mevcut konum.
- Kullanıcı tarafından belirlenen hız limiti için uyarılar.
- Kayıtlı sürüş geçmişi ve sürüş özeti.
- Rota tekrar oynatma: 1×, 2×, 4× ve zaman verisi uygunsa gerçek zaman hız seçeneği.
- GPX olarak rota dışa aktarma, harita bağlantısı açma ve sürüş kartı oluşturma.
- Sürüş skoru, rozetler, yol hikâyeleri ve önceki benzer sürüşü “hayalet” olarak karşılaştırma.
- Haftalık kilometre hedefi, harita işaretleri ve sürüş görünümü ayarları.

Sürüş skoru ve “Sürüş DNA” gibi özetler GPS örneklerinden türetilen eğlence/analiz göstergeleridir; profesyonel sürüş değerlendirmesi değildir.

#### Harita ve çevrimdışı kullanım

Telefon haritasında OpenStreetMap ve Esri taban katmanları bulunur. Görünen alanın bir bölümü çevrimdışı önbelleğe alınabilir; uygulama ayrıca daha önce yüklenmiş bazı harita karelerini saklar. Bu özellik sınırsız bir çevrimdışı harita indirme hizmeti değildir.

- GPS kayıt mantığı ve yerel sürüş kayıtları cihazda çalışacak şekilde tasarlanmıştır.
- Çevrimdışı harita görünümü yalnızca daha önce önbelleğe alınmış alanlarla sınırlıdır.
- Adres arama, çevrimiçi rota hesaplama ve navigasyon için internet gerekir.
- Trafik yoğunluğu verisi sunulmaz.

### 5. Navigasyon ve park yeri

Navigasyon ekranı adres/yer arama, rota seçenekleri, dönüş mesafesi, tahmini varış saati ve sesli yönerge özellikleri içerir. Yeniden rota hesaplama da bulunur. Adres ve rota hizmetleri kodda OpenStreetMap Nominatim ve OSRM'in herkese açık uç noktalarına bağlanır; internet gerektirir ve canlı trafik bilgisi sağlamaz. İstenirse Google Haritalar'da yön tarifi açılabilir.

Park yeri özelliği mevcut konumu kaydederek daha sonra uzaklık/yön bilgisini gösterir ve harita uygulamasında yürüyüş yön tarifi açabilir.

### 6. Galaxy Watch / Wear OS

Wear OS uygulaması, telefon arayüzünün küçük bir kopyası değil, sürüş sırasında hızlı erişim için ayrı bir kontrol ekranıdır. Güncel projede şu işlevler bulunur:

- Telefonda kayıtlı araçları ve plakaları saat ekranından seçme.
- Saatten sürüş başlatma, duraklatma, devam ettirme ve bitirme isteği gönderme.
- Kısa sürüş onayını ve sürüş sonu özetini saat ekranında görüntüleme.
- Uygun akışta özeti kaydetme, silme veya daha sonra karar verme.
- Anlık hız ve sürüş ölçümlerini gösterme.
- Hız uyarıları ve titreşim geri bildirimi.
- Müzik kontrolü ve kayıtlı park yeri için özet bilgi.
- Mini rota haritası: başlangıç ve mevcut konum farklı işaretlenir; telefon rotasından en fazla 24 örnek nokta aktarılır.
- Telefon bağlantısı, GPS hazırlığı ve veri güncelliği için durum göstergeleri.

**Mini harita tam sokak haritası veya navigasyon değildir.** Saatte düşük kaynak kullanımı için çizilen şematik yol dokusu üzerinde gerçek GPS rotasının yaklaşık şekli gösterilir; sokak adı ve kavşak verisi sunmaz.

Telefon ve saat arasında Google Play Services Wearable Data Layer kullanılır. İki cihaz için de **aynı GitHub Actions çalıştırmasından üretilen APK'ları** kullanmak önerilir. Saat komutlarının çalışması için telefon uygulamasının bir kez başlatılması, gerekli konum izinlerinin verilmesi ve sürüş/arka plan servisinin hazırlanması gerekebilir. Android'in pil optimizasyonları, üretici yazılımı, izinler ve uygulamanın zorla durdurulması arka plan davranışını etkileyebilir; her cihazda gerçek test yapılmalıdır.

### 7. Ana ekran widget'ı ve bildirimler

Android ana ekran widget'ı seçilen aracın plakasını, kilometre bilgisini ve bakım durumunu gösterebilir. Birden fazla araç varsa widget üzerinden seçimi değiştirme desteği bulunur.

Uygulama içi uyarılar, girilmiş tarih ve bakım kilometresi verilerine dayanır. Android sistem bildirimi için kullanıcı izni gerekir; günlük hatırlatma ve bildirim zamanlaması Android/üretici pil politikalarından etkilenebilir. Bildirimlerin her koşulda tam saatinde geleceği garanti edilmez.

### 8. Müzik kontrolü

Telefon tarafındaki yerel medya köprüsü, uygun aktif medya oturumundan parça adı/sanatçı/albüm bilgisini ve albüm kapağını okuyabilir; oynat/duraklat, önceki ve sonraki parça komutlarını iletebilir. Bu özellik için Android'in **Bildirim erişimi** iznini vermek gerekebilir. Erişim izni olmadan parça bilgileri eksik kalabilir; kontrol davranışı aktif medya uygulamasına göre değişir.

### 9. Yapay zekâ asistanı

Asistan bölümü iki sağlayıcı seçeneği sunar:

- Google Gemini
- OpenAI (`gpt-4o-mini` model çağrısı)

Kullanıcı kendi API anahtarını ayarlara girer. Özellik internet ve sağlayıcı hesabı/anahtarı gerektirir; kullanım ücretleri, kotalar ve sağlayıcı koşulları kullanıcıya aittir. Gemini entegrasyonunda isteğe bağlı görsel gönderimi de bulunur.

API anahtarı uygulamanın yerel web depolamasında tutulur; bu, donanım destekli güvenli kasa veya şifrelenmiş gizli depo değildir. Cihazını başkalarıyla paylaşırken dikkatli ol. Manuel JSON yedeklemesi API anahtarını ve PIN bilgisini dışarı aktarmamaya çalışır.

### 10. Temalar, PIN ve kişiselleştirme

Uygulamada karanlık/açık görünüm tercihi, dört haneli PIN ekranı ve 12 renk paketi bulunur: Klasik Koyu, Beyaz + Kırmızı, Metalik Gri, Metalik Altın, Carbon Turuncu, Okyanus, Orman, Royal Mor, Rose Gold, Kar + Mavi, Krem + Kahve ve Neon Mint.

PIN, uygulama açılışında ek bir kilit ekranı sağlar; **uygulama verilerini şifrelemez**. Telefonun kendi ekran kilidini kullanmaya devam et. PIN unutulması veya uygulamanın kaldırılması durumunda veri kurtarma için önceden alınmış dışa aktarılmış yedeğe ihtiyaç duyulabilir.

### 11. Sosyal alan

“Sosyal” bölümünde metin, fotoğraf ve araç etiketiyle paylaşım kartları oluşturma, yerel beğeni sayısını değiştirme ve kartları silme akışları bulunur. **Bu kaynak deposunda global sosyal ağ sunucusu yoktur:** paylaşımlar aynı cihazdaki yerel depoda saklanır; başka kullanıcıların cihazlarına otomatik gönderilmez ve hesaplar arası senkronizasyon yapılmaz.

## Veri, yedekleme ve gizlilik

Garajım'ın araç kayıtları ve arayüz tercihleri ağırlıklı olarak uygulamanın cihaz içindeki WebView `localStorage` alanında tutulur. Bazı Android işlevleri (widget verileri, yerel sürüş durumu, bekleyen kayıtlar ve senkronizasyon) `SharedPreferences` kullanır. Bu projede tüm kullanıcı verilerini tutan merkezi Garajım hesabı veya genel bir bulut veri tabanı bulunmaz.

### Yedekleme türleri

- **Manuel JSON yedeği:** Araçlar, kayıtlı sürüşler, park konumu, sürüş ayarları/ek verileri, güvenli tercihler ve kurtarılabilir sürüş taslağı/bekleyen özet gibi desteklenen verileri içerir. PIN ve AI API anahtarı özellikle dahil edilmez.
- **Otomatik yerel yedek:** Aynı cihazda son yedi kopyaya kadar **yalnızca araç listesini** saklar; tam yedek veya bulut yedeklemesi değildir.
- **CSV:** Masraf kayıtları için dışa aktarma.
- **PDF:** Araç raporu ve genel rapor.
- **GPX:** Sürüş rotası dışa aktarma.

Sosyal akış ve AI sohbet geçmişi mevcut manuel JSON yedeğinin parçası değildir. Otomatik yedekler uygulama verisiyle aynı cihazda tutulduğu için uygulama verileri silinirse onlar da kaybolabilir. Önemli bir güncelleme/kaldırma öncesinde JSON yedeğini indirip başka bir konuma kopyala ve gerektiğinde geri yüklemeyi test et.

### Dış servislerle veri paylaşımı

- **Harita/rota:** Harita kareleri OSM/Esri sağlayıcılarından alınabilir. Adres arama ve rota hesaplama istekleri Nominatim/OSRM uç noktalarına gider. Harita/rota kullanımında ağ sağlayıcıları IP adresi ve istenen harita/koordinat bilgilerini görebilir.
- **Yapay zekâ:** Asistan kullanılırsa yazdığın mesajlar ve desteklenen akışta gönderdiğin görsel seçtiğin Gemini/OpenAI API hizmetine iletilir. İlgili sağlayıcının gizlilik ve kullanım koşulları geçerlidir.
- **Garajım sunucusu:** Bu kaynakta tüm araç/sürüş kayıtlarını toplayan bir merkezi Garajım sunucusu veya kullanıcı hesabı altyapısı tanımlı değildir.

## İzinler ve pil kullanımı

Özelliklere göre Android aşağıdaki izinleri isteyebilir:

- Konum (yaklaşık/kesin): GPS sürüşü, rota, park konumu ve hız hesapları.
- Arka plan konumu ve foreground service: desteklenen arka plan sürüş takibi senaryoları.
- Bildirim izni: sürüş hizmeti ve hatırlatma bildirimleri.
- Kamera/fotoğraf erişimi: araç fotoğrafı, fiş OCR ve kilometre sayacı okuma.
- Bildirim erişimi: medya oturumu/parça bilgisini okuyabilmek için kullanıcı tarafından ayrıca etkinleştirilmesi gereken erişim.
- Wear OS eşleştirmesi ve Google Play Services bağlantısı: telefon ile saat arasında sürüş durumu/komut paylaşımı.

Sürüş kaydı aktif değilken GPS takibinin açık tutulması gerekmez. Sürüş sırasında ekranı sürekli açık bırakmak ile uygulamanın izin verilmiş bir arka plan servisinde çalışması aynı şey değildir. Pil kullanımı GPS sıklığına, ekran parlaklığına, harita katmanına, sinyal durumuna ve üretici güç yönetimine bağlıdır.

## Teknik mimari

Garajım, web arayüzünü Capacitor ile Android uygulamasına dönüştürür; bazı cihaz özellikleri Java ile yazılmış yerel katmanlardan sağlanır. Wear OS arayüzü ayrı bir yerel Android modülüdür.

| Yol | Sorumluluk |
|---|---|
| `index.html` | Ana Garajım arayüzü ve iş mantığı: garaj, bakım, yakıt, sürüş, navigasyon, AI ve sosyal yerel akış |
| `build-web.js` | Üçüncü taraf arayüz kütüphanelerini `www/vendor` içine kopyalar, Tailwind CSS'i derler ve CDN yollarını yerel dosyalara çevirir |
| `capacitor.config.json` | Capacitor uygulama kimliği/adı ve web çıktı klasörü |
| `native-android/src/main/java/com/garajim/app/` | Android köprüsü, sürüş foreground servisi, Wear OS senkronizasyonu, medya kontrolü, widget, bildirim ve yeniden başlatma alıcıları |
| `native-android/src/main/res/` | Widget ve Android kaynakları |
| `native-wear/` | Wear OS uygulama modülü, saat ekranı, kontroller ve `MiniRouteView` rota çizimi |
| `scripts/ci-wear-setup.py` | CI sırasında yerel Wear OS modülünü üretilen Capacitor Android projesine kopyalar ve modül ayarlarını yapar |
| `.github/workflows/build-apk.yml` | Web paketini hazırlar, testleri çalıştırır, telefon ve Wear OS APK'larını derler ve ayrı artifact olarak yükler |
| `tests/` | Sürüş, widget, yedekleme, navigasyon, medya, Wear OS iletişimi, arka plan servisleri ve mini rota için kontroller |

### Kullanılan ana teknolojiler

- HTML, CSS, JavaScript
- Capacitor 6 ve Android Java
- Wear OS yerel Activity ve Google Play Services Wearable Data Layer
- Tailwind CSS, Font Awesome, Inter
- Chart.js (grafikler)
- jsPDF ve jsPDF-AutoTable (raporlar)
- Leaflet (telefon haritaları)
- Tesseract.js ve yerel dil dosyaları (OCR)
- Capacitor Background Geolocation eklentisi

## Geliştirici kurulumu

### Gereksinimler

- Node.js 20 (CI'daki sürüm)
- npm
- Java 17 (CI'daki sürüm)
- GitHub Actions ile APK üretmek için GitHub deposu ve Actions izinleri
- Yerel Android derlemesi için Android SDK/Gradle ortamı ve Wear OS modülünü kuran CI adımlarının uygulanması

### Web paketini hazırlama ve testler

Proje kökünde çalıştır:

```bash
npm install --no-audit --no-fund
npm run build:web
npm test
```

`build-web.js`, `www/` klasörünü yeniden oluşturur. Grafik, PDF, harita arayüzü, ikon fontları, yazı tipleri ve OCR için gereken dosyaları `www/vendor/` altına yerleştirir. Bu yüzden derlenmiş uygulama, bu kütüphaneleri çalışma sırasında CDN'den indirmeye bağımlı olmayacak şekilde hazırlanır. Harita/rota sağlayıcıları ve AI API'leri gibi dış hizmetler yine internet gerektirir.

`npm test`, `tests/` altındaki test dosyalarını ayrı süreçlerde çalıştırır. Testler kaynak davranışına ve bileşen sözleşmelerine ilişkin otomatik kontrollerdir; gerçek telefon/saat testinin yerini tutmaz.

### APK'ları GitHub Actions ile üretme

Önerilen APK üretme yolu depodaki GitHub Actions iş akışıdır:

1. Kaynak değişikliklerini `main` veya `master` dalına commit/push et; iş akışı otomatik başlar. Alternatif olarak **Actions → APK Olustur → Run workflow** kullan.
2. Web bağımlılıkları yüklenir, web paketi hazırlanır ve testler çalıştırılır.
3. Capacitor Android projesi oluşturulur; `native-android` ve `native-wear` kaynakları eklenir.
4. Telefon ve saat APK'ları derlenir.
5. Aynı çalıştırmanın **Artifacts** bölümünden iki çıktıyı indir:
   - `Garajim-Mobil-APK`
   - `Garajim-WearOS-APK`

Artifact'lar iş akışında 14 gün saklanacak şekilde ayarlanmıştır. İndirirken telefon ve saat APK'larını aynı Actions çalıştırmasından almak önemlidir.

> `android/`, `www/` ve `node_modules/` klasörleri `.gitignore` içindedir; CI bunları derleme sırasında üretir. Bu nedenle depoda hazır Android Studio projesi veya APK bulunmaması normaldir.

### APK imzalama ve güncelleme

Workflow şu GitHub Actions secrets değerlerinin **tamamı** tanımlıysa release imzası kullanır:

- `KEYSTORE_BASE64`
- `KEYSTORE_PASSWORD`
- `KEY_ALIAS`
- `KEY_PASSWORD`

Eksikse debug APK üretir ve logda imza uyarısı verir. Uzun vadeli güncellemeler için aynı imza anahtarını korumak gerekir. Keystore dosyasını Git deposuna koyma; güvenli ve yedekli bir yerde sakla. İmza anahtarı kaybolursa veya değişirse Android kurulu uygulamanın üzerine güncellemeyi reddedebilir.

### Telefon ve saate yükleme

1. `Garajim-Mobil-APK` artifact'ını aç ve içindeki telefon APK'sını telefona kur.
2. `Garajim-WearOS-APK` artifact'ını aç ve içindeki saat APK'sını Galaxy Watch/uyumlu Wear OS cihaza kur.
3. Mevcut telefonu güncellerken, aynı uygulama kimliği ve imza varsa kaldırmadan güncelleme (`install -r`) kullan.
4. Güncel projede telefon ile Wear OS APK'sı Wearable Data Layer uyumu için `com.garajim.app` applicationId'sini paylaşır; eski saat paketinin kimliği `com.garajim.wear` olan kurulumlar yeni uygulamayla birlikte ayrı görünebilir. Bu eski saat paketinin bir defalık kaldırılması gerekebilir. **Telefon uygulamasını kaldırmakla karıştırma.** Telefon verilerini korumak için önce yedek al.

Örnek ADB komutları (cihaz seri numaralarını kendi `adb devices` çıktına göre değiştir):

```bash
adb devices -l
adb -s TELEFON_SERI_NO install -r app-release.apk
adb -s SAAT_SERI_NO install -r wear-release.apk
```

APK'nın adı imzalama yapılandırmasına göre `app-release.apk` / `wear-release.apk` veya debug adları olabilir. Dosya adını indirdiğin artifact içinden kontrol et.

## Bilinen sınırlar ve önemli notlar

- **Sosyal alan yereldir:** Bu repoda global akış sunucusu, kullanıcı hesabı veya cihazlar arasında sosyal paylaşım backend'i yoktur.
- **Mini harita şematiktir:** Saatte gerçek sokak haritası değil, sınırlı sayıda GPS noktasından çizilen rota önizlemesi gösterilir.
- **Navigasyonda canlı trafik yoktur:** Rota hesabı internet ve kullanılan herkese açık servislerin kullanılabilirliğine bağlıdır.
- **Hız GPS'e dayanır:** Tünellerde, kapalı alanlarda veya düşük sinyalde ölçüm yanlış/eksik olabilir; resmî araç hız göstergesinin yerine geçmez.
- **Arka plan davranışı cihazdan etkilenir:** Konum izni, bildirim izni, GPS ayarı ve pil optimizasyonları önemlidir. Android'in uygulamayı zorla durdurması hâlinde arka plan işlemleri garanti edilemez.
- **PIN şifreleme değildir:** Uygulama içi kilit, yerel veri dosyalarını şifrelemez.
- **AI anahtarı yerel depolamadadır:** Güvenli sunucu tarafı sır kasası değildir; anahtarın erişilebilir olduğu cihazı koru.
- **Yedeklerin kapsamı aynı değildir:** Manuel JSON yedeği otomatik yerel yedekten daha kapsamlıdır; ikisi de tüm verileri veya sırları içermez. Yedeğini geri yüklemeyi gerçek bir testle doğrula.
- **Sürüm bilgisi:** CI telefon APK'sının sürümünü workflow içinde, saat APK'sının sürümünü `native-wear/build.gradle` içinde belirler. `package.json` sürümü de ayrı bulunduğu için resmî yayın öncesi bu değerlerin birlikte güncellenmesi gerekir.
- **Lisans:** Bu pakette henüz kök dizinde `LICENSE` dosyası bulunmuyor. Yeniden dağıtım ve katkı koşulları yayın öncesi ayrıca belirlenmelidir.

## Güvenli kullanım

Sürüş sırasında telefonu veya saati kurcalamak yerine işlemleri araç dururken yap. GPS kaydı, sürüş skoru ve yakıt tahminleri destekleyici göstergelerdir; güvenlik, bakım ve mevzuat kararlarında tek kaynak olarak kullanılmamalıdır.

## Kısa tanıtım metni

**Garajım — Aracının dijital garajı. Sürüşün bileğinde.**

Araçlarını kaydet, bakım ve sigorta tarihlerini takip et, yakıt fişlerini incele, masraflarını analiz et ve GPS sürüşlerini haritada gör. İstatistiklerini raporla, park yerini kaybetme ve uyumlu Wear OS saatinle sürüşün temel kontrollerini bileğinden yönet. Garajım, araç sahipliğinin günlük ayrıntılarını tek bir yerde toplamayı amaçlayan kişisel araç ve sürüş asistanıdır.

---

<div align="center">
  <sub>Garajım · Araç yönetimi, sürüş kaydı ve Wear OS kontrolü tek deneyimde.</sub>
</div>

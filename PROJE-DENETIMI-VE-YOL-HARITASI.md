# Garajım — Kaynak Denetimi, Uygulanan Düzeltmeler ve Yol Haritası

**Bu pakette ele alınan hedef:** Telefon uygulamasının veri ve GPS ana merkezi olarak kalması; Galaxy Watch7'nin sürüşü kontrol edebilen bağımsız bir kumanda paneline dönüşmesi; araç/ride senkronizasyonu ve yedeklerin daha güvenilir olması.

## Uygulanan bu paket değişiklikleri

### 1. Saat komutları ve senkronizasyon
- Telefon uygulamasının çalışan WebView oturumuna gönderilecek saat komutları artık tek bir değişkende tutulmuyor. Sınırlı FIFO kuyruğu kullanılıyor; 25 saniyeden eski komutlar çalıştırılmadan atılıyor.
- Telefon/WebView oturumu hazır değilken sürüş başlat/duraklat/bitir gibi tehlikeli komutlar daha sonra kendiliğinden çalıştırılmak üzere saklanmıyor. Araç seçimi ertelemesi ayrı tutuluyor.
- `start`, `resume`, `pause`, `finish` gibi açık komutlar kullanılıyor. Tekrarlanan genel `toggle` komutunun durumu yanlışlıkla tersine çevirmesi riski azaltıldı.
- Araç listesi telefon uygulaması her veri kaydettiğinde saate gönderiliyor; 10 saniyelik Wear OS durum kalp atışı da yedek senkron yolu olarak duruyor.
- Durum gönderen taraf, son JSON'u yalnızca Google Wearable Data Layer yazımı başarıyla tamamlandıktan sonra önbelleğe alıyor. Böylece başarısız bir yazım, aynı duruma ait sonraki denemeleri gereksiz yere bastırmıyor.
- Wear OS tarafında eski zaman damgalı durumlar atılıyor; DataEventBuffer kaynakları serbest bırakılıyor.
- Saat ekranında telefon bağlantısı, GPS'in hazır olması ve telemetri verisinin güncelliği ayrı gösteriliyor. 25 saniyeden eski durum açıkça “veri eski” olarak işaretleniyor.

### 2. Saat kullanım deneyimi
- Araç değişimi aktif sürüş sırasında hem saat ekranında hem de telefon tarafındaki komut işleyicide engelleniyor.
- Yeni bir sürüş başlatılmadan önce önceki sürüşün kaydedilmeyi bekleyen özeti çözülmeli.
- Saatten bitirme kararı, “çok kısa sürüş” uyarısı ve özeti kaydet/sil/sonra akışı yönetilebiliyor; karar telefon ekranındaki `confirm()` penceresine bırakılmıyor.
- Hız değişimi, sürüş durumu, hız limiti, uyarılar ve tuş basışları için kısa animasyon/titreşim geri bildirimi kullanılıyor. Sürüş sırasında dikkat dağıtan sürekli animasyonlardan kaçınılıyor.
- Bu dosyanın ilk denetiminde telefon/saat sürüm kodları daha eskiydi. 1.3.3 paketiyle telefon `versionCode 5`, saat `versionCode 7`; ikisinin `versionName` değeri `1.3.3` olarak ayarlandı.

### 3. Manuel yedek v3
- Araçlar, kayıtlı sürüş geçmişi, park yeri, sürüş ayarları ve sürüş ekleri korunuyor.
- Tema, tema paketi ve hatırlatma aralığı gibi sınırlı/güvenli tercihler dahil ediliyor.
- Devam eden sürüş taslağı ve henüz kaydedilmemiş bitmiş sürüş özeti manuel yedeğe ekleniyor.
- Geri yüklemede mevcut sürüşler kimliğe göre birleştiriliyor; aktif oturum, mevcut yarım sürüş taslağı veya zaten bekleyen özet ezilmiyor.
- PIN ve AI API anahtarı yedeğe konmuyor.
- Otomatik yedekleme yalnızca araç listesini saklıyor; arayüz metninde bu kapsam açıkça belirtiliyor. Tam yedek için manuel JSON dışa aktarma kullanılmalı.
- Önceki sürüm bundle'larının ve yalnızca araç dizisi içeren eski JSON yedeklerin içe aktarımı korunuyor.

## Telefon ve saat arasında kalıcı görev ayrımı

| İş | Telefonun rolü | Saatin rolü |
|---|---|---|
| Araç oluşturma/düzenleme/silme, fotoğraf, detaylar | Ana yönetim arayüzü | Kayıtlı araçlardan seçim |
| Yakıt/masraf/bakım/fiş OCR/PDF/CSV | Ana işlem ve kayıt merkezi | Kısa özet/hatırlatma, sınırlı hızlı giriş daha sonraki aşama |
| Sürüş GPS ve rota kaydı | Şu an asıl GPS/sürüş motoru | Kontrol ve telemetri gösterimi |
| Başlat/duraklat/devam/bitir | Harita ve kontrol yedeği | Büyük ve doğrudan sürüş kontrolleri |
| Kısa sürüş onayı | Detaylı arayüzde yedek yol | Onay saatte verilir |
| Sürüş özeti kaydet/sil/sonra | Kaydı kalıcılaştıran taraf | Kullanıcı kararını alır |
| Park/müzik | Tam yönetim | Hızlı kontrol/mesafe/yön |
| Yedek/geri yükleme/AI ayarları/sosyal ekranlar | Ana yönetim merkezi | Gerekirse kısa durum gösterimi |

## Devam eden önemli mimari sınır

Telefon tarafında `GarajimRideService` artık kalıcı durum, GPS örnekleme, mesafe/süre takibi ve foreground service yaşam döngüsünü destekleyen yerel sürüş moduna sahip. WebView tabanlı sürüş akışıyla geçiş/uyumluluk kodları da projede bulunduğundan, her senaryoda WebView'den tamamen bağımsız olduğunu varsaymamak gerekir. Özellikle ekran kapalı, WebView yeniden oluşturulmuş, işletim sistemi süreci öldürmüş ve kullanıcı uygulamayı zorla durdurmuş senaryolar ayrı ayrı fiziksel cihazda doğrulanmalıdır.

Saatte mesajın iletildiği ve telefonun komutu kabul ettiği durumlar ayrıdır. 1.3.4 ile komut kimliği/ACK eklendi; ACK telefon tarafında kabul/yönlendirmeyi gösterir, sürüşün kesin tamamlandığını kanıtlamaz. Otomatik yeniden deneme eklenmedi; aynı komutun iki kez uygulanması riskini önlemek için önce gerçek cihaz davranışı doğrulanmalıdır.

## 1.3.3 güncellemesi

- Wear OS kokpitinde mesafe, geçen süre ve maksimum hız için ayrı metrik kartları eklendi.
- Saatin renk sistemi koyu lacivert yüzeyler, kırmızı vurgu ve yüksek kontrastlı metinlerle tutarlılaştırıldı.
- Mini rota görünümü biraz büyütüldü; GPS bekleme, canlı rota ve duraklatılmış durum göstergeleri korundu.
- `GarajimRideService` rota JSON'u üretirken geçersiz koordinat nedeniyle tüm durum yayınının kesilmesini önleyen `JSONException` yakalaması içeriyor.
- `CHANGELOG.md` eklendi ve telefon/saat sürüm numaraları eşitlendi.

## Sonraki işlerin öncelik sırası

### P0 — Önce güvenilirlik
1. Bu paketteki değişiklikleri GitHub Actions ile derleyip iki fiziksel cihazda doğrulamak.
2. Telefon WebView'i açık, arka planda, ekran kapalı, Android tarafından kapatılmış ve uygulama zorla durdurulmuş durumları ayrı ayrı test etmek.
3. Saat komutu ACK akışını ekran açık/kapalı, bağlantı kopması ve servis başlatma hatalarıyla gerçek Galaxy Watch7 üzerinde doğrulamak; telefonun kabul yanıtını gerçek işlem sonucu gibi göstermemek.
4. Sürüş özeti kaydet/sil durumunu uygulama süreç kapanmasına karşı idempotent ve kalıcı hale getirmek.
5. JSON içe aktarmada bozuk kayıt/yerel depolama kotası kurtarma testleri eklemek.

### P1 — Saatte daha iyi sürüş deneyimi
1. Ana Sürüş görünümünü önceliklendir: büyük hız, plaka, süre/mesafe, bağlantı/GPS durumu, Başlat/Duraklat ve ayrı Bitir.
2. Araç seçimi ve sürüş özeti için ayrı, okunabilir ekran/panel kullan.
3. Son 3 sürüş, haftalık mesafe ve bakım uyarılarını küçük kartlar halinde ekle.
4. Sürüşte büyük dokunma alanları, düşük güç tüketimi, titreşimin sıklık ayarı ve erişilebilir kontrastı doğrula.
5. Gerekirse Tile/complication ile aktif sürüş durumuna hızlı erişim ekle.

### P2 — Veri güvenliği ve mimari bakım
1. `index.html` içindeki büyük modülleri sürüş, araçlar, yedekleme, harita, OCR ve raporlama olarak ayır; aşamalı ilerle, baştan toplu yeniden yazma yapma.
2. `package-lock.json` ekleyip doğruladıktan sonra `npm install` yerine `npm ci` kullanarak bağımlılık sürümlerini sabitle.
3. Aynı release keystore'u GitHub Actions secrets ile koru; debug imzalı APK'ların farklı runner'lardan geldiğinde güncellemeyi engellemesi riskini kaldır.
4. Kullanıcı tarafından etkilenebilen HTML alanlarında ortak escape/textContent yaklaşımını kalan tüm render noktalarına genişlet; bu iterasyonda yalnızca araç listesi, bildirimler, sosyal akış ve detayın belirli alanları sertleştirildi.
5. PIN'in yerel veriyi şifrelemediğini açıkça bildir; AI API anahtarı için daha güvenli saklama ve bağlam paylaşım kontrolü ekle.
6. Sosyal akış ekranı yerel cihaz depolamasıyla çalışıyor; gerçek çevrimiçi topluluk olarak sunulacaksa backend/hesap/moderasyon ayrı planlanmalı.
7. Harita sağlayıcılarının, adres aramanın ve rota servisinin çevrimdışı sınırlamalarını kullanıcıya açık göster.

## Doğrulama durumu — 1.3.8 teslim adayı

- `tests/t12_wear_reliability.js`–`tests/t23_import_render_safety.js` kapsamındaki 12 kaynak regresyon dosyası tek tek çalıştırıldı: toplam **114 kontrol geçti, 0 başarısız test dosyası**. Bunlar kaynak sözleşmesi/statik ve yardımcı-fonksiyon testleridir; Android çalışma zamanı kanıtı değildir.
- `index.html` içindeki iki inline JavaScript bloğu ve `build-web.js` `node --check` ile kontrol edildi; test dosyalarının tamamı Node sözdizimi kontrolünden geçti. `scripts/ci-wear-setup.py` Python derleme kontrolünden geçti.
- `package.json` geçerli JSON; telefon/saat kaynaklarındaki 16 Android XML dosyası hatasız ayrıştırıldı.
- 1.3.8'de HTML kaçış, inline JavaScript argümanı ve görsel URL doğrulama yardımcıları eklenip önemli araç/bildirim/sosyal render noktalarına bağlandı. Bu bir tam uygulama güvenlik denetimi değildir; kalan HTML üretim noktaları P2 işidir.
- Tam `npm test` tamamlanamadı: `node_modules` yok, `www/index.html` üretilmemiş ve ortam DNS/network bağımlılık indirmesini sağlayamadı. `build-web.js` `chart.js` dosyası eksikliğinden başarısız; test çalıştırıcısı DOM gerektiren 11 testi bloke olarak raporluyor. Bu durum testleri geçmiş sayılmaz.
- Android SDK/Gradle bulunmadığından telefon veya Wear OS APK'sı burada derlenmedi; GitHub Actions sonucu gözlemlenmedi. Gerçek Galaxy Watch7 üzerinde GPS, bağlantı kesintisi, uyku/uyanma ACK'si, medya ve sürüş özeti akışı henüz doğrulanmadı.
- Sürümler: telefon workflow `versionCode 10 / 1.3.8`, saat `versionCode 12 / 1.3.8`, `package.json` `1.3.8`.

### Gerçek cihaz doğrulama kuyruğu

1. GitHub Actions'ta aynı başarılı çalıştırmadan hem `Garajim-Mobil-APK` hem `Garajim-WearOS-APK` artifact'larını üretip indir.
2. Release secrets tanımlı değilse APK debug imzasıyla çıkar; mevcut kurulu release imzalı uygulamanın üzerine kurulamayabilir. Aynı release keystore korunmalı.
3. Galaxy Watch7'de ekran uykuya girerken ve bağlantı gidip gelirken sürüş komut ACK'sinin eşleştiğini doğrula.
4. Telefon ekranı kapalı, WebView yeniden açılmış, GPS izni kapalı ve uygulama zorla durdurulmuş senaryolarını ayrı ayrı sınayıp sürüş kaydının hangi koşullarda durduğunu belgele.
5. Backup içeri aktarımı, kötü biçimli veriler, araç/sosyal metinlerde HTML karakterleri ve büyük fotoğraf/yedek dosyalarıyla gerçek UI testi yap.

## Karar

Yeni özellik sayısını artırmadan önce sürüş kontrolünün, araç senkronizasyonunun, bekleyen özetin ve yedeklerin güvenilirliğini bitirmek gerekir. Sonraki büyük mimari yatırım, GPS/sürüş motorunu WebView dışına taşıyarak telefon ekranı ve WebView yaşam döngüsüne bağımlılığı azaltmak olmalıdır. Saat tasarımında ise animasyonlar birer durum göstergesi olarak kalmalı; okunabilirlik, pil ve sürüş güvenliği görsel gösteriden daha önemlidir.


## 1.3.4 iterasyonu — senkronizasyon geri basıncı (önceki)

- `GarajimWearSync.pushState()` her çağrıda ayrı kuyruk işi eklemek yerine son bekleyen sürüş durumunu tutar. Aktif Data Layer yazımı tamamlandığında varsa yeni son durum bir sonraki iş olarak eklenir.
- Bu, bağlantı yavaşladığında saatin saniyeler önceki konum/hız durumlarını sırayla oynatıp gecikmenin büyümesini önlemeyi amaçlar; cihaz üzerinde ölçülmüş bir performans iddiası değildir.
- `tests/t15_wear_sync_coalescing.js` kaynak sözleşmesini kontrol eder.
- Sürüm: telefon `versionCode 6 / 1.3.4`, saat `versionCode 8 / 1.3.4`, `package.json` `1.3.4`.
- Komut ACK protokolü bu iterasyonda eklendi: saat her isteğe benzersiz kimlik koyar; telefonun komutu kabul edip etmediği ayrı mesajla dönülür. Bu, komutun sürüşü kesin tamamladığını değil, telefon tarafında kabul edildiğini gösterir.
- Native sürüş durumuna öncelik verilirken WebView medya/park kısayollarının serviste tüketilmesi engellendi; WebView hazırsa JS köprüsüne yönlendirilir, hazır değilse kabul edildi diye gösterilmez.
- Telefon arayüzüne görünür klavye odağı, azaltılmış hareket tercihi ve tema rengine uyumlu form vurgusu eklendi.
- Kaynak statik testleri `t12`–`t18` aralığındaki 7 kontrol dosyasına genişletildi.
- Sıradaki önemli işler: saat/telefon bağlantı kesintisi ve ekran kapalıyken ACK testi, ardından telefon ana ekranının görsel ve erişilebilirlik denetimi.
- Ortam kısıtı: bu çalışma ortamında `node_modules` ve Gradle/Android SDK yoksa tam web test paketi ve APK derlemesi burada doğrulanamaz; GitHub Actions ile cihaz testi gerekir.


## 1.3.5 iterasyonu — ekran kapalıyken medya ve park

- Müzik komutları WebView açıksa JS köprüsüne, değilse native `GarajimMedia.command()` çağrısına yönlendirilir. Bu, medya kontrolünü WebView yaşam döngüsünden ayırır; yine de uygun medya oturumu/Android medya tuşu davranışı cihazda denenmelidir.
- Park koordinatı native `SharedPreferences` içinde doğrulanmış JSON olarak tutulur. JS, mevcut yerel park kaydını uygulama açılışında eşitlemeyi dener; park silme işlemi native kopyayı da kaldırır.
- Saat park isteği native servis üzerinden geldiğinde servis uzaklık/yönü son GPS düzeltmesinden hesaplar. Son konum iki dakikadan eskiyse mesafe `-1`/yön boş kalır; uygulama eski GPS konumunu canlıymış gibi göstermemelidir.
- Sürüm: telefon `versionCode 7 / 1.3.5`, saat `versionCode 9 / 1.3.5`, `package.json` `1.3.5`.
- Yeni test: `tests/t19_native_park_location.js`; medya/park yönlendirme testi `tests/t17_wear_shortcut_routing.js` güncellendi.
- Bu değişikliklerin Android SDK ile gerçek derlemesi yapılmadı. `node_modules` ve `jsdom` bulunmadığı/kurulum zaman aşımına uğradığı için tam `npm test` de doğrulanamadı. Android XML, inline JS, Java sentaks taraması ve bu repodaki statik kontrol dosyaları ayrı ayrı çalıştırılmalı; son aşama Actions ve fiziksel cihaz testidir.


## 1.3.6 iterasyonu — Wear OS kokpit akışı

- Araç seçme ve sürüş kontrol düğmeleri hız/telemetri alanının hemen altına taşındı; müzik ve rota yardımcı alanları ana aksiyonların önüne geçmiyor.
- Dokunma hedefleri en az 44 dp olarak düzenlendi ve medya ikonları için erişilebilir adlar eklendi.
- Telefon/saat kaynak sürümleri `1.3.6` olarak yükseltildi.
- `tests/t20_wear_cockpit_hierarchy.js` yeni görsel hiyerarşi ve dokunma alanı sözleşmesini denetler.
- İlk doğrulama turunda XML parse ve statik testler çalıştırılacak; gerçek Watch7 testi ve APK derlemesi hâlâ ayrı adımlardır.


## 1.3.6 iterasyonu — kokpit ergonomisi ve kalıcı komut onayı

- Başlat/Duraklat/Bitir ve araç seçimi saat ekranının üst bölümüne alındı; rota ve müzik yardımcıları daha sonra gelir.
- Etkileşimli kontrol hedefleri 44 dp ve medya düğmeleri ekran okuyucu açıklamalı.
- ACK mesajları, hızlı mesajın yanında `/garajim/ack/{commandId}` Data Item olarak da tutulur; saat açıldığında bekleyen kimliğiyle eşleştirilip tüketilmeye çalışılır.
- `tests/t20_wear_cockpit_hierarchy.js` ve `tests/t21_wear_durable_ack.js` yeni sözleşmeleri denetler.

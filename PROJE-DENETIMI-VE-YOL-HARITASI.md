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
- `native-wear` sürüm kodu `4`, sürüm adı `1.3.0`; telefon derlemesi `versionCode 2`, `versionName 1.2.0` olarak ayarlanıyor. Eski sürümün üzerine güncelleme hedefleniyor.

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

Bu paket, telefonun ekranını öne getirmeden çalışan WebView oturumuna komut iletimini ve durum senkronizasyonunu iyileştirir. Ancak GPS örnekleme ve sürüş durumunun asıl mantığı hâlâ `index.html` içindeki JavaScript `ride` akışında. `GarajimRideService` şu anda sürüş bildirimini/foreground-service yaşam döngüsünü sağlar; kendi başına tam GPS/sürüş motoru değildir.

Bu nedenle telefon uygulaması arka plandayken WebView süreci yaşıyorsa kontrol çalışabilir; işletim sistemi süreci tamamen öldürürse veya kullanıcı uygulamayı zorla durdurursa bütün saat komutlarının çalışması garanti edilmez. **Bir sonraki büyük mühendislik aşaması**, GPS takibini, süreyi, mesafeyi, sürüş durum makinesini ve bekleyen özeti yerel Android foreground service + kalıcı depolama katmanına taşımaktır. Bu çalışma, yalnızca birkaç buton eklemekten daha kapsamlıdır ve gerçek Watch7/Android cihazında test edilmelidir.

## Sonraki işlerin öncelik sırası

### P0 — Önce güvenilirlik
1. Bu paketteki değişiklikleri GitHub Actions ile derleyip iki fiziksel cihazda doğrulamak.
2. Telefon WebView'i açık, arka planda, ekran kapalı, Android tarafından kapatılmış ve uygulama zorla durdurulmuş durumları ayrı ayrı test etmek.
3. Saat komutları için komut kimliği + ACK/sonuç protokolü eklemek; ekranda “gönderildi” ile “telefonda işlendi” durumunu ayırmak.
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
4. Kullanıcı tarafından etkilenebilen HTML alanlarında ortak escape/textContent yaklaşımı kullan.
5. PIN'in yerel veriyi şifrelemediğini açıkça bildir; AI API anahtarı için daha güvenli saklama ve bağlam paylaşım kontrolü ekle.
6. Sosyal akış ekranı yerel cihaz depolamasıyla çalışıyor; gerçek çevrimiçi topluluk olarak sunulacaksa backend/hesap/moderasyon ayrı planlanmalı.
7. Harita sağlayıcılarının, adres aramanın ve rota servisinin çevrimdışı sınırlamalarını kullanıcıya açık göster.

## Doğrulama durumu

- Ana HTML içindeki iki çalıştırılabilir inline JavaScript bloğu `node --check` ile kontrol edildi.
- Projedeki 16 XML dosyası ayrıştırıldı.
- Yeni telefon/Wear OS statik sözleşme testindeki 12 kontrol geçti.
- `tests/t06_yedek.js` içinde v3 dışa aktarma/geri yükleme ve eski v2 bundle uyumluluğu için testler güncellendi.
- Bu ortamda `node_modules` hazır değildi ve bağımlılık kurulumu zaman aşımına uğradı; bu yüzden tam `npm test` koşturulamadı. Android SDK da yok; Gradle derlemesi ve gerçek cihaz testi bu ortamda yapılmadı. Son doğrulama GitHub Actions ve fiziksel telefon/Watch7 üzerinde yapılmalı.

## Karar

Yeni özellik sayısını artırmadan önce sürüş kontrolünün, araç senkronizasyonunun, bekleyen özetin ve yedeklerin güvenilirliğini bitirmek gerekir. Sonraki büyük mimari yatırım, GPS/sürüş motorunu WebView dışına taşıyarak telefon ekranı ve WebView yaşam döngüsüne bağımlılığı azaltmak olmalıdır. Saat tasarımında ise animasyonlar birer durum göstergesi olarak kalmalı; okunabilirlik, pil ve sürüş güvenliği görsel gösteriden daha önemlidir.

# Garajım — Güvenilir sürüş ve Wear OS güncellemesi

Bu kaynak paketi, telefon uygulaması ile Galaxy Watch / Wear OS uygulaması arasındaki sürüş kontrolünü sağlamlaştırmak ve manuel yedekleme kapsamını genişletmek için hazırlanmıştır.

## Yapılan değişiklikler

### Telefon ↔ saat iletişimi
- Saat komutları telefon tarafında tek bir geçici değişken yerine, en fazla 16 komut tutan ve 25 saniyeden eski komutları atmayan FIFO kuyruğunda işlenir.
- Sürüş komutları telefon/WebView oturumu hazır değilken gecikmeli şekilde çalıştırılmaz. Araç seçimi ertelenebilir; başlatma/duraklatma/bitirme gibi sürüş komutları sonradan kendiliğinden devreye girmez.
- Saatten gelen `start`, `resume`, `pause` ve `finish` komutları açık eylemlere ayrılır. Tekrarlanan `toggle` komutlarının sürüş durumunu yanlışlıkla tersine çevirme riski azaltılır.
- Telefon WebView'i çalıştığı sürece araç listesi ve sürüş durumu 10 saniyede bir saate yeniden yayımlanır.
- Sürüş sırasında saatten araç değiştirme engellenir.
- Saatte telefon bağlantısı ve son telemetri güncelliği sürüş durumundan ayrı gösterilir. Veri 25 saniyeden eskiyse saat bunu açıkça belirtir.
- Wearable DataEventBuffer serbest bırakılır; veri sırası ve yaşam döngüsü için ilave kontroller eklendi.

### Saat deneyimi
- Hız değişiminde kısa gösterge animasyonu; bağlantı, hız limiti ve sürüş geçişlerinde durum rengi/titreşim geri bildirimi.
- Sürüş başlatma/duraklatma/devam komutları ayrıdır.
- Araç seçimi aktif sürüşte kilitlenir.
- Bekleyen sürüş özeti çözülmeden yeni sürüşün başlatılması engellenir; kaydet/sil/sonra akışı korunur.
- Bağlantı, GPS hazır olma durumu ve telemetri eskiliği birbirinden ayrılır.

### Manuel yedekleme v3
- Araçlar, sürüş geçmişi, park konumu, sürüş ayarları ve sürüş eklentileri korunur.
- İzin verilen güvenli tercihler (tema, tema paketi ve hatırlatma aralığı) da yedeğe eklenir.
- Kesintiye uğramış sürüş taslağı ve kaydet/sil kararı bekleyen sürüş özeti yedeğe alınır.
- Geri yükleme mevcut sürüşleri silmez; sürüş kayıtları kimliğe göre birleştirilir. Aktif oturum veya mevcut taslak/özetin üzerine yazılmaz.
- PIN ve yapay zekâ API anahtarı yedeğe konmaz.
- Otomatik yedekleme alanında yalnızca araç listesinin kopyalandığı açıkça belirtilir. Tam yedek için manuel dışa aktarma kullanılmalıdır.
- Eski sürüm yedekleri içe aktarma biçimi desteklenmeye devam eder.

## Önemli mimari sınır

GPS takibi ve sürüş oturumunun esas mantığı hâlâ telefon uygulamasının WebView/JavaScript katmanında yürür. Bu güncelleme, WebView çalıştığı sürece arka planda ekranı öne getirmeden saat komutlarının iletilmesini ve durum eşitlemesini iyileştirir. Android uygulaması sistem tarafından tamamen kapatılırsa veya zorla durdurulursa tüm sürüş komutlarının çalışmaya devam edeceği garanti edilmez. Bunu tam olarak çözmek için GPS/sürüş oturumunun kalıcı durumunu yerel Android foreground service ve depolama katmanına taşımak ayrı bir sonraki aşamadır.

## GitHub Actions ile derleme

1. ZIP içindeki kaynak dosyalarını GitHub deposunun aynı yollarına kopyalayın; `.github` ve `native-android` / `native-wear` klasörlerini de dahil edin.
2. Değişiklikleri `main` dalına commit/push edin veya Actions içinden workflow'u çalıştırın.
3. Aynı başarılı Actions çalıştırmasından `Garajim-Mobil-APK` ve `Garajim-WearOS-APK` artifact'larını indirin.
4. Önce telefon uygulamasını `adb install -r` ile güncelleyin; telefon uygulamasını kaldırmayın. Ardından aynı çalıştırmadan gelen Wear OS APK'sını Watch7'ye yükleyin.
5. Telefon ve saat uygulamasının aynı build run'ından geldiğini kontrol edin. Saatte eski, farklı paket kimliğine sahip bir Garajım uygulaması kalırsa çift uygulama oluşabilir.

## Kontrol durumu

Bu pakette JavaScript inline blokları `node --check` ile, XML dosyaları XML parser ile denetlenmiştir. Wear OS ve telefon-saat sözleşmesi için yeni statik regresyon kontrolleri eklendi. Bu çalışma ortamında `node_modules` hazır değildi ve bağımlılık kurulumu zaman aşımına uğradı; Android SDK da bulunmadığından tam `npm test`, Gradle/APK derlemesi ve gerçek cihaz testi bu ortamda tamamlanamadı. Nihai doğrulama GitHub Actions ve Watch7 üzerinde yapılmalıdır.

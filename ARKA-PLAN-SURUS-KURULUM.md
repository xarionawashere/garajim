# Garajım — Telefon uygulaması kapalıyken saatten sürüş

## Bu yamanın amacı

Saatten gelen araç seçme / başlat / duraklat / devam / bitir komutlarını telefonun WebView'i açıkken mevcut JavaScript sürüş mantığına; WebView/Activity kapanınca ise Android foreground location service içindeki yerel sürüş oturumuna yönlendirmek.

Native servis temel sürüş telemetrisini (GPS noktaları, mesafe, süre, mevcut ve maksimum hız), seçili araç/plakayı ve bitirilmiş sürüş özetini kalıcı depoda tutar. Telefon uygulaması yeniden açıldığında, saatten kaydedilmiş native sürüş özetleri ana sürüş geçmişine aktarılır.

## Dahil edilen dosyalar

Yama ZIP'indeki dosyalar depodaki aynı yolları korur. ZIP'i GitHub'a tek dosya olarak yüklemeyin; çıkarıp bu dosyaları mevcut depo yollarında değiştirin.

- `.github/workflows/build-apk.yml`
- `index.html`
- `native-android/src/main/java/com/garajim/app/MainActivity.java`
- `native-android/src/main/java/com/garajim/app/GarajimNativeBridge.java`
- `native-android/src/main/java/com/garajim/app/GarajimRideService.java`
- `native-android/src/main/java/com/garajim/app/GarajimWearListener.java`
- `native-android/src/main/java/com/garajim/app/GarajimWearSync.java`
- `native-wear/src/main/java/com/garajim/wear/WearMainActivity.java`
- `native-wear/build.gradle`
- `tests/t12_wear_reliability.js`
- `tests/t13_native_background.js` (yeni regresyon kontrolleri)

## Uygulama

1. `https://github.com/xarionawashere/garajim` deposunda `main` dalını açın.
2. Yukarıdaki dosyaların her birini aynı konumdaki dosyayla değiştirin. `index.html` büyük bir dosyadır; tüm içeriği değiştirdiğinizden emin olun.
3. Değişiklikleri tek bir commit ile `main` dalına gönderin.
4. GitHub Actions'ta `APK Olustur` iş akışının bitmesini bekleyin. Yalnızca `Success` olan çalıştırmanın artifact'larını kullanın.
5. Aynı çalıştırmadan hem `Garajim-Mobil-APK` hem de `Garajim-WearOS-APK` artifact'larını indirin.
6. Önce telefon APK'sını, ardından Wear OS APK'sını `adb install -r` ile yükleyin. Telefon uygulamasını kaldırmayın.

## Telefonu arka plan sürüşüne hazırlama

1. Telefonda Garajım'ı bir kez açın.
2. Konum izni verin ve telefonun Konum/GPS özelliğini açın.
3. Garajım açıkken `Garajım · Saat bağlantısı hazır` benzeri kalıcı bildirim görünmeli. Bildirim servisin arka plan için kurulduğunu gösterir.
4. Saate araç listesinin eşitlenmesi için birkaç saniye bekleyin.
5. Garajım'ı son uygulamalar ekranından kaydırarak kapatın. Android Ayarları'ndan **Zorla durdur** yapmayın; bu, uygulamanın servislerini bilerek durdurur.
6. Saatten araç seçip sürüşü başlatın; GPS hazır olmasını, mesafe/sürenin arttığını kontrol edin. Saatten duraklat/devam/bitir ve Kaydet akışını test edin.
7. Telefon Garajım'ı tekrar açın. Kaydedilen native sürüşün ana sürüş geçmişine bir kez aktarıldığını ve çift kayıt oluşmadığını kontrol edin.

Samsung güç yönetimi servisi kapatıyorsa: **Ayarlar → Uygulamalar → Garajım → Pil → Sınırsız** seçeneğini etkinleştirin. Menü adları Android/One UI sürümüne göre değişebilir.

## Önemli sınırlar

- Android, konum için foreground service ve görünür bildirim gerektirir. Bu yama gizlice/kalıcı bildirim olmadan GPS takibi yapmaya çalışmaz.
- Kullanıcı Android Ayarları'ndan uygulamayı zorla durdurursa servisler çalışmayı sürdüremez. Pil optimizasyonları/üretici yazılımı da davranışı etkileyebilir.
- Telefon uygulaması kapalıyken yerel servis temel sürüş takibi ve özetini yönetir. JavaScript tarafındaki gelişmiş viraj puanı, sürüş DNA'sı, bazı Açık Dünya analizleri ve harita efektleri native modda henüz aynı şekilde hesaplanmaz.
- Tam Gradle/APK derlemesi bu geliştirme ortamında yapılmadı. GitHub Actions derlemesi ve gerçek cihaz testi tamamlanmadan bu yamayı üretim için doğrulanmış saymayın.

## Gerçek cihaz test listesi

- [ ] Actions iki APK'yı aynı run'da üretiyor.
- [ ] Telefon APK'sı mevcut uygulamayı verileri koruyarak güncelliyor.
- [ ] Watch APK'sı güncelleniyor ve çift Garajım uygulaması oluşmuyor.
- [ ] Telefon Garajım bir kez açılınca kalıcı servis bildirimi görünüyor.
- [ ] Telefon uygulaması son uygulamalardan kaydırılıp kapatılınca saatten sürüş başlıyor.
- [ ] Ekran kapalıyken GPS, süre ve mesafe ilerliyor.
- [ ] Saatten duraklat/devam/bitir ve sürüş özeti Kaydet/Sil çalışıyor.
- [ ] Telefon tekrar açıldığında kayıt geçmişe yalnızca bir kez aktarılıyor.
- [ ] GPS/konum kapalıysa kullanıcıya açık hata gösteriliyor, sahte sürüş başlatılmıyor.

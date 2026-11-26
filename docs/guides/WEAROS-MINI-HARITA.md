# Garajım Wear OS — Mini rota haritası

## Ne eklendi?
- Saat ekranına düşük yükte, çevrimdışı çizilen mini rota kartı eklendi.
- Telefonun yerel sürüş servisi, GPS rotasından en fazla 24 örnek koordinatı seçip Wearable Data Layer ile saate gönderir. Tam rota geçmişi saatin üzerine taşınmaz.
- Saat bu GPS noktalarını koyu, düşük kontrastlı şematik bir arka planda çizer; başlangıç ve mevcut nokta farklı işaretlenir.
- GPS bekleniyorsa, ilk konum alındıysa, sürüş canlıysa veya duraklatıldıysa durum etiketi güncellenir.
- Harita internetten karo indirmez, API anahtarı gerektirmez ve arka planında yalnızca dekoratif yol dokusu vardır. Rota çizgisi gerçek GPS verisidir; çevredeki gri yollar gerçek sokak haritası değildir. Gerçek sokak adları/yollar için ayrı bir harita sağlayıcısı, atıf, önbellekleme ve ağ politikası gerekir.
- Telefon ve saat APK sürüm kodları güncellendi.

## GitHub'a yüklenecek dosyalar
1. `native-wear/src/main/res/layout/activity_wear.xml` (güncellendi)
2. `native-wear/src/main/java/com/garajim/wear/MiniRouteView.java` (yeni dosya)
3. `native-wear/src/main/java/com/garajim/wear/WearMainActivity.java` (güncellendi)
4. `native-android/src/main/java/com/garajim/app/GarajimRideService.java` (güncellendi)
5. `native-android/src/main/java/com/garajim/app/GarajimWearSync.java` (güncellendi)
6. `native-wear/build.gradle` (versionCode 6)
7. `.github/workflows/build-apk.yml` (telefon versionCode 4 / versionName 1.3.2)
8. `tests/t14_wear_mini_map.js` (yeni kontrol)

## Sınırlar
Bu değişiklik kod seviyesinde hazırlandı; bu ortamda Android SDK/Gradle derlemesi çalıştırılmadı. GitHub Actions sonucu ve Watch7 üzerinde gerçek rota çizimi doğrulanmalıdır. Rota en fazla 24 örnek noktayla temsil edildiği için çok kıvrımlı uzun rotalarda sadeleşir; amaç saatte rota şekline hızlı bakıştır, tam navigasyon değildir.

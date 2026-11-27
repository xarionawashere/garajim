# Garajım — Rozet DNA: Gerçek kaynak dosyaları

Bu paket bir **yama çalıştırıcısı değildir**. İçindeki dosyalar, özellikler entegre edilmiş tam kaynak dosyalarıdır ve mevcut Garajım deposundaki aynı yolların yerine konulmalıdır.

## GitHub'a yüklenecek dosyalar

1. `index.html` → deponun kökündeki mevcut `index.html` dosyasının tamamını bununla değiştir.
2. `native-android/src/main/java/com/garajim/app/GarajimNativeBridge.java` → aynı yoldaki dosyayı değiştir.
3. `native-android/src/main/java/com/garajim/app/GarajimWearSync.java` → aynı yoldaki dosyayı değiştir.
4. `native-wear/src/main/java/com/garajim/wear/WearMainActivity.java` → aynı yoldaki dosyayı değiştir.
5. `tests/t25_achievement_system.js` → `tests/` klasörüne yeni dosya olarak ekle.

Başka dosyaları silme veya bu paketteki tek başına `modules/` benzeri kopyaları uygulamaya bağlamaya çalışma. Bu pakette ayrı modül kopyaları yok; HTML ve native kaynaklardaki bütünleşik gerçek kod var.

## Dahil edilen özellikler

- Tam 51 rozet; sürüş, Sürüş DNA, garaj, bakım, yakıt, kilometre, yedekleme, keşif ve ustalık hedefleri.
- Rozet nadirliğine göre farklı kutlama görünümü ve titreşim.
- Sekiz nitelikli Sürüş DNA profili ve tekrarlanan uygunluk sayaçları.
- Telefonda ilk DNA kazanımında animasyonlu kutlama ve titreşim.
- Saat bağlıyken Wear OS tarafına anlık kutlama mesajı, yeşil bildirim görünümü ve titreşim. Saat bağlı değilse bu canlı kutlama eski bildirim olarak sonradan gönderilmez.
- Rozet, aktivite ve kilometre geçmişinin yedek/geri yükleme paketine dahil edilmesi.
- Yeni kaynak doğrulama testi.

## Kontrol durumu

- `index.html` içindeki satır içi JavaScript bloklarının sözdizimi kontrolü geçti.
- Rozet kataloğunda 51 `add(...)` tanımı var.
- Bu çalışma ortamında tam `npm test` tamamlanamadı: `node_modules/chart.js/dist/chart.umd.js` bulunmuyor; ayrıca yeni test doğrudan çalıştırıldığında `jsdom` bağımlılığı kurulu değil. Dolayısıyla tam test paketinin geçtiği veya APK derlemesinin başarılı olduğu iddia edilmiyor.
- Kaynakları GitHub'a yükledikten sonra bağımlılıkları kurup `npm test` çalıştır ve GitHub Actions sonuçlarından hem Android hem Wear OS derlemesini doğrula.

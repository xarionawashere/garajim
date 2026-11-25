# Garajım 1.3.9 — Tam proje teslimi

Bu arşiv tam kaynak projeyi içerir; yalnızca yama veya APK değildir.

## Dahil edilenler
- 51 rozetlik başarım sistemi ve Sürüş DNA hedefleri.
- Telefonda kutlama ve nadirliğe göre titreşim.
- Android köprüsü ve Wear Data Layer üzerinden saat başarım mesajları.
- Wear OS kutlama görünümü, nadirlik titreşimi ve arka plan bildirim dinleyicisi.
- Gizli başarım test menüsü: `Rozetlerim` başlığına 4 saniyede 7 kez dokunarak açılır.
- Garaj ana ekranından “Garaj Özeti” kartı kaldırıldı; ana başlığın yapışkan davranışı kaldırıldı, rozet/araç kartlarının dikey alanı sıkıştırıldı ve alt gezinme çubuğu için kaydırma boşluğu artırıldı.
- Kaynak testleri ve GitHub Actions iş akışı.

## Derleme ve test
GitHub Actions, bağımlılıkları yükler, `node build-web.js` çalıştırır, `npm test` uygular ve telefon/Wear OS APK artifact'lerini üretir. APK'ları aynı workflow çalıştırmasından indirip ikisini de güncelleyin.

Bu çalışma ortamında `npm install`, tam `npm test`, Android SDK/Gradle derlemesi ve gerçek cihaz üzerinde test yapılmış sayılmaz. Kaynakta çalışan statik kontroller ile cihaz/derleme doğrulaması birbirinden ayrılmalıdır.

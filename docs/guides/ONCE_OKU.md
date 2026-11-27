# Önce bunu oku

Bu ZIP **kaynak kod ve test paketi** içerir; hazır APK/AAB içermez. Sürüm 1.4.6, Asistan sekmesini Garajım Studio araç tasarım/modifikasyon merkezine dönüştürür.

1. Node.js 20 ve ağ erişimi olan bir ortamda `npm ci` çalıştır.
2. Bağımlılıkları kurduktan sonra `npm test` çalıştır. Bazı eski uçtan uca testler `jsdom` gerektirir.
3. `npm run build:web` çalıştır; bağımlılıklar eksiksiz kuruluysa başarılı olur ve `www/` oluşturulur.
4. GitHub'a bu projenin tüm içeriğini yükle. `.github/workflows/build-apk.yml` dosyası Actions'ta Android derlemesini başlatır.
5. İmzalama secret'ları olmadan yalnızca test amaçlı debug APK beklenir. Google Play için kalıcı imza anahtarıyla imzalı AAB gerekir.
6. Android cihazda arka plan GPS, izinler, widget, bildirimler, yedek/geri yükleme ve çevrimdışı davranışı test et.

Tarihi kontrol ayrıntıları [`../archive/10_ASAMA_RAPORU.md`](../archive/10_ASAMA_RAPORU.md) içindedir. Bu raporlar eski sürümlere aittir; güncel test sonucu GitHub Actions çalıştırmasından kontrol edilmelidir.


# Önce bunu oku

Bu ZIP **kaynak kod ve test paketi** içerir; hazır APK/AAB içermez.

1. Node.js 22 ve ağ erişimi olan bir ortamda `npm install` (lock dosyası eklenince `npm ci`) çalıştır.
2. `npm test` çalıştır. Bu pakette yerel testler bağımlılık gerektirmeden çalışır.
3. `npm run build:web` çalıştır; başarılı olursa `www/` oluşturulur.
4. GitHub'a bu projenin tüm içeriğini yükle. `.github/workflows/build-apk.yml` dosyası Actions'ta Android derlemesini başlatır.
5. İmzalama secret'ları olmadan yalnızca test amaçlı debug APK beklenir. Google Play için kalıcı imza anahtarıyla imzalı AAB gerekir.
6. Android cihazda arka plan GPS, izinler, widget, bildirimler, yedek/geri yükleme ve çevrimdışı davranışı test et.

Kontrol ayrıntıları `10_ASAMA_RAPORU.md`, test dökümü `TEST_SONUCLARI.json` dosyasındadır.

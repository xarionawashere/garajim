# Garajım 1.4.2 — Navigasyon güvenilirliği ve sade Açık Dünya arayüzü

## Yapılan değişiklikler
- Navigasyon artık kayıtlı sürüşten bağımsız olarak arka plan konum izleyicisini başlatmayı dener; `rideBGStop()` navigasyon sürerken ortak GPS izleyicisini durdurmaz.
- GPS doğruluğuna göre uyarlanan rota dışı mesafe eşiği, güvenilmez GPS'te yeniden rota / sesli manevra bastırma ve yeniden rota bekleme süresi eklendi. Büyük konum sıçramasında rota geometrisi genelinde eşleme denenir.
- Aktif navigasyon hedefi, rota, ilerleme ve ses tercihleri yerel depoya kaydedilir; uygulama yeniden açıldığında kullanıcıdan açık onayla devam edilebilir. Oturum 12 saat sonra geçersiz sayılır.
- Nominatim sonuçları 30 gün yerel önbelleğe alınır, canlı sorgular seri yürütülür ve aralarında en az 1,1 saniye bırakılır.
- Standart OpenStreetMap tile sunucusuna toplu çevrimdışı indirme kodu kaldırıldı; yalnızca normal harita görüntüleme istekleri kalır, kaynak atfı görünür hale getirilir ve çevrimdışı durumda rota hesaplamasının çalışmadığı doğru belirtilir.
- Açık Dünya üzerinde kalıcı görünen kontrol sayısı azaltıldı: konuma dönme ve navigasyon ana düğmeleri kaldı; kamera/katman/park/işaret/zoom/kayıt ve ayarlar tek araç paneline taşındı.
- `package.json` 1.4.2, telefon `versionCode 14 / versionName 1.4.2` ve Wear OS `versionCode 16 / versionName 1.4.2` olarak güncellendi.

## Testler
- `scripts/check-syntax.js` ile tüm satır içi JavaScript sözdizimi kontrolü hedeflenmiştir.
- `t10_navigasyon_ghost_karne.js` konum/guidance testi genişletildi.
- `t03_derlenmis.js` standart OSM tile toplu indirme beklentisi yerine bunun kapalı olduğunu kontrol edecek şekilde güncellendi.
- `t31_navigation_reliability.js` statik regresyon kontrolleri eklendi; bağımlılıksız `t32_navigation_core.js` rota, GPS doğruluğu, yeniden rota ve oturum yaşam döngüsünü simüle eder.
- `scripts/check-syntax.js`, tüm kaynak/test JavaScript dosyalarının `node --check` kontrolü, `t31` (12/12) ve `t32` (10/10) başarılıdır. Tam `npm test` bu ortamda `node_modules/chart.js/dist/chart.umd.js` eksikliği nedeniyle `build-web.js` aşamasında durdu; JSDOM tabanlı entegrasyon testleri burada çalıştırılamadı. Bu nedenle rapor gerçek cihaz testi veya APK derlemesi yapıldığı anlamına gelmez. GitHub Actions sonucu ayrıca doğrulanmalıdır.

## Sınırlamalar
- Canlı trafik veya çevrimdışı rota hesaplama eklenmedi. OSRM/Nominatim herkese açık servisleri en iyi gayretle çalışır; hizmet garantisi yoktur.
- Arka plan takibi, Android'de konum izinlerine ve BackgroundGeolocation eklentisinin kurulmuş olmasına bağlıdır. Eklenti başlamazsa uygulama, ekran açık tutulması gerektiğini bildirir.

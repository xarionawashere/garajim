# Garajım 1.3.8 — Teslim raporu

**Paket türü:** Kaynak kod ve GitHub Actions derleme projesi. Bu arşiv hazır APK değildir.

## İçerik

- Android/Capacitor telefon uygulaması kaynakları (`index.html`, `native-android/`, `capacitor.config.json`).
- Wear OS saat modülü (`native-wear/`) ve telefon–saat Wearable Data Layer senkronizasyon kaynakları.
- GitHub Actions workflow'u, otomatik kaynak testleri, kurulum/aktarım belgeleri ve manuel cihaz kontrol listesi.
- Güncel sürüm: telefon `versionCode 10 / 1.3.8`, saat `versionCode 12 / 1.3.8`.

## Bu teslimdeki önemli düzenlemeler

1. Wear OS ekranındaki araç ve sürüş kontrol akışı önceliklendirildi; ölçümler ayrıştırıldı ve dokunma/erişilebilirlik ayrıntıları düzenlendi.
2. Saat komut ACK'si kalıcı Data Item ile de alınacak şekilde korunuyor; ekran uyku/uyanma sonrası bekleyen kimliğe iki dakikalık kurtarma penceresi tanınıyor. Her bağlı düğüme gönderim ayrı deneniyor.
3. Telefon tarafındaki araç/bildirim/sosyal metinlerinin belirli render noktaları HTML kaçışına alındı; onclick kimlikleri güvenli JSON dize argümanlarıyla aktarılıyor. Fotoğraf kaynakları base64 PNG/JPEG/GIF/WebP veya HTTPS ile sınırlandırılıyor. **Bu, tüm uygulamanın eksiksiz güvenlik denetimi değildir.**
4. Sürüm numaraları ve kurulum, imza ve test belgeleri güncellendi. `TEST-KONTROL-LISTESI-1.3.8.md`, kalan gerçek cihaz kontrolünü ayrı listeliyor.

## Yapılan doğrulamalar

- Kaynak regresyonları: **114 kontrol geçti, 0 başarısız test dosyası** (`tests/t12`–`tests/t23`).
- `index.html` içindeki iki inline JS bloğu, `build-web.js` ve test JavaScript dosyaları Node sözdizimi kontrolünden geçti.
- `scripts/ci-wear-setup.py` Python sözdizimi kontrolünden geçti; `package.json` geçerli JSON; 16 Android XML dosyası başarıyla ayrıştırıldı.
- `tests/t23_import_render_safety.js` HTML kaçışını, enjeksiyon örneğini ve görsel URL filtresini gerçek helper fonksiyonları üzerinde sınadı.

## Henüz yapılmamış doğrulamalar

- `npm test` **tamamlanmadı**: bu ortamda `node_modules/chart.js` bulunmuyor ve paket indirme için ağ/DNS erişimi sağlanamadı. Web paketi (`www/index.html`) oluşturulamadığından DOM gerektiren 11 test bloke kaldı. Tam komut bu nedenle çıkış kodu 1 ile sonlandı.
- Android SDK/Gradle bu çalışma ortamında bulunmadığı için telefon veya saat APK'sı burada üretilmedi. GitHub Actions çalışması da bu oturumdan tetiklenip doğrulanmadı.
- Galaxy Watch7 üzerinde ekran uyku/uyanma, bağlantı kaybı, GPS, özet kaydet/sil, medya/park kısayolları, pil davranışı ve kurulum imzası fiziksel olarak doğrulanmadı.

## APK üretimi ve kurulum

1. ZIP'i çıkar; tüm dosyaları GitHub deponun köküne aktar ve `.github/workflows/build-apk.yml` dahil gizli klasörleri koru.
2. `main` veya `master` dalına push et; GitHub > Actions > `APK Olustur` çalışmasının başarılı bitmesini bekle.
3. Aynı çalıştırmadan hem `Garajim-Mobil-APK` hem `Garajim-WearOS-APK` artifact'larını indir.
4. Release imzasının kullanılabilmesi için şu dört Actions secret'ın tümü tanımlı olmalı: `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`. Eksikse workflow debug APK üretir; bu APK mevcut release imzalı uygulamanın üzerine kurulamayabilir.
5. Mevcut uygulamayı kaldırmadan önce yedek al. Saat tarafındaki eski paket kimliği `com.garajim.wear` ise yeni Wear OS paketi `com.garajim.app` olduğundan yalnızca eski saat paketini kaldırmak gerekebilir; **telefon uygulamasını kaldırma**.

**Yayın kararı:** Kaynak teslimi hazır; APK derlemesi ve gerçek cihaz testleri kanıtlanmadan uygulamanın tümüyle üretim için doğrulandığı söylenemez.

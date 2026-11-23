# Garajım 1.3.8 — teslim ve yayın öncesi doğrulama

Bu liste, kaynak sözleşme testlerini gerçek Android derleme ve cihaz testlerinden ayrı tutar. Statik testlerin geçmesi APK'nın çalıştığını ya da GPS davranışının fiziksel cihazda doğrulandığını kanıtlamaz.

## Bu pakette çalıştırılan kaynak kontrolleri

- [x] `tests/t12_wear_reliability.js` — Wear senkronu, yedekleme ve sürüş komutları
- [x] `tests/t13_native_background.js` — native arka plan sürüşü ve kalıcı durum
- [x] `tests/t14_wear_mini_map.js` — rota aktarımı ve mini harita
- [x] `tests/t15_wear_sync_coalescing.js` — senkron kuyruğunda en güncel snapshot
- [x] `tests/t16_wear_command_ack.js` — komut kimliği ve ACK sözleşmesi
- [x] `tests/t17_wear_shortcut_routing.js` — medya ve park yönlendirmesi
- [x] `tests/t18_accessibility_baseline.js` — telefon UI temel erişilebilirliği
- [x] `tests/t19_native_park_location.js` — native park konumu ve GPS tazeliği
- [x] `tests/t20_wear_cockpit_hierarchy.js` — sürüş aksiyonlarının sırası, 44 dp dokunma hedefleri ve medya erişilebilirliği
- [x] `tests/t21_wear_durable_ack.js` — kalıcı ACK Data Item
- [x] `tests/t22_wear_ack_resume_grace.js` — uyku/uyanma sonrası iki dakikalık ACK kurtarma penceresi
- [x] `tests/t23_import_render_safety.js` — HTML metin kaçışı, inline JS argümanı ve görsel URL politikası
- [x] Bu 12 test dosyasında toplam **114 kaynak kontrolü** geçti; bunlar statik ve yardımcı fonksiyon regresyonlarıdır, Android UI testleri değildir.
- [x] `index.html` içindeki 2 inline JavaScript bloğu `node --check` ile ayrıştırıldı.
- [x] Kaynaktaki 16 Android XML dosyası XML parser kontrolünden geçti.

## Derleme ortamı engeli

- [ ] Tam `npm test`: bu ortamda `node_modules` bulunmadığından ve `npm install` zaman aşımına uğradığından DOM tabanlı 11 test çalıştırılamadı.
- [ ] Android APK derlemesi: Android SDK/Gradle ortamı mevcut olmadığından burada APK üretilmedi.
- [ ] GitHub Actions: telefon ve saat APK'larının aynı başarılı workflow çalıştırmasından üretilmesi doğrulanmalı.

## Telefon arayüzü kontrolü

- [x] Sayfa yakınlaştırması `user-scalable=no` / `maximum-scale=1.0` ile kapatılmıyor (`t18` statik kontrolü).

## Galaxy Watch7 manuel kontrolü

- [ ] Saat uygulamasının ilk ekranında hız, araç plakası, ölçümler, araç seçimi ve Başlat/Duraklat/Bitir kontrolleri rahatça görülüyor mu?
- [ ] Başlat/Duraklat/Bitir ve araç seçimi, gerçek bilekte 44 dp alanlarla güvenilir biçimde dokunulabiliyor mu?
- [ ] Aktif sürüşte GPS, mesafe, süre, maksimum hız ve mini rota akıcı biçimde güncelleniyor mu?
- [ ] Kısa sürüş onayı ve özeti kaydet/sil işlemi saatten tamamlanıyor mu?
- [ ] Telefon ekranı kapalıyken sürüş hizmeti kayıt yapmayı sürdürüyor mu? (Telefonun zorla durdurulması ayrı sınır olarak test edilmeli.)
- [ ] Saatte bir komut gönderildikten hemen sonra ekranı uykuya geçirip yeniden aç. Komut ACK yanıtı kaybolmadan eşleşiyor mu?
- [ ] Telefon bağlantısı kesilip geri geldiğinde veri eskiliği, GPS bekleme ve ACK uyarıları doğru mu?
- [ ] Park yeri eski GPS ile güncelmiş gibi gösterilmiyor mu?
- [ ] Medya düğmelerinin önceki/sonraki/oynat-duraklat davranışı hedef medya uygulamasında doğrulandı mı?
- [ ] Ekran açık kalma süresi, bilek titreşimi, animasyon ve pil tüketimi en az 15–20 dakikalık gerçek kullanımda kontrol edildi mi?



## Sürüm

- Telefon: `versionCode 10`, `versionName 1.3.8`
- Wear OS: `versionCode 12`, `versionName 1.3.8`
- Kaynak paket: `package.json` `1.3.8`


## 1.3.8 ek güvenlik ve ACK kontrolü

- [x] `garajimHtmlEsc` temel HTML riskli karakterlerini kaçırır.
- [x] `garajimInlineJsArg` JSON dize argümanını HTML özniteliğine güvenli aktarır; enjeksiyon örneği kod çalıştırmadan özgün metin olarak kalır.
- [x] `garajimSafeImageSrc` `javascript:` ve SVG data URL'lerini reddeder; PNG/JPEG/GIF/WebP base64 ve HTTPS'i kabul eder.
- [x] Araç kartı, bildirim, sosyal akış ve bazı detay HTML noktaları güvenli yardımcıları kullanır. Kalan HTML render noktaları için kapsamlı güvenlik denetimi yapılması hâlâ gerekir.
- [ ] Tam `npm test`, Android APK build ve Galaxy Watch7 gerçek cihaz testi tamamlanmalı.

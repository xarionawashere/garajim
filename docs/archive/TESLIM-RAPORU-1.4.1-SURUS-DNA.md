# Garajım 1.4.1 — Sürüş DNA güncellemesi

## Uygulanan değişiklikler
- Sekiz DNA profilinin puanlama mantığı birbirinden ayrıldı; profil için veri yoksa varsayılan pozitif puan verilmez.
- Gece profili başlangıç saatine tek başına bakmak yerine sürüş süresinin gece oranını örnekler. Seyrek GPS örnekleri tek başına gece profilini doğrulamaz.
- Otoyol DNA'sı en yüksek hızı avantaj kabul etmez; 130 km/sa üstü gözlenen tepe hız puanı düşürür ve güvenli otoyol profili uygunluğunu engeller. Otoyol ve turcu profilleri yeterli hız örnekleri olmadan doğrulanmaz.
- GPS kalitesi, örnek sayısı, veri yeterliliği ve profilin tekrar eden gözlemleri ayrı tutulur.
- Profil kilidi üç ayrı nitelikli sürüşten sonra (Uzun Yol için iki) açılır; eski kilitler ve geçmiş puanlar korunur. `schemaVersion` alanı bulunmayan önceki kayıtlar da v2 şemasına taşınır.
- Aynı sürüş kimliği tekrar işlenirse toplam, puan örnekleri ve kilit sayaçları ikinci kez artırılmaz.
- Başarım ekranına sekiz profilin puan/veri yeterliliği ve son analiz geçmişi eklendi.
- Gizli test menüsüne kayıt yazmayan sekiz profilli DNA simülatörü eklendi.
- Keşif hesabı ham GPS noktaları yerine yaklaşık kilometrelik konum hücreleri saklar; bu bilgilerin yerel cihazda tutulduğu arayüz notuna eklendi.
- Navigasyon kaynaklarına dokunulmadı; sonraki adım için ayrı çalışma olarak bırakıldı.

## Sürüm
- Kaynak paket: 1.4.1
- Telefon APK: versionCode 13 / versionName 1.4.1 (GitHub Actions)
- Wear OS APK: versionCode 15 / versionName 1.4.1

## Doğrulama durumu
- `node scripts/check-syntax.js` başarılı.
- DNA motorunun sekiz sentetik senaryosu, aşırı tepe hız davranışı, yinelenen sürüş koruması ve eski kayıt migrasyonu için 6 bağımsız Node kontrolü geçti.
- Bağımsız statik regresyon testleri: 125 PASS. XML dosyaları: 16/16 parse edildi.
- Tam `npm test` bu ortamda çalıştırılamadı: derleme öncesinde `node_modules/chart.js/dist/chart.umd.js` bulunmuyor; bu nedenle JSDOM temelli `t30_ride_dna_engine.js` testi ve bütünleştirilmiş suite burada doğrulanmış sayılmaz. GitHub Actions bağımlılıkları kurduğunda bütün testler çalıştırılmalıdır.
- Gerçek telefon ve saat davranışı APK derlemesinden sonra cihazda doğrulanmalıdır. Bu paket hazır APK içermez.

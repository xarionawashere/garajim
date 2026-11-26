# Garajım 1.4.5 — Göz yormayan tema paketleri

## Yapılanlar
- Tema kataloğu 12 mevcut paketten 24 pakete çıkarıldı.
- Yeni paletler: Sisli Turkuaz, Alacakaranlık Lavanta, Yumuşak Arduvaz, Adaçayı, Sıcak Kum, Soluk Gül, Yosun ve Taş, Mürdüm Grisi, Bakır Dumanı, Mavi Saat, Yumuşak Zeytin, Kâğıt ve Mürekkep.
- Yeni paletler floresan/neon renkler kullanmaz; çoğu düşük doygunluklu, koyu veya yumuşak kırık beyaz zeminlerdir.
- İlk yükleme renk haritası (`index.html` üst bölüm), web ayarlarındaki tema kartları ve Wear OS `applyPhoneTheme` renk eşlemesi güncellendi.
- Wear OS birincil düğmesinin metin rengi, vurgu renginin göreli parlaklığına göre seçilir.
- Telefonun tema seçimini saatte uygulamak için önceki `/garajim/theme` Data Layer senkronizasyonu korunur.

## Sürüm
- Web kaynak: `package.json` 1.4.5
- Wear OS: versionCode 19 / versionName 1.4.5
- Telefon APK iş akışı: versionCode 16 / versionName 1.4.5

## Kontroller
- Ayrı statik tema testi `tests/t34_soft_theme_packs.js` ile çalıştırılmalıdır.
- JavaScript ve JSON sözdizimi kontrolleriyle tema kataloğunun her yeni kimliğinin ilk çizim ve Wear OS eşlemesinde bulunduğu doğrulanır.
- Bu teslim, APK'nın Gradle ile derlendiği veya gerçek telefon/saatte test edildiği anlamına gelmez. Fiziksel cihazdaki görünüm, kontrast ve göz rahatlığı kişisel olarak kontrol edilmelidir.

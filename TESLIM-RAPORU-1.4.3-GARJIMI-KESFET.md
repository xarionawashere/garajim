# Garajım 1.4.3 — Animasyonlu tanıtım ve “Şunu Dene!”

## İçerik
- İlk açılışta altı adımlı tam ekran tur, atlama ve geri/ileri.
- Sonraki açılışlarda kullanıcı bağlamına göre tek ve değişen öneri.
- Ayarlardan tekrar oynatma, öneriyi elle gösterme veya otomatik açılış önerilerini kapatma.
- Temel özelliklere doğrudan geçiş: araç ekleme, araç detayı/yakıt, navigasyon, park yeri, Sürüş DNA, yedekleme ayarları.
- `prefers-reduced-motion` desteği ve PIN kilidi görünürken tanıtımı açmama.
- Veri sadece `garaj_discovery_v1` tercih anahtarına yazılır; araç/rozet/sürüş kaydı değiştirilmez.

## Sürüm
- Kaynak / package.json: 1.4.3
- Telefon APK: versionCode 15, versionName 1.4.3 (GitHub Actions)
- Wear OS APK: versionCode 17, versionName 1.4.3

## Test
`tests/t33_discovery_onboarding.js` içerik ve davranış sözleşmesini kontrol eder. Tam `npm test` için Actions ortamında bağımlılıkların kurulması gerekir; statik testler gerçek cihaz görünümünün yerine geçmez.

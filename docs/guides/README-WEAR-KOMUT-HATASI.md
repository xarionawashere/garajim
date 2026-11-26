# Garajım Wear OS — “Bilinmeyen komut” düzeltmesi

## Bulunan neden

GitHub `main` dalındaki Wear OS `send()` metodu `select_vehicle|ARAÇ_ID` ve `summary_save|ÖZET_ID` gibi ifadeleri JSON içindeki `cmd` alanına olduğu gibi koyuyordu. Telefon tarafındaki komut eşleştiricisi `select_vehicle` beklediği için `select_vehicle|...` ifadesini tanıyamıyordu. Benzer sorun seçili araç kimliğiyle `start|ARAÇ_ID` komutunda da oluşabiliyordu.

## Pakette bulunanlar

- `native-android/.../GarajimWearListener.java`: Alternatif JSON alanlarını, eski `komut|argüman` zarfını, camelCase ve eski komut adlarını kabul eden telefon dinleyicisi. Tanınmayan komutu günlük kaydına ayrıntılı yazar.
- `WearMainActivity-send-fix.patch`: Mevcut GitHub `main` dalındaki `WearMainActivity.java` dosyasına yalnızca gerekli gönderim düzeltmesini uygular; `cmd` ve `arg` ayrı JSON alanları olur.
- `tests/t12_wear_reliability.js` ve `tests/t24_wear_command_protocol.js`: Komut protokolü için regresyon kontrolleri.

## GitHub projesine uygulama

1. Bu ZIP'i Garajım depo köküne çıkart; klasör yolları `native-android` ve `tests` olacak şekilde kaynak dosyalarının üzerine yaz.
2. Depo kökünde terminal açıp şu komutu çalıştır: `git apply WearMainActivity-send-fix.patch`.
3. `git status` ile dört değişiklik olduğunu doğrula; sonra şu dosyaları commit et ve `main` dalına gönder:
   - `native-android/src/main/java/com/garajim/app/GarajimWearListener.java`
   - `native-wear/src/main/java/com/garajim/wear/WearMainActivity.java`
   - `tests/t12_wear_reliability.js`
   - `tests/t24_wear_command_protocol.js`
4. GitHub Actions'taki **aynı başarılı derleme çalıştırmasından** hem `Garajim-Mobil-APK` hem `Garajim-WearOS-APK` artifact'larını indir. Komut protokolü iki uygulama arasında paylaşıldığı için test sırasında bu yeni iki APK'yı birlikte kullan.

Bu düzeltme kullanıcı verilerini silmeyi veya uygulama verisini temizlemeyi gerektirmez. Kaynak değişiklikleri bu oturumdan GitHub'a gönderilemedi; bu paket repoya uygulanıp gönderilmeye hazırdır.

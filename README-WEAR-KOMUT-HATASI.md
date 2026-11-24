# Wear OS “Bilinmeyen komut” düzeltmesi

## Kök neden
Saat uygulaması `send("start|<araç-id>")` ve `send("select_vehicle|<araç-id>")` gibi dahili komut metinlerini JSON zarfının `cmd` alanına olduğu gibi koyuyordu. Telefon tarafı JSON'u okuyordu ama `|` ayırıcısını yalnızca JSON olmayan düz metinlerde ayırdığı için `start|id` ve `select_vehicle|id` komutları eşleşmiyordu.

## Değişiklikler
1. `native-wear/src/main/java/com/garajim/wear/WearMainActivity.java`: komut ve argüman artık JSON'da ayrı `cmd` ve `arg` alanlarıyla gönderiliyor.
2. `native-android/src/main/java/com/garajim/app/GarajimWearListener.java`: eski saat APK'larından gelen `cmd: "start|id"` biçimi de kabul ediliyor; bitirme komutu için bilinen eski takma adlar da eşleniyor.
3. `tests/t24_wear_command_protocol.js`: bu protokol sözleşmesini kontrol eden yeni regresyon testi.

## Test doğrulaması
- `t24_wear_command_protocol.js`: 4/4 PASS
- `t13_native_background.js`: 23/23 PASS
- Ek statik kontroller: `t12`, `t14`, `t15`, `t20`, `t22`, `t23` bu paketin kaynaklarıyla çalıştırıldığında PASS.
- Bu doğrulamalar fiziksel saat testi veya Android APK derlemesinin yerini tutmaz.

## Kurulum notu
Telefon APK'sı ile Wear OS APK'sı **aynı düzeltilmiş kaynak koddan yeniden derlenmeli** ve ikisi de kurulmalı; yalnızca saat APK'sını güncellemek telefonun eski komut ayrıştırmasını düzeltmez. Eski APK'lar bu hatayı içerebilir. Yeni derlemede `npm test` ve Android build aşamaları başarılı olmalı.

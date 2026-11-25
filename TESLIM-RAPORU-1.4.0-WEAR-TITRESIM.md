# Garajım 1.4.0 — Wear OS başarım titreşimi düzeltmesi

## Belirti
Saat başarım bildirimi gösteriyor ama haptik titreşim üretmiyordu.

## Kaynak değişikliği
- `GarajimWearCelebrationListener`, bildirimi yayınladıktan sonra `VibratorManager`/`Vibrator` API’siyle aynı nadirlik desenini doğrudan tetikler.
- Android 13 ve üstünde titreşim `USAGE_NOTIFICATION` özniteliğiyle çağrılır.
- Önceden oluşturulmuş ve ayarı değiştirilemeyen bildirim kanallarından kaçınmak için kanal kimliği `garajim_achievement_v2_*` olarak artırılır.
- Bildirim kanalının kendi haptik titreşimi kapatılır; böylece doğrudan titreşimle çift tetikleme hedeflenmez.
- Telefon ve Wear OS sürümleri 1.4.0’a yükseltildi.

## Kontrol
`tests/t29_wear_achievement_haptics.js` statik kaynak regresyon kontrollerini içerir. Gerçek saat titreşimi ve tam Android derlemesi bu ortamda cihaz üstünde doğrulanmamıştır. Saatte sistem genelindeki titreşim / Rahatsız Etmeyin ayarları kapalıysa işletim sistemi yine titreşimi bastırabilir.

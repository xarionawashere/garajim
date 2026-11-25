# Gizli Başarım Kutlaması Testi

Bu paket, Wear OS başarı kutlaması entegrasyonuna uygulama içinden kullanılabilen bir test menüsü ekler.

## Nasıl açılır?
1. Telefon uygulamasını güncelleyip açın.
2. **Rozetlerim** koleksiyon ekranına girin.
3. Üstteki **Rozetlerim** başlığına 4 saniye içinde 7 kez hızlıca dokunun.
4. **Gizli kutlama testi** menüsünde nadirlik seçin.
5. **Telefon + saat kutlamasını dene** seçeneğine dokunun. Saat bağlantısını ayrı sınamak için **Yalnızca saate gönder** seçeneği vardır.

## Gerçek başarılar etkilenir mi?
Hayır. Test rozetinin kimliği geçicidir. Test, gerçek başarı kataloğunu açmaz/değiştirmez, `achievementStateSave` çağırmaz ve sürüş/aktivite geçmişine kayıt eklemez.

## İsteğe bağlı JS komutu
Uygulama içindeki WebView geliştirici konsolu kullanılabiliyorsa:

```js
window.garajimTestAchievementCelebration('legendary')
window.garajimTestAchievementCelebration('rare', 'watch')
window.garajimOpenAchievementTestMenu()
```

İlk komut telefon + saat, ikinci komut yalnızca saat, üçüncü komut test menüsü açar.

## ZIP içeriği
İçindeki yolları proje köküne göre koruyun. Mevcut dosyaların üzerine yazın ve yeni `tests/t27_wear_achievement_test_menu.js` ile bu rehberi ekleyin.

## Test durumu
Gizli test regresyon dosyası ve HTML satır içi JavaScript sözdizimi kontrolleri geçti. Tam `npm test`, ortamda `node_modules/chart.js/dist/chart.umd.js` bulunmadığı için derleme aşamasında durdu; tam test paketi sonucu olarak değerlendirilmemelidir.

# Garajım Android yerel özellikleri

Bu dizindeki native Java sınıfları GitHub Actions tarafından Capacitor'ın oluşturduğu Android projesine kopyalanır.

## Ana ekran widget'ları

- **Hızlı Kontrol:** Araç durumu, yaklaşan bakım ve Yakıt / KM / Bakım / Sürüş / Park kısa yolları.
- **Garajım Kartı:** Kayıtlı araçların plaka ve kilometre özeti, seçili aracın yakıt ve bakım bilgisi.
- **Bakım Takibi:** Seçili aracın bakım kilometresine kalan mesafe ve ilerleme çubuğu.
- **Yakıt & KM:** Ortalama tüketim, kilometre ve yakıt kayıt sayısı.
- **Rozet Koleksiyonu:** Kazanılan rozet sayısı ve sıradaki hedefin ilerlemesi.

Araç verisi web uygulamasından `syncWidget` köprüsüyle, başarım verisi rozet sistemi güncellendiğinde aynı köprü üzerinden SharedPreferences'a aktarılır. Böylece tüm widget örnekleri güncellenir. Birden çok araç varsa Garajım Kartı ve Hızlı Kontrol içinden araç değiştirilebilir.

## Diğer yerel özellikler

- Yerel hatırlatma: uygulamadaki **Sistem bildirimi** düğmesinden izin istenir ve Android AlarmManager ile yaklaşık 09.00 için bakım kontrolü hatırlatması kurulur. Android pil tasarrufu saati geciktirebilir.
- Bildirim metni şu an genel hatırlatmadır; uygulamadaki her araç için ayrı bakım son tarihiyle native alarm eşleştirmesi yapmaz.

Gerçek cihazda widget boyutları, ana ekran başlatıcısı, izinler, yenileme ve üretici pil optimizasyonu test edilmelidir.

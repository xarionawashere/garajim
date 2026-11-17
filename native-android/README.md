# Garajım Android yerel özellikleri

Bu dizin GitHub Actions iş akışınca Capacitor'ın oluşturduğu `android/` projesine kopyalanır.

- Ana ekran widget'ı: kayıtlı ilk aracın adını, plakasını ve kilometresini gösterir; dokununca uygulamayı açar.
- Widget verisi: web uygulaması araçları kaydederken native JavaScript köprüsüyle SharedPreferences'a aktarılır.
- Yerel hatırlatma: uygulamadaki **Sistem bildirimi** düğmesinden izin istenir ve Android AlarmManager ile her gün yaklaşık 09.00 için alarm kurulur. Alarm, son kaydedilen araç verisindeki tarihleri ve bakım kilometresi eşiğini her çalıştığında yeniden hesaplar; uygulama kapalıyken yaklaşan tarih uyarıları güncellenebilir. Kilometre uyarıları son kaydedilen km değerini kullanır. Android pil tasarrufu saati geciktirebilir.

Gerçek cihazda izin, widget yenileme, yeniden başlatma ve üretici pil optimizasyonu testleri yapılmalıdır.

# Garajım Android yerel özellikleri

Bu dizin GitHub Actions iş akışınca Capacitor'ın oluşturduğu `android/` projesine kopyalanır.

- Ana ekran widget'ı: kayıtlı ilk aracın adını, plakasını ve kilometresini gösterir; dokununca uygulamayı açar.
- Widget verisi: web uygulaması araçları kaydederken native JavaScript köprüsüyle SharedPreferences'a aktarılır.
- Yerel hatırlatma: uygulamadaki **Sistem bildirimi** düğmesinden izin istenir ve Android AlarmManager ile her gün yaklaşık 09.00 için genel bakım kontrolü hatırlatması kurulur. Android pil tasarrufu saati geciktirebilir.
- Bildirim metni şu an genel hatırlatmadır; uygulamadaki her araç için ayrı bakım son tarihiyle native alarm eşleştirmesi yapmaz.

Gerçek cihazda izin, widget yenileme, yeniden başlatma ve üretici pil optimizasyonu testleri yapılmalıdır.

# Garajım Android yerel özellikleri

Bu dizin GitHub Actions iş akışınca Capacitor'ın oluşturduğu `android/` projesine kopyalanır.

- Ana ekran widget'ı: kayıtlı ilk aracın adını, plakasını ve kilometresini gösterir; dokununca uygulamayı açar.
- Widget verisi: web uygulaması araçları kaydederken native JavaScript köprüsüyle SharedPreferences'a aktarılır.
- Android derleme: Capacitor 8 / API 36 hedeflenir; arka plan konum açıklaması sürüş başlamadan önce uygulama içinde gösterilir.
- Yerel hatırlatma: uygulamadaki **Sistem bildirimi** düğmesinden izin istenir ve Android AlarmManager ile her gün yaklaşık 09.00 için hatırlatma kurulur. Android pil tasarrufu saati geciktirebilir.
- Bildirim, uygulama en son açıkken JavaScript tarafından SharedPreferences içine eşitlenen yaklaşan/geciken uyarı satırlarını kullanır. Uygulama uzun süre kapalı kalırsa son tarihler alarm anında yeniden hesaplanmaz; uygulamayı tekrar açınca uyarılar güncellenir. Bu sınırlama gerçek cihaz testinde dikkate alınmalıdır.

Gerçek cihazda izin, widget yenileme, yeniden başlatma ve üretici pil optimizasyonu testleri yapılmalıdır.

# 🚗 Garajım

**Garajım**, araç bilgilerini ve kullanım giderlerini takip etmeye yardımcı olan bir uygulamadır. Bakım kilometresi, yakıt tüketimi ve maliyet hesaplamaları, kilometre OCR desteği ve Android hatırlatma/widget katmanı gibi özellikler içerir.

> Bu README, 17.11.2026 tarihli altı aşamalı kontrol raporuna göre hazırlanmıştır. Kaynak kodun statik kontrolleri ve seçili işlev testleri başarılıdır; ancak rapor tarihinde tam web derlemesi, APK derlemesi ve gerçek cihaz testleri tamamlanmamıştır.

## ✨ Özellikler

- **Bakım takibi:** Yaklaşan ve gecikmiş bakım kilometrelerini takip etmeye yardımcı olur.
- **Yakıt tüketimi hesabı:** Tam depo–tam depo ve kısmi dolum senaryolarını ele alır.
- **Yakıt maliyeti:** Maliyet verisi eksik olduğunda maliyet uydurulmaz.
- **Masraf analizi:** 100 km başına toplam masraf hesabı.
- **Kilometre OCR:** OCR tarafından bulunan kilometre adaylarını değerlendirmeye yönelik işlevler.
- **Android hatırlatmaları ve widget:** Günlük alarm sırasında tarih ve bakım kilometresi uyarılarının yeniden hesaplanması için native katman.
- **Kayıt/yedekleme:** Yedekleme kapsamını ve geri yükleme davranışını doğrulamak için uygulama içindeki mevcut akışın ayrıca test edilmesi gerekir.

## 🧪 Kontrol durumu

17 Kasım 2026 tarihli kontrol raporuna göre:

- ZIP arşivinin bütünlük kontrolü geçti.
- HTML ayrıştırması ve JavaScript sözdizimi kontrolleri geçti.
- 179 statik HTML ID'sinde tekrar bulunmadı.
- 111 satır içi olay işleyicisi ve 79 farklı işleyici giriş adı taramasında çözümlenemeyen işleyici bulunmadı.
- Seçili bakım, yakıt, maliyet ve OCR aday sıralama testleri geçti.
- Beş XML kaynağı ayrıştırıldı ve kullanılan 15 Android `R.id` öğesi yerleşimde bulundu.
- Hatırlatıcı tarih hesabının bugün, yarın ve dün senaryoları test edildi.

### Henüz doğrulanmayanlar

- npm kayıt sunucusuna ağ/DNS erişimi olmadığından tam web derlemesi tamamlanamadı.
- Ortamda Android SDK ve Gradle bulunmadığından APK derlemesi yapılamadı.
- Emülatör veya gerçek Android cihaz testi yapılmadı.
- Widget ekleme, bildirim izni, cihaz yeniden başlatıldıktan sonraki alarm davranışı ve üretici pil optimizasyonları canlı cihazda doğrulanmadı.

Bu nedenle kaynak kontrollerinin ve seçili testlerin başarılı olması, yayımlanmaya hazır APK üretildiği veya bütün özelliklerin gerçek cihazda doğrulandığı anlamına gelmez.

## 🔔 Android hatırlatmaları hakkında

Kontrol raporunda belirtilen düzeltmeyle, günlük alarm çalışırken tarih ve bakım kilometresi uyarılarının yeniden hesaplanması ve widget uyarı satırının güncellenmesi sağlandı. Kilometre uyarısı son kaydedilen kilometre değerini kullanır; araç kullanıldıkça kilometre bilgisi, uygulama açılıp yeni değer kaydedilene kadar kendiliğinden ilerlemez.

## 📦 Kurulum ve geliştirme

Kaynak kodu klonlamak için:

```bash
git clone https://github.com/xarionawashere/garajim.git
cd garajim
```

Derleme ve bağımlılık yükleme adımları, projenin mevcut yapılandırma dosyalarına ve kullanılan araç sürümlerine göre izlenmelidir. Kontrol raporunda `npm install --no-audit --no-fund` işlemi ağ/DNS hatası (`EAI_AGAIN`) nedeniyle tamamlanamamış; bu nedenle gerçek bağımlılıklarla `node build-web.js` çalıştırılamamıştır.

## 🐛 Hata bildirimi

Bir hata veya geliştirme önerisi için [GitHub Issues](https://github.com/xarionawashere/garajim/issues) bölümünü kullanabilirsiniz. Bildirime mümkünse şu bilgileri ekleyin:

- Sorunun açıklaması ve tekrarlama adımları
- Beklenen ve gerçekleşen sonuç
- İşletim sistemi, uygulama ve ilgili oyun/araç verisi sürümü (uygunsa)
- Hata mesajı veya ekran görüntüsü

Kişisel bilgileri, erişim anahtarlarını veya özel kayıt/yedek dosyalarını herkese açık olarak paylaşmayın.

## 📄 Lisans

Lisans koşulları için depoda bulunan lisans dosyasını kontrol edin. Lisans dosyası yoksa kullanım ve yeniden dağıtım izinlerinin tanımlı olduğunu varsaymayın.

---

**Geliştirici:** [@xarionawashere](https://github.com/xarionawashere)  
**Depo:** [xarionawashere/garajim](https://github.com/xarionawashere/garajim)

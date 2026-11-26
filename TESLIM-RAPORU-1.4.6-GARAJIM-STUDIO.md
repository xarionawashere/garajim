# Garajım 1.4.6 — Studio teslim raporu

## Neler değişti
- Eski Asistan sekmesi, **Garajım Studio** adıyla araç tasarımı ve modifikasyon proje merkezine dönüştürüldü.
- Kayıtlı Garajım aracından proje başlatılabilir; kayıtlı araç yoksa marka/model/yıl/kasa tipi ve isteğe bağlı fotoğraf ile bağımsız Studio profili oluşturulabilir. Yaygın markalar ve modeller için yerel hızlı öneri listesi de vardır; listede olmayan metin serbestçe girilebilir. Plaka zorunlu değildir.
- Fotoğraflar 1000 px genişliğe ve JPEG kalite 0.68'e sıkıştırılarak cihaz içi depolamaya hazırlanır.
- 8 renk seçeneğiyle etkileşimli genel otomobil maketi, tasarım varyantlarını kaydetme/uygulama ve paylaşım özeti eklendi.
- Parça listesi: kategori, marka/ürün kodu, elle girilen fiyat, planlandı/sipariş edildi/takıldı durumu, kullanıcının uyumluluk doğrulaması kaydı.
- Proje günlüğü, notlar, JSON proje dışa aktarma ve mevcut Garajım JSON yedeğine Studio projelerini ekleme/geri yükleme desteği eklendi.
- AI API anahtarı alanı artık kullanılmayan ayarlar bölümünden kaldırıldı; eski sohbet kodu kaynakta bırakıldı ama navigasyondan erişilmiyor.

## Dürüst kapsam notları
- Bu pakette harici, lisanslı tüm-markalar araç kataloğu veya canlı ürün/fiyat kaynağı eklenmedi. Katalog yerine mevcut Garajım araç kayıtları ve manuel profil oluşturma seçenekleri kullanılıyor.
- Fotoğraf referans olarak tutulur; orijinal aracın fotoğraf boyası yapay biçimde değiştirilmiş gibi gösterilmez. Renk görselleştirmesi genel SVG silüet üzerinde çalışır.
- Parça uyumluluğu otomatik doğrulanmaz; kullanıcı kayıt tutabilir, ama teknik uyumluluk üretici verisi/uzmanla kontrol edilmelidir.

## Kontrol durumu
- Studio statik regresyon testi: 13 kontrol geçti.
- İlgili mevcut statik regresyonlar dahil 17 test dosyasında toplam 188 kontrol geçti.
- 13 eski uçtan uca test dosyası, bu çalışma ortamında `jsdom` paketi bulunmadığı için başlatılamadı; bu testler geçmiş sayılmadı.
- Sekiz inline JavaScript bloğu `node --check` ile sözdizimi kontrolünden geçti.
- Android/Watch APK derlemesi ve gerçek cihaz doğrulaması bu değişikliğin parçası olarak yapılmadı.

## 1.4.6 — Garajım Studio
- Asistan sekmesi, araç tasarımı ve modifikasyon projesi çalışma alanı olarak yeniden tasarlandı.
- Kayıtlı garaj aracından proje oluşturma veya plaka zorunluluğu olmadan bağımsız araç profili açma eklendi; yaygın marka/model hızlı seçim listesi ve serbest metin girişi birlikte destekleniyor.
- Fotoğraf seçme ve cihaz içinde sıkıştırma, boya rengi maketi, kaydedilebilir tasarım varyantları eklendi.
- Modifikasyon listesi, manuel fiyat/bütçe takibi, sipariş/montaj durumu ve proje zaman çizelgesi eklendi.
- Studio projeleri uygulama yedeğine dahil edildi; doğrulanmamış parça uyumluluğu açıkça işaretleniyor.

## 1.4.5 — Göz yormayan tema paketleri
- Tema kataloğu 12 yeni, düşük doygunluklu paletle 24 pakete çıkarıldı: Sisli Turkuaz, Alacakaranlık Lavanta, Yumuşak Arduvaz, Adaçayı, Sıcak Kum, Soluk Gül, Yosun ve Taş, Mürdüm Grisi, Bakır Dumanı, Mavi Saat, Yumuşak Zeytin ve Kâğıt ve Mürekkep.
- İlk ekran çizimindeki renk haritası, web tema kataloğu ve Wear OS renk eşlemesi senkronize edildi.
- Wear OS ana sürüş düğmesinin metin rengi, vurgu renginin parlaklığına göre siyah/beyaz seçilerek okunabilirlik korundu.
- `tests/t34_soft_theme_packs.js` tema katalogu, her paletin ilk çizim haritasında ve Wear OS tarafında bulunması için statik kontroller içerir.
- Doğrulama sınırı: kaynak/statik testler gerçek cihazda görsel konfor, renk algısı veya APK kurulumunu doğrulamaz; saat/telefon üzerinde kontrol edilmelidir.

## 1.4.4 — Wear OS çok sayfalı arayüz ve tema eşitleme
- Saat arayüzü Kokpit, Müzik, Navigasyon ve Garaj sayfalarına ayrıldı.
- Telefon tema paketinin Wear OS cihazına Data Layer üzerinden eşitlenmesi eklendi.
- Doğrulama sınırları ve cihaz testi adımları `TESLIM-RAPORU-1.4.4-WEAR-REDESIGN-TEMA.md` içinde.

## 1.4.3 — Animasyonlu ilk tanıtım ve “Şunu Dene!”

- İlk açılışta 6 adımlı animasyonlu Garajım tanıtımı; her adımda Atla, Geri ve Devam et.
- Sonraki açılışlarda her seferinde değişen, tek kartlık “Şunu Dene!” önerisi. Atla ile anında kapatılabilir.
- Öneriler kullanıcı ilerlemesine göre uyarlanır: araç yoksa araç ekleme, araç varsa bakım/yakıt, ayrıca navigasyon, park yeri, DNA ve yedekleme.
- Ayarlar → Garajım’ı Keşfet bölümünden tanıtımı tekrar izleme, isteğe bağlı ipucu gösterme ve açılış önerilerini kapatma.
- Animasyonlar azaltılmış hareket tercihini izler; içerik yerel saklanır ve mevcut araç/rozet verileri değiştirilmez.
- Telefon APK sürümü versionCode 15 / versionName 1.4.3, Wear OS versionCode 17 / versionName 1.4.3.
- `tests/t33_discovery_onboarding.js` ilk tanıtım, Atla, açılış ipuçları ve ayar kontrolleri için eklendi.
- **Doğrulama sınırı:** Kaynak/sentaks/regresyon kontrolleri gerçek cihaz animasyon yerleşimini veya uygulama içindeki yönlendirmeleri tek başına kanıtlamaz; Actions ve cihaz kontrolü gerekir.

## 1.4.2 — Navigasyon güvenilirliği ve sade Açık Dünya arayüzü

- Navigasyon açık dünya sürüş kaydından bağımsız arka plan konum izleme desteğiyle güçlendirildi; ortak konum izleyicisi navigasyon sürerken yanlışlıkla kapatılmaz.
- GPS doğruluğu dikkate alınarak rota dışı algılama uyarlanabilir hale getirildi; zayıf konumda gereksiz yeniden hesaplama ve sesli talimatlar bastırılır.
- Yeniden rota isteklerine bekleme süresi eklendi; büyük konum sıçramasında rota boyunca tam tarama ile konum eşleme yapılır.
- Aktif hedef ve rota ilerlemesi 12 saatlik sınırla kaydedilir; uygulama yeniden açıldığında kullanıcı isterse yolculuğa devam edebilir.
- Nominatim adres sonuçları önbelleğe alınır ve canlı istekler arasında en az 1,1 saniye bırakılır.
- OSM standart karo sunucusundan toplu/çevrimdışı ön indirme kaldırıldı; internet/rota durumu doğru anlatılır ve harita lisans atfı görünür.
- Açık Dünya ekranındaki kalıcı butonlar 12+ görünür kontrol yerine konum + navigasyon ve tek araçlar menüsüne indirildi; nadir araçlar açılır panelde toplandı.
- Telefon APK versionCode 14 / versionName 1.4.2; Wear OS versionCode 16 / versionName 1.4.2.

## 1.4.1 — Sürüş DNA motoru ve profil panosu

- Sekiz DNA profili de ölçülebilir sinyallerden ayrı puan ve veri yeterliliği alır.
- Gece profili başlangıç saatine tek başına bakmak yerine sürüş süresinin gece oranını örnekler.
- Otoyol profili yüksek tepe hızı ödüllendirmez; aşırı tepe hız puanı düşürür ve profil şartını sağlamaz.
- Yinelenen sürüşlerin DNA toplamını/sayaçlarını ikinci kez artırması engellendi.
- Yeni DNA profilleri tekrarlanan nitelikli sürüşlerle doğrulanır; eski DNA ve kazanılmış kilitler korunur.
- Başarım ekranına sekiz profilli puan/veri yeterliliği panosu ve son analiz geçmişi eklendi.
- Gizli kutlama test menüsüne, kalıcı sürüş/DNA kaydı oluşturmayan sekiz profilli DNA simülatörü eklendi.
- Sürüm adı 1.4.1; telefon versionCode 13, Wear OS versionCode 15.

## 1.4.0 — Wear OS başarım titreşimi düzeltmesi
- Arka planda başarım bildirimi geldiğinde WearableListenerService artık nadirliğe uygun titreşimi doğrudan tetikler.
- Eski, titreşim ayarı kilitlenmiş bildirim kanallarından ayrılmak için yeni `garajim_achievement_v2_*` kanal kimlikleri kullanılır.
- Bildirim kanalı ve doğrudan haptik çift titreşim yaratmayacak şekilde ayrıldı.
- Telefon APK versionCode 12; Wear OS APK versionCode 14; sürüm adı 1.4.0.
- `tests/t29_wear_achievement_haptics.js` statik regresyon kontrolleri eklendi.

# Garajım Değişiklik Günlüğü

## 1.3.9 — Başarım kutlaması, Wear OS ve garaj ana ekranı

- 51 rozetlik başarım kataloğu ve Sürüş DNA hedefleri; telefon ekranında nadirliğe göre kutlama animasyonu ve titreşim.
- Kazanılan rozetler, Wear Data Layer üzerinden saate gönderilir; saat ekranında başarım katmanı ve nadirliğe göre titreşim gösterilir. Saat uygulaması kapalıyken Wear OS bildirim dinleyicisi bildirim oluşturur.
- Gizli kutlama test menüsü: Rozetlerim başlığına 4 saniyede 7 dokunuşla açılır; telefon/saat/birlikte testleri gerçek kazanım durumuna yazmaz.
- Ana garaj ekranındaki “Garaj Özeti” kartı kaldırıldı. Uzun `sticky` başlık kaldırılarak araç listesi kaydırmada ekranı kaplamaz; rozet kartı ve araç kartları sıkıştırıldı, alt gezinme çubuğu için kaydırma boşluğu eklendi.
- Telefon ve Wear OS kaynak sürümü 1.3.9; otomatik regresyon testleri `t26`, `t27` ve `t28` ile genişletildi.
- **Doğrulama sınırı:** Kaynak/statik testler derlemeyi veya Galaxy Watch üzerinde gerçek zamanlı davranışı kanıtlamaz; GitHub Actions ve cihaz testiyle doğrulanmalıdır.

## 1.3.8 — Güvenli metin/görsel render'ı ve ACK kurtarma düzeltmesi

- Telefon arayüzünde içe aktarılmış araç, bildirim ve yerel sosyal akış metinleri HTML kaçışından geçirilir; dinamik kimlikler HTML özniteliğine güvenli JSON dize argümanı olarak yazılır.
- Araç, fiş ve sosyal fotoğraf kaynakları yalnızca base64 PNG/JPEG/GIF/WebP veya HTTPS URL kabul eder; `javascript:` ve SVG data URL'leri görsel kaynağı olarak reddedilir. Bu, uygulamadaki tüm render noktalarının kapsamlı güvenlik denetimi değildir.
- Saatte ACK bekleme penceresi ekran uyku/uyanma sonrası yeniden başlatılır; tek Wear düğümüne gönderim hatası diğer bağlı düğümlerin denenmesini engellemez.
- `tests/t23_import_render_safety.js` kaçış yardımcılarını çalıştırıp kasıtlı HTML/JS enjeksiyon örneklerini ve görsel URL politikasını doğrular.
- Telefon `versionCode 10 / 1.3.8`, Wear OS `versionCode 12 / 1.3.8`, `package.json` `1.3.8`.
- **Doğrulama sınırı:** Kaynak testleri ve statik analiz geçti; npm/DOM testleri bağımlılık indirme engeli nedeniyle tamamlanamadı. Android SDK/Gradle ve gerçek telefon/saat testleri bu ortamda çalıştırılamadı.

## 1.3.7 — Saat ACK kurtarma ve teslim doğrulaması

- Saat uygulaması uykuya girerken bekleyen komut kimliğini korur; ekrana geri dönüldüğünde kalıcı Data Item ACK'sini yakalamak için iki dakikalık kurtarma penceresini yeniden başlatır. Böylece kısa ön plan zaman aşımı, ekran uykusunda komut kimliğini erken silmez.
- Mesaj gönderimi birden fazla bağlı düğüme denendiğinde tek düğüm hatası diğer gönderimlerin denenmesini engellemez. En az bir gönderim başarılıysa ACK beklenir; hiçbiri başarılı değilse kullanıcıya açık uyarı gösterilir.
- `tests/t22_wear_ack_resume_grace.js` uyku/uyanma zaman aşımı sözleşmesini denetler.
- Telefon sürümü `versionCode 9 / 1.3.7`, Wear OS sürümü `versionCode 11 / 1.3.7`, `package.json` sürümü `1.3.7` olarak yükseltildi.
- **Doğrulama sınırı:** Bu ortamda npm paketleri indirilemediği için DOM testlerinin 11'i blokeli; Android SDK/Gradle olmadığından APK derleme ve Galaxy Watch7 testleri yapılmadı. Kaynak kontrolleri, XML ayrıştırma ve JavaScript sözdizimi denetimi ayrıca raporlanmalıdır.


## 1.3.6 — Wear OS kokpit ergonomisi

- Sürüş aracı seçimi ve Başlat/Duraklat/Bitir kontrolleri müzik kartının altından çıkarılıp ilk ekrana yakın konuma alındı. Öncelikli sürüş aksiyonları önce, rota ve müzik yardımcı alanları sonra geliyor.
- Araç seçimi, bekleyen sürüş özeti, park ve müzik dokunma hedefleri 44 dp yapıldı. Önceki/sonraki parça ve oynat/duraklat düğmelerine ekran okuyucu açıklaması eklendi.
- Saat komut onayları hızlı `MessageClient` yanıtına ek olarak komut kimliğine özel Data Item ile saklanır. Ekran uykuya girince bekleyen ACK kimliği silinmez; saat yeniden açılınca kalıcı yanıtı okumayı ve tüketilen ACK öğesini silmeyi dener.
- `npm test` bağımlılıkları/`www` paketi hazır değilse DOM testlerini bloke olarak raporlar, fakat bağımsız statik regresyon kontrollerini yine çalıştırır. Eksik bağımlılık durumu yine başarısız çıkış koduyla bildirilir.
- Telefon APK sürümü `versionCode 8 / 1.3.6`, Wear OS APK sürümü `versionCode 10 / 1.3.6`, kaynak `package.json` sürümü `1.3.6` olarak yükseltildi.
- Telefon arayüzünde `maximum-scale=1.0` ve `user-scalable=no` kaldırıldı; kullanıcı sistem yakınlaştırmasını kaybetmez. Bu sözleşme `tests/t18_accessibility_baseline.js` içine eklendi.
- Yeni kontroller: `tests/t20_wear_cockpit_hierarchy.js` ve `tests/t21_wear_durable_ack.js`, önemli sürüş eylemlerinin sırasını ve dokunma/erişilebilirlik hedeflerini denetler.
- **Doğrulama sınırı:** XML ve kaynak regresyon kontrolleri gerçek cihaz yerleşimi, Android derlemesi veya sürüş sırasında güvenli kullanımı kanıtlamaz. Bunlar Actions ve Galaxy Watch7 testleriyle ayrıca doğrulanmalı.

## 1.3.5 — Ekran kapalıyken müzik ve park kısayolları

- Saatten gelen önceki/sonraki/oynat-duraklat müzik komutları, WebView açıksa önce Garajım köprüsünü kullanır; WebView yoksa yerel Android `MediaSession`/medya tuşlarına düşer.
- Park yeri koordinatı kaydedildiğinde native `SharedPreferences` içine doğrulanmış bir kopya yazılır; park kaydı silinince native kopya da temizlenir. Önceden kaydedilmiş bir park konumu uygulama açılışında yeni kopyaya eşitlenir.
- WebView kapalıyken saatten park yeri sorulabilir. Mesafe/yön yalnızca son GPS düzeltmesi iki dakikadan yeni ise gösterilir; daha eski konum güncelmiş gibi sunulmaz.
- Native servis, doğrudan kendisine yönlendirilen müzik komutlarını da işler. Park yeri yoksa veya GPS eskiyse saat için anlaşılır uyarı yayınlar.
- Yeni kaynak regresyon kapsamı: `tests/t19_native_park_location.js`; `t17` medya/park yönlendirme sözleşmesi gerçek ekran kapalı senaryosuna göre güncellendi.
- Manuel yayın doğrulama adımları ve açık ortam sınırlamaları `TEST-KONTROL-LISTESI-1.3.5.md` dosyasına eklendi.
- Sürümler telefon `versionCode 7 / 1.3.5`, Wear OS `versionCode 9 / 1.3.5`, `package.json` `1.3.5` olarak hizalandı.
- **Doğrulama sınırı:** Kaynak statik testleri APK derlemesi veya Galaxy Watch7 üzerinde gerçek medya/GPS davranışı yerine geçmez. Ortamda Android SDK/Gradle eksik olduğundan fiziksel cihaz testi ve APK üretimi ayrıca yapılmalı.

## 1.3.4 — Wear senkronizasyon dayanıklılığı

- Telefonun Wear Data Layer senkronizasyonunda sürüş durumu için **son değer odaklı kuyruklama** eklendi. Ağ yavaşlarsa her eski saniyelik snapshot ayrı ayrı kuyruğa yığılmak yerine en güncel bekleyen durum tutulur.
- Sürüş durumu yazımları tek tek yürütülür; arada bekleyen yeni bir durum varsa diğer kuyruk işlerinin arkasına alınarak araç listesi ve uyarı aktarımının aç kalması azaltılır.
- Durum önbelleği yalnızca Data Layer yazımı başarılı olduktan sonra güncellenir; hata olursa başarısız snapshot başarılıymış gibi işaretlenmez.
- Saat komutlarına benzersiz kimlikli telefon onayı eklendi. Saat, yalnızca `sendMessage` tamamlandı diye komutun kabul edildiğini varsaymaz; telefon kabul/red yanıtı döndürür. Yanıt gelmezse saat ekran açık kaldığı sürece zaman aşımı uyarısı gösterir.
- Eski saat sürümlerinin düz komut biçimi telefon tarafında desteklenmeye devam eder.
- Native sürüş servisi aktifken müzik/park kısayollarının yanlışlıkla sadece native servise gidip çalışmaması düzeltildi: açık WebView varsa bu eylemler JS medya/park köprüsüne gider; WebView yoksa saat açık bir uyarı alır.
- Klavye odağı için görünür vurgu, dokunma gecikmesini azaltan `touch-action` ve `prefers-reduced-motion` desteği eklendi.
- Yeni statik regresyon testleri: `tests/t15_wear_sync_coalescing.js`–`tests/t18_accessibility_baseline.js`.
- Telefon sürümü `1.3.4` / `versionCode 6`; Wear OS sürümü `1.3.4` / `versionCode 8` olarak hizalandı.
- **Doğrulama sınırı:** Bu iterasyonda statik kontroller çalıştırılabilir; Android APK derlemesi ve gerçek telefon–Galaxy Watch bağlantı testi ayrı doğrulanmalıdır.

## 1.3.3 — Wear OS kokpit iyileştirmeleri

- Saat ekranında sürüş mesafesi, süre ve maksimum hız ayrı ölçüm kartlarına ayrıldı.
- Seçili araç/plaka alanı hız göstergesinden ayrıştırıldı; mini rota alanı biraz genişletildi.
- Koyu lacivert kart ve hız halkası stilleri güncellendi.
- Native rota JSON oluştururken bozuk koordinat girdilerinin tüm durum yayınını bozmasını önleyen kontrollü hata ele alma eklendi.
- Wear/telefon sürüm kontrolleri ve kurulum belgeleri güncellendi.

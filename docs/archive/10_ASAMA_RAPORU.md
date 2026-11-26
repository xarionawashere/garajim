# Garajım — 10 Aşamalı Detaylı Teknik Kontrol Raporu

**İncelenen dosya:** `Garajim-guncel.zip`  
**Kontrol edilen kaynak sürümü:** `package.json` sürüm `1.2.0`  
**Rapor tarihi:** 17 Kasım 2026  
**Sonuç:** Kaynak kodda tespit edilen birkaç kusur düzeltildi. Kaynak seviyesindeki otomatik testler geçti. **Ancak APK/AAB derlemesi ve gerçek Android cihaz testi bu ortamda çalıştırılamadı; bu nedenle proje, gerçek cihaz ve Google Play yayını için bütünüyle doğrulanmış sayılmaz.**

## Yönetici özeti

- JavaScript sözdizimi: başarılı.
- Hedefli fonksiyon testleri: **25/25**; ayrıca UTC+14 ve America/Los_Angeles saat dilimlerinde 25/25.
- HTML: parse edildi; **183 benzersiz ID**, yinelenen ID yok.
- Android XML kaynakları: **5/5** parse edildi.
- GitHub Actions YAML: parse edildi; içindeki **3 Python bloğunun** sözdizimi kontrol edildi.
- PNG uygulama ikonları: ikisi de okunabilir, her biri 1024×1024.
- ZIP bütünlüğü: çıktı arşivinde hata yok.
- Üretim web derlemesi: **çalıştırılamadı**. `node_modules` mevcut değildi ve npm bağımlılık kurulumu ağ/DNS hatasıyla tamamlanmadı. `npm run build:web` bu nedenle `node_modules/chart.js/dist/chart.umd.js` eksikliğinde durdu. Bu, bağımlılıkları kurulu bir CI ortamında tekrar çalıştırılmalı.
- Android derlemesi: **çalıştırılamadı**. Bu ortamda Android SDK (`ANDROID_HOME`) ve Gradle yok. GitHub Actions iş akışı statik olarak kontrol edildi ama imzalı AAB üretilip test edilmedi.

## 1. Aşama — ZIP bütünlüğü ve açılabilirlik

**Durum: BAŞARILI**

**Kontrol:** Yüklenen arşiv açıldı; proje dosyaları çıkarıldı ve incelendi. Düzeltilmiş paket yeniden oluşturulup ZIP bütünlük testi yapılacak.

**Sonuç:** Dosya incelemesine engel olacak bir arşiv bozulması görülmedi. Nihai arşiv için `unzip -t` kontrolü tekrarlandı.

## 2. Aşama — Proje yapısı ve gerekli dosyalar

**Durum: BAŞARILI, bir tekrarlanabilirlik notuyla**

**Kontrol edilenler:** `index.html`, `package.json`, `capacitor.config.json`, `build-web.js`, Tailwind girdisi/yapılandırması, `native-android/`, `.github/workflows/build-apk.yml`, ikonlar ve test scriptleri.

**Düzeltmeler:** Test scriptleri eklendi; eski kurulum belgelerindeki yanlış artifact adları, secret adları ve mevcut olmayan `logo.png` varsayımı düzeltildi. Yeni yönergeler depo kökünün tamamının yüklenmesini söylüyor.

**Açık nokta:** ZIP'te `package-lock.json` yok. Doğrudan npm bağımlılıkları sürüm numaralarıyla sabitlenmiş olsa da geçişli bağımlılıklar lock dosyası olmadan tamamen tekrarlanabilir değildir. Ağ erişimi olan ortamda lock dosyası oluşturulup repoya eklenmeli; sonrasında CI'da `npm ci` kullanılmalı.

## 3. Aşama — Bağımlılıklar ve web derleme betiği

**Durum: KAYNAK KONTROLÜ BAŞARILI; GERÇEK DERLEME ENGELLİ**

**Kontrol:** `package.json`, `build-web.js` ve kaynak dosya yolları incelendi. `build-web.js` eksik bir dosyada derlemeyi hata ile durduracak şekilde tasarlanmış.

**Bulgu ve düzeltme:** OCR paketinin çekirdek dosyası kopyalama filtresi, WASM kullanılmayan ortamlardaki geri dönüş JS varyantlarını kapsamıyordu. Filtre genişletildi; genel, SIMD, LSTM ve SIMD+LSTM için `.js`, `.wasm` ve `.wasm.js` varyantları (12 dosya biçimi) dahil edildi. Gerekli çekirdek dosyaları bulunmazsa betik açık hata vermeye devam ediyor.

**Çalıştırma durumu:** `npm install --ignore-scripts --no-audit --no-fund` ağ/DNS erişim hatası (`EAI_AGAIN`) nedeniyle tamamlanmadı. Ardından `npm run build:web` denendi ve bağımlılıklar kurulu olmadığı için `node_modules/chart.js/dist/chart.umd.js` dosyasında durdu. Bu nedenle oluşmuş `www/` çıktısı başarılı derleme olarak raporlanmıyor.

## 4. Aşama — JavaScript sözdizimi

**Durum: BAŞARILI**

`npm test` içindeki sözdizimi denetimi çalıştırıldı. `index.html` içindeki iki inline JavaScript bloğu ve `build-web.js` `vm.Script` ile parse edildi. Sözdizimi hatası bulunmadı.

## 5. Aşama — HTML ve DOM yapısı

**Durum: STATİK KONTROL BAŞARILI; GERÇEK TARAYICI TESTİ ENGELLİ**

- HTML parser dosyayı açtı.
- 183 `id` bulundu; yinelenen ID yok.
- Bazı öğeler (grafik, sürüş oynatma kontrolleri ve toast gibi) JavaScript tarafından dinamik yaratıldığından başlangıç HTML'sinde doğrudan bulunmaması tek başına hata sayılmadı.
- Gerçek tarayıcıda duman testi denendi; bu çalışma ortamında Chromium basit bir HTML için bile zaman aşımına uğradı. Bu nedenle arayüzün gerçek tarayıcıda açılması ayrıca test edilmeli.

## 6. Aşama — Tarih, gün hesabı ve bakım eşikleri

**Durum: BAŞARILI; BULUNAN HATA DÜZELTİLDİ**

**Bulgu:** `YYYY-MM-DD` biçimindeki geçerli tarih, önce UTC ISO dizgesine çevrilerek doğrulanıyordu. UTC+14 gibi pozitif saat dilimlerinde yerel gece yarısı UTC'de önceki güne denk gelebildiği için geçerli bir tarih yanlışlıkla reddedilebilirdi.

**Düzeltme:** Tarih geçerliliği artık yıl/ay/gün yerel takvim alanlarının karşılaştırılmasıyla kontrol ediliyor. Geçersiz gün (ör. `2026-02-31`) reddediliyor. `todayStr()` yerel takvim gününü döndürüyor; `daysBetween()` tarih-only değerler için UTC gün indeksini kullanarak gün ışığından yararlanma saati farkını engelliyor.

**Test:** Geçerli tarih, imkânsız tarih, bugün için sıfır gün, ardışık gün farkı ve geçersiz aralık senaryoları normal ortamda, `Pacific/Kiritimati` (UTC+14) ve `America/Los_Angeles` saat dilimlerinde geçti.

## 7. Aşama — Yedekleme, içe aktarma ve geri yükleme

**Durum: BAŞARILI; HEDEFLİ TESTLER GEÇTİ**

**İçerik:** Yedek v3; araçlar, kayıtlı Açık Dünya sürüşleri/rotaları, kayıtlı park yeri, kişisel işaretler, sürüş kartları, asfalt olayları, sürüş DNA/segment/blackbox verileri, yarım kalmış sürüş taslağı, seçili sürüş aracı ve bazı tercihler için alan içeriyor. API anahtarları ve PIN değerleri yedeğe dahil edilmiyor.

**Otomatik yedek:** Tam v3 paketi saklanıyor; alan kotası yetmezse kopyalar azaltılıyor ve uyarı gösteriliyor. Eski yalnızca araç listesini içeren otomatik yedekler geriye dönük olarak tanınıyor ve kullanıcıya kapsamı belirtiliyor.

**Test:** Yedek oluşturma, kayıtlı sürüş/rota/park yeri/işaret/ayarların paket içinde bulunması ve geri yükleme testleri geçti.

## 8. Aşama — Güvenli veri gösterimi ve içe aktarma

**Durum: HEDEFLİ GÜVENLİK TESTLERİ BAŞARILI; TAM PENETRASYON TESTİ DEĞİL**

**Bulgu ve düzeltmeler:**
- İçeri aktarılan/kayıtlı verilerde HTML açılı-kapanış işaretleri normalize ediliyor; özel/prototype anahtarları atılıyor; diziler ve nesneler sınırlandırılıyor.
- Bozuk localStorage JSON'u uygulama açılışını durdurmak yerine güvenli boş diziye döndürülüyor.
- Kayıt kimlikleri sınırlandırılıyor ve yinelenen ID'ler düzeltiliyor.
- Görsellerde yalnızca izin verilen base64 PNG/JPEG/WEBP/GIF URI biçimleri kabul ediliyor; SVG, `javascript:` ve 8 MiB'den büyük değerler reddediliyor.
- Araç seçimi ve sosyal paylaşım fotoğrafı şablonları kaçışlama/güvenli görsel kontrolü kullanacak şekilde düzenlendi.

**Test:** HTML kaçışlama, kötü amaçlı URI reddi, SVG reddi, aşırı büyük görsel reddi, güvenli görsel kabulü, bozuk depolama ve yinelenen ID senaryoları geçti. Bu otomatik kontroller tam bir güvenlik/penetrasyon denetiminin yerine geçmez.

## 9. Aşama — OCR/görsel varlıklar, Android kaynakları ve CI

**Durum: STATİK KONTROLLER BAŞARILI; APK/AAB DERLEMESİ BEKLİYOR**

**Android/CI düzeltmeleri:**
- Capacitor yapılandırması 8.x bağımlılık ailesine göre sabitlendi.
- GitHub Actions, üretilen Android projesinde `minSdkVersion = 24`, `compileSdkVersion = 36`, `targetSdkVersion = 36` değerlerini sabitleyip doğruluyor.
- Sürüm `1.2.0` için CI sürüm kodunu `10200` olarak üretir. Uygulama Play'de daha önce `10200` veya daha yüksek versionCode ile yayınlandıysa workflow'daki hesap güncellenmeli.
- Workflow YAML parse edildi; içindeki üç gömülü Python bloğu sözdizimsel olarak doğrulandı. SDK/version düzenleme mantığı örnek yapılandırma dosyalarıyla denendi.
- Beş Android XML kaynak dosyası parse edildi. `icon.png` ve `icon-foreground.png` okunabilir PNG ve 1024×1024.

**Açık noktalar:** Bu ortamda `ANDROID_HOME` yok ve `gradle` komutu bulunmuyor; bu nedenle Native Java kaynaklarını Android SDK'ya karşı derlemek, AAB imzalamak veya gerçek cihaz davranışını doğrulamak mümkün olmadı. GitHub Actions sonucu başarılı olmadan APK/AAB çalışıyor kabul edilmemeli.

## 10. Aşama — Son test ve paket teslimi

**Durum: KAYNAK TESTİ VE ZIP BAŞARILI; ÜRETİM DERLEMESİ DOĞRULANMADI**

- `npm test`: sözdizimi denetimi ve **25/25 hedefli test** başarılı.
- Aynı 25 test UTC+14 ve America/Los_Angeles saat dilimlerinde de başarılı.
- Rapor, test sonuçları ve yönergeler kaynak paketine eklendi.
- Son ZIP bütünlük testinden geçti.

### Düzeltilemeyen / gerçek ortam gerektiren noktalar

1. Bağımlılık kurulumu ağ/DNS hatasıyla engellendi. Bağlantılı ortamda lock dosyası oluşturup `npm ci`, ardından `npm test` ve `npm run build:web` çalıştırılmalı.
2. Android SDK/Gradle bulunmadığından imzalı AAB, release APK ve native derleme doğrulanmadı.
3. Günlük native hatırlatıcı, uygulama en son açıkken eşitlenen uyarı satırlarını kullanıyor; uygulama kapalı kaldığında gerçek tarihleri alarm anında yeniden hesaplamıyor. Bu sınırlama belgelerde açıkça yazıldı ve gerçek cihaz testinde kontrol edilmeli.
4. Harita katmanları ve yapay zekâ API çağrıları internet bağlantısı gerektiriyor. OCR/arayüz kütüphanelerinin yerel kopyalanması, tüm uygulamanın tamamen çevrimdışı olduğu anlamına gelmez.
5. Arka plan konum kullanımı Play Console beyanı, gizlilik sayfası, uygun gerekçe ve gerçek cihaz testi gerektirir.

### Play Console hedef API kaynağı

Google Play'in hedef API şartları yayımlanmadan önce tekrar doğrulanmalıdır. Kontrol tarihinde yeni uygulamalar ve güncellemeler için Android 16 / API 36 şartı yürürlüktedir: https://support.google.com/googleplay/android-developer/answer/11926878?hl=tr . Capacitor 8 Android yapılandırma kılavuzu: https://capacitorjs.com/docs/updating/8-0 .

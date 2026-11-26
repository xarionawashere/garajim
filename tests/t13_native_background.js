// Native background ride architecture contract checks. Static checks require real-device validation too.
const fs = require('fs');
const path = require('path');
const root = path.dirname(process.argv[2]);
const { readIndexWithAppSource } = require('./helpers/read-app-source');
const html = readIndexWithAppSource(root);
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const service = read('native-android/src/main/java/com/garajim/app/GarajimRideService.java');
const main = read('native-android/src/main/java/com/garajim/app/MainActivity.java');
const listener = read('native-android/src/main/java/com/garajim/app/GarajimWearListener.java');
const bridge = read('native-android/src/main/java/com/garajim/app/GarajimNativeBridge.java');
const wear = read('native-wear/src/main/java/com/garajim/wear/WearMainActivity.java');
let failures = 0;
function check(condition, label) { if (condition) console.log('PASS ' + label); else { console.log('FAIL ' + label); failures++; } }
check(/armIfPermitted\(this\)/.test(main) && /takeOverWebRide\(getApplicationContext\(\)\)/.test(main), 'Activity görünürken servis hazırlanır, kapanırken sürüş devredilir');
check(/ACTION_TAKEOVER/.test(service) && /takeOverWebSession\(\)/.test(service), 'Servis WebView sürüş taslağından devralabilir');
check(/LocationManager\.GPS_PROVIDER/.test(service) && /requestLocationUpdates/.test(service), 'Native arka plan sürüşü GPS konumu alır');
check(/KEY_STATE/.test(service) && /saveState\(\)/.test(service) && /START_STICKY/.test(service), 'Native sürüş durumu kalıcı depolanır ve servis yeniden başlatmaya dayanıklıdır');
check(/dispatchWatchCommand\(context, action, vehicleId\)/.test(main) && /isNativeRideManaged\(context\)/.test(main), 'Saat komutları Activity yokken servise yönlendirilir');
check(/getNativeRideHandoffs/.test(bridge) && /ackNativeRideHandoffs/.test(bridge) && /importNativeRideHandoffs\(\)/.test(html), 'Saatte kaydedilen özet telefon geçmişine idempotent aktarılır');
check(/syncRideSnapshot/.test(bridge) && /pointStart/.test(html) && /pointsTotal/.test(service), 'WebView sürüş taslağı servis devri için artımlı nokta senkronu kullanır');
check(/isNativeRideManaged\(\)/.test(html) && /Bu sürüş arka plan servisinde/.test(html), 'Native sürüş sırasında WebView eski durumu ezmez');
check(/setSelectedVehicle/.test(bridge) && /wear_select_vehicle/.test(service), 'Seçili araç/plaka uygulama kapalıyken de native servis durumunda tutulur');
check(/FOREGROUND_SERVICE_TYPE_LOCATION/.test(service) && /FOREGROUND_SERVICE_LOCATION/.test(read('.github/workflows/build-apk.yml')) && /ride_svc.set\(A\+'foregroundServiceType', 'location'\)/.test(read('.github/workflows/build-apk.yml')), 'Konum takibi türüyle foreground service hazırlanır');
check(/private final Handler handler/.test(service) && !/mainHandler/.test(service), 'Yerel sürüş servisinin Handler referansları tutarlı');
check(/PERSIST_INTERVAL_MS = 10_000L/.test(service) && !/statePut\(\"gpsReady\", true\);\s*saveState\(\)/.test(service), 'GPS noktaları her saniye büyük JSON dosyası olarak diske yazılmaz');

check(/if \(isNativeRunning\(\)\) \{[\s\S]{0,180}if \(state\.optBoolean\(\"paused\", false\)\) resumeNativeRide\(\)/.test(service), 'Stale başlat komutu aktif sürüşün aracını değiştirip ikinci sürüş açmaz');
check(/Devam ettirilecek bir sürüş yok[\s\S]{0,120}publishState\(\)/.test(service), 'Devam komutu bekleyen olmayan oturumda yanlışlıkla yeni sürüş başlatmaz');
check(/if \(!isLocationEnabled\(this\) \|\| locationManager == null/.test(service), 'Native sürüş başlamadan GPS/konum durumu kontrol edilir');
check(/long delay = isNativeRunning\(\) && !state\.optBoolean\(\"paused\", false\) \? TICK_MS : 10_000L/.test(service), 'Boşta servis gereksiz yere saniyede bir saat verisi yayınlamaz');
check(/send\(selectedVehicleId\.isEmpty\(\) \? \"start\" : \"start\\|\" \+ selectedVehicleId\)/.test(wear), 'Saat başlat komutunda seçili araç kimliği yedek olarak gönderilir');

check(/remove\(KEY_WEB_SNAPSHOT\)\.commit\(\)/.test(service), 'Devralınan eski WebView taslağı bir kez alındıktan sonra tekrar oynatılmaz');
check(/syncSelectedVehicleFromNative\(\)/.test(html) && /getNativeRideState/.test(bridge), 'Saatten seçilen araç telefon tekrar açıldığında yerel seçime aktarılır');
check(/summary\.nativeBackground && summary\.date[\s\S]{0,500}removeItem\('garaj_ride_draft'\)/.test(html), 'Aynı sürüşün eski taslağı native özet içe alınırken temizlenir');
process.exit(failures ? 1 : 0);

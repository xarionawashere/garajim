// Wear OS/phone contract regression checks. Static checks complement device tests.
const fs = require('fs');
const path = require('path');
const indexPath = process.argv[2];
const root = path.dirname(indexPath);
const { readIndexWithAppSource } = require('./helpers/read-app-source');
const html = readIndexWithAppSource(root);
const mainActivity = fs.readFileSync(path.join(root, 'native-android/src/main/java/com/garajim/app/MainActivity.java'), 'utf8');
const nativeBridge = fs.readFileSync(path.join(root, 'native-android/src/main/java/com/garajim/app/GarajimNativeBridge.java'), 'utf8');
const wearActivity = fs.readFileSync(path.join(root, 'native-wear/src/main/java/com/garajim/wear/WearMainActivity.java'), 'utf8');
const wearSync = fs.readFileSync(path.join(root, 'native-android/src/main/java/com/garajim/app/GarajimWearSync.java'), 'utf8');
const wearLayout = fs.readFileSync(path.join(root, 'native-wear/src/main/res/layout/activity_wear.xml'), 'utf8');
let failures = 0;
function check(condition, label) {
  if (condition) console.log('PASS ' + label);
  else { console.log('FAIL ' + label); failures++; }
}
check(/window\.__garajimWearHeartbeat\s*=\s*setInterval\([\s\S]*?10000\)/.test(html), 'Telefon araç listesini ve durumunu boşta da periyodik eşitler');
check(/gpsReady:\s*!!ride\.gotFix/.test(html), 'GPS hazır bilgisi saatin durumuna gönderilir');
check(/if\s*\(ride\.running\)\s*\{[\s\S]{0,160}Aktif sürüş sırasında araç değiştirilemez/.test(html), 'Aktif sürüşte saatten araç değişimi engellenir');
check(/WEAR_COMMANDS_KEY\s*=\s*"commands_json"/.test(mainActivity) && /consumeWearCommand\(context\)/.test(nativeBridge), 'Saat komutları FIFO kuyrukta tek tek tüketilir');
check(/WEAR_COMMAND_TTL_MS\s*=\s*25_000L/.test(mainActivity), 'Gecikmiş saat komutlarının otomatik uygulanması süreyle sınırlandırılır');
check(/wearConnection/.test(wearLayout) && /refreshPhoneConnection\(\)/.test(wearActivity), 'Saatte bağlantı ve veri güncelliği ayrı gösterilir');
check(/events\.release\(\)/.test(wearActivity), 'Wearable DataEventBuffer serbest bırakılır');
const tickBlock = html.match(/function rideTick\(\)\s*\{([\s\S]*?)\n  \}/);
check(!!tickBlock && (tickBlock[1].match(/ride\.elapsed \+= \(now - ride\.lastTick\) \/ 1000;/g) || []).length === 1, 'Sürüş süresi her tickte yalnızca bir kez artırılır');

check(/case "start": return "wear_start"/.test(fs.readFileSync(path.join(root, 'native-android/src/main/java/com/garajim/app/GarajimWearListener.java'), 'utf8'))
  && /case "resume": return "wear_resume"/.test(fs.readFileSync(path.join(root, 'native-android/src/main/java/com/garajim/app/GarajimWearListener.java'), 'utf8')),
  'Saat açık başlat/devam komutlarını ayrı yollarla gönderir');
check(/a === 'wear_start'/.test(html) && /a === 'wear_resume'/.test(html) && /a === 'wear_pause'/.test(html),
  'Telefon başlat/devam/duraklat komutlarını açık ve idempotent işler');
check(/function backupBundle\(\)[\s\S]*?version:\s*4/.test(html)
  && /preferences:\s*backupSafePreferences\(\)/.test(html)
  && /rideDraft:\s*backupReadJson\('garaj_ride_draft'\)/.test(html)
  && /pendingRide:\s*pendingRide/.test(html),
  'Manuel yedek v4 güvenli tercihleri ve kurtarılabilir sürüş durumunu kapsar');
const backupCode = html.match(/function backupSafePreferences\(\)[\s\S]*?function exportData\(/);
check(!!backupCode && !/garaj_ai_settings|garaj_pin/.test(backupCode[0]) && /Yedek v4[\s\S]*?özellikle dışa aktarılmaz/.test(html),
  'PIN ve AI API anahtarı yedek paketinin dışında tutulur');


const syncNativeBlock = html.match(/function syncNative\(\)\s*\{([\s\S]*?)\n  \}/);
check(!!syncNativeBlock && /pushWearVehicles/.test(syncNativeBlock[1]),
  'Araç ekleme/düzenleme/silme sonrası liste senkronu gecikmeden tetiklenir');
check(/Tasks\.await\(Wearable\.getDataClient\(app\)\.putDataItem\(req\.asPutDataRequest\(\)\)\)/.test(wearSync)
  && /lastJson = json/.test(wearSync),
  'Saat durumunun gönderim önbelleği yalnızca başarılı yazımdan sonra güncellenir');
check(/versionCode 20/.test(fs.readFileSync(path.join(root, 'native-wear/build.gradle'), 'utf8'))
  && /versionCode=17/.test(fs.readFileSync(path.join(root, '.github/workflows/build-apk.yml'), 'utf8')),
  'Telefon ve saat paket sürüm kodları yükseltilir');

process.exit(failures ? 1 : 0);

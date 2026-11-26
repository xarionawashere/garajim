// Optional phone/watch pairing and management regression checks.
const fs = require('fs');
const path = require('path');
const root = path.dirname(process.argv[2]);
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const settings = fs.readFileSync(path.join(root, 'src/js/settings.js'), 'utf8');
const wearLayout = fs.readFileSync(path.join(root, 'native-wear/src/main/res/layout/activity_wear.xml'), 'utf8');
const wear = fs.readFileSync(path.join(root, 'native-wear/src/main/java/com/garajim/wear/WearMainActivity.java'), 'utf8');
const bridge = fs.readFileSync(path.join(root, 'native-android/src/main/java/com/garajim/app/GarajimNativeBridge.java'), 'utf8');
const sync = fs.readFileSync(path.join(root, 'native-android/src/main/java/com/garajim/app/GarajimWearSync.java'), 'utf8');
let failures = 0;
function check(ok, name) { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) failures++; }

check(/Saat uygulaması isteğe bağlı/.test(html) && /Şimdilik telefonda kullan/.test(html)
  && /Telefon uygulaması tam olarak kullanılabilir/.test(settings),
  'Saat eşleştirmesi atlanabilir; telefon uygulaması tüm işlevleriyle açık kalır');
check(/wearPairManage\(\)/.test(html) && /openWearSettings\(\)/.test(settings)
  && /getWearStatus\(\)/.test(settings),
  'Telefon ayarlarında saat bağlantısı durumu ve yönetim eylemi görünür');
check(/btnWearPair/.test(wearLayout) && /showWearPairingDialog\(\)/.test(wear),
  'Saatte de telefon bağlantısı için yönetim ekranı bulunur');
check(/ACTION_BLUETOOTH_SETTINGS/.test(wear) && /openWearSettings/.test(bridge)
  && /com.google.android.wearable.app/.test(bridge)
  && /com.samsung.android.app.watchmanager/.test(bridge),
  'Bağla/kes akışı Wear OS veya Galaxy Wearable yönetimini açar');
check(/SharedPreferences prefs = app.getSharedPreferences\("garajim_wear_status"/.test(sync)
  && /return cached;/.test(sync),
  'Telefon bağlantı durumunu UI ana iş parçacığını bekletmeden gösterir');

process.exit(failures ? 1 : 0);

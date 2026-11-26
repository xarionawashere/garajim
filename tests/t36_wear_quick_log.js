// Watch-native KM/fuel entry regression checks.
const fs = require('fs');
const path = require('path');
const root = path.dirname(process.argv[2]);
const { readAppSource } = require('./helpers/read-app-source');
const app = readAppSource(root);
const watch = fs.readFileSync(path.join(root, 'native-wear/src/main/java/com/garajim/wear/WearMainActivity.java'), 'utf8');
const phone = fs.readFileSync(path.join(root, 'native-android/src/main/java/com/garajim/app/MainActivity.java'), 'utf8');
const listener = fs.readFileSync(path.join(root, 'native-android/src/main/java/com/garajim/app/GarajimWearListener.java'), 'utf8');
let failures = 0;
function check(ok, name) { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) failures++; }

check(/btnFuelQuick[\s\S]{0,180}showQuickFuelEntry\(\)/.test(watch)
  && /btnKmQuick[\s\S]{0,180}showQuickKmEntry\(\)/.test(watch),
  'Saatteki Yakıt ve KM düğmeleri doğrudan giriş ekranını açar');
check(/quickEntryVehicle\(\)/.test(watch) && /selected_vehicle_id|VEHICLE_PREFS/.test(watch)
  && /km: String\(v\.km \|\| '0'\)/.test(app),
  'Seçili araç ve son KM saat ekranına eşitlenir');
check(/send\("fuel_save", payload\.toString\(\)\)/.test(watch)
  && /send\("km_save", payload\.toString\(\)\)/.test(watch),
  'Saat kayıt değerlerini araç kimliğiyle telefona gönderir');
check(/case "fuel_save": return "wear_fuel_save"/.test(listener)
  && /case "km_save": return "wear_km_save"/.test(listener)
  && /isValidWearLogPayload/.test(listener),
  'Telefon yakıt ve KM kayıt komutlarını doğrular');
check(/WEAR_LOG_COMMAND_TTL_MS/.test(phone)
  && /wearCommandTtlMs\(item\.optString/.test(phone)
  && /Bekleyen yakıt\/KM kayıtlarını sessizce silme/.test(phone),
  'Telefon çevrimdışıyken yeni kayıtları yedi gün saklar');
check(/wearFuelEntryIds/.test(app) || /wearId \|\| ''/.test(app),
  'Yeniden gelen yakıt komutu ikinci kez kaydedilmez');
check(/v\.fuelLogs\.push\(entry\)/.test(app)
  && /achievementRecordActivity\('fuel'\)/.test(app)
  && /achievementRecordActivity\('odometer'\)/.test(app)
  && /persist\(\)/.test(app),
  'Saat kayıtları araç verisine ve mevcut başarı/kayıt akışına işlenir');

process.exit(failures ? 1 : 0);

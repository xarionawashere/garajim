// Regression checks for the legacy Wear OS JSON command envelope.
// npm test runs this file through tests/run.js.
const fs = require('fs');
const path = require('path');
const root = path.dirname(process.argv[2]);
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const listener = read('native-android/src/main/java/com/garajim/app/GarajimWearListener.java');
const watch = read('native-wear/src/main/java/com/garajim/wear/WearMainActivity.java');
let failures = 0;
function check(ok, name) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name);
  if (!ok) failures++;
}

check(/cmd\.indexOf\('\|'\)/.test(listener) && /arg = packedArgument/.test(listener),
  'Telefon JSON cmd alanındaki eski komut|arg biçimini ayırır');
check(/cmd = firstNonBlank\(o, "cmd", "command", "action", "type", "event", "name"\)/.test(listener),
  'Telefon alternatif JSON komut alanlarını kabul eder');
check(/case "select_vehicle": return "wear_select_vehicle"/.test(listener)
  && /case "start": return "wear_start"/.test(listener),
  'Araç seçimi ve sürüş başlatma eşlemeleri korunur');
check(/case "summary_save": return "wear_summary_save"/.test(listener)
  && /case "summary_discard": return "wear_summary_discard"/.test(listener),
  'Sürüş özeti kaydetme ve silme komutları eşlenir');
check(/case "finish_confirmed":/.test(listener) && /case "finish_ride":/.test(listener),
  'Eski sürüş bitirme adları desteklenir');
check(/send\("select_vehicle\|" \+ v\.id\)/.test(watch)
  && /send\(selectedVehicleId\.isEmpty\(\) \? "start" : "start\|" \+ selectedVehicleId\)/.test(watch),
  'Mevcut saat sürümünün araç ve sürüş kimliğiyle gönderdiği komutlar kapsanır');

process.exit(failures ? 1 : 0);

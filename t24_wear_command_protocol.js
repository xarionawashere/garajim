// Wear command envelope regression checks: JSON commands must keep action and argument separate.
const fs = require('fs');
const path = require('path');
const root = path.dirname(process.argv[2]);
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const listener = read('native-android/src/main/java/com/garajim/app/GarajimWearListener.java');
const watch = read('native-wear/src/main/java/com/garajim/wear/WearMainActivity.java');
let failures = 0;
function check(ok, name) { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) failures++; }
const listenerParse = listener.match(/\/\/ Geriye dönük uyumluluk:[\s\S]*?String action = mapCmd\(cmd\);/);
check(!!listenerParse && /cmd\.indexOf\('\|'\)/.test(listenerParse[0]) && /arg = packedArgument/.test(listenerParse[0]),
  'Telefon, JSON cmd alanına yanlışlıkla eklenmiş |arg değerini de ayırır');
const send = watch.match(/private void send\(String cmd\)\s*\{([\s\S]*?)\n    \}/);
check(!!send && /wireCmd/.test(send[1]) && /wireArg/.test(send[1])
  && /envelope\.put\("cmd", wireCmd\)/.test(send[1]) && /envelope\.put\("arg", wireArg\)/.test(send[1]),
  'Saat komut ve araç/özet kimliğini ayrı JSON alanlarında gönderir');
check(/case "select_vehicle": return "wear_select_vehicle"/.test(listener)
  && /case "start": return "wear_start"/.test(listener)
  && /case "stop_confirmed"[\s\S]{0,180}return "wear_finish_confirmed"/.test(listener),
  'Araç seçimi, sürüş başlatma ve bitirme eylemleri tanınan komutlara eşlenir');
check(/case "finish_confirmed"/.test(listener) && /case "finish_ride"/.test(listener),
  'Önceki sürümdeki bitirme komutu adlarıyla da uyumludur');
process.exit(failures ? 1 : 0);

// Wear OS cockpit layout regression: core ride actions should appear before secondary cards.
const fs = require('fs');
const path = require('path');
const root = path.dirname(process.argv[2]);
const xml = fs.readFileSync(path.join(root, 'native-wear/src/main/res/layout/activity_wear.xml'), 'utf8');
const gradle = fs.readFileSync(path.join(root, 'native-wear/build.gradle'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/build-apk.yml'), 'utf8');
const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
let failures = 0;
function check(ok, name) { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) failures++; }
function indexOf(haystack) { return xml.indexOf(haystack); }
function buttonTag(id) { return xml.match(new RegExp('<Button\\b[^>]*android:id="@\\+id/' + id + '"[^>]*/>')); }
const vehicle = indexOf('android:id="@+id/btnVehicle"');
const metrics = indexOf('android:id="@+id/wearMetrics"');
const toggle = indexOf('android:id="@+id/btnToggle"');
const stop = indexOf('android:id="@+id/btnStop"');
const summary = indexOf('android:id="@+id/btnPendingSummary"');
const map = indexOf('android:id="@+id/wearMapCard"');
const music = indexOf('android:id="@+id/wearTrack"');
check(vehicle >= 0 && metrics > vehicle && toggle > metrics && stop > toggle && summary > stop && map > summary && music > map,
  'Araç seçimi, ölçümler ve sürüş eylemleri harita/müzik yardımcı kartlarından önce gelir');
for (const id of ['btnVehicle', 'btnToggle', 'btnStop', 'btnPendingSummary', 'btnPark', 'btnPrev', 'btnPlay', 'btnNext']) {
  const m = buttonTag(id);
  check(!!m && /android:layout_height="44dp"/.test(m[0]), id + ' dokunma alanı 44 dp');
}
check(/android:contentDescription="Önceki parça"/.test(xml)
  && /android:contentDescription="Oynat veya duraklat"/.test(xml)
  && /android:contentDescription="Sonraki parça"/.test(xml), 'Müzik ikonlarında ekran okuyucu adları vardır');
check(/versionCode\s+20/.test(gradle) && /versionName "1\.4\.6"/.test(gradle)
  && /python3 scripts\/ci-version\.py/.test(workflow)
  && /major \* 1_000_000 \+ minor \* 1_000 \+ patch/.test(fs.readFileSync(path.join(root, 'scripts/ci-version.py'), 'utf8'))
  && /"version": "1\.4\.6"/.test(pkg), 'Telefon, saat ve kaynak paket sürümleri 1.4.6 olarak eşleşir');
process.exit(failures ? 1 : 0);

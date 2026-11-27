// Wear Data Layer back-pressure regression checks: stale ride snapshots must not flood the executor.
const fs = require('fs');
const path = require('path');
const root = path.dirname(process.argv[2]);
const sync = fs.readFileSync(path.join(root, 'native-android/src/main/java/com/garajim/app/GarajimWearSync.java'), 'utf8');
const { readIndexWithAppSource } = require('./helpers/read-app-source');
const html = readIndexWithAppSource(root);
let failures = 0;
function check(ok, name) { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) failures++; }

const push = sync.match(/public static void pushState\(Context ctx, String json\)\s*\{([\s\S]*?)\n    \}/);
const drainStart = sync.indexOf('private static void drainPendingState()');
const drainEnd = sync.indexOf('/** Araç listesi', drainStart);
const drain = drainStart >= 0 && drainEnd > drainStart ? [null, sync.slice(drainStart, drainEnd)] : null;
check(!!push && /pendingStateJson\s*=\s*json/.test(push[1]) && /stateDrainScheduled/.test(push[1]),
  'Saat durumu güncellendiğinde tek pending snapshot tutulur');
check(!!drain && /pendingStateJson\s*=\s*""/.test(drain[1]) && /EX\.execute\(GarajimWearSync::drainPendingState\)/.test(drain[1]),
  'Her yazım sonrası yalnızca bekleyen en güncel durum yeniden kuyruğa alınır');
check(!!drain && /Tasks\.await\(Wearable\.getDataClient\(app\)\.putDataItem\(req\.asPutDataRequest\(\)\)\)/.test(drain[1])
  && /lastJson\s*=\s*json/.test(drain[1]) && /finally/.test(drain[1]),
  'Durum önbelleği yalnızca başarılı Data Layer yazımından sonra güncellenir');
check(!/sendingStateJson|sendingStateAt/.test(sync),
  'Eski tek bekleyen-değer işaretçileri kaldırıldı');
check(/PATH_STATE/.test(sync) && /routeJson/.test(sync) && /summaryId/.test(sync) && /parkDistM/.test(sync),
  'Kokpit rota, özet ve park alanları yeni aktarım yolunda korunur');
check(/python3 scripts\/ci-version\.py/.test(fs.readFileSync(path.join(root, '.github/workflows/build-apk.yml'), 'utf8'))
  && /versionCode\s+20/.test(fs.readFileSync(path.join(root, 'native-wear/build.gradle'), 'utf8'))
  && /major \* 1_000_000 \+ minor \* 1_000 \+ patch/.test(fs.readFileSync(path.join(root, 'scripts/ci-version.py'), 'utf8'))
  && /"version": "1\.4\.6"/.test(fs.readFileSync(path.join(root, 'package.json'), 'utf8')),
  'Telefon, saat ve kaynak paket sürümleri 1.4.6 olarak hizalıdır');
check(/function rideTick\(\)/.test(html), 'Web sürüş döngüsü kaynak pakette korunur');
process.exit(failures ? 1 : 0);

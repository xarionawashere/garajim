const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.dirname(process.argv[2] || path.join(__dirname, '..', 'index.html'));
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const { readIndexWithAppSource } = require('./helpers/read-app-source');
const html = readIndexWithAppSource(root);
const bridge = read('native-android/src/main/java/com/garajim/app/GarajimNativeBridge.java');
const sync = read('native-android/src/main/java/com/garajim/app/GarajimWearSync.java');
const activity = read('native-wear/src/main/java/com/garajim/wear/WearMainActivity.java');
const listener = read('native-wear/src/main/java/com/garajim/wear/GarajimWearCelebrationListener.java');
const manifest = read('native-wear/src/main/AndroidManifest.xml');
const gradle = read('native-wear/build.gradle');
const workflow = read('.github/workflows/build-apk.yml');
const packageJson = JSON.parse(read('package.json'));
const ok = (condition, message) => { console.log((condition ? 'PASS ' : 'FAIL ') + message); if (!condition) process.exitCode = 1; };
ok(/function achievementSendWearCelebrations\(items\)/.test(html) && /achievementSendWearCelebrations\(sorted\)/.test(html), 'kazanılan başarılar kutlama anında Wear köprüsüne gönderiliyor');
const helperStart = html.indexOf('  function achievementSendWearCelebrations(items){');
const helperEnd = html.indexOf('\n  function achievementCelebrate(items)', helperStart);
let sentPayload = null;
if (helperStart >= 0 && helperEnd > helperStart) {
  const context = {
    rideNativeBridge: () => ({ pushWearAchievements: raw => { sentPayload = JSON.parse(raw); } }),
    ACHIEVEMENT_RARITY_LABEL: { common: 'Standart', rare: 'Nadir', epic: 'Destansı', legendary: 'Efsanevi' },
    ACHIEVEMENT_CATEGORIES: { drive: 'Sürüş', dna: 'Sürüş DNA’sı' }
  };
  vm.createContext(context);
  vm.runInContext(html.slice(helperStart, helperEnd) + '\nglobalThis.__send = achievementSendWearCelebrations;', context);
  const sendResult = context.__send([{ id: 'test-badge', name: 'Deneme Rozeti', rarity: 'rare', description: 'Deneme', category: 'drive', icon: 'fa-medal' }]);
  ok(sendResult && sentPayload && sentPayload.items && sentPayload.items[0].id === 'test-badge' && sentPayload.items[0].rarity === 'rare', 'JS gerçek kazanım payloadunu native köprüye gönderiyor');
} else {
  ok(false, 'JS gönderici fonksiyonu test için ayrıştırılabiliyor');
}
ok(/public void pushWearAchievements\(String json\)/.test(bridge), 'Android JavaScript köprüsü başarı paketini alıyor');
ok(/PATH_ACHIEVEMENT\s*=\s*"\/garajim\/achievement"/.test(sync) && /sendMessage\(node\.getId\(\), PATH_ACHIEVEMENT, data\)/.test(sync), 'başarım payloadu bağlı saate anlık MessageClient iletiliyor');
ok(/PATH_ACHIEVEMENT\.equals\(event\.getPath\(\)\)/.test(activity) && /BAŞARIM KAZANDIN/.test(activity), 'saat uygulaması başarı kutlama katmanını açıyor');
ok(/buzzAchievementRarity/.test(activity) && /case "legendary"/.test(activity), 'saatte nadirliğe göre ayrı titreşim düzenleri var');
ok(/GarajimWearCelebrationListener/.test(manifest) && /MESSAGE_RECEIVED/.test(manifest) && /pathPrefix="\/garajim\/achievement"/.test(manifest), 'uygulama kapalıyken mesaj dinleyicisi manifestte kayıtlı');
ok(/CHANNEL_PREFIX = "garajim_achievement_v2_"/.test(listener) && /vibrateAchievementRarity\(rarity\)/.test(listener) && /notify\(notificationId/.test(listener), 'arka plan başarım bildirimi ve doğrudan nadirlik titreşimi var');
ok(/POST_NOTIFICATIONS/.test(manifest) && /requestAchievementNotificationPermission/.test(activity), 'saat bildirim izni isteniyor');
ok(packageJson.version === '1.4.7' && /versionCode\s+1004007/.test(gradle) && /versionName "1\.4\.7"/.test(gradle) && /python3 scripts\/ci-version\.py/.test(workflow) && /major \* 1_000_000 \+ minor \* 1_000 \+ patch/.test(fs.readFileSync(path.join(root, 'scripts/ci-version.py'), 'utf8')), 'telefon ve Wear APK sürümleri ortak sürüm kaynağından üretiliyor');

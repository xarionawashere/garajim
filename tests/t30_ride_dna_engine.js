const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const root = path.dirname(process.argv[2] || path.join(__dirname, '..', 'index.html'));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const errors = [];
const ok = (condition, message) => { console.log((condition ? 'PASS ' : 'FAIL ') + message); if (!condition) process.exitCode = 1; };
function mkL() {
  const chain = () => new Proxy(function () {}, { get: (t, k) => k === 'then' ? undefined : chain(), apply: () => chain() });
  return {
    map: () => chain(), tileLayer: () => chain(), polyline: () => ({ addTo() { return this; }, setLatLngs() {}, getBounds() { return {}; } }),
    marker: () => ({ addTo() { return this; }, setLatLng() {}, getLatLng: () => ({ lat: 41, lng: 29 }), getElement: () => ({ querySelector: () => ({ style: {} }) }) }),
    divIcon: () => ({}), latLng: (lat, lng) => ({ lat, lng }), Icon: { Default: {} }
  };
}
const dom = new JSDOM(html, {
  runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://localhost/',
  beforeParse(w) {
    w.L = mkL(); w.matchMedia = () => ({ matches: false, addListener() {}, addEventListener() {} });
    w.confirm = () => true; w.alert = () => {}; w.scrollTo = () => {};
    w.URL.createObjectURL = () => 'blob:dna-test'; w.URL.revokeObjectURL = () => {};
    w.navigator.geolocation = { getCurrentPosition: cb => cb({ coords: { latitude: 41, longitude: 29, accuracy: 5, speed: 0, heading: null }, timestamp: Date.now() }), watchPosition: () => 1, clearWatch() {} };
    w.localStorage.setItem('garaj_v4', '[]');
    w.addEventListener('error', e => errors.push(e.message));
  }
});
const w = dom.window;
const ev = code => w.eval(code);
function makeSummary(id, options = {}) {
  const count = options.count || 28;
  const start = new Date(options.date || '2026-06-15T23:20:00.000Z').getTime();
  const step = options.step || 0.001;
  const speed = options.speed == null ? 30 : options.speed;
  const pts = Array.from({ length: count }, (_, i) => [41 + i * step, 29 + i * step * 0.4, start + i * 1000, speed + (i % 3)]);
  const s = {
    id, date: new Date(start).toISOString(), dist: options.dist == null ? 6000 : options.dist,
    time: options.time == null ? 900 : options.time, avg: options.avg == null ? 30 : options.avg,
    max: options.max == null ? 55 : options.max, pts, gap: false, incompleteGps: false
  };
  if (options.hardBrakes !== undefined) s.hardBrakes = options.hardBrakes;
  if (options.speedSamples) s.speedSamples = options.speedSamples;
  return s;
}
(async () => {
  await new Promise(r => setTimeout(r, 250));
  ok(errors.length === 0, 'uygulama açılırken JavaScript hatası yok: ' + errors.join('|'));
  ok(ev('ACHIEVEMENT_DNA_KEYS.length') === 8 && Object.keys(ev('RIDE_DNA_PROFILE_UNLOCK_AT')).length === 8, 'sekiz DNA profili ve sekiz kilit eşiği tanımlı');
  ev('achievementOpen("all")');
  ok(w.document.querySelectorAll('.ride-dna-prof').length === 8, 'DNA panosu sekiz profil için ayrı puan çubuğu gösteriyor');
  ok(w.document.querySelector('.ride-dna-dashboard') && /DNA keşfediliyor/.test(w.document.querySelector('.ride-dna-dashboard').textContent), 'boş veri durumunda kesin profil uydurmadan keşif durumunu gösteriyor');

  const previewKeys = ['virajci', 'sehir', 'gece', 'otoyol', 'turcu', 'uzunyol', 'yumusak', 'kesifci'];
  const beforeDna = w.localStorage.getItem('garaj_ride_dna');
  const beforeRides = w.localStorage.getItem('garaj_rides');
  let previewOk = true;
  for (const key of previewKeys) {
    const result = ev(`garajimTestRideDnaProfile(${JSON.stringify(key)})`);
    previewOk = previewOk && result && result.persistentWrite === false && result.score != null && result.confidence >= 0.4 && result.qualified === true;
  }
  ok(previewOk, 'gizli DNA simülatöründeki sekiz profil senaryosu puan/uygunluk üretiyor');
  ok(w.localStorage.getItem('garaj_ride_dna') === beforeDna && w.localStorage.getItem('garaj_rides') === beforeRides, 'DNA simülatörü sürüş veya DNA kayıtlarına yazmıyor');

  const safe = makeSummary('speed-safe', { dist: 45000, time: 1900, avg: 85, max: 112, count: 40, step: 0.002, speed: 85 });
  const unsafe = { ...safe, id: 'speed-high', max: 165 };
  const safeAnalysis = ev('rideDnaAnalyzeTrip(' + JSON.stringify(safe) + ',null,[])');
  const unsafeAnalysis = ev('rideDnaAnalyzeTrip(' + JSON.stringify(unsafe) + ',null,[])');
  ok(safeAnalysis.scores.otoyol != null && unsafeAnalysis.scores.otoyol < safeAnalysis.scores.otoyol, 'yüksek tepe hız otoyol DNA puanını artırmıyor; aksine düşürüyor');
  ok(!unsafeAnalysis.qualified.otoyol, '130 km/sa üzeri tepe hız güvenli otoyol DNA şartını sağlamıyor');
  ok(previewKeys.every(k => Object.prototype.hasOwnProperty.call(safeAnalysis.scores, k)), 'her sürüş analizinde sekiz profilin tamamı ayrı alanla değerlendirilir');
  const noSpeed = makeSummary('highway-no-speed-samples', { dist: 45000, time: 1900, avg: 85, max: 112, count: 40, step: 0.002, speed: 85 });
  noSpeed.pts = noSpeed.pts.map(p => p.slice(0, 3));
  const noSpeedAnalysis = ev('rideDnaAnalyzeTrip(' + JSON.stringify(noSpeed) + ',null,[])');
  ok(!noSpeedAnalysis.qualified.otoyol && !noSpeedAnalysis.qualified.turcu, 'hız örnekleri olmayan kayıt otoyol/turcu profilini doğrulayamıyor');
  const sparseNight = makeSummary('night-sparse', { dist: 6000, time: 900, avg: 30, max: 55, count: 4, step: 0.001 });
  const sparseNightAnalysis = ev('rideDnaAnalyzeTrip(' + JSON.stringify(sparseNight) + ',null,[])');
  ok(!sparseNightAnalysis.qualified.gece, 'seyrek GPS örnekleri tek başına gece profilini doğrulamıyor');

  ev("localStorage.removeItem('garaj_ride_dna')");
  let third = null;
  for (let i = 0; i < 3; i++) {
    const summary = makeSummary('night-qual-' + i, { date: new Date(2026, 5, 15 + i, 23, 20).toISOString(), dist: 6000, time: 900, avg: 30, max: 55, count: 22, step: 0.001 });
    const result = ev('rideComputeDna(' + JSON.stringify(summary) + ',null)');
    if (i === 0) ok(!result.unlocked.includes('gece'), 'ilk gece sürüşü tek başına kalıcı DNA profili açmıyor');
    third = result;
  }
  ok(third.unlocked.includes('gece') && third.qualifiedCounts.gece === 3, 'üç ayrı nitelikli gece sürüşü Gece Kuşu profilini doğruluyor');
  const totalBeforeDuplicate = ev('rideDnaGet().total');
  const samplesBeforeDuplicate = ev("rideDnaGet().profileStats.gece.observations");
  const repeated = makeSummary('night-qual-2', { date: new Date(2026, 5, 17, 23, 20).toISOString(), dist: 6000, time: 900, avg: 30, max: 55, count: 22, step: 0.001 });
  ev('rideComputeDna(' + JSON.stringify(repeated) + ',null)');
  ok(ev('rideDnaGet().total') === totalBeforeDuplicate && ev('rideDnaGet().profileStats.gece.observations') === samplesBeforeDuplicate, 'aynı sürüş ikinci kez işlendiğinde toplam ve profil gözlemleri artmıyor');

  ev("localStorage.setItem('garaj_ride_dna',JSON.stringify({counts:{virajci:300,sehir:350,gece:200,otoyol:180,turcu:250},total:5,primary:'sehir',unlocked:['sehir'],qualifiedCounts:{sehir:1},qualifiedRides:{'old-ride-1':[]},visitedCells:['41.00,29.00']}))");
  const legacyRide = makeSummary('legacy-new-ride', { dist: 25000, time: 1800, avg: 60, max: 90, count: 32, step: 0.002, speed: 60, hardBrakes: 0 });
  const migrated = ev('rideComputeDna(' + JSON.stringify(legacyRide) + ',null)');
  ok(migrated.schemaVersion === 2 && migrated.total === 6, 'eski DNA verisi v2 şemasına taşınırken sürüş geçmişi korunuyor');
  ok(migrated.unlocked.includes('sehir') && migrated.profileStats.sehir, 'mevcut profil kilitleri ve eski puanlardan türetilen başlangıç verisi korunuyor');
  ok(errors.length === 0, 'DNA hesaplama ve simülatör senaryolarında JavaScript hatası yok: ' + errors.join('|'));
  dom.window.close();
  process.exit(process.exitCode || 0);
})().catch(e => { console.error(e); process.exit(1); });

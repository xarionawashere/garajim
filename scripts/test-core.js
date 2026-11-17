'use strict';
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('index.html', 'utf8');
const results = [];
function assert(name, condition, detail = '') {
  results.push({ name, passed: Boolean(condition), detail: String(detail || '') });
}
function between(start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw new Error(`Test source boundary missing: ${start} / ${end}`);
  return source.slice(a, b);
}
const storage = new Map();
const localStorage = {
  getItem(key) { return storage.has(String(key)) ? storage.get(String(key)) : null; },
  setItem(key, value) { storage.set(String(key), String(value)); },
  removeItem(key) { storage.delete(String(key)); },
  clear() { storage.clear(); }
};
const classList = { add() {}, remove() {}, toggle() {} };
const document = { getElementById() { return { textContent: '', classList }; } };
const context = vm.createContext({
  console, localStorage, document, Date, Math, JSON, Array, Object, Number, String, Set, Map,
  RegExp, Error, Promise, setTimeout: () => 1, clearTimeout() {}, confirm: () => true,
  prompt: () => '1', alert() {}, toast() {}, syncNative() {}, updateNotifBadge() {},
  updateBackupInfo() {}, renderList() {}, closeSettings() {}, saveFileToast() {}
});
try {
  const helpers = between('  function escHtml(value) {', '  let vehicles = parseStoredArray');
  vm.runInContext(helpers, context, { filename: 'index-safety-helpers.js' });
  vm.runInContext(`
    const bad = sanitizeStoredData({ id: "x' onclick='alert(1)", plate: '<img onerror=alert(1)>', photo: 'javascript:alert(1)', child: { text: '<svg onload=alert(1)>' } }, 0, '');
    globalThis.__helperResults = {
      escaped: escHtml('<script x="1">') === '&lt;script x=&quot;1&quot;&gt;',
      imageDenied: safeImageSrc('javascript:alert(1)') === '',
      svgImageDenied: safeImageSrc('data:image/svg+xml;base64,PHN2Zz4=') === '',
      oversizedImageDenied: safeImageSrc('data:image/png;base64,' + 'A'.repeat(8 * 1024 * 1024)) === '',
      imageAccepted: safeImageSrc('data:image/png;base64,aGVsbG8=') === 'data:image/png;base64,aGVsbG8=',
      importTextSafe: !bad.plate.includes('<') && !bad.child.text.includes('<'),
      importImageSafe: bad.photo === null,
      idSafe: /^[A-Za-z0-9_-]{1,100}$/.test(bad.id),
      duplicateIdsUnique: new Set(normalizeRecordArray([{id:'same'}, {id:'same'}], 'row', 10).map(x=>x.id)).size === 2,
      corruptStorageSafe: (localStorage.setItem('corrupt','{no json'), parseStoredArray('corrupt','row',10).length === 0)
    };
  `, context, { filename: 'index-safety-tests.js' });
  const h = context.__helperResults;
  for (const [name, passed] of Object.entries(h)) assert(`Güvenlik yardımcısı: ${name}`, passed);
  assert('Render güvenliği: araç seçici kullanıcı metnini kaçışlar', source.includes("escHtml(v.plate || '—')") && source.includes("escHtml(v.brand || '')"));
  assert('Render güvenliği: sosyal fotoğraf yalnızca güvenli veri URI ile çizilir', source.includes('safeImageSrc(p.photo)') && source.includes('escHtml(safeImageSrc(p.photo))'));

  const dateFns = between('  function daysLeft(d) {', '  function getRemindDays()') +
    between('  const todayStr = () => {', '  function getAlerts(v)');
  vm.runInContext(dateFns, context, { filename: 'index-date-tests.js' });
  vm.runInContext(`globalThis.__dateResults = {
      sameDayZero: daysBetween(todayStr(), todayStr()) === 0,
      impossibleDateRejected: daysLeft('2026-02-31') === null,
      localDateLooksValid: /^\\d{4}-\\d{2}-\\d{2}$/.test(todayStr())
    };`, context);
  for (const [name, passed] of Object.entries(context.__dateResults)) assert(`Tarih testi: ${name}`, passed);

  // Run the real backup functions from index.html against an isolated localStorage fake.
  vm.runInContext(`
    const PARK_KEY = 'garaj_parking';
    const RIDE_PIN_KEY = 'garaj_ride_pins';
    const RIDE_CARDS_KEY = 'garaj_ride_cards';
    const RIDE_ASPHALT_KEY = 'garaj_ride_asphalt';
    const RIDE_DNA_KEY = 'garaj_ride_dna';
    const RIDE_BLACKBOX_KEY = 'garaj_ride_blackbox';
    const RIDE_SEGMENT_KEY = 'garaj_ride_segments';
    let vehicles = [{id:'v1', plate:'34ABC123', history:[], fuelLogs:[]}];
    function getAllRides(){ return parseStoredArray('garaj_rides','ride',150); }
    function parkGet(){ try { return JSON.parse(localStorage.getItem(PARK_KEY)||'null'); } catch { return null; } }
    function rideSettings(){ try { return JSON.parse(localStorage.getItem('garaj_ride_settings')||'{}'); } catch { return {}; } }
    function ridePinsGet(){ return parseStoredArray(RIDE_PIN_KEY,'pin',80); }
    function rideCardsGet(){ return parseStoredArray(RIDE_CARDS_KEY,'card',120); }
    function rideAsphaltGet(){ return parseStoredArray(RIDE_ASPHALT_KEY,'asphalt',400); }
    function rideDnaGet(){ try { return sanitizeStoredData(JSON.parse(localStorage.getItem(RIDE_DNA_KEY)||'null'),0,''); } catch { return null; } }
    function rideSegGet(){ try { return sanitizeStoredData(JSON.parse(localStorage.getItem(RIDE_SEGMENT_KEY)||'{}'),0,''); } catch { return {}; } }
  `, context);
  const autoSection = between('  // ---------- OTOMATİK YEDEK ----------', '  // ---------- FILTER ----------');
  const exportSection = between('  // ---------- EXPORT / IMPORT ----------', '  function updateBackupInfo()');
  vm.runInContext(autoSection + '\n' + exportSection, context, { filename: 'index-backup-tests.js' });
  vm.runInContext(`
    localStorage.setItem('garaj_rides', JSON.stringify([{id:'r_1',date:'2026-11-17T10:00:00Z',pts:[],dist:1200}]));
    localStorage.setItem('garaj_parking', JSON.stringify({lat:41.0,lng:29.0,at:1}));
    localStorage.setItem('garaj_ride_pins', JSON.stringify([{id:'p_1',type:'manzara',lat:41,lng:29,note:'durak'}]));
    localStorage.setItem('garaj_ride_cards', JSON.stringify([{id:'c_1',title:'rota',body:'iyi yol'}]));
    localStorage.setItem('garaj_ride_settings', JSON.stringify({unit:'kmh'}));
    localStorage.setItem('garaj_ride_draft', JSON.stringify({pts:[{lat:41,lng:29}]}));
    const bundle = backupBundle();
    globalThis.__bundleResults = {
      v3: bundle.version===3 && bundle.app==='garajim',
      rideIncluded: bundle.rides.length===1 && bundle.rides[0].id==='r_1',
      openWorldIncluded: !!bundle.parking && bundle.ridePins.length===1 && bundle.rideCards.length===1 && !!bundle.rideDraft,
      settingsIncluded: bundle.rideSettings.unit==='kmh'
    };
    localStorage.setItem(AUTO_ON,'1');
    const autoOK=runAutoBackup(true);
    const auto = getAutoBackups();
    globalThis.__autoResults = {
      createSuccess: autoOK===true,
      storesFullBundle: auto.length>0 && auto[0].data.version===3 && auto[0].data.rides.length===1 && auto[0].data.ridePins.length===1
    };
    applyBackupSnapshot({...bundle, vehicles:[{id:'v2',plate:'06XYZ999',history:[],fuelLogs:[],photo:'javascript:alert(1)'}]});
    globalThis.__restoreResults = {
      vehicleRestored: vehicles.length===1 && vehicles[0].id==='v2',
      unsafePhotoRemoved: !vehicles[0].photo,
      rideRestored: JSON.parse(localStorage.getItem('garaj_rides')||'[]').some(r=>r.id==='r_1'),
      pinRestored: JSON.parse(localStorage.getItem('garaj_ride_pins')||'[]').some(p=>p.id==='p_1')
    };
  `, context, { filename: 'index-backup-run-tests.js' });
  for (const [name, passed] of Object.entries(context.__bundleResults)) assert(`Yedek paketi: ${name}`, passed);
  for (const [name, passed] of Object.entries(context.__autoResults)) assert(`Otomatik yedek: ${name}`, passed);
  for (const [name, passed] of Object.entries(context.__restoreResults)) assert(`Yedekten geri yükleme: ${name}`, passed);
} catch (error) {
  assert('Test harness çalışması', false, error && error.stack || error);
}
const passed = results.filter(r => r.passed).length;
console.log(JSON.stringify({ passed, total: results.length, results }, null, 2));
if (passed !== results.length) process.exitCode = 1;

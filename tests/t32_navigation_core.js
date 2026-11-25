// Standalone navigation engine checks. Intentionally does not require jsdom or network.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('// ---------- NAVİGASYON (OSM arama + OSRM rota) ----------');
const end = html.indexOf('// ---------- CANLI GHOST', start);
const ok = (condition, message) => { console.log((condition ? 'PASS ' : 'FAIL ') + message); if (!condition) process.exitCode = 1; };
if (start < 0 || end <= start) { console.log('FAIL navigasyon modülü kaynaktan alınamadı'); process.exitCode = 1; process.exit(); }
const moduleCode = html.slice(start, end);
const storage = Object.create(null), spoken = [], fetches = [];
const elements = Object.create(null);
function element(id) {
  if (!elements[id]) {
    const classes = new Set(['hidden']);
    elements[id] = {
      id, textContent: '', innerHTML: '', className: '', title: '', style: {}, attrs: {},
      classList: { add: (...a) => a.forEach(x => classes.add(x)), remove: (...a) => a.forEach(x => classes.delete(x)), toggle: (x,v) => { if (v === undefined) v = !classes.has(x); v ? classes.add(x) : classes.delete(x); return v; }, contains: x => classes.has(x) },
      setAttribute(k,v) { this.attrs[k] = v; }
    };
  }
  return elements[id];
}
const routeData = (() => {
  const coordinates = Array.from({ length: 21 }, (_, i) => [29 + (i > 10 ? 0.004 : 0), 41 + i * 0.001]);
  return { distance: 2220, duration: 240, geometry: { coordinates }, legs: [{ steps: [
    { distance: 1110, duration: 120, name: 'Bağdat Cd.', maneuver: { type: 'depart', location: coordinates[0] } },
    { distance: 1110, duration: 120, name: 'Moda Cd.', maneuver: { type: 'turn', modifier: 'right', location: coordinates[10] } },
    { distance: 0, duration: 0, name: '', maneuver: { type: 'arrive', modifier: 'right', location: coordinates[20] } }
  ] }] };
})();
function hav(a,b) {
  const rad = Math.PI / 180, dLat=(b.lat-a.lat)*rad, dLng=(b.lng-a.lng)*rad;
  const q=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLng/2)**2;
  return 6371000*2*Math.atan2(Math.sqrt(q),Math.sqrt(1-q));
}
const map = { removeLayer(){}, fitBounds(){}, getCenter(){ return { lat: 41, lng: 29 }; }, setView(){}, panTo(){} };
const layer = { addTo(){ return this; }, on(){ return this; }, getBounds(){ return {}; } };
const context = {
  console, Date, Math, Number, String, Object, Array, JSON, Promise, Map, Set,
  setTimeout, clearTimeout, AbortController,
  __route: routeData,
  localStorage: { getItem:k => Object.prototype.hasOwnProperty.call(storage,k) ? storage[k] : null, setItem:(k,v)=>{storage[k]=String(v);}, removeItem:k=>{delete storage[k];} },
  navigator: { onLine: true, geolocation: { getCurrentPosition(ok){ ok({ coords:{ latitude:41,longitude:29,accuracy:5,speed:0,heading:0 }, timestamp:Date.now() }); } } },
  window: { addEventListener(){}, speechSynthesis: { cancel(){}, speak(u){spoken.push(u.text);} }, SpeechSynthesisUtterance: function(text){ this.text=text; } },
  document: { hidden:false, getElementById:element },
  ride: { last:{lat:41,lng:29,t:Date.now(),acc:5}, marker:null, map, layers:[], cam:'follow', hasHeading:false, running:false, paused:false, watchId:null, bgId:null, lastSpeedKmh:0 },
  rideHav: hav,
  rideEsc: x => String(x == null ? '' : x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'),
  rideAccent: () => '#ef4444', rideUpdateCamHint(){}, rideSetMe(){}, rideGhostChipPos(){},
  rideShowBgNotification(){}, rideStartWatch(){}, rideBGStart: async () => false,
  rideBGStop: async () => true, rideHideBgNotification(){}, rideVisible:()=>true,
  isNativeApp:()=>false, parkGet:()=>null, ridePinsGet:()=>[], openExternal(){}, toast(){},
  speechSynthesis: { cancel(){}, speak(u){spoken.push(u.text);} },
  SpeechSynthesisUtterance: function(text){ this.text=text; },
  L: { polyline(){ return Object.create(layer); }, circleMarker(){ return Object.create(layer); } },
  fetch: async url => { fetches.push(String(url)); return { ok:true, json:async()=>({ routes:[routeData] }) }; }
};
vm.createContext(context);
try { vm.runInContext(moduleCode, context, { timeout: 1500 }); } catch(e) { console.log('FAIL navigasyon modülü VM yükleme: '+e.message); process.exitCode=1; process.exit(); }
(async () => {
  try {
    const r = vm.runInContext('nvBuild(__route)', context);
    context.__built = r;
    ok(r.pts.length === 21 && r.steps.length === 3, 'rota geometrisi ve üç yön adımı güvenli biçimde çözüldü');
    ok(r.total > 2000 && r.dur === 240 && r.steps[1].text === 'Sağa dön · Moda Cd.', 'rota mesafe/süre ve Türkçe talimat doğru');
    vm.runInContext('nv.dest={name:"Test hedef",lat:41.02,lng:29}; nv.routes=[__built]; nv.sel=0; nvStart()', context, { timeout: 1500 });
    ok(vm.runInContext('nv.active',context) === true, 'navigasyon başlatıldı');
    ok(!!JSON.parse(storage.garaj_nav_session_v2 || 'null'), 'aktif hedef ve rota yerel oturuma kaydedildi');
    const status = () => element('navGpsStatus').textContent;
    vm.runInContext('nvTick(41.0075,29,5,Date.now()+2000,10)', context);
    ok(status().includes('GPS ±5 m'), 'iyi GPS doğruluğu navigasyonda gösteriliyor');
    vm.runInContext('nv.off=0; nvTick(41.005,29.003,140,Date.now()+3000,10)', context);
    ok(vm.runInContext('nv.off===0',context) && status().includes('düşük'), 'zayıf GPS tek başına rota dışı sayılmıyor');
    vm.runInContext('nv.off=0; nvTick(41.005,29.003,null,Date.now()+4000,10)', context);
    ok(vm.runInContext('nv.off===0',context) && status().includes('bilinmiyor'), 'doğruluk bilinmiyorsa yeniden rota tetiklenmiyor');
    vm.runInContext('nv.retryAt=0; nv.off=0; nvTick(41.005,29.003,5,Date.now()+5000,10); nvTick(41.0052,29.0031,5,Date.now()+6000,10); nvTick(41.0054,29.0032,5,Date.now()+7000,10)', context);
    await new Promise(resolve => setTimeout(resolve, 25));
    ok(fetches.filter(u => u.includes('/route/v1/driving/')).length === 1, 'üç tutarlı rota dışı konum yalnızca bir yeniden rota isteği oluşturuyor');
    ok(spoken.some(x => /Yeniden rota/.test(x)), 'rota dışı durumda sesli bilgilendirme yapılıyor');
    vm.runInContext('nvStop()', context);
    ok(!storage.garaj_nav_session_v2 && vm.runInContext('nv.active===false',context), 'navigasyon bitince oturum temizleniyor');
  } catch (e) { console.log('FAIL navigation core exception: '+(e && e.stack || e)); process.exitCode=1; }
})();

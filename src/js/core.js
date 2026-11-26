// State, storage, notifications, and platform bridge.
// Classic script: globals are shared with other files in index.html's intentional load order.
let vehicles = JSON.parse(localStorage.getItem('garaj_v4') || '[]');
  let currentId = null;
  let tempPhoto = null;
  let currentFilter = 'all';
  let expenseChart = null;
  let studioActiveProjectId = localStorage.getItem('garaj_studio_selected_project') || null;
  let studioDraftPhoto = null;
  let studioSubView = 'design';
  let studioPartFormOpen = false;
  let studioJournalFormOpen = false;
  const STUDIO_PROJECTS_KEY = 'garaj_studio_projects';
  const STUDIO_COLORS = [
    {name:'Grafit',hex:'#66717e',note:'OEM+ / sade'}, {name:'Saten siyah',hex:'#24282d',note:'Gizli ve agresif'},
    {name:'Buz beyazı',hex:'#e7e9e6',note:'Temiz görünüm'}, {name:'Yarış yeşili',hex:'#285246',note:'Klasik sport'},
    {name:'Okyanus mavisi',hex:'#416987',note:'Soğuk metalik'}, {name:'Bakır',hex:'#a76e50',note:'Sıcak metalik'},
    {name:'Bordo',hex:'#713744',note:'Derin ton'}, {name:'Kum beji',hex:'#b3a48a',note:'Retro stil'}
  ];
  const STUDIO_MODEL_CATALOG = {
    'Audi':['A1','A3','A4','A5','A6','A7','A8','Q2','Q3','Q5','Q7','e-tron GT'],
    'BMW':['1 Serisi','2 Serisi','3 Serisi','4 Serisi','5 Serisi','7 Serisi','X1','X3','X5','i4','iX','M2','M3','M4'],
    'Citroën':['C3','C3 Aircross','C4','C4 X','C5 Aircross'],
    'Dacia':['Sandero','Jogger','Duster','Spring'],
    'Fiat':['Egea','500','Panda','Tipo','600'],
    'Ford':['Fiesta','Focus','Puma','Kuga','Mustang','Ranger','Tourneo Courier'],
    'Honda':['Civic','Jazz','HR-V','CR-V','ZR-V'],
    'Hyundai':['i10','i20','i30','Bayon','Kona','Tucson','IONIQ 5','IONIQ 6'],
    'Kia':['Picanto','Rio','Ceed','Stonic','Sportage','EV3','EV6'],
    'Land Rover':['Defender','Discovery Sport','Range Rover Evoque','Range Rover Sport'],
    'Mazda':['Mazda2','Mazda3','CX-30','CX-5','MX-5'],
    'Mercedes-Benz':['A-Serisi','B-Serisi','C-Serisi','E-Serisi','S-Serisi','CLA','GLA','GLC','GLE','EQA','EQE'],
    'MG':['MG3','MG4','ZS','HS','Cyberster'],
    'MINI':['Cooper','Countryman','Aceman'],
    'Nissan':['Micra','Juke','Qashqai','X-Trail','Leaf'],
    'Opel':['Corsa','Astra','Mokka','Frontera','Grandland'],
    'Peugeot':['208','308','408','2008','3008','5008','Rifter'],
    'Renault':['Clio','Megane','Captur','Austral','Rafale','Kangoo'],
    'SEAT':['Ibiza','Leon','Arona','Ateca'],
    'Škoda':['Fabia','Scala','Octavia','Superb','Kamiq','Karoq','Kodiaq','Enyaq'],
    'Suzuki':['Swift','Vitara','S-Cross','Jimny'],
    'Tesla':['Model 3','Model Y','Model S','Model X'],
    'TOGG':['T10X','T10F'],
    'Toyota':['Yaris','Corolla','C-HR','RAV4','Hilux','Corolla Cross','Land Cruiser'],
    'Volkswagen':['Polo','Golf','Passat','T-Cross','T-Roc','Tiguan','Touareg','ID.3','ID.4','Transporter'],
    'Volvo':['EX30','EX40','EC40','S60','S90','V60','XC60','XC90']
  };

  const typeIcons = { car: 'fa-car', suv: 'fa-car-side', motorcycle: 'fa-motorcycle', van: 'fa-van-shuttle', other: 'fa-truck' };

  const cats = {
    bakim: { n: 'Periyodik Bakım', i: 'fa-wrench', c: '#f87171' },
    tamir: { n: 'Onarım / Yedek Parça', i: 'fa-screwdriver-wrench', c: '#fb923c' },
    lastik: { n: 'Lastik ve Jant', i: 'fa-circle-dot', c: '#94a3b8' },
    yakit: { n: 'Yakıt', i: 'fa-gas-pump', c: '#fbbf24' },
    vergi: { n: 'Vergi / Resmi', i: 'fa-file-invoice', c: '#a78bfa' },
    otopark: { n: 'Otopark / Garaj', i: 'fa-square-parking', c: '#38bdf8' },
    otoyol: { n: 'Otoyol / Geçiş', i: 'fa-road', c: '#2dd4bf' },
    aksesuar: { n: 'Aksesuar', i: 'fa-car-battery', c: '#818cf8' },
    ceza: { n: 'Trafik Cezası', i: 'fa-triangle-exclamation', c: '#f43f5e' },
    finans: { n: 'Finansman', i: 'fa-credit-card', c: '#c084fc' },
    hasar: { n: 'Kaza / Hasar', i: 'fa-car-burst', c: '#ef4444' },
    surucu: { n: 'Sürücü / İşletme', i: 'fa-user-tie', c: '#67e8f9' },
    sigorta: { n: 'Sigorta / Kasko', i: 'fa-shield-halved', c: '#34d399' },
    diger: { n: 'Diğer', i: 'fa-ellipsis', c: '#64748b' }
  };

  const planDefs = [
    { key: 'muayene', label: 'Muayene', icon: 'fa-clipboard-check', desc: 'Muayene bitiş tarihi' },
    { key: 'trafikSigorta', label: 'Trafik Sigortası', icon: 'fa-shield', desc: 'Poliçe bitiş' },
    { key: 'kasko', label: 'Kasko', icon: 'fa-shield-halved', desc: 'Poliçe bitiş' },
    { key: 'periyodik', label: 'Periyodik Bakım', icon: 'fa-wrench', desc: 'Sonraki bakım' },
    { key: 'kisLastigi', label: 'Kış Lastiği', icon: 'fa-snowflake', desc: 'Değişim tarihi' },
    { key: 'yazLastigi', label: 'Yaz Lastiği', icon: 'fa-sun', desc: 'Değişim tarihi' },
    { key: 'dortMevsim', label: '4 Mevsim Lastik', icon: 'fa-cloud-sun', desc: 'Değişim / kontrol tarihi' }
  ];

  // Android widget + yerel bildirim verisini gönder
  function syncNative() {
    try {
      const N = window.GarajimNative;
      if (!N) return;
      if (typeof N.syncWidget === 'function') N.syncWidget(JSON.stringify(vehicles.map(v => ({ id: v.id, name: v.name || [v.brand, v.model].filter(Boolean).join(' ') || 'Aracınız', plate: v.plate || 'Plaka girilmedi', km: v.km || v.mileage || '', cons: (() => { const f = fuelStats(v); return f ? f.avg.toFixed(1) : ''; })(), svc: (() => { const p = serviceProgress(v); return p ? { remaining: Math.round(p.remaining), percent: Math.round(p.percent), state: p.overdue ? 'bad' : p.warning ? 'warn' : 'ok' } : null; })() }))));
      // Araç ekleme/düzenleme/silme sonrası saat listesini anında yenile; heartbeat ayrıca yedek yol sağlar.
      if (typeof N.pushWearVehicles === 'function') N.pushWearVehicles(JSON.stringify(vehicles.slice(0, 60).map(v => ({
        id: String(v.id || ''), plate: String(v.plate || ''), name: String(v.name || ''), brand: String(v.brand || ''), model: String(v.model || '')
      }))));
      if (typeof N.setReminders === 'function') N.setReminders(JSON.stringify(collectNotifications().map(n => n.title + ': ' + n.body)));
    } catch (e) {}
  }

  // ---------- WIDGET HIZLI EYLEMLERİ ----------
  let widgetPending = null, widgetTimer = null;
  function openRideForVehicle(id) {
    if (id) rideSetVehicle(id);
    showTab('ride');
  }
  function runWidgetAction(a, vid) {
    if (!String(a || '').startsWith('wear_') && lockVisible()) { // telefon widget'ı PIN'e uyar; saatin sürüş kontrolleri kullanılabilir
      widgetPending = { a, vid };
      if (!widgetTimer) widgetTimer = setInterval(() => {
        if (lockVisible()) return;
        clearInterval(widgetTimer); widgetTimer = null;
        const x = widgetPending; widgetPending = null; if (x) runWidgetAction(x.a, x.vid);
      }, 500);
      return;
    }
    // Watch işlemleri telefon ekranını açmadan mevcut WebView oturumunda yürütülür.
    if (a === 'wear_select_vehicle') {
      if (ride.running) {
        try { rideWearAlert('info', 'Aktif sürüş sırasında araç değiştirilemez. Önce sürüşü bitir.'); } catch (e) {}
        return;
      }
      const selected = vehicles.find(x => String(x.id) === String(vid));
      if (!selected) { try { rideWearAlert('info', 'Araç bulunamadı; telefondaki araç listesi yenilensin.'); } catch (e) {} return; }
      rideSetVehicle(selected.id);
      rideRefreshVehicleSelect();
      const sel = document.getElementById('rideVehicleSelect');
      if (sel) sel.value = selected.id;
      try { rideWearPush(); } catch (e) {}
      try { if (typeof toast === 'function') toast('Saatten araç seçildi · ' + (selected.plate || selected.brand || selected.model || 'Garajım')); } catch (e) {}
      return;
    }
    if (a === 'wear_finish_confirmed') {
      if (ride.running || ride.startedAt) { rideFinish(true); }
      else { try { rideWearAlert('info', 'Aktif sürüş bulunamadı.'); } catch (e) {} }
      return;
    }
    if (a === 'wear_summary_save') {
      if (ride.pendingSummary && (!vid || String(ride.pendingSummary.id) === String(vid))) {
        rideKeepSummary();
      } else { try { rideWearAlert('info', 'Kaydedilecek sürüş özeti bulunamadı.'); } catch (e) {} }
      return;
    }
    if (a === 'wear_summary_discard') {
      if (ride.pendingSummary && (!vid || String(ride.pendingSummary.id) === String(vid))) {
        rideDiscardSummary();
      } else { try { rideWearAlert('info', 'Silinecek sürüş özeti bulunamadı.'); } catch (e) {} }
      return;
    }
    if (a === 'wear_request_sync') { try { rideWearPush(); } catch (e) {} return; }
    if (a === 'wear_fuel_quick' || a === 'wear_km_quick') {
      try {
        const requestedId = vid || currentId || localStorage.getItem('garaj_ride_vehicle');
        const selected = vehicles.find(x => String(x.id) === String(requestedId)) || vehicles[0];
        if (!selected) { toast('Önce Garajım’a bir araç ekle'); return; }
        showTab('garage');
        currentId = selected.id;
        openDetail(currentId);
        if (a === 'wear_fuel_quick' && typeof openFuelModal === 'function') {
          openFuelModal();
          toast('Saatten yakıt kaydı · tutarı gir');
        } else if (a === 'wear_km_quick' && typeof openKmModal === 'function') {
          openKmModal();
          toast('Saatten KM kaydı · değeri gir');
        }
      } catch (e) { console.warn('Wear hızlı kayıt açılamadı', e); }
      return;
    }
    if (a === 'wear_voice_pin') {
      try {
        showTab('ride');
        if (typeof ridePinPrompt === 'function') ridePinPrompt();
        else toast('Pin için Açık Dünya açık olsun');
      } catch (e) {}
      return;
    }
    if (a === 'wear_start') {
      if (vid && !ride.running && vehicles.some(x => String(x.id) === String(vid))) rideSetVehicle(String(vid));
      if (ride.pendingSummary && !ride.running) { try { rideWearAlert('info', 'Önce bekleyen sürüş özetini kaydet veya sil.'); } catch (e) {} return; }
      if (!ride.running && !(ride.vehicleId || localStorage.getItem('garaj_ride_vehicle'))) {
        try { rideWearAlert('info', 'Önce saatten bir araç seç.'); } catch (e) {}
        return;
      }
      try { if (!ride.running) rideToggle(); } catch (e) {}
      return;
    }
    if (a === 'wear_resume') {
      if (ride.pendingSummary && !ride.running) { try { rideWearAlert('info', 'Önce bekleyen sürüş özetini kaydet veya sil.'); } catch (e) {} return; }
      try { if (!ride.running || ride.paused) rideToggle(); } catch (e) {}
      return;
    }
    if (a === 'wear_toggle') { // Eski saat APK'sı için uyumluluk
      if (!ride.running && ride.pendingSummary) { try { rideWearAlert('info', 'Önce bekleyen sürüş özetini kaydet veya sil.'); } catch (e) {} return; }
      if (!ride.running && !(ride.vehicleId || localStorage.getItem('garaj_ride_vehicle'))) {
        try { rideWearAlert('info', 'Önce saatten bir araç seç.'); } catch (e) {}
        return;
      }
      try { rideToggle(); } catch (e) {}
      return;
    }
    if (a === 'wear_pause') {
      try { if (ride.running && !ride.paused) rideToggle(); } catch (e) {}
      return;
    }
    if (a === 'wear_stop_request') {
      try { rideWearAlert('info', 'Sürüşü bitirmek için saatteki Bitir düğmesini kullan.'); } catch (e) {}
      return;
    }
    if (a === 'wear_music_next') { try { musCmd('next'); } catch (e) {} return; }
    if (a === 'wear_music_prev') { try { musCmd('prev'); } catch (e) {} return; }
    if (a === 'wear_music_playpause') { try { musCmd('toggle'); } catch (e) {} return; }
    if (a === 'wear_park_where') {
      try {
        const p = parkGet();
        if (!p) { rideWearAlert('park', 'Kayıtlı park yok'); return; }
        if (ride.last && typeof parkBearing === 'function') {
          const d = rideHav(ride.last, { lat: p.lat, lng: p.lng });
          const dir = parkDirTxt(parkBearing(ride.last, { lat: p.lat, lng: p.lng }));
          const txt = (d >= 1000 ? (d/1000).toFixed(1) + ' km' : Math.round(d) + ' m') + ' · ' + dir;
          rideWearAlert('park', 'Park: ' + txt);
        }
        rideWearPush();
      } catch (e) {}
      return;
    }

    const v = vehicles.find(x => x.id === vid) || vehicles[0];   // widget'ta seçili araç
    if (a === 'ride') { openRideForVehicle(v && v.id); return; }
    if (a === 'ride_toggle' || a === 'toggle') {
      showTab('ride');
      try {
        if (ride.running && !ride.paused) { /* pause via toggle */ rideToggle(); }
        else if (ride.running && ride.paused) rideToggle();
        else rideToggle();
      } catch (e) {}
      return;
    }
    if (a === 'ride_pause' || a === 'pause') {
      showTab('ride');
      try { if (ride.running && !ride.paused) rideToggle(); } catch (e) {}
      return;
    }
    if (a === 'ride_stop' || a === 'stop' || a === 'finish') {
      showTab('ride');
      try { if (ride.running) rideStopConfirm(); } catch (e) {}
      return;
    }
    if (a === 'music_next' || a === 'next') { try { musCmd('next'); } catch (e) {} return; }
    if (a === 'music_prev' || a === 'prev') { try { musCmd('prev'); } catch (e) {} return; }
    if (a === 'music_playpause' || a === 'playpause') { try { musCmd('toggle'); } catch (e) {} return; }
    if (a === 'park_where') {
      try {
        showTab('ride');
        const p = parkGet();
        if (!p) { toast('Kayıtlı park yok'); return; }
        if (ride.last && typeof parkBearing === 'function') {
          const d = rideHav(ride.last, { lat: p.lat, lng: p.lng });
          const dir = parkDirTxt(parkBearing(ride.last, { lat: p.lat, lng: p.lng }));
          const txt = (d >= 1000 ? (d/1000).toFixed(1) + ' km' : Math.round(d) + ' m') + ' · ' + dir;
          toast('Park: ' + txt);
          rideWearAlert('park', 'Park ' + txt);
        } else {
          parkOpen();
        }
        rideWearPush();
      } catch (e) {}
      return;
    }
    if (a === 'park') { if (v) rideSetVehicle(v.id); showTab('ride'); parkSave(); return; }
    if (a === 'alerts') { showTab('garage'); openNotifPanel(); return; }
    if (a === 'open') { showTab('garage'); return; }
    if (!v) { showTab('garage'); toast('Önce bir araç ekle'); openAddModal(); return; }
    showTab('garage');
    openDetail(v.id);
    if (a === 'fuel') openFuelModal();
    else if (a === 'km') openKmModal();
    else if (a === 'service') openServiceModal();
  }
  function setWidgetVehicle(id) {
    try { const N = window.GarajimNative; if (N && N.setWidgetVehicle) { N.setWidgetVehicle(id); toast('Widget artık bu aracı gösteriyor'); } } catch (e) {}
  }

  let wearBridgeTimer = null;
  function wearBridgeKeepalive(on) {
    if (wearBridgeTimer) { clearInterval(wearBridgeTimer); wearBridgeTimer = null; }
    if (!on) return;
    wearBridgeTimer = setInterval(() => {
      try { checkWidgetAction(); } catch (e) {}
      try { rideWearStatusRefresh(false); } catch (e) {}
      try {
        // Sürüş veya ride sekmesindeyken saati taze tut
        const rv = document.getElementById('rideView');
        if (rv && !rv.classList.contains('hidden')) rideWearPush();
      } catch (e) {}
    }, 1500);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      try { checkWidgetAction(); rideWearPush(); } catch (e) {}
      wearBridgeKeepalive(true);
    }
  });
  function checkWidgetAction() {
    try {
      const N = window.GarajimNative;
      if (!N || typeof N.consumeAction !== 'function') return;
      const raw = N.consumeAction();
      if (raw) { const i = raw.indexOf('|'); runWidgetAction(i < 0 ? raw : raw.slice(0, i), i < 0 ? null : raw.slice(i + 1)); }
    } catch (e) {}
  }
  window.garajimCheckAction = checkWidgetAction;
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkWidgetAction(); });
  if (!window.__garajimActionPoll) window.__garajimActionPoll = setInterval(checkWidgetAction, 1200);

  // Dolu depo → dolu depo yöntemiyle L/100 km ve yakıt ₺/100 km (kısmi dolumlar toplanır)
  function fuelStats(v) {
    const logs = (v.fuelLogs || []).filter(f => Number(f.km) > 0).slice().sort((a, b) => Number(a.km) - Number(b.km));
    let lastFull = null, acc = 0, accCost = 0, costOk = true; const segs = [];
    logs.forEach(f => {
      const L = Number(f.liters) || 0, km = Number(f.km), C = Number(f.cost) || 0;
      if (!(C > 0)) costOk = false;
      if (f.full === false) { acc += L; accCost += C; return; }
      if (lastFull != null && km > lastFull && acc + L > 0) segs.push({ km: km - lastFull, liters: acc + L, cost: costOk ? accCost + C : null });
      lastFull = km; acc = 0; accCost = 0; costOk = true;
    });
    const ok = segs.filter(x => x.km >= 30 && x.liters / x.km * 100 > 0.5 && x.liters / x.km * 100 < 40);
    if (!ok.length) return null;
    const w = a => a.reduce((s, x) => s + x.liters, 0) / a.reduce((s, x) => s + x.km, 0) * 100;
    const last = ok[ok.length - 1], prev = ok.slice(0, -1).slice(-5);
    const lastV = last.liters / last.km * 100, prevAvg = prev.length ? w(prev) : null;
    const withCost = ok.filter(x => x.cost != null && x.cost > 0).slice(-5);
    const cost100 = withCost.length ? withCost.reduce((s, x) => s + x.cost, 0) / withCost.reduce((s, x) => s + x.km, 0) * 100 : null;
    return { last: lastV, avg: w(ok.slice(-5)), n: ok.length, prevAvg, change: prevAvg ? (lastV / prevAvg - 1) * 100 : null, cost100 };
  }
  // Kayıtlı tüm masraflar (bakım + yakıt) / kayıtlı km aralığı
  function costStats(v) {
    const hist = v.history || [], fuel = v.fuelLogs || [];
    const kms = hist.map(h => Number(h.km)).concat(fuel.map(f => Number(f.km)), [Number(v.km)]).filter(n => n > 0);
    if (!kms.length) return null;
    const span = Math.max(...kms) - Math.min(...kms);
    const sum = a => a.reduce((s, x) => s + (Number(x.cost) || 0), 0);
    const total = sum(hist) + sum(fuel);
    return span >= 200 && total > 0 ? { span, total, per100: total / span * 100 } : null;
  }

  function persist() {
    try {
      localStorage.setItem('garaj_v4', JSON.stringify(vehicles));
      syncNative();
      runAutoBackup(false);
      updateNotifBadge();
    } catch (err) {
      if (err.name === 'QuotaExceededError' || err.code === 22) {
        alert('Depolama dolu! Daha küçük bir resim seçin veya eski araçları silin.');
      } else {
        alert('Kaydetme hatası: ' + err.message);
      }
      throw err;
    }
  }

  function formatKm(n) { return (n === null || n === undefined || n === '') ? '—' : Number(n).toLocaleString('tr-TR') + ' km'; }
  function formatMoney(n) { return (!n && n !== 0) ? '' : Number(n).toLocaleString('tr-TR') + ' ₺'; }
  function daysLeft(d) { if (!d) return null; return Math.ceil((new Date(d) - new Date()) / 86400000); }
  function getRemindDays() { return Number(localStorage.getItem('garaj_remind_days') || 30); }
  function setRemindDays(d) {
    localStorage.setItem('garaj_remind_days', d);
    document.querySelectorAll('.remind-opt').forEach(b => b.classList.toggle('active', Number(b.dataset.d) === d));
    toast(d + ' gün kala uyarı verilecek');
    renderList();
  }
  function statusText(days, label) {
    if (days === null) return null;
    if (days < 0) return label + ' süresi dolmuş';
    if (days === 0) return label + ' bugün bitiyor';
    if (days <= getRemindDays()) return label + ' ' + days + ' gün';
    return null;
  }
  const catOf = h => cats[h.cat] ? h.cat : 'diger';
  const totalCost = v => (v.history || []).reduce((s, h) => s + (Number(h.cost) || 0), 0);
  const fmtTL = n => Math.round(n).toLocaleString('tr-TR') + ' ₺';
  const todayStr = () => new Date().toISOString().slice(0, 10);
  const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

  function getAlerts(v) {
    const alerts = [];
    ['muayene', 'trafikSigorta', 'kasko', 'kisLastigi', 'yazLastigi', 'dortMevsim'].forEach(k => {
      const t = statusText(daysLeft(v[k]), planDefs.find(p => p.key === k)?.label || k);
      if (t) alerts.push(t);
    });
    const prog = serviceProgress(v);
    if (prog && prog.overdue) alerts.push('Bakım gecikti');
    else if (prog && prog.warning) alerts.push('Bakım yaklaşıyor');
    return alerts;
  }

  // Premium: araç sağlık skoru 0-100
  function healthScore(v) {
    let score = 100;
    const reasons = [];
    const prog = serviceProgress(v);
    if (prog) {
      if (prog.overdue) { score -= 35; reasons.push('Bakım gecikmiş'); }
      else if (prog.warning) { score -= 15; reasons.push('Bakım yaklaşıyor'); }
    } else {
      score -= 10; reasons.push('Bakım planı eksik');
    }
    ['muayene', 'trafikSigorta', 'kasko'].forEach(k => {
      const d = daysLeft(v[k]);
      if (d === null) { score -= 8; reasons.push((planDefs.find(p => p.key === k)?.label || k) + ' yok'); }
      else if (d < 0) { score -= 20; reasons.push((planDefs.find(p => p.key === k)?.label || k) + ' dolmuş'); }
      else if (d <= getRemindDays()) { score -= 10; reasons.push((planDefs.find(p => p.key === k)?.label || k) + ' yakın'); }
    });
    // Yakıt anomalisi: son tüketim ortalamanın %30 üstündeyse
    const flogs = v.fuelLogs || [];
    if (flogs.length >= 3) {
      const rates = [];
      for (let i = 1; i < flogs.length; i++) {
        const km = Number(flogs[i].km) - Number(flogs[i-1].km);
        const L = Number(flogs[i].liters) || 0;
        if (km > 50 && L > 0) rates.push(L / km * 100);
      }
      if (rates.length >= 2) {
        const avg = rates.slice(0, -1).reduce((s, x) => s + x, 0) / (rates.length - 1);
        const last = rates[rates.length - 1];
        if (avg > 0 && last > avg * 1.3) { score -= 8; reasons.push('Yakıt tüketimi yükselmiş'); }
      }
    }
    score = Math.max(0, Math.min(100, Math.round(score)));
    let label = 'Mükemmel', color = '#22c55e';
    if (score < 40) { label = 'Kritik'; color = '#ef4444'; }
    else if (score < 60) { label = 'Dikkat'; color = '#f59e0b'; }
    else if (score < 80) { label = 'İyi'; color = '#eab308'; }
    else if (score < 95) { label = 'Çok iyi'; color = '#84cc16'; }
    return { score, label, color, reasons: reasons.slice(0, 3) };
  }

  // Premium: 90 günlük tahmini maliyet
  function estimate90Days(v) {
    const hist = v.history || [];
    const now = new Date();
    const from = new Date(now); from.setDate(from.getDate() - 180);
    const recent = hist.filter(h => h.date && new Date(h.date) >= from);
    const total = recent.reduce((s, h) => s + (Number(h.cost) || 0), 0);
    const days = Math.max(30, Math.min(180, recent.length ? 180 : 90));
    let base = (total / days) * 90;
    // Yaklaşan sabit kalemler
    let upcoming = 0;
    ['muayene', 'trafikSigorta', 'kasko'].forEach(k => {
      const d = daysLeft(v[k]);
      if (d !== null && d >= 0 && d <= 90) {
        const similar = hist.filter(h => h.cat === 'sigorta' || h.cat === 'vergi').map(h => Number(h.cost) || 0);
        const avg = similar.length ? similar.reduce((a, b) => a + b, 0) / similar.length : 0;
        upcoming += avg;
      }
    });
    const bakimlar = hist.filter(h => h.cat === 'bakim' && Number(h.cost) > 0);
    const avgBakim = bakimlar.length ? bakimlar.reduce((s, h) => s + Number(h.cost), 0) / bakimlar.length : 0;
    const prog = serviceProgress(v);
    if (prog && (prog.warning || prog.overdue || prog.remaining < 3000)) upcoming += avgBakim;
    return Math.round(base + upcoming);
  }

  function serviceProgress(v) {
    if (!v.km || !v.nextServiceKm) return null;
    const remaining = Number(v.nextServiceKm) - Number(v.km);
    const interval = Number(v.interval) || 15000;
    const percent = Math.min(100, Math.max(0, 100 - (remaining / interval) * 100));
    // Uyarı eşiği: aralığın %12'si veya en az 600 / en fazla 1200 km
    const warnThreshold = Math.min(1200, Math.max(600, Math.round(interval * 0.12)));
    return {
      remaining,
      percent,
      overdue: remaining <= 0,
      warning: remaining > 0 && remaining <= warnThreshold,
      warnThreshold
    };
  }

  // ---------- BİLDİRİM MERKEZİ ----------
  function collectNotifications() {
    const list = [];
    vehicles.forEach(v => {
      const plate = v.plate || 'Araç';
      const prog = serviceProgress(v);
      if (prog) {
        if (prog.overdue) {
          list.push({ id: v.id, type: 'danger', title: plate, body: `Bakım KM’si geçti (${formatKm(Math.abs(prog.remaining))} gecikme)`, icon: 'fa-wrench' });
        } else if (prog.warning) {
          list.push({ id: v.id, type: 'warn', title: plate, body: `Bakım KM’si yaklaşıyor — ${formatKm(prog.remaining)} kaldı`, icon: 'fa-gauge-high' });
        }
      }
      getAlerts(v).forEach(a => {
        if (a.includes('Bakım')) return; // yukarıda eklendi
        const danger = a.includes('dolmuş') || a.includes('gecikti') || a.includes('bugün');
        list.push({
          id: v.id,
          type: danger ? 'danger' : 'warn',
          title: plate,
          body: a,
          icon: a.includes('Sigorta') || a.includes('Kasko') ? 'fa-shield' : a.includes('Muayene') ? 'fa-clipboard-check' : a.includes('Lastik') ? 'fa-circle-dot' : 'fa-bell'
        });
      });
    });
    return list;
  }

  function updateNotifBadge() {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    const n = collectNotifications().length;
    if (n > 0) {
      badge.textContent = n > 9 ? '9+' : String(n);
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  function toggleNotifPanel() {
    const panel = document.getElementById('notifPanel');
    if (panel.classList.contains('hidden')) openNotifPanel();
    else closeNotifPanel();
  }

  // JSON yedeklerinden ve yerel kayıtlardan gelen metinler HTML içine gömülmeden kaçırılır.
  function garajimHtmlEsc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[ch]);
  }
  // onclick gibi HTML özniteliklerinde JS argümanı üretirken hem JS hem HTML katmanını koru.
  function garajimInlineJsArg(value) {
    // onclick="..." içinde tek tırnaklı JS dizesi: HTML özniteliği kırılmaz, testler 'id' bekler.
    const raw = String(value == null ? '' : value);
    const js = "'" + raw
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029')
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e') + "'";
    // Çift tırnaklı öznitelik içinde tek tırnak güvenli; yalnızca & kaçır.
    return js.replace(/&/g, '&amp;');
  }
  function garajimSafeImageSrc(value) {
    const src = String(value == null ? '' : value).trim();
    if (/^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=\r\n]+$/i.test(src)) return garajimHtmlEsc(src);
    if (/^https:\/\/[^\s"'<>`]+$/i.test(src)) return garajimHtmlEsc(src);
    return '';
  }

  function openNotifPanel() {
    const list = collectNotifications();
    const box = document.getElementById('notifList');
    if (!list.length) {
      box.innerHTML = `<div class="text-center py-10 text-slate-500 text-sm">
        <i class="fa-regular fa-bell-slash text-2xl mb-2 opacity-50"></i>
        <p>Şu an bildirim yok</p>
        <p class="text-[11px] mt-1">Bakım KM’si veya tarihler yaklaşınca burada görünür</p>
      </div>`;
    } else {
      box.innerHTML = list.map(n => `
        <button onclick="openDetailFromNotif(${garajimInlineJsArg(n.id)})" class="w-full text-left flex gap-3 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 mb-1">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${n.type === 'danger' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}">
            <i class="fa-solid ${n.icon} text-sm"></i>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold truncate">${garajimHtmlEsc(n.title)}</p>
            <p class="text-[12px] text-slate-400 mt-0.5 leading-snug">${garajimHtmlEsc(n.body)}</p>
          </div>
          <i class="fa-solid fa-chevron-right text-slate-600 text-xs self-center"></i>
        </button>`).join('');
    }
    document.getElementById('notifPanel').classList.remove('hidden');
  }

  function closeNotifPanel() {
    document.getElementById('notifPanel').classList.add('hidden');
  }

  function openDetailFromNotif(id) {
    closeNotifPanel();
    openDetail(id);
  }

  function canUseSystemNotif() {
    // file:// ve content:// ortamında tarayıcı izin penceresi açmaz
    if (!('Notification' in window)) return { ok: false, reason: 'Bu tarayıcı sistem bildirimi desteklemiyor.' };
    if (!window.isSecureContext) {
      return {
        ok: false,
        reason: 'Dosyayı doğrudan açınca (file/content) sistem bildirimi çalışmaz. Uygulama içi zil paneli yine çalışır. Sistem bildirimi için siteyi HTTPS ile açman veya Ana ekrana eklemen gerekir.'
      };
    }
    if (Notification.permission === 'denied') {
      return {
        ok: false,
        reason: 'Bildirim izni daha önce reddedilmiş. Tarayıcı site ayarlarından bildirimlere izin vermen gerekir.'
      };
    }
    return { ok: true };
  }

  async function requestNotifPermission() {
    if (window.GarajimNative && typeof window.GarajimNative.requestNotifications === 'function') {
      try { window.GarajimNative.requestNotifications(); toast('Yerel bakım hatırlatması ayarlandı. Android bildirim iznini onaylayın.'); }
      catch (e) { alert('Yerel bildirim ayarlanamadı. Android ayarlarından Garajım bildirim iznini kontrol edin.'); }
      return;
    }
    const check = canUseSystemNotif();
    if (!check.ok) {
      alert(check.reason);
      return;
    }
    if (Notification.permission === 'granted') {
      checkAndNotify(true);
      toast('Sistem bildirimleri zaten açık');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        checkAndNotify(true);
        toast('Sistem bildirimleri açıldı');
      } else {
        alert('İzin verilmedi. Zil ikonundaki uygulama içi bildirimler yine çalışır; sistem bildirimi için tarayıcı ayarlarından izin vermen gerekir.');
      }
    } catch (e) {
      alert('Bildirim izni istenemedi. Dosyayı doğrudan açıyor olabilirsin — uygulama içi bildirimler (zil) izinsiz çalışır.');
    }
  }

  function checkAndNotify(force) {
    updateNotifBadge();
    const check = canUseSystemNotif();
    if (!check.ok || Notification.permission !== 'granted') return;
    const lastNotif = localStorage.getItem('garaj_last_notif') || '';
    const today = todayStr();
    if (!force && lastNotif === today) return;
    collectNotifications().forEach(n => {
      try {
        new Notification(n.title + ' · Garajım', {
          body: n.body,
          tag: n.id + n.body,
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🚗</text></svg>'
        });
      } catch (e) {}
    });
    localStorage.setItem('garaj_last_notif', today);
  }

  // ---------- OTOMATİK YEDEK ----------
  const AUTO_KEY = 'garaj_auto_backups';
  const AUTO_ON = 'garaj_auto_backup_on';

  function isAutoBackupOn() { return localStorage.getItem(AUTO_ON) === '1'; }

  function toggleAutoBackup() {
    const on = !isAutoBackupOn();
    localStorage.setItem(AUTO_ON, on ? '1' : '0');
    updateAutoBackupUI();
    if (on) { runAutoBackup(true); toast('Otomatik yedek açıldı'); }
    else toast('Otomatik yedek kapandı');
  }

  function getAutoBackups() {
    try { return JSON.parse(localStorage.getItem(AUTO_KEY) || '[]'); }
    catch { return []; }
  }

  function runAutoBackup(force) {
    if (!isAutoBackupOn() && !force) return;
    try {
      let list = getAutoBackups();
      const today = todayStr();
      // Aynı gün içinde tek anlık kopya (force değilse)
      if (!force && list[0] && list[0].date === today) return;
      list.unshift({
        date: today,
        time: new Date().toISOString(),
        count: vehicles.length,
        data: vehicles
      });
      list = list.slice(0, 7); // son 7 yedek
      localStorage.setItem(AUTO_KEY, JSON.stringify(list));
      updateAutoBackupUI();
    } catch (e) {
      // kota doluysa eski yedekleri silip dene
      try {
        localStorage.setItem(AUTO_KEY, JSON.stringify([{ date: todayStr(), time: new Date().toISOString(), count: vehicles.length, data: vehicles }]));
      } catch (e2) {}
    }
  }

  function updateAutoBackupUI() {
    const btn = document.getElementById('autoBackupToggle');
    const st = document.getElementById('autoBackupStatus');
    if (!btn || !st) return;
    const on = isAutoBackupOn();
    btn.textContent = on ? 'Açık' : 'Kapalı';
    btn.classList.toggle('active', on);
    const list = getAutoBackups();
    if (!list.length) st.textContent = on ? 'Henüz yedek yok — ilk kayıtta oluşacak' : 'Kapalı';
    else {
      const last = list[0];
      st.textContent = `Son otomatik: ${last.date} · ${last.count} araç · ${list.length} kopya saklı (yalnızca araç listesi)`;
    }
  }

  function restoreAutoBackup() {
    const list = getAutoBackups();
    if (!list.length) { toast('Otomatik yedek yok'); return; }
    const msg = list.map((b, i) => `${i + 1}) ${b.date} — ${b.count} araç`).join('\n');
    const pick = prompt('Hangi yedeği yükleyelim?\n\n' + msg + '\n\nNumara yaz (1 = en yeni):', '1');
    const idx = Number(pick) - 1;
    if (isNaN(idx) || !list[idx]) { toast('İptal'); return; }
    if (!confirm(`${list[idx].date} tarihli yedek yüklenecek. Mevcut veri değişir. Devam?`)) return;
    vehicles = list[idx].data || [];
    persist();
    renderList();
    updateNotifBadge();
    toast('Otomatik yedekten geri yüklendi');
    closeSettings();
  }

  function downloadAutoBackup() {
    const list = getAutoBackups();
    if (!list.length) { toast('Otomatik yedek yok'); return; }
    saveFileToast('garajim-otomatik-' + (list[0].date || todayStr()) + '.json', 'application/json', JSON.stringify(list[0].data, null, 2), 'Otomatik yedek');
  }

  // ---------- PWA ----------
  function setupPWA() {
    const manifest = {
      name: 'Garajım',
      short_name: 'Garajım',
      description: 'Araç bakım ve masraf takibi',
      start_url: location.href,
      display: 'standalone',
      background_color: '#0a0a0a',
      theme_color: '#0a0a0a',
      icons: [{
        src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23ef4444" width="100" height="100" rx="20"/><text y=".9em" x="50%" text-anchor="middle" font-size="60">🚗</text></svg>',
        sizes: '192x192',
        type: 'image/svg+xml'
      }]
    };
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    document.getElementById('manifestLink').href = URL.createObjectURL(blob);

    // Simple service worker for offline
    if ('serviceWorker' in navigator) {
      const swCode = `
        self.addEventListener('install', e => self.skipWaiting());
        self.addEventListener('activate', e => clients.claim());
        self.addEventListener('fetch', e => {
          e.respondWith(caches.open('garaj-v1').then(cache => 
            cache.match(e.request).then(r => r || fetch(e.request).then(resp => {
              if (e.request.url.startsWith('http') && resp.ok) cache.put(e.request, resp.clone());
              return resp;
            }).catch(() => r))
          ));
        });
      `;
      const swBlob = new Blob([swCode], { type: 'application/javascript' });
      navigator.serviceWorker.register(URL.createObjectURL(swBlob)).catch(() => {});
    }
  }

  // ---------- FILTER ----------

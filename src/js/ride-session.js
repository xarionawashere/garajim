// Live ride session, GPS, summaries, and Wear synchronization.
// Classic script: globals are shared with other files in index.html's intentional load order.
function computeTCO(v) {
    const hist = v.history || [];
    const totalCost = hist.reduce((s, h) => s + (Number(h.cost) || 0), 0);
    const rides = typeof getVehicleRides === 'function' ? getVehicleRides(v.id) : [];
    const rideKm = rides.reduce((s, r) => s + (r.dist || 0), 0) / 1000;
    // KM: mevcut km - en düşük yakıt/history km yaklaşık kullanım
    const kms = [];
    hist.forEach(h => { if (h.km) kms.push(Number(h.km)); });
    (v.fuelLogs || []).forEach(f => { if (f.km) kms.push(Number(f.km)); });
    let driven = rideKm;
    if (kms.length >= 2) driven = Math.max(driven, Math.max(...kms) - Math.min(...kms));
    if (v.km && kms.length) driven = Math.max(driven, Number(v.km) - Math.min(...kms));
    if (driven < 1 && v.km) driven = Number(v.km) > 100 ? 0 : 0; // bilinmiyor
    const perKm = driven > 1 && totalCost > 0 ? totalCost / driven : null;
    return { totalCost, driven, perKm, rideKm, fuelCost: hist.filter(h => h.cat === 'yakit').reduce((s,h)=>s+(Number(h.cost)||0),0) };
  }

  function addToCalendar(title, dateStr, days) {
    if (!dateStr) { toast('Tarih yok'); return; }
    const start = dateStr.replace(/-/g, '');
    // bitiş aynı gün
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Garajim//TR',
      'BEGIN:VEVENT',
      'DTSTART;VALUE=DATE:' + start,
      'DTEND;VALUE=DATE:' + start,
      'SUMMARY:' + title.replace(/[,;\n]/g, ' '),
      'DESCRIPTION:Garajım hatırlatması',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (title || 'hatirlatma').replace(/\s+/g, '_') + '.ics';
    const native = !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
    if (!native) a.click();                                    // APK'da dosya indirme çalışmaz; Google Takvim açılır
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    // Google Calendar web
    const g = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' +
      encodeURIComponent(title) + '&dates=' + start + '/' + start;
    toast(native ? 'Google Takvim açılıyor' : 'Takvim dosyası indirildi');
    setTimeout(() => { try { openExternal(g); } catch (e) {} }, 400);
  }

  function rideRefreshVehicleSelect() {
    const sel = document.getElementById('rideVehicleSelect');
    if (!sel) return;
    const cur = ride.vehicleId || localStorage.getItem('garaj_ride_vehicle') || (currentId || '');
    sel.innerHTML = '<option value="">Araç seç</option>' + vehicles.map(v =>
      `<option value="${v.id}">${(v.plate || v.brand || 'Araç').replace(/</g,'')}</option>`
    ).join('');
    if (cur && vehicles.some(v => v.id === cur)) {
      sel.value = cur;
      ride.vehicleId = cur;
    } else if (vehicles.length === 1) {
      sel.value = vehicles[0].id;
      ride.vehicleId = vehicles[0].id;
      localStorage.setItem('garaj_ride_vehicle', ride.vehicleId);
    }
  }
  function rideSetVehicle(id) {
    try {
      const N = window.GarajimNative;
      if (N && typeof N.isNativeRideManaged === 'function' && N.isNativeRideManaged()) {
        toast('Arka plan sürüşü saatte yönetiliyor; araç sürüş sırasında değiştirilemez.');
        return;
      }
    } catch (e) {}
    ride.vehicleId = id || null;
    if (id) localStorage.setItem('garaj_ride_vehicle', id);
    else localStorage.removeItem('garaj_ride_vehicle');
    try { const N = window.GarajimNative; if (N && N.setRideVehicle && id) N.setRideVehicle(String(id)); } catch (e) {}
    try { rideWearPush(); } catch (e) {}
  }
  function openVehicleRidePreview(vehicleId, idx) {
    let r = null;
    if (vehicleId) r = getVehicleRides(vehicleId)[idx];
    if (!r && typeof idx === 'number') r = getAllRides()[idx];
    if (!r) return;
    ride.pendingSummary = { ...r, _previewOnly: true };
    rideShowSummary(r, true);
  }
  function rideClosePreview() { rideHideSummary(); }

  function rideSettings() {
    try { return JSON.parse(localStorage.getItem('garaj_ride_settings') || '{}'); }
    catch { return {}; }
  }
  function rideSaveSettings(p) {
    const s = { ...rideSettings(), ...p };
    localStorage.setItem('garaj_ride_settings', JSON.stringify(s));
    return s;
  }
  function rideUnit() { return rideSettings().unit || 'kmh'; }
  function rideAccent() {
    return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ef4444';
  }

  function rideShowGate(mode, title, msg) {
    const gate = document.getElementById('rideGate');
    gate.classList.remove('hidden');
    gate.classList.add('flex');
    document.getElementById('rideGateTitle').textContent = title;
    document.getElementById('rideGateMsg').textContent = msg;
    const btn = document.getElementById('rideGateBtn');
    const icon = document.getElementById('rideGateIcon');
    if (mode === 'denied') {
      icon.className = 'fa-solid fa-location-pin-lock text-2xl text-amber-400';
      btn.classList.remove('hidden');
    } else if (mode === 'wait') {
      icon.className = 'fa-solid fa-satellite-dish text-2xl text-accent fa-fade';
      btn.classList.add('hidden');
    } else {
      icon.className = 'fa-solid fa-triangle-exclamation text-2xl text-red-400';
      btn.classList.remove('hidden');
    }
  }
  function rideHideGate() {
    const gate = document.getElementById('rideGate');
    gate.classList.add('hidden');
    gate.classList.remove('flex');
  }

  function rideSetGpsStatus(state, acc) {
    const dot = document.getElementById('rideGpsDot');
    const txt = document.getElementById('rideGpsTxt');
    if (!dot || !txt) return;
    if (state === 'ok') {
      dot.style.background = '#22c55e';
      txt.textContent = acc != null ? `GPS · ±${Math.round(acc)} m` : 'GPS bağlı';
    } else if (state === 'weak') {
      dot.style.background = '#f59e0b';
      txt.textContent = acc != null ? `Zayıf · ±${Math.round(acc)} m` : 'Zayıf sinyal';
    } else if (state === 'off') {
      dot.style.background = '#ef4444';
      txt.textContent = 'GPS yok';
    } else {
      dot.style.background = '#64748b';
      txt.textContent = 'GPS…';
    }
  }

  function rideEsc(t) { return String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  const rideVisible = () => !document.getElementById('rideView').classList.contains('hidden');


  // —— Snapchat tarzı bölge/hava efektleri (Open-Meteo, ücretsiz) ——
  function rideWeatherModeFromCode(code) {
    const c = Number(code);
    if (!isFinite(c)) return 'clear';
    if (c === 71 || c === 73 || c === 75 || c === 77 || c === 85 || c === 86) return 'snow';
    if (c >= 95) return 'storm';
    if (c === 61 || c === 63 || c === 65 || c === 66 || c === 67 || c === 80 || c === 81 || c === 82 || c === 51 || c === 53 || c === 55 || c === 56 || c === 57) return 'rain';
    if (c === 45 || c === 48) return 'fog';
    if (c === 1 || c === 2 || c === 3) return 'cloud';
    return 'clear';
  }
  function rideWeatherLabel(mode, temp) {
    const t = (temp != null && isFinite(temp)) ? (' · ' + Math.round(temp) + '°') : '';
    return ({ clear: 'Açık', cloud: 'Bulutlu', fog: 'Sis', rain: 'Yağmur', snow: 'Kar', storm: 'Fırtına' }[mode] || mode) + t;
  }
  function rideWeatherIcon(mode) {
    return ({ clear: '☀️', cloud: '☁️', fog: 'fog', rain: '🌧️', snow: '❄️', storm: '⛈️' }[mode] || '🌤').replace('fog', '🌫️');
  }
  function rideWeatherEnsureCanvas() {
    const c = document.getElementById('rideWeatherFx');
    if (!c) return null;
    const w = c.clientWidth || c.offsetWidth || 1;
    const h = c.clientHeight || c.offsetHeight || 1;
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    return c;
  }
  function rideWeatherSpawn(mode, n) {
    const c = rideWeatherEnsureCanvas();
    if (!c) return;
    const pts = ride.weather.particles || [];
    for (let i = 0; i < n; i++) {
      if (mode === 'snow') {
        pts.push({ x: Math.random() * c.width, y: Math.random() * c.height - c.height, v: 0.6 + Math.random() * 1.4, r: 1.2 + Math.random() * 2.2, drift: -0.4 + Math.random() * 0.8, kind: 'snow' });
      } else if (mode === 'rain' || mode === 'storm') {
        pts.push({ x: Math.random() * c.width, y: Math.random() * c.height - c.height, v: 9 + Math.random() * 12, len: 8 + Math.random() * 14, kind: 'rain' });
      }
    }
    ride.weather.particles = pts.slice(-420);
  }
  function rideWeatherTick() {
    const mode = ride.weather.mode;
    const c = rideWeatherEnsureCanvas();
    if (!c) { ride.weather.raf = 0; return; }
    const ctx = c.getContext('2d');
    if (!ctx) { ride.weather.raf = 0; return; }
    ctx.clearRect(0, 0, c.width, c.height);
    if (!ride.weather.enabled || mode === 'clear' || mode === 'cloud') {
      if (mode === 'cloud' || mode === 'fog') {
        ctx.fillStyle = mode === 'fog' ? 'rgba(180,190,200,0.14)' : 'rgba(30,40,60,0.08)';
        ctx.fillRect(0, 0, c.width, c.height);
      }
      ride.weather.raf = requestAnimationFrame(rideWeatherTick);
      return;
    }
    if (mode === 'fog') {
      ctx.fillStyle = 'rgba(170,180,190,0.16)';
      ctx.fillRect(0, 0, c.width, c.height);
    }
    if (mode === 'storm') {
      if (Math.random() < 0.012) {
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(0, 0, c.width, c.height);
      }
    }
    if ((ride.weather.particles || []).length < 180) rideWeatherSpawn(mode === 'storm' ? 'rain' : mode, 12);
    const pts = ride.weather.particles || [];
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      if (p.kind === 'snow') {
        p.y += p.v; p.x += p.drift;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        p.y += p.v;
        ctx.strokeStyle = mode === 'storm' ? 'rgba(180,200,255,0.45)' : 'rgba(160,190,255,0.4)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - 1.2, p.y + p.len);
        ctx.stroke();
      }
      if (p.y > c.height + 20) {
        p.y = -10;
        p.x = Math.random() * c.width;
      }
    }
    ride.weather.raf = requestAnimationFrame(rideWeatherTick);
  }
  function rideWeatherStartLoop() {
    if (ride.weather.raf) return;
    ride.weather.raf = requestAnimationFrame(rideWeatherTick);
  }
  function rideWeatherStopLoop() {
    if (ride.weather.raf) cancelAnimationFrame(ride.weather.raf);
    ride.weather.raf = 0;
    const c = document.getElementById('rideWeatherFx');
    if (c) {
      const ctx = c.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, c.width, c.height);
    }
  }
  function rideWeatherApply(mode, temp, code) {
    ride.weather.mode = mode || 'clear';
    ride.weather.temp = temp;
    ride.weather.code = code;
    ride.weather.label = rideWeatherLabel(ride.weather.mode, temp);
    ride.weather.particles = [];
    const chip = document.getElementById('rideWeatherChip');
    const ic = document.getElementById('rideWeatherIcon');
    const tx = document.getElementById('rideWeatherTxt');
    if (chip) chip.classList.toggle('hidden', false);
    if (ic) ic.textContent = rideWeatherIcon(ride.weather.mode);
    if (tx) tx.textContent = ride.weather.label;
    if (ride.weather.mode === 'rain' || ride.weather.mode === 'snow' || ride.weather.mode === 'storm') {
      rideWeatherSpawn(ride.weather.mode === 'storm' ? 'rain' : ride.weather.mode, 80);
    }
    rideWeatherStartLoop();
  }
  function rideWeatherFetch(lat, lng, force) {
    if (!ride.weather.enabled) return;
    if (lat == null || lng == null || !isFinite(lat) || !isFinite(lng)) return;
    const now = Date.now();
    if (!force && ride.weather.lastFetch && now - ride.weather.lastFetch < 12 * 60 * 1000) {
      const dlat = Math.abs((ride.weather.lastLat || 0) - lat);
      const dlng = Math.abs((ride.weather.lastLng || 0) - lng);
      if (dlat < 0.08 && dlng < 0.08) return; // ~8–10 km
    }
    ride.weather.lastFetch = now;
    ride.weather.lastLat = lat;
    ride.weather.lastLng = lng;
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + encodeURIComponent(lat) +
      '&longitude=' + encodeURIComponent(lng) +
      '&current=weather_code,temperature_2m,precipitation&timezone=auto';
    fetch(url).then(r => r.json()).then(data => {
      const cur = data && data.current;
      if (!cur) return;
      const code = cur.weather_code;
      const mode = rideWeatherModeFromCode(code);
      rideWeatherApply(mode, cur.temperature_2m, code);
    }).catch(() => {
      // sessiz: çevrimdışı / ağ yok
    });
  }

  function rideOpen() {
    const s = rideSettings();
    if (!ride.running && !ride.startedAt) ride.cam = s.cam || 'follow';
    ride.panelCollapsed = s.hud === false;
    rideApplyPanel();
    rideUpdateCamHint();
    rideRefreshVehicleSelect();
    rideApplyNight(!!s.night);
    if (!ride.map) {
      ride.map = L.map('rideMap', { zoomControl: false, attributionControl: false, maxZoom: 19 }).setView([39.0, 35.0], 6);
      ride.tile = addBaseTiles(ride.map);
      try {
        ride.satTile = tileLayerCached('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Esri' });
      } catch (e) { ride.satTile = null; }
      ride.line = L.polyline([], { color: rideAccent(), weight: 5, opacity: 0.9, lineJoin: 'round' }).addTo(ride.map);
      ride.map.on('dragstart', () => { ride.cam = 'free'; rideUpdateCamHint(); });
    }
    ride.map.getContainer().classList.toggle('map-dark', !isLight());
    setTimeout(() => { try { ride.map.invalidateSize(); rideUpdateMapAttribution(); } catch (e) {} }, 180);
    parkRenderMarker();
    ridePinsRender();
    rideRequestPermission();
    rideTryRecover();
    musInit();
    try {
      const ll = ride.last || (ride.map && ride.map.getCenter && { lat: ride.map.getCenter().lat, lng: ride.map.getCenter().lng });
      if (ll) rideWeatherFetch(ll.lat, ll.lng, false);
      rideWeatherStartLoop();
    } catch (e) {}
    try { rideWearStatusRefresh(false); } catch (e) {}
  }

  // Sürüş yokken sekmeden çıkınca GPS'i kapat (pil)
  function rideLeave() {
    try { rideWeatherStopLoop(); } catch (e) {}
    musStop(); musClose();
    if (!ride.running && !ride.startedAt && !nv.active && ride.watchId != null) {
      try { navigator.geolocation.clearWatch(ride.watchId); } catch (e) {}
      ride.watchId = null;
    }
  }

  function rideStartWatch() {
    if (ride.watchId != null || ride.bgId) return;
    ride.watchId = navigator.geolocation.watchPosition(
      p => rideApplyPos(p, false),
      err => {
        if (err && err.code === 1) {
          ride.gotFix = false;
          rideShowGate('denied', 'Konum izni gerekli', 'Açık Dünya için konum izni ver. Telefon ayarlarından Garajım için konumu aç, sonra tekrar dene.');
          rideSetGpsStatus('off');
        } else rideSetGpsStatus('weak');
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 }
    );
  }

  function rideRequestPermission() {
    if (!navigator.geolocation) {
      rideShowGate('err', 'Konum yok', 'Bu cihaz/tarayıcı konum servisini desteklemiyor.');
      rideSetGpsStatus('off');
      return;
    }
    if (ride.gotFix) { rideHideGate(); rideStartWatch(); return; }
    rideShowGate('wait', 'Konum bekleniyor', 'GPS açılıyor… Konum alınmadan haritaya sahte pin koyulmaz.');
    rideSetGpsStatus('wait');
    navigator.geolocation.getCurrentPosition(
      pos => {
        rideHideGate();
        ride.gotFix = true;
        rideApplyPos(pos, true);
        rideStartWatch();
      },
      err => {
        if (err && err.code === 1) rideShowGate('denied', 'Konum izni gerekli', 'Açık Dünya için konum izni ver. Telefon ayarlarından Garajım konumunu aç, sonra tekrar dene.');
        else rideShowGate('err', 'Konum alınamadı', 'GPS kapalı olabilir veya sinyal yok. Açık alanda tekrar dene.');
        rideSetGpsStatus('off');
      },
      { enableHighAccuracy: true, timeout: 18000, maximumAge: 0 }
    );
  }

  // ---- Arka plan konum (APK'da eklenti varsa; yoksa normal GPS ile devam)
  function rideBGPlugin() {
    if (ride.bg !== undefined) return ride.bg;
    ride.bg = null;
    try { if (window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()) ride.bg = Capacitor.registerPlugin('BackgroundGeolocation'); } catch (e) {}
    return ride.bg;
  }
  async function rideBGStart() {
    const BG = rideBGPlugin();
    if (!BG) return false;
    if (ride.bgId) return true;
    if (ride.bgStarting) return ride.bgStarting;
    ride.bgStarting = (async () => {
      try {
        const navOnly = nv.active && !(ride.running && !ride.paused);
        const id = await BG.addWatcher(
          { backgroundTitle: nv.active ? 'Garajım · Navigasyon' : 'Garajım · Açık Dünya', backgroundMessage: navOnly ? ('Hedef: ' + ((nv.dest && nv.dest.name) || 'Navigasyon sürüyor')) : 'Sürüş ve konum takibi arka planda devam ediyor…', requestPermissions: true, stale: false, distanceFilter: 5 },
          (l, e) => {
            if (e) { if (e.code === 'NOT_AUTHORIZED') { toast('Arka planda konum izni gerekli'); try { BG.openSettings(); } catch (x) {} } return; }
            rideApplyPos({ coords: { latitude: l.latitude, longitude: l.longitude, accuracy: l.accuracy, speed: (l.speed != null && l.speed >= 0) ? l.speed : null, heading: (l.bearing != null && isFinite(l.bearing)) ? l.bearing : null }, timestamp: l.time || Date.now() }, false);
          }
        );
        ride.bgId = id || null;
        if (ride.bgId && ride.watchId != null) { try { navigator.geolocation.clearWatch(ride.watchId); } catch (e) {} ride.watchId = null; }
        return !!ride.bgId;
      } catch (e) { ride.bgId = null; return false; }
      finally { ride.bgStarting = null; }
    })();
    return ride.bgStarting;
  }
  async function rideBGStop() {
    // Sürüş veya navigasyon hâlâ konum istiyorsa ortak arka plan izleyicisini kapatma.
    if (nv.active || (ride.running && !ride.paused)) return false;
    const BG = rideBGPlugin();
    if (BG && ride.bgId) { try { await BG.removeWatcher({ id: ride.bgId }); } catch (e) {} }
    ride.bgId = null;
    if (rideVisible() && navigator.geolocation) rideStartWatch();
    return true;
  }

  // Kalıcı arka plan bildirimi: hem kayıtlı sürüş hem bağımsız navigasyon için kullanılır.
  function rideNativeBridge() {
    try { return window.GarajimNative || null; } catch (e) { return null; }
  }
  function rideShowBgNotification() {
    const hasLiveWork = nv.active || (ride.running && !ride.paused);
    if (!hasLiveWork) return;
    const title = nv.active ? ((ride.running && !ride.paused) ? 'Garajım · Sürüş ve navigasyon' : 'Garajım · Navigasyon') : 'Garajım · Açık Dünya';
    const text = nv.active ? ('Hedef: ' + ((nv.dest && nv.dest.name) || 'Navigasyon devam ediyor…')) : 'Sürüş kaydı arka planda devam ediyor…';
    const bridge = rideNativeBridge();
    if (bridge && typeof bridge.startRideNotification === 'function') {
      try { bridge.startRideNotification(title, text); ride._bgNotifOn = true; return; } catch (e) {}
    }
    // Tarayıcı / PWA yedek (arka planda çalışma garantisi vermez).
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        if (ride._webNotif) { try { ride._webNotif.close(); } catch (e) {} }
        ride._webNotif = new Notification(title, { body: text, tag: 'garajim-navigation', requireInteraction: true, silent: true });
        ride._bgNotifOn = true;
      } else if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission().then(p => {
          if (p === 'granted' && (nv.active || (ride.running && !ride.paused)) && document.hidden) rideShowBgNotification();
        });
      }
    } catch (e) {}
  }
  function rideHideBgNotification() {
    if (nv.active || (ride.running && !ride.paused)) return;
    ride._bgNotifOn = false;
    const bridge = rideNativeBridge();
    if (bridge && typeof bridge.stopRideNotification === 'function') {
      try { bridge.stopRideNotification(); } catch (e) {}
    }
    if (ride._webNotif) { try { ride._webNotif.close(); } catch (e) {} ride._webNotif = null; }
  }
  function rideOnBackground() {
    if (nv.active) { nvPersistSession(true); rideShowBgNotification(); }
    if (ride.running && !ride.paused) ridePersistDraft(true);
  }
  function rideOnForeground() {
    if (ride.running && !ride.paused) { rideTick(); rideWake(true); }
    if ((nv.active || (ride.running && !ride.paused)) && !ride.bgId && navigator.geolocation) {
      rideStartWatch();
      // Arka plan servisi, kullanıcı ön plandayken başlatılır; Android'in arka plan başlatma kısıtına takılmasın.
      rideBGStart().then(ok => { if (!ok && nv.active) nvSetGpsStatus('Arka plan takibi sınırlı · ekranı açık tut'); });
    }
  }

  function rideIcon(heading) {
    const c = rideAccent();
    const rot = (heading != null && !isNaN(heading)) ? heading : 0;
    return L.divIcon({
      className: '',
      html: `<div class="ride-me" style="width:44px;height:44px;transform:rotate(${rot}deg);transition:transform .3s linear"><svg width="44" height="44" viewBox="0 0 44 44"><circle cx="22" cy="22" r="21" fill="${c}" fill-opacity=".22"/><g stroke="#fff" stroke-width="1.6" stroke-linejoin="round"><rect x="19.8" y="3" width="4.4" height="11" rx="2.2" fill="#222"/><rect x="11" y="14" width="22" height="3.2" rx="1.6" fill="#222"/><ellipse cx="22" cy="24" rx="6.5" ry="9.5" fill="${c}"/><circle cx="22" cy="25" r="4.6" fill="#222"/><rect x="19.3" y="32.5" width="5.4" height="9.5" rx="2.7" fill="#222"/></g></svg></div>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });
  }

  function rideSetMe(lat, lng, zoom, heading) {
    if (!ride.map) return;
    if (!ride.marker) {
      ride.marker = L.marker([lat, lng], { icon: rideIcon(heading), interactive: false, zIndexOffset: 1000 }).addTo(ride.map);
    } else {
      ride.marker.setLatLng([lat, lng]);
      if (heading != null && ride.hasHeading) {
        const el = ride.marker.getElement && ride.marker.getElement();
        const m = el && el.querySelector('.ride-me');
        if (m) m.style.transform = 'rotate(' + heading + 'deg)';
      }
    }
    if (ride.cam === 'follow' || ride.cam === 'heading') {
      if (zoom) ride.map.setView([lat, lng], zoom, { animate: true });
      else ride.map.panTo([lat, lng], { animate: true, duration: 0.35 });
    }
  }

  function rideApplyPos(pos, isFirst) {
    const c = pos.coords;
    const acc = c.accuracy;
    if (acc != null) {
      ride.accuracy = acc;
      rideSetGpsStatus(acc > 40 ? 'weak' : 'ok', acc);
      if (!isFirst && acc > 150) return;                       // çok kötü konum: işaretçi bile sıçramasın
    }
    const cur = { lat: c.latitude, lng: c.longitude, t: pos.timestamp || Date.now(), acc: acc };
    const poor = ride.running && acc != null && acc > 50;      // kötü doğrulukta mesafe/hız yazma

    if (c.heading != null && !isNaN(c.heading) && (c.speed == null || c.speed > 0.8)) {
      ride.heading = c.heading; ride.hasHeading = true;
    } else if (ride.last && ride.running) {
      const d = rideHav(ride.last, cur);
      if (d > 8) {
        const y = Math.sin((cur.lng - ride.last.lng) * Math.PI / 180) * Math.cos(cur.lat * Math.PI / 180);
        const x = Math.cos(ride.last.lat * Math.PI / 180) * Math.sin(cur.lat * Math.PI / 180) -
          Math.sin(ride.last.lat * Math.PI / 180) * Math.cos(cur.lat * Math.PI / 180) * Math.cos((cur.lng - ride.last.lng) * Math.PI / 180);
        ride.heading = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; ride.hasHeading = true;
      }
    }
    rideSetMe(cur.lat, cur.lng, isFirst ? 17 : null, ride.hasHeading ? ride.heading : null);
    try { nvTick(cur.lat, cur.lng, acc, cur.t, c.speed); rideGhostUpdate(); } catch (e) {}

    let kmh = null;
    if (c.speed != null && c.speed >= 0) kmh = c.speed * 3.6;
    if (ride.last) {
      const d = rideHav(ride.last, cur);
      const dt = Math.max(0.001, (cur.t - ride.last.t) / 1000);
      if (kmh == null) kmh = (d / dt) * 3.6;
      if (kmh > 220) { rideRender(ride.lastSpeedKmh); return; }
      const jitter = Math.max(3.5, (acc || 0) * 0.5);           // GPS titremesi eşiği doğrulukla büyür
      if (d < jitter && (!ride.running || (kmh != null && kmh < 2.5))) {
        ride.lastSpeedKmh = kmh != null && kmh > 1.5 ? kmh : 0;
        rideRender(ride.lastSpeedKmh);
        return;
      }
      if (ride.running && !ride.paused && !poor) {
        const spd = (kmh != null && kmh >= 0 && kmh < 200) ? kmh : null;
        if (dt > 30) { ride.gap = true; ride.pts.push([cur.lat, cur.lng, cur.t, spd]); }       // kayıt boşluğu: aradaki mesafeyi uydurma
        else if (d / dt * 3.6 < 200) { ride.dist += d; ride.pts.push([cur.lat, cur.lng, cur.t, spd]); }
        if (ride.line) ride.line.setLatLngs(ride.pts.map(p => [p[0], p[1]]));
      }
    }
    if (ride.running && !ride.paused && !poor && kmh != null && kmh >= 0 && kmh < 200) {
      if (kmh > ride.maxSpeed) ride.maxSpeed = kmh;
      ride.speedSamples.push(kmh);
      if (ride.speedSamples.length > 5000) ride.speedSamples.shift();
      if (ride.speedSamples.length >= 2) {
        const a = ride.speedSamples[ride.speedSamples.length - 2];
        if (a - kmh > 25 && a > 40) ride.hardBrakes++;
      }
      rideCornerTick(cur, kmh, ride.hasHeading ? ride.heading : null);
      rideMaybeMemoryPin(cur, kmh);
      if (Math.floor(ride.elapsed) % 45 === 0) rideCheckGoldenHour();
    }
    ride.last = cur;
    ride.lastSpeedKmh = kmh;
    rideRender(kmh);
    ridePersistDraft();
    try {
      if (ride.running || !document.getElementById('rideView').classList.contains('hidden')) {
        if (Math.floor((ride.elapsed || 0)) % 90 === 0) rideWeatherFetch(cur.lat, cur.lng, false);
      }
    } catch (e) {}
  }

  function rideHav(a, b) {
    const R = 6371000, rad = x => x * Math.PI / 180;
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function rideFmtTime(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    const h = String(Math.floor(sec / 3600)).padStart(2, '0');
    const m = String(Math.floor(sec % 3600 / 60)).padStart(2, '0');
    const x = String(sec % 60).padStart(2, '0');
    return `${h}:${m}:${x}`;
  }

  function rideToDisplaySpeed(kmh) {
    if (kmh == null || isNaN(kmh)) return null;
    return rideUnit() === 'mph' ? kmh * 0.621371 : kmh;
  }

  function rideDistTxt(m) { return rideUnit() === 'mph' ? (m / 1609.344).toFixed(2) + ' mi' : (m / 1000).toFixed(2) + ' km'; }
  function rideSpdTxt(kmh) { const mph = rideUnit() === 'mph'; return ((Number(kmh) || 0) * (mph ? 0.621371 : 1)).toFixed(1) + ' ' + (mph ? 'mph' : 'km/sa'); }

  function rideRender(nowKmh) {
    const mph = rideUnit() === 'mph';
    const unit = mph ? 'mph' : 'km/sa';
    ['rideUnitLbl', 'rideUnitLbl2'].forEach(id => { const l = document.getElementById(id); if (l) l.textContent = unit; });
    const dl = document.getElementById('rideDistLbl'); if (dl) dl.textContent = mph ? 'mi' : 'km';
    const avgKmh = ride.elapsed > 5 ? (ride.dist / 1000) / (ride.elapsed / 3600) : 0;
    const now = rideToDisplaySpeed(nowKmh);
    const avg = rideToDisplaySpeed(avgKmh);
    const max = rideToDisplaySpeed(ride.maxSpeed);
    document.getElementById('rideAvg').textContent = (avg || 0).toFixed(1);
    document.getElementById('rideNow').textContent = now == null ? '—' : String(Math.round(now));
    const mn = document.getElementById('rideMiniNum');
    if (mn) {                                                   // küçük daire gösterge: hız + yay + kayıt noktası
      mn.textContent = now == null ? '—' : String(Math.round(now));
      document.getElementById('rideMiniUnit').textContent = unit;
      const arc = document.getElementById('rideMiniArc'), v = Number(nowKmh) || 0;
      arc.style.strokeDashoffset = (238.8 * (1 - Math.max(0, Math.min(1, v / 180)))).toFixed(1);
      const lim = Number(rideSettings().speedLimit) || 0;
      const overLimit = lim > 0 && now != null && now > lim;
      arc.style.stroke = overLimit ? '#ef4444' : (v > 140 ? '#ef4444' : v > 110 ? '#f59e0b' : 'var(--accent)');
      document.getElementById('rideMiniRec').classList.toggle('hidden', !(ride.running && !ride.paused));
      const gauge = document.getElementById('rideMiniGauge');
      if (gauge) {
        if (overLimit) {
          gauge.style.boxShadow = '0 0 0 3px #ef4444, 0 0 18px rgba(239,68,68,.55)';
          if (ride.running && !ride.paused && (!ride._lastLimitVibe || Date.now() - ride._lastLimitVibe > 2500)) {
            ride._lastLimitVibe = Date.now();
            try { if (navigator.vibrate) navigator.vibrate([80, 40, 80]); } catch (e) {}
          }
        } else {
          gauge.style.boxShadow = '';
        }
      }
    }
    document.getElementById('rideDist').textContent = (mph ? ride.dist / 1609.344 : ride.dist / 1000).toFixed(2);
    document.getElementById('rideTime').textContent = rideFmtTime(ride.elapsed);
    document.getElementById('rideMax').textContent = String(Math.round(max || 0));
  }



  let wearLinkKnown = null; // null | true | false
  function rideWearStatusRefresh(forceToast) {
    try {
      const N = window.GarajimNative;
      const dot = document.getElementById('rideWearDot');
      const txt = document.getElementById('rideWearTxt');
      if (!dot || !txt) return;
      if (!N || typeof N.getWearStatus !== 'function') {
        dot.className = 'w-2 h-2 rounded-full bg-slate-500 shrink-0';
        txt.textContent = 'Saat —';
        txt.className = 'text-[10px] text-slate-500 truncate max-w-[4.5rem]';
        return;
      }
      let s = {};
      try { s = JSON.parse(N.getWearStatus() || '{}'); } catch (e) { s = {}; }
      const on = !!s.connected;
      const name = (s.name || '').trim();
      if (on) {
        dot.className = 'w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_rgba(52,211,153,.7)]';
        txt.textContent = name ? ('Saat · ' + name) : 'Saat bağlı';
        txt.className = 'text-[10px] text-emerald-300/90 truncate max-w-[5.5rem]';
      } else {
        dot.className = 'w-2 h-2 rounded-full bg-rose-400 shrink-0';
        txt.textContent = 'Saat yok';
        txt.className = 'text-[10px] text-rose-300/90 truncate max-w-[4.5rem]';
      }
      if (wearLinkKnown === true && !on) {
        try { toast('⌚ Saat bağlantısı kesildi'); } catch (e) {}
        try { if (typeof rideWearAlert === 'function') rideWearAlert('info', 'Saat bağlantısı kesildi'); } catch (e) {}
      } else if (wearLinkKnown === false && on) {
        try { toast('⌚ Saat bağlandı' + (name ? (': ' + name) : '')); } catch (e) {}
      } else if (forceToast && on) {
        try { toast('⌚ Saat bağlı'); } catch (e) {}
      }
      wearLinkKnown = on;
    } catch (e) {}
  }
  function rideWearPush() {
    try {
      const N = window.GarajimNative;
      try { if (N && typeof N.pushWearLink === "function") N.pushWearLink(true, "web"); } catch (e) {}
      if (!N || typeof N.pushWearState !== 'function') return;
      // Native servis arka plan sürüşünün tek otoritesi; boş WebView durumu saate gönderilmemeli.
      if (typeof N.isNativeRideManaged === 'function' && N.isNativeRideManaged()) return;
      const selectedVehicleId = ride.vehicleId || localStorage.getItem('garaj_ride_vehicle') || currentId || '';
      const selectedVehicle = vehicles.find(v => String(v.id) === String(selectedVehicleId)) || null;
      let plate = selectedVehicle ? (selectedVehicle.plate || [selectedVehicle.brand, selectedVehicle.model].filter(Boolean).join(' ')) : '';
      try {
        if (!plate) {
          const sel = document.getElementById('rideVehicleSelect');
          if (sel && sel.selectedOptions && sel.selectedOptions[0]) plate = sel.selectedOptions[0].textContent || '';
        }
      } catch (e) {}
      if (typeof N.pushWearVehicles === 'function') {
        try {
          N.pushWearVehicles(JSON.stringify(vehicles.slice(0, 60).map(v => ({
            id: String(v.id || ''), plate: String(v.plate || ''),
            name: String(v.name || ''), brand: String(v.brand || ''), model: String(v.model || '')
          }))));
        } catch (e) {}
      }
      const pendingSummary = ride.pendingSummary || null;
      const summaryVehicle = pendingSummary && pendingSummary.vehicleId
        ? vehicles.find(v => String(v.id) === String(pendingSummary.vehicleId)) : selectedVehicle;
      const modeEl = document.getElementById('rideModeChip');
      const lim = Number(rideSettings().speedLimit) || 0;
      const kmh = ride.lastSpeedKmh || 0;
      const overLimit = lim > 0 && kmh > lim + 2;
      let track = '', artist = '';
      try {
        const t = document.getElementById('rideMusicTitle');
        const a = document.getElementById('rideMusicArtist');
        if (t) track = t.textContent || '';
        if (a) artist = a.textContent || '';
      } catch (e) {}
      let parkLat = 0, parkLng = 0, parkDistM = -1, parkDir = '', parkSaved = false;
      try {
        const p = typeof parkGet === 'function' ? parkGet() : null;
        const plat = p ? Number(p.lat) : NaN, plng = p ? Number(p.lng) : NaN;
        parkSaved = !!p && Number.isFinite(plat) && Number.isFinite(plng)
          && plat >= -90 && plat <= 90 && plng >= -180 && plng <= 180;
        if (parkSaved) { parkLat = plat; parkLng = plng; }
        if (parkSaved && ride.last) {
          parkLat = p.lat; parkLng = p.lng;
          parkDistM = rideHav(ride.last, { lat: p.lat, lng: p.lng });
          if (typeof parkBearing === 'function' && typeof parkDirTxt === 'function') {
            parkDir = parkDirTxt(parkBearing(ride.last, { lat: p.lat, lng: p.lng }));
          }
        }
      } catch (e) {}
      N.pushWearState(JSON.stringify({
        seq: Date.now(),
        running: !!ride.running,
        paused: !!ride.paused,
        gpsReady: !!ride.gotFix,
        kmh: kmh,
        distM: ride.dist || 0,
        elapsedSec: Math.floor(ride.elapsed || 0),
        maxKmh: ride.maxSpeed || 0,
        plate: plate,
        vehicleId: selectedVehicleId,
        pendingSummary: !!pendingSummary,
        summaryId: pendingSummary ? String(pendingSummary.id || '') : '',
        summaryPlate: pendingSummary && summaryVehicle ? String(summaryVehicle.plate || [summaryVehicle.brand, summaryVehicle.model].filter(Boolean).join(' ')) : (pendingSummary ? plate : ''),
        summaryDistM: pendingSummary ? Number(pendingSummary.dist || 0) : 0,
        summaryElapsedSec: pendingSummary ? Math.floor(Number(pendingSummary.time || 0)) : 0,
        summaryAvgKmh: pendingSummary ? Number(pendingSummary.avg || 0) : 0,
        summaryMaxKmh: pendingSummary ? Number(pendingSummary.max || 0) : 0,
        mode: modeEl ? (modeEl.textContent || '') : '',
        track: track,
        artist: artist,
        overLimit: overLimit,
        alert: overLimit ? ('Limit ' + lim + '+') : '',
        parkLat: parkLat,
        parkLng: parkLng,
        parkSaved: parkSaved,
        parkDistM: parkDistM,
        parkDir: parkDir,
        navText: (function(){ try { const m = document.getElementById('rideNavMain'); return m ? (m.textContent || '') : ''; } catch(e){ return ''; } })(),
        navDistM: (function(){ try { return (typeof nv !== 'undefined' && nv && nv.active && nv.remainingM != null) ? Number(nv.remainingM) : -1; } catch(e){ return -1; } })(),
        limitKmh: lim,
        dailyKm: (function(){
          try {
            const day = new Date().toISOString().slice(0,10);
            return getAllRides().filter(r => (r.date || '').slice(0,10) === day).reduce((s,r)=>s+(r.dist||0),0)/1000;
          } catch(e){ return 0; }
        })(),
        dailyGoalKm: (function(){ try { const g = Number(rideSettings().dailyGoalKm); return (isFinite(g) && g > 0) ? g : 50; } catch(e){ return 50; } })(),
        badgeText: (function(){ try { return ride._wearBadge || ''; } catch(e){ return ''; } })(),
        convoyText: ''
      }));
      // limit titreşimi (throttle)
      if (overLimit && N.pushWearAlert) {
        const now = Date.now();
        if (!ride._wearLimitBuzz || now - ride._wearLimitBuzz > 8000) {
          ride._wearLimitBuzz = now;
          N.pushWearAlert('limit', 'Hız limiti aşıldı · ' + Math.round(kmh) + ' km/sa');
        }
      }
    } catch (e) {}
  }
  function rideWearAlert(kind, msg) {
    try {
      const N = window.GarajimNative;
      if (N && typeof N.pushWearAlert === 'function') N.pushWearAlert(kind || 'info', msg || '');
    } catch (e) {}
  }
  function rideTick() {
    if (!ride.running || ride.paused) return;
    const now = Date.now();
    ride.elapsed += (now - ride.lastTick) / 1000;
    ride.lastTick = now;
    rideRender(ride.lastSpeedKmh);
    try { rideGhostUpdate(); } catch (e) {}
    if (Math.floor(ride.elapsed) % 10 === 0) ridePersistDraft();
    try { rideWearPush(); } catch (e) {}
  }

  async function rideWake(on) {
    try {
      if (on && 'wakeLock' in navigator) ride.wake = await navigator.wakeLock.request('screen');
      else if (!on && ride.wake) { await ride.wake.release(); ride.wake = null; }
    } catch (e) {}
  }

  function rideToggle() {
    try {
      const N = window.GarajimNative;
      if (N && typeof N.isNativeRideManaged === 'function' && N.isNativeRideManaged()) {
        toast('Bu sürüş arka plan servisinde. Kontrolü Galaxy Watch üzerinden yap.');
        return;
      }
    } catch (e) {}
    if (!ride.running && ride.pendingSummary && !ride.pendingSummary._previewOnly) {
      toast('Önce bekleyen sürüş özetini kaydet veya sil');
      try { rideWearAlert('info', 'Yeni sürüşten önce bekleyen özeti kaydet veya sil.'); } catch (e) {}
      return;
    }
    if (!navigator.geolocation) { toast('Konum desteklenmiyor'); return; }
    if (!ride.gotFix && !ride.last) {
      toast('Önce GPS konumu bekleniyor');
      rideRequestPermission();
      return;
    }
    const txt = document.getElementById('rideStartTxt');
    const icon = document.querySelector('#rideStartBtn i');
    if (!ride.running) {
      // yeni veya devam
      if (!ride.startedAt) {
        ride.startedAt = new Date().toISOString();
        ride.startCoord = ride.last ? { lat: ride.last.lat, lng: ride.last.lng } : null;
        ride.pts = []; ride.dist = 0; ride.maxSpeed = 0; ride.elapsed = 0;
        ride.speedSamples = []; ride.hardBrakes = 0; ride.favorite = false; ride.gap = false;
        ride.corners = []; ride.cornerActive = null; ride.asphaltHits = []; ride.blackbox = [];
        ride.sessionRough = 0; ride.impactLocked = false; ride.goldenOn = false; ride.lastMemoryAsk = 0;
        ride.autoNight = false; ride.memAsks = 0; ride.slowSince = null; ride.lastHd = null;
        if (ride.line) ride.line.setLatLngs([]);
      }
      ride.running = true;
      ride.paused = false;
      ride.lastTick = Date.now();
      ride.last = null; // pause sonrası mesafe atlamasın
      if (ride.cam === 'free') ride.cam = 'follow';
      rideUpdateCamHint();
      if (!ride.timer) ride.timer = setInterval(rideTick, 1000);
      rideWake(true);
      rideMotionStart();
      rideCheckGoldenHour();
      rideShowBgNotification();        // ön planda başlat: Android 12+ arka planda servis başlatmayı engeller
      rideBGStart();
      if (navigator.geolocation) rideStartWatch();
      txt.textContent = 'Duraklat';
      rideRender(ride.lastSpeedKmh);
      icon.className = 'fa-solid fa-pause mr-2';
      document.getElementById('rideStopBtn').classList.remove('hidden');
      toast('Sürüş başladı');
      rideGhostStart();
    } else if (!ride.paused) {
      ride.paused = true;
      clearInterval(ride.timer); ride.timer = null;
      rideWake(false);
      rideBGStop();
      rideMotionStop();
      rideHideBgNotification();
      txt.textContent = 'Devam';
      rideRender(ride.lastSpeedKmh);
      icon.className = 'fa-solid fa-play mr-2';
      toast('Duraklatıldı');
    } else {
      ride.paused = false;
      ride.lastTick = Date.now();
      ride.last = null;
      ride.timer = setInterval(rideTick, 1000);
      rideWake(true);
      rideMotionStart();
      rideShowBgNotification();        // ön planda başlat: Android 12+ arka planda servis başlatmayı engeller
      rideBGStart();
      if (navigator.geolocation) rideStartWatch();
      txt.textContent = 'Duraklat';
      rideRender(ride.lastSpeedKmh);
      icon.className = 'fa-solid fa-pause mr-2';
    }
    ridePersistDraft(true);
    try { rideWearPush(); } catch (e) {} // Başlat/duraklat/devam durumu saatte beklemeden güncellensin.
  }

  function rideStopConfirm() {
    try {
      const N = window.GarajimNative;
      if (N && typeof N.isNativeRideManaged === 'function' && N.isNativeRideManaged()) {
        toast('Arka plan sürüşünü saatteki Bitir düğmesiyle tamamla.');
        return;
      }
    } catch (e) {}
    if (ride.dist < 30 && ride.elapsed < 20) {
      if (!confirm('Çok kısa sürüş. Bitirilsin mi?')) return;
    } else if (!confirm('Sürüşü bitirip özeti göster?')) return;
    rideFinish();
  }

  // Rotayı eşit aralıkla azalt (son noktayı koru)
  function rideDecimate(pts, max) {
    if (!pts || pts.length <= max) return (pts || []).slice();
    const step = pts.length / max, out = [];
    for (let i = 0; i < max; i++) out.push(pts[Math.floor(i * step)]);
    out.push(pts[pts.length - 1]);
    return out;
  }
  function ridePtLatLng(p) { return Array.isArray(p) ? [p[0], p[1]] : [p.lat, p.lng]; }
  function ridePtSpd(p) { return Array.isArray(p) ? (p[3] != null ? p[3] : null) : (p.spd != null ? p.spd : null); }
  function ridePtT(p) { return Array.isArray(p) ? (p[2] != null ? p[2] : null) : (p.t != null ? p.t : null); }
  function rideSpeedColor(kmh) {
    if (kmh == null || isNaN(kmh)) return rideAccent();
    if (kmh < 30) return '#3b82f6';      // mavi yavaş
    if (kmh < 60) return '#22c55e';      // yeşil
    if (kmh < 90) return '#eab308';      // sarı
    if (kmh < 120) return '#f97316';     // turuncu
    return '#ef4444';                    // kırmızı hızlı
  }
  function rideAddSpeedColoredLine(map, pts) {
    if (!pts || pts.length < 2) return null;
    const layers = []; let run = [ridePtLatLng(pts[0])], col = null;
    const flush = () => { if (run.length > 1) layers.push(L.polyline(run, { color: col, weight: 5, opacity: 0.95, lineJoin: 'round', lineCap: 'round' }).addTo(map)); };
    for (let i = 1; i < pts.length; i++) {
      const sa = ridePtSpd(pts[i - 1]), sb = ridePtSpd(pts[i]);
      const c = rideSpeedColor((sa != null && sb != null) ? (sa + sb) / 2 : (sb != null ? sb : sa));
      if (col !== null && c !== col) { const last = run[run.length - 1]; flush(); run = [last]; }
      col = c; run.push(ridePtLatLng(pts[i]));
    }
    flush();
    return layers;
  }

  function rideFinish(fromWatch) {
    try {
      const N = window.GarajimNative;
      if (N && typeof N.isNativeRideManaged === 'function' && N.isNativeRideManaged()) {
        toast('Arka plan sürüşünü saatte tamamla.');
        return;
      }
    } catch (e) {}
    if (ride.running && !ride.paused) {
      // timer durdur
      ride.paused = true;
      clearInterval(ride.timer); ride.timer = null;
      rideWake(false);
    }
    ride.running = false;
    ride.paused = false;
    rideBGStop();
    rideMotionStop();
    rideHideBgNotification();
    // açık virajı kapat
    if (ride.cornerActive && ride.cornerActive.samples >= 3) {
      const c = ride.cornerActive;
      c.score = c.score || 70; c.label = c.label || 'iyi';
      ride.corners.push(c);
      ride.cornerActive = null;
    }
    let summary = {
      id: 'r_' + Date.now().toString(36),
      date: ride.startedAt || new Date().toISOString(),
      endedAt: new Date().toISOString(),
      dist: ride.dist,
      time: ride.elapsed,
      avg: ride.elapsed > 0 ? (ride.dist / 1000) / (ride.elapsed / 3600) : 0,
      max: ride.maxSpeed,
      pts: rideDecimate(ride.pts, 600),
      start: ride.startCoord,
      end: ride.last ? { lat: ride.last.lat, lng: ride.last.lng } : null,
      incompleteGps: !ride.gotFix || ride.pts.length < 2,
      gap: !!ride.gap,
      vehicleId: ride.vehicleId || localStorage.getItem('garaj_ride_vehicle') || null,
      hardBrakes: ride.hardBrakes || 0,
      score: rideComputeScore(),
      favorite: false
    };
    ride.epicUndo = rideEpicSnapshot();
    try { summary = rideFinalizeEpic(summary); } catch (e) {}
    rideGhostStop();
    ride.pendingSummary = summary;
    // Özeti kalıcı yedekte tut: saatten kaydet/sil kararı verilmeden süreç kapanırsa kaybolmasın.
    try { localStorage.setItem('garaj_ride_watch_pending', JSON.stringify(summary)); } catch (e) {}
    localStorage.removeItem('garaj_ride_draft');
    rideClearNativeSnapshot();
    // UI reset buttons
    document.getElementById('rideStartTxt').textContent = 'Sürüşe Başla';
    document.querySelector('#rideStartBtn i').className = 'fa-solid fa-play mr-2';
    document.getElementById('rideStopBtn').classList.add('hidden');
    if (!fromWatch) rideShowSummary(summary);
    // clear live session metrics after showing; watch can review/save/discard the pending summary.
    ride.pts = []; ride.dist = 0; ride.maxSpeed = 0; ride.elapsed = 0;
    ride.startedAt = null; ride.startCoord = null; ride.last = null; ride.gap = false;
    if (ride.line) ride.line.setLatLngs([]);
    rideRender(0);
    try { rideWearPush(); } catch (e) {}
  }

  function rideShowSummary(s, preview) {
    const keepBtn = document.getElementById('rideSumKeepBtn'), discBtn = document.getElementById('rideSumDiscardBtn');
    keepBtn.textContent = preview ? 'Kapat' : 'Kaydet';
    keepBtn.setAttribute('onclick', preview ? 'rideClosePreview()' : 'rideKeepSummary()');
    discBtn.classList.toggle('hidden', !!preview);
    document.getElementById('rideSumDate').textContent = new Date(s.date).toLocaleString('tr-TR');
    document.getElementById('rideSumDist').textContent = rideDistTxt(s.dist);
    document.getElementById('rideSumTime').textContent = rideFmtTime(s.time);
    document.getElementById('rideSumAvg').textContent = rideSpdTxt(s.avg);
    document.getElementById('rideSumMax').textContent = rideSpdTxt(s.max);
    document.getElementById('rideSumNote').textContent = s.incompleteGps
      ? 'GPS noktası az — rota eksik olabilir. İstatistikler mevcut kayıttan hesaplandı.'
      : s.gap ? 'Kayıtta boşluk var (GPS/uygulama kesintisi). Mesafe yalnızca kaydedilen konumlardan hesaplandı.'
      : 'Rota ve istatistikler cihaz GPS verisinden hesaplandı.';
    const sc = s.score || rideComputeScoreFromSummary(s);
    document.getElementById('rideSumScore').textContent = sc.value;
    document.getElementById('rideSumScoreTip').textContent = sc.tip + (s.hardBrakes ? (' · ' + s.hardBrakes + ' sert fren') : '');
    const favBtn = document.getElementById('rideFavBtn');
    if (favBtn) favBtn.innerHTML = (s.favorite ? '<i class="fa-solid fa-star mr-1"></i>Favori' : '<i class="fa-regular fa-star mr-1"></i>Favori');
    // Epic extras
    const ex = document.getElementById('rideSumExtras');
    if (ex) {
      const rows = [];
      if (s.story) rows.push('<div class="rounded-xl bg-white/5 border border-white/10 p-3"><p class="text-[10px] text-slate-500 uppercase mb-1">Yol hikâyesi</p><p class="text-sm leading-relaxed">' + rideEsc(s.story) + '</p></div>');
      if (s.dna && s.dna.label) rows.push('<div class="rounded-xl bg-accent/10 border border-accent/20 p-3 text-sm"><i class="fa-solid fa-dna text-accent mr-1"></i><b>' + rideEsc(s.dna.label) + '</b></div>');
      if (s.corners && s.corners.n) rows.push('<div class="rounded-xl bg-white/5 p-3 text-sm"><i class="fa-solid fa-road mr-1 text-slate-400"></i>Viraj: ' + s.corners.n + ' · skor ' + s.corners.avg + ' · ' + s.corners.perfect + ' mükemmel</div>');
      if (s.ghostId) rows.push('<div class="rounded-xl bg-white/5 p-3 text-sm"><i class="fa-solid fa-ghost mr-1 text-slate-400"></i>Hayalet: önceki benzer rota · maks ' + rideSpdTxt(s.ghostMax || 0) + '</div>');
      if (s.segmentVisits >= 2) rows.push('<div class="rounded-xl bg-white/5 p-3 text-sm"><i class="fa-solid fa-users mr-1 text-slate-400"></i>Sessiz konvoy: bu güzergâhta ' + s.segmentVisits + '. geçiş</div>');
      if (s.fuelGhost) rows.push('<div class="rounded-xl bg-white/5 p-3 text-sm"><i class="fa-solid fa-gas-pump mr-1 text-slate-400"></i>Bu sürüşte yaklaşık ' + s.fuelGhost.usedL + ' L yakıt · ortalaman ' + s.fuelGhost.l100 + ' L/100 km</div>');
      if (rows.length) { ex.innerHTML = rows.join(''); ex.classList.remove('hidden'); }
      else { ex.innerHTML = ''; ex.classList.add('hidden'); }
    }
    document.getElementById('rideSummaryModal').classList.remove('hidden');
    setTimeout(() => {
      try {
        if (ride.sumMap) { ride.sumMap.remove(); ride.sumMap = null; }
        ride.sumMap = L.map('rideSumMap', { zoomControl: false, attributionControl: false });
        addBaseTiles(ride.sumMap);
        if (s.pts && s.pts.length) {
          const hasSpd = s.pts.some(p => ridePtSpd(p) != null);
          let pl;
          if (hasSpd) {
            ride.sumLineLayers = rideAddSpeedColoredLine(ride.sumMap, s.pts);
            pl = L.polyline(s.pts.map(ridePtLatLng), { color: 'transparent', weight: 1, opacity: 0 }).addTo(ride.sumMap);
          } else {
            pl = L.polyline(s.pts.map(ridePtLatLng), { color: rideAccent(), weight: 5, opacity: 0.9 }).addTo(ride.sumMap);
          }
          ride.sumLine = pl;
          ride.sumMap.invalidateSize();
          ride.sumMap.fitBounds(pl.getBounds(), { padding: [22, 22] });
          if (s.pts.length > 1) {
            const dot = (p, c) => L.circleMarker(ridePtLatLng(p), { radius: 7, color: '#fff', weight: 2, fillColor: c, fillOpacity: 1 }).addTo(ride.sumMap);
            dot(s.pts[0], '#22c55e'); dot(s.pts[s.pts.length - 1], '#ef4444');
            // Hayalet rota (önceki benzer sürüş)
            if (s.ghostId) {
              const g = getAllRides().find(r => r.id === s.ghostId);
              if (g && g.pts && g.pts.length > 1) {
                L.polyline(g.pts.map(ridePtLatLng), { color: '#94a3b8', weight: 4, opacity: 0.45, dashArray: '8 10' }).addTo(ride.sumMap);
              }
            }
            try { rideDrawAsphalt(ride.sumMap); } catch (e) {}
            ride.sumMap.on('click', () => rideReplay());
            ride.sumMap.getContainer().insertAdjacentHTML('beforeend',
              '<div id="rideReplayCtrl" style="position:absolute;z-index:1000;right:10px;bottom:10px;display:flex;gap:6px;align-items:center">' +
              '<button type="button" id="rideReplayBtn" style="padding:8px 12px;border-radius:12px;background:rgba(0,0,0,.72);color:#fff;font-size:12px;font-weight:700;border:1px solid rgba(255,255,255,.18)"><i class="fa-solid fa-play" style="margin-right:6px"></i>Oynat</button>' +
              '<select id="rideReplaySpeed" style="padding:6px 8px;border-radius:10px;background:rgba(0,0,0,.72);color:#fff;font-size:11px;border:1px solid rgba(255,255,255,.18)"><option value="1" selected>1x</option><option value="2">2x</option><option value="4">4x</option><option value="0">Gerçek</option></select>' +
              '</div>');
            document.getElementById('rideReplayBtn').addEventListener('click', e => { e.stopPropagation(); rideReplay(); });
            if (hasSpd) {
              const leg = document.createElement('div');
              leg.style.cssText = 'position:absolute;z-index:1000;left:10px;bottom:10px;padding:6px 10px;border-radius:10px;background:rgba(0,0,0,.7);color:#fff;font-size:10px;line-height:1.4';
              leg.innerHTML = '<span style="color:#3b82f6">■</span> yavaş <span style="color:#22c55e">■</span> orta <span style="color:#eab308">■</span> hızlı <span style="color:#ef4444">■</span> çok hızlı' +
                (s.ghostId ? ' · <span style="color:#94a3b8">- - hayalet</span>' : '');
              ride.sumMap.getContainer().appendChild(leg);
            }
          }
        } else ride.sumMap.setView([39, 35], 5);
      } catch (e) {}
    }, 250);
  }

  // Araç sayfasındaki liste için minik rota önizlemesi
  function rideThumb(pts) {
    if (!pts || pts.length < 2) return '<i class="fa-solid fa-motorcycle text-accent text-sm"></i>';
    let a0 = 90, a1 = -90, o0 = 180, o1 = -180;
    pts.forEach(p => { a0 = Math.min(a0, p[0]); a1 = Math.max(a1, p[0]); o0 = Math.min(o0, p[1]); o1 = Math.max(o1, p[1]); });
    const k = Math.cos((a0 + a1) / 2 * Math.PI / 180), w = Math.max((o1 - o0) * k, 1e-5), h = Math.max(a1 - a0, 1e-5), S = Math.min(48 / w, 30 / h);
    const ox = 4 + (48 - w * S) / 2, oy = 4 + (30 - h * S) / 2;
    const X = p => (ox + (p[1] - o0) * k * S).toFixed(1), Y = p => (oy + (a1 - p[0]) * S).toFixed(1);
    const st = pts[0], en = pts[pts.length - 1];
    return '<svg viewBox="0 0 56 38" width="56" height="38"><polyline fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="' + pts.map(p => X(p) + ',' + Y(p)).join(' ') + '"/><circle cx="' + X(st) + '" cy="' + Y(st) + '" r="2.4" fill="#22c55e"/><circle cx="' + X(en) + '" cy="' + Y(en) + '" r="2.4" fill="#ef4444"/></svg>';
  }

  // ---- Rota tekrarı: motor, gidilen rota üzerinden animasyonlu sürer
  function rideReplayStop() {
    if (ride.replayRaf) { cancelAnimationFrame(ride.replayRaf); ride.replayRaf = null; }
  }
  function rideReplay(durMs) {
    const s = ride.pendingSummary, map = ride.sumMap;
    if (!s || !map || !s.pts || s.pts.length < 2) return;
    rideReplayStop();
    const pts = s.pts.filter(p => isFinite(p[0]) && isFinite(p[1]));
    if (pts.length < 2) return;
    const speedSel = document.getElementById('rideReplaySpeed');
    const mult = speedSel ? Number(speedSel.value) : 1;
    const hasTime = pts.every(p => ridePtT(p) != null) && (ridePtT(pts[pts.length - 1]) - ridePtT(pts[0]) > 1000);
    const cum = [0];
    for (let i = 1; i < pts.length; i++) {
      const a = ridePtLatLng(pts[i - 1]), b = ridePtLatLng(pts[i]);
      cum.push(cum[i - 1] + rideHav({ lat: a[0], lng: a[1] }, { lat: b[0], lng: b[1] }));
    }
    const total = cum[cum.length - 1] || 1;
    let dur;
    if (mult === 0 && hasTime) {
      dur = Math.max(2000, (ridePtT(pts[pts.length - 1]) - ridePtT(pts[0])));
    } else {
      const base = durMs || Math.min(14000, Math.max(4000, 3500 + total / 1000 * 220));
      dur = base / Math.max(0.5, mult || 4);
    }
    if (ride.replayMarker) { try { map.removeLayer(ride.replayMarker); } catch (e) {} }
    if (ride.replayTrail) { try { map.removeLayer(ride.replayTrail); } catch (e) {} }
    if (ride.sumLine) ride.sumLine.setStyle({ opacity: 0.15 });
    if (ride.sumLineLayers) ride.sumLineLayers.forEach(l => { try { l.setStyle({ opacity: 0.2 }); } catch (e) {} });
    const firstLL = ridePtLatLng(pts[0]);
    ride.replayTrail = L.polyline([firstLL], { color: rideAccent(), weight: 6, opacity: 1 }).addTo(map);
    ride.replayMarker = L.marker(firstLL, { icon: rideIcon(0), interactive: false, zIndexOffset: 2000 }).addTo(map);
    const mEl = () => { const el = ride.replayMarker.getElement && ride.replayMarker.getElement(); return el && el.querySelector('.ride-me'); };
    const info = document.getElementById('rideReplayInfo'), btn = document.getElementById('rideReplayBtn'), ctrl = document.getElementById('rideReplayCtrl');
    if (btn) btn.style.display = 'none';
    if (ctrl && speedSel) speedSel.style.display = 'none';
    const t0 = performance.now(); let seg = 0, hd = 0;
    const step = now => {
      if (ride.sumMap !== map) return;
      const f = Math.min(1, (now - t0) / dur);
      let d = f * total;
      if (mult === 0 && hasTime) {
        const tStart = ridePtT(pts[0]), tEnd = ridePtT(pts[pts.length - 1]);
        const tNow = tStart + f * (tEnd - tStart);
        while (seg < pts.length - 2 && ridePtT(pts[seg + 1]) < tNow) seg++;
        const ta = ridePtT(pts[seg]), tb = ridePtT(pts[seg + 1]) || (ta + 1);
        const u = Math.max(0, Math.min(1, (tNow - ta) / (tb - ta || 1)));
        const a = ridePtLatLng(pts[seg]), b = ridePtLatLng(pts[seg + 1]);
        const cur = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
        if (rideHav({ lat: a[0], lng: a[1] }, { lat: b[0], lng: b[1] }) > 0.5) hd = parkBearing({ lat: a[0], lng: a[1] }, { lat: b[0], lng: b[1] });
        ride.replayMarker.setLatLng(cur);
        const m = mEl(); if (m) m.style.transform = 'rotate(' + hd + 'deg)';
        const trailPts = pts.slice(0, seg + 1).map(ridePtLatLng).concat([cur]);
        ride.replayTrail.setLatLngs(trailPts);
        if (info) info.textContent = rideDistTxt(s.dist * f) + ' / ' + rideDistTxt(s.dist) + (mult === 0 ? ' · gerçek hız' : '');
      } else {
        while (seg < pts.length - 2 && cum[seg + 1] < d) seg++;
        const span = (cum[seg + 1] - cum[seg]) || 1, u = Math.max(0, Math.min(1, (d - cum[seg]) / span));
        const a = ridePtLatLng(pts[seg]), b = ridePtLatLng(pts[seg + 1]);
        const cur = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
        if (cum[seg + 1] - cum[seg] > 0.5) hd = parkBearing({ lat: a[0], lng: a[1] }, { lat: b[0], lng: b[1] });
        ride.replayMarker.setLatLng(cur);
        const m = mEl(); if (m) m.style.transform = 'rotate(' + hd + 'deg)';
        ride.replayTrail.setLatLngs(pts.slice(0, seg + 1).map(ridePtLatLng).concat([cur]));
        if (info) info.textContent = rideDistTxt(s.dist * f) + ' / ' + rideDistTxt(s.dist) + (mult > 1 ? ' · ' + mult + 'x' : '');
      }
      if (f < 1) ride.replayRaf = requestAnimationFrame(step);
      else {
        ride.replayRaf = null;
        if (ride.sumLine) ride.sumLine.setStyle({ opacity: 0.9 });
        if (ride.sumLineLayers) ride.sumLineLayers.forEach(l => { try { l.setStyle({ opacity: 0.95 }); } catch (e) {} });
        if (info) info.textContent = 'Tekrar oynatmak için haritaya dokun veya hız seç';
        if (btn) { btn.style.display = ''; btn.innerHTML = '<i class="fa-solid fa-rotate-right" style="margin-right:6px"></i>Tekrar'; }
        if (speedSel) speedSel.style.display = '';
      }
    };
    ride.replayRaf = requestAnimationFrame(step);
  }

  function rideHideSummary() {
    rideReplayStop();
    ride.replayMarker = null; ride.replayTrail = null; ride.sumLine = null;
    if (ride.sumLineLayers) { try { ride.sumLineLayers.forEach(l => l.remove()); } catch (e) {} ride.sumLineLayers = null; }
    ride.pendingSummary = null;
    document.getElementById('rideSummaryModal').classList.add('hidden');
    if (ride.sumMap) { try { ride.sumMap.remove(); } catch (e) {} ride.sumMap = null; }
  }

  function rideKeepSummary() {
    try {
      const N = window.GarajimNative;
      if (N && typeof N.isNativeRideManaged === 'function' && N.isNativeRideManaged()) {
        toast('Bu sürüş özetini saat ekranından kaydet.');
        return;
      }
    } catch (e) {}
    const s = ride.pendingSummary;
    if (!s || s._previewOnly) { rideHideSummary(); return; }
    ride.epicUndo = null;
    let msg = 'Sürüş kaydedildi · ' + rideDistTxt(s.dist);
    let summaryStored = false;
    try {
      if (!s.vehicleId && ride.vehicleId) s.vehicleId = ride.vehicleId;
      let keep = [s].concat(getAllRides()).slice(0, 150);    // eskiden 40'tan sonrası sessizce siliniyordu
      for (;;) {                                               // depolama doluysa en eski kayıtları at
        try { localStorage.setItem('garaj_rides', JSON.stringify(keep)); summaryStored = true; break; }
        catch (e) { if (keep.length <= 1) throw e; keep = keep.slice(0, Math.max(1, keep.length - 5)); }
      }
      const v = s.vehicleId ? vehicles.find(x => x.id === s.vehicleId) : null;
      if (v) {
        if (!v.rides) v.rides = [];
        v.rides.unshift({ id: s.id, date: s.date, dist: s.dist, time: s.time, avg: s.avg, max: s.max });
        v.rides = v.rides.slice(0, 30);
        const addKm = Math.round(s.dist / 1000), cur = Number(v.km);
        if (addKm > 0 && v.km !== '' && v.km != null && isFinite(cur)) { achievementRecordOdometer(v, cur, cur + addKm, 'ride'); v.km = cur + addKm; msg += ' · KM +' + addKm; }
        persist();
        if (v.plate) msg += ' · ' + v.plate;
      }
      toast(msg);
    } catch (e) {
      toast(summaryStored ? 'Sürüş kaydedildi; araç özeti güncellenemedi' : 'Kayıt yazılamadı — depolama dolu olabilir');
    }
    // Kayıt ana listede güvenle saklanmadıysa saatten tekrar deneyebilmek için özeti tut.
    if (!summaryStored) { try { rideWearPush(); } catch (e) {} return; }
    try { localStorage.removeItem('garaj_ride_watch_pending'); } catch (e) {}
    rideHideSummary(); achievementRecordActivity('ride'); achievementEvaluate('ride');
    try { rideWearPush(); } catch (e) {}
  }

  function rideDiscardSummary() {
    try {
      const N = window.GarajimNative;
      if (N && typeof N.isNativeRideManaged === 'function' && N.isNativeRideManaged()) {
        toast('Bu sürüş özetini saat ekranından sil.');
        return;
      }
    } catch (e) {}
    rideEpicRestore();
    try { localStorage.removeItem('garaj_ride_watch_pending'); } catch (e) {}
    rideHideSummary();
    toast('Sürüş silindi');
    try { rideWearPush(); } catch (e) {}
  }

  function ridePersistDraft(force) {
    if (!ride.running && !ride.startedAt) return;
    if (!force && Date.now() - (ride._draftAt || 0) < 10000) return;
    ride._draftAt = Date.now();
    const pts = ride.pts.slice(-6000);
    try {
      localStorage.setItem('garaj_ride_draft', JSON.stringify({
        startedAt: ride.startedAt,
        dist: ride.dist,
        elapsed: ride.elapsed,
        maxSpeed: ride.maxSpeed,
        pts: pts,
        startCoord: ride.startCoord,
        running: ride.running,
        paused: ride.paused,
        vehicleId: ride.vehicleId
      }));
    } catch (e) {}

    // WebView kapanırsa native servis son güvenli taslağı devralabilsin. Noktalar delta olarak gönderilir.
    try {
      const N = window.GarajimNative;
      if (!N || typeof N.syncRideSnapshot !== 'function'
          || (typeof N.isNativeRideManaged === 'function' && N.isNativeRideManaged())) return;
      const selectedVehicleId = String(ride.vehicleId || localStorage.getItem('garaj_ride_vehicle') || currentId || '');
      const selectedVehicle = vehicles.find(v => String(v.id) === selectedVehicleId) || null;
      const count = ride.pts.length;
      const sessionChanged = ride._nativeSnapshotSession !== ride.startedAt;
      const sourceStart = Math.max(0, count - 6000);
      const previousCount = Number(ride._nativeSnapshotPointCount) || 0;
      const resetPoints = sessionChanged || sourceStart > previousCount;
      const pointStart = resetPoints ? sourceStart : previousCount;
      const delta = ride.pts.slice(pointStart);
      N.syncRideSnapshot(JSON.stringify({
        active: true,
        startedAt: ride.startedAt,
        running: !!ride.running,
        paused: !!ride.paused,
        vehicleId: selectedVehicleId,
        plate: selectedVehicle ? (selectedVehicle.plate || [selectedVehicle.brand, selectedVehicle.model].filter(Boolean).join(' ')) : '',
        dist: Number(ride.dist) || 0,
        elapsed: Number(ride.elapsed) || 0,
        maxSpeed: Number(ride.maxSpeed) || 0,
        lastSpeedKmh: Number(ride.lastSpeedKmh) || 0,
        gotFix: !!ride.gotFix,
        gap: !!ride.gap,
        startCoord: ride.startCoord || null,
        last: ride.last || null,
        pts: delta,
        pointStart: pointStart,
        pointsTotal: count,
        resetPoints: resetPoints
      }));
      ride._nativeSnapshotSession = ride.startedAt;
      ride._nativeSnapshotPointCount = count;
    } catch (e) {}
  }

  function rideClearNativeSnapshot() {
    try {
      const N = window.GarajimNative;
      if (N && typeof N.syncRideSnapshot === 'function') {
        N.syncRideSnapshot(JSON.stringify({
          active: false, startedAt: '', running: false, paused: false, vehicleId: '',
          dist: 0, elapsed: 0, maxSpeed: 0, gotFix: false, gap: false,
          pts: [], pointStart: 0, pointsTotal: 0, resetPoints: true
        }));
      }
    } catch (e) {}
  }

  function rideTryRecover() {
    try {
      const N = window.GarajimNative;
      if (N && typeof N.isNativeRideManaged === 'function' && N.isNativeRideManaged()) return;
      if (ride.startedAt || ride.running) return;               // oturum zaten bellekte
      const d = JSON.parse(localStorage.getItem('garaj_ride_draft') || 'null');
      if (!d || !d.startedAt) return;
      if (!confirm('Yarım kalmış bir sürüş bulundu. Devam edilsin mi?')) {
        localStorage.removeItem('garaj_ride_draft');
        return;
      }
      ride.startedAt = d.startedAt;
      ride.dist = d.dist || 0;
      ride.elapsed = d.elapsed || 0;
      ride.maxSpeed = d.maxSpeed || 0;
      ride.pts = d.pts || [];
      ride.startCoord = d.startCoord;
      if (d.vehicleId) { ride.vehicleId = d.vehicleId; rideRefreshVehicleSelect(); }
      if (ride.line) ride.line.setLatLngs(ride.pts.map(p => [p[0], p[1]]));
      ride.running = false;
      ride.paused = true;
      rideHideBgNotification();
      document.getElementById('rideStartTxt').textContent = 'Devam';
      document.querySelector('#rideStartBtn i').className = 'fa-solid fa-play mr-2';
      document.getElementById('rideStopBtn').classList.remove('hidden');
      rideRender(0);
      toast('Sürüş kurtarıldı — Devam’a bas');
    } catch (e) {}
  }

  function rideCenterOnMe(zoom) {
    const ll = ride.marker ? ride.marker.getLatLng() : null;
    if (ll) rideSetMe(ll.lat, ll.lng, Math.max(ride.map.getZoom(), zoom || 16), ride.hasHeading ? ride.heading : null);
    else rideRequestPermission();
  }
  function rideRecenter() {
    ride.cam = 'follow';
    rideUpdateCamHint();
    rideCenterOnMe(16);
  }
  function rideUpdateMapAttribution() {
    const el = document.getElementById('rideMapAttributionLink'); if (!el) return;
    const sat = ride.mapStyle === 'sat';
    const baseUrl = ride.map && ride.map.__base && ride.map.__base._url || '';
    if (sat || /arcgisonline/i.test(baseUrl)) {
      el.href = 'https://www.esri.com/en-us/legal/terms/full-master-agreement';
      el.textContent = 'Tiles © Esri';
    } else {
      el.href = 'https://www.openstreetmap.org/copyright';
      el.textContent = '© OpenStreetMap contributors';
    }
    const box = document.getElementById('rideMapAttribution'), panel = document.getElementById('ridePanel');
    if (box && panel) {
      box.style.bottom = Math.max(138, Math.ceil(panel.getBoundingClientRect().height + 5)) + 'px';
      if (typeof ResizeObserver !== 'undefined' && !window.__rideAttrObserver) {
        try { window.__rideAttrObserver = new ResizeObserver(() => { box.style.bottom = Math.max(138, Math.ceil(panel.getBoundingClientRect().height + 5)) + 'px'; }); window.__rideAttrObserver.observe(panel); } catch (e) {}
      }
    }
  }
  window.addEventListener('resize', () => setTimeout(rideUpdateMapAttribution, 80));
  function rideToolsOpen() { const el=document.getElementById('rideToolsModal'); if(el)el.classList.remove('hidden'); }
  function rideToolsClose() { const el=document.getElementById('rideToolsModal'); if(el)el.classList.add('hidden'); }
  function rideToolsRun(action) {
    rideToolsClose();
    const actions={camera:rideCycleCamera,map:rideToggleMapStyle,park:parkOpen,pin:ridePinPrompt,zoomIn:()=>rideZoom(1),zoomOut:()=>rideZoom(-1),cards:rideCardsOpen,stats:rideStatsOpen,history:rideOpenHistory,settings:rideOpenSettings};
    const fn=actions[action]; if(typeof fn==='function') { try{fn();}catch(e){toast('Araç açılamadı; tekrar dene');} }
  }

  function rideCycleCamera() {
    const order = ['follow', 'heading', 'free'];
    ride.cam = order[(order.indexOf(ride.cam) + 1) % order.length];
    rideSaveSettings({ cam: ride.cam });
    rideUpdateCamHint();
    if (ride.cam !== 'free') rideCenterOnMe(16);             // kamera modunu bozmadan merkezle
    toast('Kamera: ' + ({ follow: 'takip', heading: 'yön takibi', free: 'serbest' })[ride.cam]);
  }

  function rideUpdateCamHint() {
    const el = document.getElementById('rideCamHint');
    if (!el) return;
    el.textContent = 'Kamera: ' + ({ follow: 'takip', heading: 'yön takibi (simge döner)', free: 'serbest' })[ride.cam];
    const btn = document.getElementById('rideCamBtn');
    if (btn) btn.innerHTML = ride.cam === 'free' ? '<i class="fa-solid fa-hand"></i>' : ride.cam === 'heading' ? '<i class="fa-solid fa-location-arrow"></i>' : '<i class="fa-solid fa-compass"></i>';
  }

  function rideZoom(dir) {
    if (!ride.map) return;
    ride.map.setZoom(ride.map.getZoom() + dir);
  }

  function rideToggleMapStyle() {
    if (!ride.map) return;
    if (ride.mapStyle === 'road') {
      if (ride.satTile) {
        ride.map.removeLayer(ride.tile);
        ride.satTile.addTo(ride.map);
        ride.mapStyle = 'sat';
        rideUpdateMapAttribution();
        toast('Uydu görünümü');
      } else toast('Uydu katmanı yok');
    } else {
      if (ride.satTile) ride.map.removeLayer(ride.satTile);
      ride.tile.addTo(ride.map);
      ride.mapStyle = 'road';
      rideUpdateMapAttribution();
      toast('Yol haritası');
    }
  }

  // Gösterge kapalıyken hız kaybolmaz: ekranı kaplamayan küçük daire göstergeye dönüşür
  function rideApplyPanel() {
    const c = !!ride.panelCollapsed;
    document.getElementById('ridePanelBody').classList.toggle('hidden', c);
    document.getElementById('rideMiniGauge').classList.toggle('hidden', !c);
    rideRender(ride.lastSpeedKmh);
    setTimeout(rideUpdateMapAttribution, 40);
  }
  function rideTogglePanel() {
    ride.panelCollapsed = !ride.panelCollapsed;
    rideApplyPanel();
    rideSaveSettings({ hud: !ride.panelCollapsed });
  }

  function rideComputeScore() {
    return rideComputeScoreFromSummary({
      dist: ride.dist, time: ride.elapsed, avg: ride.elapsed > 0 ? (ride.dist / 1000) / (ride.elapsed / 3600) : 0,
      max: ride.maxSpeed, hardBrakes: ride.hardBrakes, pts: ride.pts, speedSamples: ride.speedSamples
    });
  }
  function rideComputeScoreFromSummary(s) {
    let score = 80;
    const tips = [];
    const samples = s.speedSamples || [];
    const hard = s.hardBrakes || 0;
    if ((s.dist || 0) < 200) { score -= 5; tips.push('kısa sürüş'); }
    if (hard > 0) { score -= Math.min(25, hard * 6); tips.push(hard + ' sert fren'); }
    if (s.max > 140) { score -= 8; tips.push('yüksek tepe hız'); }
    if (samples.length > 5) {
      const mean = samples.reduce((a,b)=>a+b,0)/samples.length;
      const variance = samples.reduce((a,b)=>a+(b-mean)**2,0)/samples.length;
      if (variance > 400) { score -= 8; tips.push('tempo dalgalı'); }
      else { score += 5; }
    }
    if ((s.avg || 0) > 20 && (s.avg || 0) < 90) score += 5;
    score = Math.max(0, Math.min(100, Math.round(score)));
    let tip = 'Dengeli sürüş';
    if (score >= 85) tip = 'Akıcı ve sakin';
    else if (score >= 70) tip = 'İyi';
    else if (score >= 50) tip = 'Geliştirilebilir';
    else tip = 'Sert tempolu';
    if (tips.length) tip += ' · ' + tips.slice(0,2).join(', ');
    return { value: score, tip };
  }
  // ---------- SÜRÜŞ PAYLAŞIM KARTI (PNG) ----------
  function rideCardCanvas(s) {
    const W = 1080, H = 1350, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext && c.getContext('2d');
    if (!g) return null;
    const ac = rideAccent(), font = f => f + ' system-ui, -apple-system, "Inter", sans-serif';
    const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#1b1b1b'); bg.addColorStop(1, '#070707');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const v = s.vehicleId ? vehicles.find(x => x.id === s.vehicleId) : null;
    g.fillStyle = ac; g.font = font('800 40px'); g.textBaseline = 'alphabetic'; g.fillText('GARAJIM', 60, 100);
    g.fillStyle = '#e5e7eb'; g.font = font('700 54px'); g.fillText(v ? ((v.plate || '') + ' · ' + [v.brand, v.model].filter(Boolean).join(' ')).trim() : 'Açık Dünya sürüşü', 60, 175);
    g.fillStyle = '#94a3b8'; g.font = font('500 32px'); g.fillText(new Date(s.date).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }), 60, 225);
    // rota alanı
    const bx = 60, by = 270, bw = 960, bh = 640;
    g.fillStyle = 'rgba(255,255,255,0.05)'; rr(bx, by, bw, bh, 36); g.fill();
    const pts = (s.pts || []).filter(p => isFinite(p[0]) && isFinite(p[1]));
    if (pts.length >= 2) {
      let a0 = 90, a1 = -90, o0 = 180, o1 = -180;
      pts.forEach(p => { a0 = Math.min(a0, p[0]); a1 = Math.max(a1, p[0]); o0 = Math.min(o0, p[1]); o1 = Math.max(o1, p[1]); });
      const k = Math.cos((a0 + a1) / 2 * Math.PI / 180), w = Math.max((o1 - o0) * k, 1e-5), h = Math.max(a1 - a0, 1e-5), pad = 70;
      const S = Math.min((bw - 2 * pad) / w, (bh - 2 * pad) / h), ox = bx + (bw - w * S) / 2, oy = by + (bh - h * S) / 2;
      const X = p => ox + (p[1] - o0) * k * S, Y = p => oy + (a1 - p[0]) * S;
      g.lineJoin = 'round'; g.lineCap = 'round';
      g.shadowColor = ac; g.shadowBlur = 24; g.strokeStyle = ac; g.lineWidth = 12;
      g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(X(p), Y(p)) : g.moveTo(X(p), Y(p))); g.stroke();
      g.shadowBlur = 0;
      const dot = (p, col) => { g.fillStyle = col; g.strokeStyle = '#fff'; g.lineWidth = 6; g.beginPath(); g.arc(X(p), Y(p), 16, 0, Math.PI * 2); g.fill(); g.stroke(); };
      dot(pts[0], '#22c55e'); dot(pts[pts.length - 1], '#ef4444');
    } else {
      g.fillStyle = '#64748b'; g.font = font('500 34px'); g.textAlign = 'center'; g.fillText('Rota verisi yok', bx + bw / 2, by + bh / 2); g.textAlign = 'left';
    }
    // istatistikler
    const stats = [[rideDistTxt(s.dist), 'mesafe'], [rideFmtTime(s.time), 'süre'], [rideSpdTxt(s.avg), 'ort. hız'], [rideSpdTxt(s.max), 'en yüksek hız']];
    stats.forEach((st, i) => {
      const x = 60 + (i % 2) * 490, y = 950 + Math.floor(i / 2) * 150;
      g.fillStyle = 'rgba(255,255,255,0.06)'; rr(x, y, 470, 130, 28); g.fill();
      g.fillStyle = '#fff'; g.font = font('800 52px'); g.fillText(st[0], x + 30, y + 70);
      g.fillStyle = '#94a3b8'; g.font = font('500 28px'); g.fillText(st[1], x + 30, y + 110);
    });
    g.fillStyle = '#64748b'; g.font = font('500 28px'); g.textAlign = 'center'; g.fillText('Garajım ile kaydedildi', W / 2, H - 30);
    return c;
  }
  async function rideShareCard() {
    const s = ride.pendingSummary;
    if (!s) return;
    const c = rideCardCanvas(s);
    if (!c) { toast('Kart oluşturulamadı'); return; }
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    if (!blob) { toast('Kart oluşturulamadı'); return; }
    await saveFileToast('garajim-surus-' + String(s.date || '').slice(0, 10) + '.png', 'image/png', blob, 'Sürüş kartı');
  }

  async function rideExportGpx() {
    const s = ride.pendingSummary;
    if (!s || !s.pts || s.pts.length < 2) { toast('Rota noktası yok'); return; }
    const trk = s.pts.map(p => `<trkpt lat="${p[0]}" lon="${p[1]}"></trkpt>`).join('\n');
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Garajim" xmlns="http://www.topografix.com/GPX/1/1">\n<trk><name>Garajim surus</name><trkseg>\n${trk}\n</trkseg></trk>\n</gpx>`;
    await saveFileToast('garajim-surus-' + String(s.date || '').slice(0, 10) + '.gpx', 'application/gpx+xml', gpx, 'GPX');
  }
  function rideOpenMaps() {
    const s = ride.pendingSummary;
    if (!s || !s.pts || !s.pts.length) { toast('Konum yok'); return; }
    const a = s.pts[0], b = s.pts[s.pts.length - 1];
    const url = `https://www.google.com/maps/dir/?api=1&origin=${a[0]},${a[1]}&destination=${b[0]},${b[1]}`;
    openExternal(url);
  }
  function rideToggleFavorite() {
    const s = ride.pendingSummary;
    if (!s) return;
    s.favorite = !s.favorite;
    if (s._previewOnly) {                                       // kayıtlı sürüşte değişiklik kalıcı olsun
      try {
        const l = getAllRides(), i = l.findIndex(x => x.id === s.id);
        if (i >= 0) { l[i].favorite = s.favorite; localStorage.setItem('garaj_rides', JSON.stringify(l)); }
      } catch (e) {}
      if (s.favorite) { achievementRecordActivity('favorite'); achievementEvaluate('favorite'); }
    }
    const favBtn = document.getElementById('rideFavBtn');
    if (favBtn) favBtn.innerHTML = s.favorite ? '<i class="fa-solid fa-star mr-1"></i>Favori' : '<i class="fa-regular fa-star mr-1"></i>Favori';
    toast(s.favorite ? 'Favorilere eklendi' : 'Favoriden çıkarıldı');
  }
  function rideToggleNight() {
    const s = rideSettings();
    const on = !s.night;
    rideSaveSettings({ night: on });
    document.getElementById('rideNightToggle').textContent = on ? 'Açık' : 'Kapalı';
    rideApplyNight(on);
  }
  function rideApplyNight(on) {
    const panel = document.getElementById('ridePanel');
    if (!panel) return;
    panel.classList.toggle('ride-night', !!on);
    const styleId = 'rideNightStyle';
    let st = document.getElementById(styleId);
    if (on && !st) {
      st = document.createElement('style');
      st.id = styleId;
      st.textContent = '.ride-night .text-5xl{font-size:3.5rem!important;letter-spacing:-0.03em}.ride-night{filter:saturate(0.85);opacity:0.98}.ride-night #rideCamHint{display:none}';
      document.head.appendChild(st);
    }
    if (!on && st) st.remove();
  }

  function rideOpenSettings() {
    const s = rideSettings();
    document.querySelectorAll('.ride-unit').forEach(b => b.classList.toggle('active', b.dataset.u === (s.unit || 'kmh')));
    const sel = document.getElementById('rideCamDefault');
    if (sel) sel.value = s.cam || 'follow';
    const hud = document.getElementById('rideHudToggle');
    if (hud) hud.textContent = s.hud === false ? 'Kapalı' : 'Açık';
    const mt = document.getElementById('rideMusicToggle');
    if (mt) mt.textContent = s.music === false ? 'Kapalı' : 'Açık';
    const nt = document.getElementById('rideNightToggle');
    if (nt) nt.textContent = s.night ? 'Açık' : 'Kapalı';
    const lim = document.getElementById('rideSpeedLimit');
    if (lim) lim.value = s.speedLimit > 0 ? s.speedLimit : '';
    const lu = document.getElementById('rideLimitUnit');
    if (lu) lu.textContent = (s.unit === 'mph') ? 'mph' : 'km/sa';
    const wg = document.getElementById('rideWeekGoal');
    if (wg) wg.value = s.weekGoal > 0 ? s.weekGoal : '';
    document.getElementById('rideSettingsModal').classList.remove('hidden');
  }
  function rideSetSpeedLimit(v) {
    const n = parseFloat(v);
    rideSaveSettings({ speedLimit: (isFinite(n) && n > 0) ? n : 0 });
    toast(n > 0 ? ('Hız limiti: ' + n) : 'Hız limiti kapalı');
  }
  function rideSetWeekGoal(v) {
    const n = parseFloat(v);
    rideSaveSettings({ weekGoal: (isFinite(n) && n > 0) ? n : 0 });
    toast(n > 0 ? ('Haftalık hedef: ' + n + ' km') : 'Haftalık hedef kapalı');
  }
  function rideSetUnit(u) {
    rideSaveSettings({ unit: u });
    document.querySelectorAll('.ride-unit').forEach(b => b.classList.toggle('active', b.dataset.u === u));
    rideRender(ride.lastSpeedKmh);
  }
  function rideSetCamDefault(v) {
    ride.cam = v;
    rideSaveSettings({ cam: v });
    rideUpdateCamHint();
  }
  function rideToggleHud() {
    const s = rideSettings();
    const on = s.hud === false;
    rideSaveSettings({ hud: on });
    document.getElementById('rideHudToggle').textContent = on ? 'Açık' : 'Kapalı';
    ride.panelCollapsed = !on;
    rideApplyPanel();
  }

  // ---------- SÜRÜŞ İSTATİSTİKLERİ ----------
  function rideStatsData(period, now) {
    now = now || new Date();
    const day0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const key = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + (period === 'year' ? '' : '-' + String(d.getDate()).padStart(2, '0'));
    const buckets = [];
    if (period === 'year') for (let i = 11; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); buckets.push({ k: key(d), label: ['O', 'Ş', 'M', 'N', 'M', 'H', 'T', 'A', 'E', 'E', 'K', 'A'][d.getMonth()], m: 0 }); }
    else for (let i = (period === 'week' ? 6 : 29); i >= 0; i--) { const d = new Date(day0.getFullYear(), day0.getMonth(), day0.getDate() - i); buckets.push({ k: key(d), label: period === 'week' ? ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'][d.getDay()] : String(d.getDate()), m: 0 }); }
    const first = buckets[0].k, map = {}; buckets.forEach(b => { map[b.k] = b; });
    const all = getAllRides(); let n = 0, dist = 0, time = 0, max = 0;
    all.forEach(r => {
      const d = new Date(r.date); if (isNaN(d)) return;
      const b = map[key(d)]; if (!b) return;
      b.m += Number(r.dist) || 0; n++; dist += Number(r.dist) || 0; time += Number(r.time) || 0; max = Math.max(max, Number(r.max) || 0);
    });
    const rec = { longest: null, fastest: null, longTime: null };
    all.forEach(r => {
      if (!rec.longest || r.dist > rec.longest.dist) rec.longest = r;
      if (!rec.fastest || r.max > rec.fastest.max) rec.fastest = r;
      if (!rec.longTime || r.time > rec.longTime.time) rec.longTime = r;
    });
    return { buckets, n, dist, time, max, avg: time > 0 ? dist / time * 3.6 : 0, rec, first, total: all.length };
  }
  function ridePeriodRange(period, offset, now) {
    now = now || new Date();
    const d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let start, end;
    if (period === 'week') {
      const day = d0.getDay(); // 0=Pz
      const monOffset = day === 0 ? -6 : 1 - day;
      start = new Date(d0); start.setDate(d0.getDate() + monOffset + offset * 7);
      end = new Date(start); end.setDate(start.getDate() + 7);
    } else if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
    } else {
      start = new Date(now.getFullYear() + offset, 0, 1);
      end = new Date(now.getFullYear() + offset + 1, 0, 1);
    }
    return { start, end };
  }
  function rideSumInRange(start, end) {
    let dist = 0, n = 0, time = 0, max = 0;
    getAllRides().forEach(r => {
      const d = new Date(r.date); if (isNaN(d) || d < start || d >= end) return;
      dist += Number(r.dist) || 0; n++; time += Number(r.time) || 0; max = Math.max(max, Number(r.max) || 0);
    });
    return { dist, n, time, max };
  }
  function rideBadges() {
    const all = getAllRides();
    const totalKm = all.reduce((s, r) => s + (Number(r.dist) || 0), 0) / 1000;
    const night = all.filter(r => { const h = new Date(r.date).getHours(); return h >= 22 || h < 5; }).length;
    const long = all.filter(r => (r.dist || 0) >= 50000).length;
    const list = [
      { id: 'first', n: 'İlk sürüş', ok: all.length >= 1, i: 'fa-flag-checkered' },
      { id: 'km100', n: '100 km', ok: totalKm >= 100, i: 'fa-road' },
      { id: 'km500', n: '500 km', ok: totalKm >= 500, i: 'fa-route' },
      { id: 'km1000', n: '1000 km', ok: totalKm >= 1000, i: 'fa-globe' },
      { id: 'rides10', n: '10 sürüş', ok: all.length >= 10, i: 'fa-list-ol' },
      { id: 'long50', n: '50+ km sürüş', ok: long >= 1, i: 'fa-gauge-high' },
      { id: 'night', n: 'Gece sürüşü', ok: night >= 1, i: 'fa-moon' },
      { id: 'fav', n: 'Favori rota', ok: all.some(r => r.favorite), i: 'fa-star' }
    ];
    return list;
  }
  function rideStatsOpen(period) {
    period = period || ride.statsPeriod || 'week'; ride.statsPeriod = period;
    const st = rideStatsData(period), mph = rideUnit() === 'mph', conv = m => mph ? m / 1609.344 : m / 1000, u = mph ? 'mi' : 'km';
    const top = Math.max(...st.buckets.map(b => b.m), 1), W = 300, H = 96, bw = W / st.buckets.length;
    const bars = st.buckets.map((b, i) => {
      const h = Math.round(b.m / top * 70);
      const show = period === 'month' ? (i % 5 === 0 || i === st.buckets.length - 1) : true;
      return `<rect x="${(i * bw + bw * 0.15).toFixed(1)}" y="${80 - h}" width="${(bw * 0.7).toFixed(1)}" height="${Math.max(h, b.m > 0 ? 2 : 0)}" rx="2" fill="${b.m > 0 ? 'var(--accent)' : 'rgba(255,255,255,0.08)'}"/>` +
        (show ? `<text x="${(i * bw + bw / 2).toFixed(1)}" y="93" text-anchor="middle" font-size="8" fill="#94a3b8">${b.label}</text>` : '');
    }).join('');
    const tab = (p, t) => `<button onclick="rideStatsOpen('${p}')" class="flex-1 py-2 rounded-xl text-sm ${p === period ? 'font-bold text-white' : 'bg-white/5 text-slate-300'}" ${p === period ? 'style="background:var(--accent)"' : ''}>${t}</button>`;
    const box = (v, l) => `<div class="rounded-xl bg-white/5 p-3 text-center"><div class="text-lg font-bold">${v}</div><div class="text-[10px] text-slate-400">${l}</div></div>`;
    const dt = r => new Date(r.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    const rec = st.rec;
    // dönem karşılaştırması
    const curR = ridePeriodRange(period, 0), prevR = ridePeriodRange(period, -1);
    const curS = rideSumInRange(curR.start, curR.end), prevS = rideSumInRange(prevR.start, prevR.end);
    const delta = curS.dist - prevS.dist;
    const deltaTxt = prevS.dist > 0 || curS.dist > 0
      ? (delta >= 0 ? '+' : '') + conv(delta).toFixed(1) + ' ' + u + (prevS.dist > 0 ? ' (' + (delta / Math.max(prevS.dist, 1) * 100).toFixed(0) + '%)' : '')
      : '—';
    const periodLabel = period === 'week' ? 'önceki hafta' : period === 'month' ? 'önceki ay' : 'önceki yıl';
    // haftalık hedef
    const goalKm = Number(rideSettings().weekGoal) || 0;
    const weekS = rideSumInRange(ridePeriodRange('week', 0).start, ridePeriodRange('week', 0).end);
    const weekKm = weekS.dist / 1000;
    const goalPct = goalKm > 0 ? Math.min(100, Math.round(weekKm / goalKm * 100)) : 0;
    // rozetler
    const badges = rideBadges();
    const badgeHtml = badges.map(b =>
      `<div class="flex flex-col items-center gap-1 p-2 rounded-xl ${b.ok ? 'bg-accent/15 border border-accent/30' : 'bg-white/5 opacity-40'}" title="${b.n}">
        <i class="fa-solid ${b.i} text-lg ${b.ok ? 'text-accent' : 'text-slate-500'}"></i>
        <span class="text-[9px] text-center leading-tight">${b.n}</span>
      </div>`
    ).join('');
    // liderlik tablosu (kişisel en iyi 5 mesafe)
    const board = getAllRides().slice().sort((a, b) => (b.dist || 0) - (a.dist || 0)).slice(0, 5);
    const boardHtml = board.length ? board.map((r, i) => {
      const plate = r.vehicleId ? (vehicles.find(v => v.id === r.vehicleId)?.plate || '') : '';
      return `<div class="flex items-center gap-2 rounded-xl bg-white/5 p-2.5 text-sm">
        <span class="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${i === 0 ? 'bg-amber-500/30 text-amber-300' : 'bg-white/10 text-slate-400'}">${i + 1}</span>
        <div class="flex-1 min-w-0"><div class="font-semibold truncate">${rideDistTxt(r.dist)}${plate ? ' · ' + plate : ''}</div>
        <div class="text-[11px] text-slate-500">${dt(r)} · ${rideFmtTime(r.time)} · maks ${rideSpdTxt(r.max)}</div></div>
      </div>`;
    }).join('') : '<p class="text-sm text-slate-500 text-center py-2">Henüz sürüş yok</p>';

    document.getElementById('rideStatsBody').innerHTML =
      `<div class="flex gap-2 mb-4">${tab('week', 'Hafta')}${tab('month', 'Ay')}${tab('year', 'Yıl')}</div>` +
      (st.total === 0 ? '<p class="text-sm text-slate-400 text-center py-6">Henüz kayıtlı sürüş yok. Bir sürüşü bitirip kaydedince istatistikler burada görünür.</p>' :
      `<div class="grid grid-cols-2 gap-2 mb-3">${box(conv(st.dist).toFixed(1) + ' ' + u, 'toplam mesafe')}${box(st.n, 'sürüş')}${box(rideFmtTime(st.time), 'toplam süre')}${box(rideSpdTxt(st.avg), 'ort. hız')}</div>` +
      `<div class="rounded-xl bg-white/5 p-3 mb-3 flex items-center justify-between text-sm">
        <span class="text-slate-400">${period === 'week' ? 'Bu hafta' : period === 'month' ? 'Bu ay' : 'Bu yıl'} vs ${periodLabel}</span>
        <span class="font-bold ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${deltaTxt}</span>
      </div>` +
      (goalKm > 0 ? `<div class="mb-3"><div class="flex justify-between text-[11px] mb-1"><span class="text-slate-400">Haftalık hedef</span><span class="font-semibold">${weekKm.toFixed(1)} / ${goalKm} km · %${goalPct}</span></div>
        <div class="h-2.5 rounded-full bg-white/10 overflow-hidden"><div class="h-full rounded-full transition-all" style="width:${goalPct}%;background:var(--accent)"></div></div></div>` : '') +
      `<svg viewBox="0 0 ${W} ${H}" class="w-full mb-1">${bars}</svg><p class="text-[10px] text-slate-500 text-center mb-4">En yüksek çubuk: ${conv(top).toFixed(1)} ${u}</p>` +
      `<div class="rounded-2xl border border-white/10 bg-white/5 p-3.5 mb-4"><div class="flex items-center gap-3"><div class="w-11 h-11 rounded-2xl flex items-center justify-center text-amber-300"><i class="fa-solid fa-medal text-xl"></i></div><div class="min-w-0 flex-1"><p class="text-sm font-extrabold">Rozet koleksiyonun</p><p class="text-[11px] text-slate-400 mt-0.5">${achievementSummary().count} / ${achievementSummary().total} kazanım · DNA ve garaj başarıları dahil</p></div><button onclick="achievementOpen(&quot;all&quot;)" class="shrink-0 px-3 py-2 rounded-xl text-[10px] font-extrabold text-white" style="background:var(--accent)">Tümünü gör <i class="fa-solid fa-arrow-right ml-1"></i></button></div><div class="ach-progress-track mt-3"><div class="ach-progress-fill" style="width:${achievementSummary().pct}%"></div></div></div>` +
      `<p class="text-xs text-slate-500 uppercase mb-2">Liderlik · en uzun sürüşler</p><div class="space-y-1.5 mb-4">${boardHtml}</div>` +
      `<p class="text-xs text-slate-500 uppercase mb-2">Rekorlar (tüm zamanlar)</p><div class="space-y-2">` +
      (rec.longest ? `<div class="flex justify-between rounded-xl bg-white/5 p-3 text-sm"><span class="text-slate-400">En uzun sürüş</span><span class="font-semibold">${rideDistTxt(rec.longest.dist)} · ${dt(rec.longest)}</span></div>` : '') +
      (rec.fastest ? `<div class="flex justify-between rounded-xl bg-white/5 p-3 text-sm"><span class="text-slate-400">En yüksek hız</span><span class="font-semibold">${rideSpdTxt(rec.fastest.max)} · ${dt(rec.fastest)}</span></div>` : '') +
      (rec.longTime ? `<div class="flex justify-between rounded-xl bg-white/5 p-3 text-sm"><span class="text-slate-400">En uzun süre</span><span class="font-semibold">${rideFmtTime(rec.longTime.time)} · ${dt(rec.longTime)}</span></div>` : '') + `</div>`);
    document.getElementById('rideStatsModal').classList.remove('hidden');
  }

  function rideOpenHistory() {
    const box = document.getElementById('rideHistoryList');
    const list = getAllRides();
    if (!list.length) {
      box.innerHTML = '<p class="text-sm text-slate-500 text-center py-8">Henüz kayıtlı sürüş yok</p>';
    } else {
      box.innerHTML = list.map((r, i) => {
        const plate = r.vehicleId ? (vehicles.find(v => v.id === r.vehicleId)?.plate || 'Araç') : 'Araçsız';
        return `<div class="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div class="flex justify-between items-start gap-2">
            <button type="button" class="text-left flex-1 min-w-0" onclick='ridePreviewFromHistory(${i})'>
              <p class="text-sm font-semibold">${new Date(r.date).toLocaleString('tr-TR')} · ${rideEsc(plate)}</p>
              <p class="text-[12px] text-slate-400 mt-0.5">${rideDistTxt(r.dist)} · ${rideFmtTime(r.time)} · ort ${rideSpdTxt(r.avg)} · maks ${rideSpdTxt(r.max)}</p>
            </button>
            <button onclick="rideDeleteHistory(${i})" class="text-slate-500 text-xs px-2 py-1">Sil</button>
          </div>
        </div>`;
      }).join('');
    }
    document.getElementById('rideHistoryModal').classList.remove('hidden');
  }
  function ridePreviewFromHistory(i) {
    const r = getAllRides()[i];
    if (!r) return;
    document.getElementById('rideHistoryModal').classList.add('hidden');
    ride.pendingSummary = { ...r, _previewOnly: true };
    rideShowSummary(r, true);
  }
  function rideDeleteHistory(i) {
    if (!confirm('Sürüş silinsin mi?')) return;
    try {
      const list = getAllRides();
      const [gone] = list.splice(i, 1);
      localStorage.setItem('garaj_rides', JSON.stringify(list));
      if (gone && gone.vehicleId) {                              // araç kaydındaki özet de silinsin
        const v = vehicles.find(x => x.id === gone.vehicleId);
        if (v && v.rides) { v.rides = v.rides.filter(x => x.id !== gone.id); persist(); }
      }
      rideOpenHistory();
    } catch (e) {}
  }

  // Uygulama arka plana / öne gelince: kalıcı bildirim + kayıt devam
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) rideOnBackground();
    else rideOnForeground();
  });
  // Capacitor / bazı Android WebView'lerde visibility yetmez
  try {
    if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.App) {
      Capacitor.Plugins.App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) rideOnForeground();
        else rideOnBackground();
      });
    }
  } catch (e) {}

  // ---------- NAVİGASYON (OSM arama + OSRM rota) ----------
  const NV_RECENT = 'garaj_nav_recent';
  const NV_SESSION_KEY = 'garaj_nav_session_v2';
  const NV_GEOCODE_CACHE_KEY = 'garaj_nav_geocode_cache_v1';
  const NV_SESSION_MAX_AGE = 12 * 60 * 60 * 1000;
  const nv = { active: false, routes: [], sel: 0, dest: null, route: null, idx: 0, along: 0, off: 0, rerouting: false, retryAt: 0, lastRerouteAt: 0, layers: [], speak: true, said: {}, list: [], lastFixAt: 0, lastPersistAt: 0, geocodeSeq: 0, geocodeQueue: Promise.resolve(), lastGpsReliable: false, resumeCandidate: null };
  const NV_MOD = { 'uturn': 'U dönüşü yap', 'sharp right': 'sağa keskin dön', 'right': 'sağa dön', 'slight right': 'hafif sağa dön', 'straight': 'düz devam et', 'slight left': 'hafif sola dön', 'sharp left': 'sola keskin dön', 'left': 'sola dön' };

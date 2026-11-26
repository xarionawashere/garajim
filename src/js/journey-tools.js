// Ride replay, media, parking, and odometer tools.
// Classic script: globals are shared with other files in index.html's intentional load order.
function rideGhostChipPos() { const c = document.getElementById('rideGhostChip'); if (c) c.style.top = 'calc(' + (nv.active ? 184 : 64) + 'px + env(safe-area-inset-top))'; }
  function rideGhostStart() {
    rideGhostStop();
    try {
      const me = ride.marker ? ride.marker.getLatLng() : null;
      if (!me) return;
      const timed = r => r.pts && r.pts.length > 10 && r.dist > 1000 && ridePtT(r.pts[0]) > 0 && ridePtT(r.pts[r.pts.length - 1]) > ridePtT(r.pts[0]);
      const cand = getAllRides().filter(r => timed(r) && rideHav({ lat: me.lat, lng: me.lng }, { lat: r.pts[0][0], lng: r.pts[0][1] }) < 800);
      if (!cand.length) return;
      cand.sort((a, b) => (b.avg || 0) - (a.avg || 0));
      const r = cand[0], t0 = ridePtT(r.pts[0]);
      ride.ghost = { id: r.id, pts: r.pts.map(p => ({ lat: p[0], lng: p[1], t: (ridePtT(p) - t0) / 1000 })), gi: 0, idx: 0, delta: null };
      ride.ghost.marker = L.marker([r.pts[0][0], r.pts[0][1]], { icon: rideIcon(0), interactive: false, opacity: 0.5, zIndexOffset: 400 }).addTo(ride.map);
      toast('👻 En hızlı turun seninle yarışıyor');
    } catch (e) { ride.ghost = null; }
  }
  function rideGhostUpdate() {
    const g = ride.ghost;
    if (!g || !ride.running || ride.paused) return;
    const T = g.pts[g.pts.length - 1].t, el = ride.elapsed;
    let i = g.gi; while (i < g.pts.length - 2 && g.pts[i + 1].t < el) i++; g.gi = i;
    const a = g.pts[i], b = g.pts[i + 1], u = Math.max(0, Math.min(1, (el - a.t) / ((b.t - a.t) || 1)));
    g.marker.setLatLng(el >= T ? [g.pts[g.pts.length - 1].lat, g.pts[g.pts.length - 1].lng] : [a.lat + (b.lat - a.lat) * u, a.lng + (b.lng - a.lng) * u]);
    const me = ride.marker ? ride.marker.getLatLng() : null; if (!me) return;
    let best = g.idx, bd = 1e12;
    for (let j = Math.max(0, g.idx - 5); j < Math.min(g.pts.length, g.idx + 300); j++) { const d = rideHav({ lat: me.lat, lng: me.lng }, g.pts[j]); if (d < bd) { bd = d; best = j; } }
    const chip = document.getElementById('rideGhostChip'); chip.classList.remove('hidden'); rideGhostChipPos();
    if (bd > 150) { g.delta = null; chip.textContent = '👻 rota dışı'; chip.style.color = '#94a3b8'; return; }
    g.idx = best; g.delta = g.pts[best].t - el;
    const ab = Math.abs(Math.round(g.delta)), txt = ab >= 90 ? Math.floor(ab / 60) + ' dk ' + (ab % 60) + ' sn' : ab + ' sn';
    chip.textContent = '👻 ' + txt + (g.delta >= 0 ? ' önde' : ' geride'); chip.style.color = g.delta >= 0 ? '#22c55e' : '#ef4444';
  }
  function rideGhostStop() {
    const g = ride.ghost;
    if (g && g.marker) { try { ride.map.removeLayer(g.marker); } catch (e) {} }
    ride.ghost = null;
    const c = document.getElementById('rideGhostChip'); if (c) c.classList.add('hidden');
  }

  // ---------- SÜRÜŞ KARNESİ (paylaşım görseli 1080x1920) ----------
  const rideGrade = v => v >= 90 ? 'A' : v >= 75 ? 'B' : v >= 60 ? 'C' : 'D';
  function rideKarneRows(s) {
    const rows = [], km10 = Math.max(0.1, (s.dist || 0) / 10000);
    if (s.corners) rows.push({ k: 'Akıcılık', v: s.corners.avg, t: s.corners.n + ' viraj · ' + s.corners.perfect + ' mükemmel' });
    if (s.roughHits != null) rows.push({ k: 'Yol pürüzü', v: Math.max(0, Math.round(100 - s.roughHits / km10 * 12)), t: s.roughHits + ' sarsıntı' });
    if (s.hardBrakes != null) rows.push({ k: 'Fren disiplini', v: Math.max(0, Math.round(100 - s.hardBrakes / km10 * 15)), t: s.hardBrakes + ' sert fren' });
    const sc = s.score || (typeof rideComputeScoreFromSummary === 'function' ? rideComputeScoreFromSummary(s) : null);
    if (sc && isFinite(sc.value)) rows.push({ k: 'Sürüş skoru', v: Math.round(sc.value), t: 'genel' });
    return { rows, overall: rows.length ? Math.round(rows.reduce((q, r) => q + r.v, 0) / rows.length) : null };
  }
  function rideKarneCanvas(s) {
    const W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext && c.getContext('2d'); if (!g) return null;
    const ac = rideAccent(), font = f => f + ' system-ui, -apple-system, "Inter", sans-serif';
    const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#1b1b1b'); bg.addColorStop(1, '#060606'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const v = s.vehicleId ? vehicles.find(x => x.id === s.vehicleId) : null;
    g.fillStyle = ac; g.font = font('800 38px'); g.fillText('SÜRÜŞ KARNESİ', 60, 100);
    g.fillStyle = '#e5e7eb'; g.font = font('700 52px'); g.fillText(v ? ((v.plate || '') + ' · ' + [v.brand, v.model].filter(Boolean).join(' ')).trim() : 'Açık Dünya', 60, 172);
    g.fillStyle = '#94a3b8'; g.font = font('500 30px'); g.fillText(new Date(s.date).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }), 60, 218);
    const bx = 60, by = 255, bw = 960, bh = 560;
    g.fillStyle = 'rgba(255,255,255,0.05)'; rr(bx, by, bw, bh, 32); g.fill();
    const pts = (s.pts || []).filter(p => isFinite(p[0]) && isFinite(p[1]));
    if (pts.length >= 2) {
      let a0 = 90, a1 = -90, o0 = 180, o1 = -180;
      pts.forEach(p => { a0 = Math.min(a0, p[0]); a1 = Math.max(a1, p[0]); o0 = Math.min(o0, p[1]); o1 = Math.max(o1, p[1]); });
      const k = Math.cos((a0 + a1) / 2 * Math.PI / 180), w = Math.max((o1 - o0) * k, 1e-5), h = Math.max(a1 - a0, 1e-5), pad = 60, S = Math.min((bw - 2 * pad) / w, (bh - 2 * pad) / h);
      const ox = bx + (bw - w * S) / 2, oy = by + (bh - h * S) / 2, X = p => ox + (p[1] - o0) * k * S, Y = p => oy + (a1 - p[0]) * S;
      g.lineJoin = 'round'; g.lineCap = 'round'; g.lineWidth = 11;
      for (let i = 1; i < pts.length; i++) { const sa = ridePtSpd(pts[i - 1]), sb = ridePtSpd(pts[i]); g.strokeStyle = (sa != null || sb != null) ? rideSpeedColor(sa != null && sb != null ? (sa + sb) / 2 : (sb != null ? sb : sa)) : ac; g.beginPath(); g.moveTo(X(pts[i - 1]), Y(pts[i - 1])); g.lineTo(X(pts[i]), Y(pts[i])); g.stroke(); }
      const dot = (p, col) => { g.fillStyle = col; g.strokeStyle = '#fff'; g.lineWidth = 6; g.beginPath(); g.arc(X(p), Y(p), 15, 0, Math.PI * 2); g.fill(); g.stroke(); };
      dot(pts[0], '#22c55e'); dot(pts[pts.length - 1], '#ef4444');
    }
    [[rideDistTxt(s.dist), 'mesafe'], [rideFmtTime(s.time), 'süre'], [rideSpdTxt(s.avg), 'ort. hız'], [rideSpdTxt(s.max), 'en yüksek']].forEach((st, i) => {
      const x = 60 + (i % 2) * 490, y = 845 + Math.floor(i / 2) * 130; g.fillStyle = 'rgba(255,255,255,0.06)'; rr(x, y, 470, 114, 26); g.fill();
      g.fillStyle = '#fff'; g.font = font('800 46px'); g.fillText(st[0], x + 28, y + 62); g.fillStyle = '#94a3b8'; g.font = font('500 26px'); g.fillText(st[1], x + 28, y + 98);
    });
    const kr = rideKarneRows(s); let y = 1130;
    g.fillStyle = '#64748b'; g.font = font('700 26px'); g.fillText('NOTLAR', 60, y - 16);
    kr.rows.forEach(r => {
      g.fillStyle = 'rgba(255,255,255,0.06)'; rr(60, y, 960, 104, 26); g.fill();
      g.fillStyle = '#fff'; g.font = font('700 34px'); g.fillText(r.k, 90, y + 46);
      g.fillStyle = '#94a3b8'; g.font = font('500 24px'); g.fillText(r.t, 90, y + 82);
      g.fillStyle = 'rgba(255,255,255,0.1)'; rr(520, y + 40, 330, 18, 9); g.fill();
      g.fillStyle = r.v >= 75 ? '#22c55e' : r.v >= 60 ? '#eab308' : '#ef4444'; rr(520, y + 40, Math.max(18, 330 * Math.min(100, r.v) / 100), 18, 9); g.fill();
      g.fillStyle = '#fff'; g.font = font('800 56px'); g.textAlign = 'right'; g.fillText(rideGrade(r.v), 990, y + 70); g.textAlign = 'left';
      y += 118;
    });
    if (kr.overall != null) { g.fillStyle = ac; g.font = font('800 130px'); g.textAlign = 'center'; g.fillText(rideGrade(kr.overall), W / 2, 1810); g.fillStyle = '#94a3b8'; g.font = font('500 28px'); g.fillText('genel not · ' + kr.overall + '/100', W / 2, 1855); g.textAlign = 'left'; }
    const extra = [s.dna && s.dna.label ? 'DNA: ' + s.dna.label : '', s.ghostDelta != null ? '👻 ' + Math.abs(s.ghostDelta) + ' sn ' + (s.ghostDelta >= 0 ? 'önde' : 'geride') : ''].filter(Boolean).join('   ·   ');
    if (extra) { g.fillStyle = '#cbd5e1'; g.font = font('500 28px'); g.fillText(extra, 60, 1900); }
    return c;
  }
  async function rideShareKarne() {
    const s = ride.pendingSummary; if (!s) return;
    const c = rideKarneCanvas(s); if (!c) { toast('Karne oluşturulamadı'); return; }
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    if (!blob) { toast('Karne oluşturulamadı'); return; }
    await saveFileToast('garajim-karne-' + String(s.date || '').slice(0, 10) + '.png', 'image/png', blob, 'Sürüş karnesi');
  }

  // ---------- MÜZİK (Spotify dahil) — Android medya oturumu üzerinden, hesap/anahtar gerekmez ----------
  const mus = { open: false, peek: false, st: null, key: '', art: '', timer: null, openAt: 0 };
  function musBridge() { const N = window.GarajimNative; return N && typeof N.mediaState === 'function' ? N : null; }
  function musInit() {
    const on = rideSettings().music !== false, b = musBridge();
    document.getElementById('musOrb').classList.toggle('hidden', !(on && b));
    if (!(on && b)) { musStop(); musClose(); return; }
    musPoll();
    if (!mus.timer) mus.timer = setInterval(musPoll, 2500);
  }
  function musStop() { if (mus.timer) { clearInterval(mus.timer); mus.timer = null; } }
  function musPoll() {
    const b = musBridge(); if (!b) return;
    let st = null; try { st = JSON.parse(b.mediaState()); } catch (e) {}
    if (!st) return;
    mus.st = st;
    if (st.key && st.key !== mus.key) {                          // şarkı değişti: kapak + kısa süre göster
      mus.key = st.key; mus.art = '';
      try { const a = b.mediaArt(); mus.art = a ? 'data:image/jpeg;base64,' + a : ''; } catch (e) {}
      if (st.playing && !mus.open && rideVisible()) musOpenCard(true);
    }
    musRender();
    if (mus.open && Date.now() - mus.openAt > (mus.peek ? 4500 : 9000)) musClose();
  }
  function musRender() {
    const st = mus.st || {}, art = mus.art;
    const orb = document.getElementById('musOrb'), artEl = document.getElementById('musArt');
    orb.style.backgroundImage = art ? 'url(' + art + ')' : '';
    artEl.style.backgroundImage = art ? 'url(' + art + ')' : '';
    document.getElementById('musOrbIcon').classList.toggle('hidden', !!art);
    artEl.firstElementChild.classList.toggle('hidden', !!art);
    document.getElementById('musOrbRing').classList.toggle('hidden', !st.playing);
    document.getElementById('musPlay').innerHTML = '<i class="fa-solid ' + (st.playing ? 'fa-pause' : 'fa-play') + '"></i>';
    const note = document.getElementById('musNote');
    let t = st.title, a = st.artist || st.app;
    note.classList.add('hidden');
    if (!st.access) {
      t = 'Müzik kontrolü'; a = 'Düğmeler çalışır; şarkı adı için izin gerekir';
      note.innerHTML = '<button type="button" onclick="musAccess()" class="underline" style="color:var(--accent)">Bildirim erişimi ver</button> — Garajım\'ı listede açman yeterli.'; note.classList.remove('hidden');
    } else if (!st.session) { t = 'Çalan müzik yok'; a = 'Spotify\'ı açmak için kapağa dokun'; }
    document.getElementById('musTitle').textContent = t || '—';
    document.getElementById('musArtist').textContent = a || '';
    document.getElementById('musBar').style.width = st.dur > 0 ? Math.max(0, Math.min(100, st.pos / st.dur * 100)).toFixed(1) + '%' : '0%';
  }
  function musOpenCard(peek) { mus.open = true; mus.peek = !!peek; mus.openAt = Date.now(); document.getElementById('musCard').classList.remove('hidden'); musRender(); }
  function musClose() { mus.open = false; const c = document.getElementById('musCard'); if (c) c.classList.add('hidden'); }
  function musToggleCard() { if (mus.open) musClose(); else { musPoll(); musOpenCard(false); } }
  function musCmd(c) {
    const b = musBridge(); if (!b) return;
    try { b.mediaCmd(c); } catch (e) {}
    mus.openAt = Date.now(); mus.peek = false;
    try { if (navigator.vibrate) navigator.vibrate(15); } catch (e) {}
    if (c === 'toggle' && mus.st) { mus.st.playing = !mus.st.playing; musRender(); }
    setTimeout(musPoll, 450);
  }
  function musAccess() { const b = musBridge(); if (b) { try { b.mediaOpenAccess(); } catch (e) {} toast('Listede Garajım\'ı aç ve izin ver, sonra geri dön'); } }
  function musApp() { const b = musBridge(); if (b) { try { b.mediaOpenApp(); } catch (e) {} } }
  function rideToggleMusic() {
    const on = rideSettings().music === false;
    rideSaveSettings({ music: on });
    document.getElementById('rideMusicToggle').textContent = on ? 'Açık' : 'Kapalı';
    musInit();
  }

  // ---------- PARK YERİM ----------
  const PARK_KEY = 'garaj_parking';
  const parkGet = () => { try { return JSON.parse(localStorage.getItem(PARK_KEY) || 'null'); } catch { return null; } };
  function parkSyncNative(p) {
    if (!p || !Number.isFinite(Number(p.lat)) || !Number.isFinite(Number(p.lng))) return;
    const N = window.GarajimNative;
    if (!N || typeof N.syncParkLocation !== 'function') return;
    try { N.syncParkLocation(JSON.stringify({ lat: Number(p.lat), lng: Number(p.lng), acc: Number(p.acc) || 0, t: Number(p.t) || Date.now() })); } catch (e) {}
  }
  function parkClearNative() {
    const N = window.GarajimNative;
    if (N && typeof N.clearParkLocation === 'function') { try { N.clearParkLocation(); } catch (e) {} }
  }
  // Yükseltmeden önce telefona kaydedilmiş park yeri varsa ilk açılışta native servise kopyala.
  try { parkSyncNative(parkGet()); } catch (e) {}
  let parkMarker = null;

  // ---------- KENDİ İŞARETLERİM (harita pin) ----------
  const RIDE_PIN_KEY = 'garaj_ride_pins';
  const PIN_TYPES = {
    manzara: { n: 'Manzara', i: 'fa-mountain-sun', c: '#22c55e' },
    benzin: { n: 'Benzinlik', i: 'fa-gas-pump', c: '#f59e0b' },
    cukur: { n: 'Çukur / risk', i: 'fa-triangle-exclamation', c: '#ef4444' },
    mola: { n: 'Mola', i: 'fa-mug-hot', c: '#38bdf8' },
    diger: { n: 'Diğer', i: 'fa-location-dot', c: '#a78bfa' }
  };
  function ridePinsGet() { try { return JSON.parse(localStorage.getItem(RIDE_PIN_KEY) || '[]'); } catch { return []; } }
  function ridePinsSave(list) {
    try { localStorage.setItem(RIDE_PIN_KEY, JSON.stringify(list.slice(0, 80))); } catch (e) { toast('İşaret kaydedilemedi'); }
  }
  let ridePinLayers = [];
  function ridePinsClearLayers() {
    if (!ride.map) return;
    ridePinLayers.forEach(m => { try { ride.map.removeLayer(m); } catch (e) {} });
    ridePinLayers = [];
  }
  function ridePinsRender() {
    if (!ride.map || typeof L === 'undefined') return;
    ridePinsClearLayers();
    ridePinsGet().forEach(p => {
      const t = PIN_TYPES[p.type] || PIN_TYPES.diger;
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:34px;height:34px;border-radius:50%;background:${t.c};border:2px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.4)"><i class="fa-solid ${t.i}" style="color:#fff;font-size:13px"></i></div>`,
        iconSize: [34, 34], iconAnchor: [17, 17]
      });
      const m = L.marker([p.lat, p.lng], { icon }).addTo(ride.map);
      m.bindPopup(`<div style="min-width:140px"><b>${t.n}</b>${p.note ? '<br><span style="font-size:12px">' + String(p.note).replace(/</g, '&lt;') + '</span>' : ''}<br><button onclick="ridePinDelete('${p.id}')" style="margin-top:6px;font-size:11px;color:#ef4444">Sil</button></div>`);
      ridePinLayers.push(m);
    });
  }
  function ridePinPrompt() {
    if (!ride.last && !ride.marker) { toast('Önce konum alınsın'); return; }
    const ll = ride.last || (ride.marker ? ride.marker.getLatLng() : null);
    if (!ll) { toast('Konum yok'); return; }
    const choices = Object.entries(PIN_TYPES).map(([k, v], i) => (i + 1) + ') ' + v.n).join('\n');
    const ans = prompt('İşaret türü:\n' + choices + '\n\nNumara yaz (1-5):');
    if (ans == null) return;
    const idx = parseInt(ans, 10);
    const keys = Object.keys(PIN_TYPES);
    const type = keys[(idx >= 1 && idx <= keys.length) ? idx - 1 : 4];
    const note = prompt('Not (isteğe bağlı):') || '';
    const list = ridePinsGet();
    list.unshift({ id: 'p_' + Date.now().toString(36), type, lat: ll.lat, lng: ll.lng, note: note.slice(0, 80), date: new Date().toISOString() });
    ridePinsSave(list);
    ridePinsRender();
    toast((PIN_TYPES[type] || PIN_TYPES.diger).n + ' işareti eklendi');
  }
  function ridePinDelete(id) {
    const list = ridePinsGet().filter(p => p.id !== id);
    ridePinsSave(list);
    ridePinsRender();
    toast('İşaret silindi');
  }
  function parkBearing(a, b) {
    const r = x => x * Math.PI / 180, y = Math.sin(r(b.lng - a.lng)) * Math.cos(r(b.lat));
    const x = Math.cos(r(a.lat)) * Math.sin(r(b.lat)) - Math.sin(r(a.lat)) * Math.cos(r(b.lat)) * Math.cos(r(b.lng - a.lng));
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }
  function parkDirTxt(deg) { return ['kuzey', 'kuzeydoğu', 'doğu', 'güneydoğu', 'güney', 'güneybatı', 'batı', 'kuzeybatı'][Math.round(deg / 45) % 8]; }
  function parkAgo(t) {
    const m = Math.round((Date.now() - t) / 60000);
    return m < 1 ? 'az önce' : m < 60 ? m + ' dk önce' : m < 1440 ? Math.round(m / 60) + ' sa önce' : Math.round(m / 1440) + ' gün önce';
  }
  function parkRenderMarker() {
    if (!ride.map || typeof L === 'undefined') return;
    if (parkMarker) { try { ride.map.removeLayer(parkMarker); } catch (e) {} parkMarker = null; }
    const p = parkGet();
    if (!p) return;
    parkMarker = L.marker([p.lat, p.lng], {
      icon: L.divIcon({ className: '', html: '<div style="width:34px;height:34px;border-radius:10px;background:#2563eb;border:2px solid #fff;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;box-shadow:0 2px 10px #0008">P</div>', iconSize: [34, 34], iconAnchor: [17, 17] }),
      zIndexOffset: 500
    }).addTo(ride.map);
    parkMarker.on('click', parkOpen);
  }
  function parkSave() {
    if (!navigator.geolocation) { toast('Konum desteklenmiyor'); return; }
    toast('Konum alınıyor…');
    navigator.geolocation.getCurrentPosition(pos => {
      const c = pos.coords;
      const p = { lat: c.latitude, lng: c.longitude, acc: c.accuracy, t: Date.now(), vehicleId: ride.vehicleId || (vehicles[0] && vehicles[0].id) || null };
      try { localStorage.setItem(PARK_KEY, JSON.stringify(p)); } catch (e) { toast('Kaydedilemedi'); return; }
      parkSyncNative(p);
      parkRenderMarker();
      toast('Park yeri kaydedildi' + (c.accuracy > 60 ? ' (±' + Math.round(c.accuracy) + ' m — zayıf sinyal)' : ''));
      parkOpen();
    }, () => toast('Konum alınamadı — GPS ve konum iznini kontrol et'), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }
  function parkOpen() {
    const p = parkGet(), body = document.getElementById('parkBody');
    const btn = (cls, fn, ic, t) => '<button onclick="' + fn + '" class="w-full py-3 rounded-2xl font-semibold text-sm ' + cls + '"><i class="fa-solid ' + ic + ' mr-2"></i>' + t + '</button>';
    if (!p) {
      body.innerHTML = '<p class="text-sm text-slate-400 mb-4">Henüz park yeri kaydetmedin. Aracından inince bir dokunuşla bulunduğun yeri kaydet; sonra haritada ve yön tarifiyle geri dön.</p>' + btn('btn-red text-white', 'parkSave()', 'fa-location-dot', 'Burayı park yeri yap');
    } else {
      let dist = '';
      const me = ride.marker ? ride.marker.getLatLng() : null;
      if (me) {
        const d = rideHav({ lat: me.lat, lng: me.lng }, p);
        dist = '<p class="text-3xl font-extrabold text-blue-400">' + (d < 1000 ? Math.round(d) + ' m' : (d / 1000).toFixed(1) + ' km') + '</p><p class="text-xs text-slate-400 mb-3">' + parkDirTxt(parkBearing({ lat: me.lat, lng: me.lng }, p)) + ' yönünde</p>';
      } else dist = '<p class="text-xs text-slate-400 mb-3">Mesafe için konum bekleniyor</p>';
      body.innerHTML = dist + '<p class="text-xs text-slate-500 mb-4">Kaydedildi: ' + parkAgo(p.t) + (p.acc ? ' · ±' + Math.round(p.acc) + ' m' : '') + '</p><div class="space-y-2">' +
        btn('bg-blue-600 text-white', 'parkNavigate()', 'fa-person-walking', 'Yön tarifi (yürüyerek)') +
        btn('bg-white/5 text-slate-200', 'parkShow()', 'fa-map-pin', 'Haritada göster') +
        btn('bg-white/5 text-slate-200', 'parkSave()', 'fa-location-dot', 'Buraya park ettim (güncelle)') +
        btn('bg-white/5 text-red-400', 'parkDelete()', 'fa-trash', 'Park yerini sil') + '</div>';
    }
    document.getElementById('parkModal').classList.remove('hidden');
  }
  function parkClose() { document.getElementById('parkModal').classList.add('hidden'); }
  function parkShow() {
    const p = parkGet(); parkClose();
    if (p && ride.map) { ride.cam = 'free'; rideUpdateCamHint(); ride.map.setView([p.lat, p.lng], 17); }
  }
  function parkNavigate() {
    const p = parkGet();
    if (p) openExternal('https://www.google.com/maps/dir/?api=1&destination=' + p.lat + ',' + p.lng + '&travelmode=walking');
  }
  function parkDelete() {
    if (!confirm('Park yeri silinsin mi?')) return;
    try { localStorage.removeItem(PARK_KEY); } catch (e) {}
    parkClearNative();
    parkRenderMarker(); parkClose(); toast('Park yeri silindi');
  }

  // ---------- KADRAN (KİLOMETRE) OKUMA ----------
  let odoTarget = null;
  function odoScan(targetId) {
    odoTarget = targetId;
    const f = document.getElementById('odoFile'); f.value = ''; f.click();
  }
  function odoAgain() { if (odoTarget) odoScan(odoTarget); }
  function odoClose() { document.getElementById('odoModal').classList.add('hidden'); }
  function odoLoadImage(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => { res({ img, url }); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('image')); };
      img.src = url;
    });
  }
  // Gri tonlama + kontrast germe; ışıklı (koyu zemin) ve mekanik (açık zemin) kadranlar için normal + ters kopya
  function odoPrepare(img) {
    const w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height;
    const k = Math.min(1600 / Math.max(w0, h0), 3), w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
    const mk = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const a = mk(), g = a.getContext && a.getContext('2d');
    if (!g) return [img];
    g.drawImage(img, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h), px = d.data, hist = new Uint32Array(256);
    for (let i = 0; i < px.length; i += 4) { const y = Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]); px[i] = y; hist[y]++; }
    const total = w * h; let lo = 0, hi = 255, acc = 0;
    for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= total * 0.02) { lo = i; break; } }
    acc = 0; for (let i = 255; i >= 0; i--) { acc += hist[i]; if (acc >= total * 0.02) { hi = i; break; } }
    if (hi - lo < 20) { lo = 0; hi = 255; }
    const norm = new Uint8ClampedArray(total);
    for (let i = 0, p = 0; i < px.length; i += 4, p++) norm[p] = Math.max(0, Math.min(255, (px[i] - lo) * 255 / (hi - lo)));
    const out = [false, true].map(inv => {
      const c = mk(), gc = c.getContext('2d'), id = gc.createImageData(w, h), q = id.data;
      for (let i = 0, p = 0; i < q.length; i += 4, p++) { const v = inv ? 255 - norm[p] : norm[p]; q[i] = q[i + 1] = q[i + 2] = v; q[i + 3] = 255; }
      gc.putImageData(id, 0, 0); return c;
    });
    return out;
  }
  // OCR çıktılarından olası kilometre değerlerini sırala (mevcut km'ye yakın ve büyük olanlar öne)
  function odoCandidates(datas, cur) {
    const map = new Map();
    const add = (txt, conf) => {
      const dg = String(txt || '').replace(/\D/g, '');
      if (dg.length < 3 || dg.length > 7) return;
      const n = Number(dg), sc = (Number(conf) || 50) + dg.length * 3, o = map.get(n);
      if (!o || sc > o.score) map.set(n, { n, score: sc });
    };
    datas.forEach(d => {
      (d.words || []).forEach(w => add(w.text, w.confidence));
      (d.lines || []).forEach(l => add(l.text, l.confidence));
      String(d.text || '').split(/\n+/).forEach(t => add(t, 40));
    });
    cur = Number(cur) || 0;
    if (cur > 0) {                                           // baştaki/sondaki yanlış okunan rakamı atınca mantıklı aralığa giriyorsa onu da aday yap
      const inRange = x => x >= cur - 20 && x <= cur + 20000;
      [...map.values()].forEach(o => {
        const dg = String(o.n);
        if (inRange(o.n) || dg.length < 5) return;
        [Number(dg.slice(1)), Math.floor(o.n / 10)].forEach(alt => { if (inRange(alt) && !map.has(alt)) map.set(alt, { n: alt, score: o.score - 5 }); });
      });
    }
    return [...map.values()].map(o => {
      let sc = o.score;
      if (cur > 0) sc += (o.n >= cur - 20 && o.n <= cur + 20000) ? 120 - Math.min(100, Math.abs(o.n - cur) / 200) : -40;
      return { n: o.n, sc };
    }).sort((a, b) => b.sc - a.sc).slice(0, 4).map(o => o.n);
  }
  async function odoRun(file) {
    const modal = document.getElementById('odoModal'), status = document.getElementById('odoStatus'), chips = document.getElementById('odoChips'), prev = document.getElementById('odoPreview');
    chips.innerHTML = ''; status.textContent = 'Görüntü hazırlanıyor…'; modal.classList.remove('hidden');
    if (typeof Tesseract === 'undefined') { status.textContent = 'Okuma motoru yüklenemedi — rakamı elle yaz.'; return; }
    let url = null;
    try {
      const loaded = await odoLoadImage(file); url = loaded.url;
      prev.src = url; prev.classList.remove('hidden');
      const variants = odoPrepare(loaded.img);
      status.textContent = 'Rakamlar okunuyor…';
      const worker = await Tesseract.createWorker('eng', 1, Object.assign({ logger: () => {} }, window.TESS_OPTS || {}));
      let results = [];
      try {
        await worker.setParameters({ tessedit_char_whitelist: '0123456789', tessedit_pageseg_mode: '11' });
        for (const c of variants) { const r = await worker.recognize(c); results.push(r.data); }
      } finally { try { await worker.terminate(); } catch (e) {} }
      const v = (typeof currentId !== 'undefined' && currentId) ? vehicles.find(x => x.id === currentId) : null;
      const cur = Number(v && v.km) || 0, cands = odoCandidates(results, cur);
      if (!cands.length) { status.textContent = 'Rakam bulunamadı. Kadranı daha yakından, parlama olmadan çekip tekrar dene.'; return; }
      status.textContent = 'Doğru olanı seç (okunan değeri mutlaka kontrol et):';
      chips.innerHTML = cands.map(n => {
        const diff = cur > 0 ? n - cur : null, bad = diff != null && diff < -20;
        return `<button type="button" onclick="odoPick(${n})" class="px-4 py-2.5 rounded-xl border ${bad ? 'border-red-500/40 text-red-300' : 'border-white/15 text-white'} bg-white/5 text-left"><span class="font-bold text-base">${n.toLocaleString('tr-TR')} km</span>${diff == null ? '' : `<span class="block text-[10px] ${bad ? 'text-red-400' : 'text-slate-400'}">${bad ? 'mevcut KM\'den küçük' : (diff >= 0 ? '+' : '') + diff.toLocaleString('tr-TR') + ' km'}</span>`}</button>`;
      }).join('');
    } catch (e) {
      status.textContent = 'Okunamadı. Fotoğraf açık ve net olsun ya da rakamı elle yaz.';
    } finally { if (url) setTimeout(() => URL.revokeObjectURL(url), 3000); }
  }
  function odoPick(n) {
    const el = odoTarget && document.getElementById(odoTarget);
    if (el) { el.value = String(n); el.dispatchEvent(new Event('input', { bubbles: true })); }
    odoClose(); toast('KM yazıldı — kontrol edip kaydet');
  }
  document.getElementById('odoFile').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) odoRun(f); });

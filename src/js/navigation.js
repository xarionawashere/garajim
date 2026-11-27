// Route search and turn-by-turn navigation.
// Classic script: globals are shared with other files in index.html's intentional load order.
function nvText(m, name) {
    const t = String(m.type || '').toLowerCase(), mod = String(m.modifier || '').toLowerCase();
    const exit = Number(m.exit);
    const roundabout = ['roundabout', 'rotary', 'roundabout turn', 'exit roundabout', 'roundabout exit'].includes(t)
      || (Number.isFinite(exit) && exit > 0);
    let b;
    if (t === 'depart') b = 'Yola çık';
    else if (t === 'arrive') b = 'Varış noktasına ulaştın' + (mod === 'left' ? ' (solda)' : mod === 'right' ? ' (sağda)' : '');
    else if (roundabout) b = 'Göbekten ' + (Number.isFinite(exit) && exit > 0 ? Math.floor(exit) : 1) + '. çıkıştan devam et';
    else if (t === 'fork') b = mod.includes('left') ? 'Çatalda sola tut' : mod.includes('right') ? 'Çatalda sağa tut' : 'Çatalda düz devam et';
    else if (t === 'end of road') b = 'Yolun sonunda ' + (NV_MOD[mod] || 'dön');
    else if (t === 'merge') b = 'Yola katıl';
    else if (t === 'on ramp') b = 'Rampaya gir';
    else if (t === 'off ramp') b = 'Rampadan çık';
    else if (t === 'continue' || t === 'new name') b = !mod || mod === 'straight' ? 'Düz devam et' : (NV_MOD[mod] || 'Devam et');
    else b = NV_MOD[mod] || 'Devam et';
    b = b.charAt(0).toLocaleUpperCase('tr-TR') + b.slice(1);
    return name ? b + ' · ' + name : b;
  }
  function nvRot(m) { const r = { 'uturn': 180, 'sharp right': 135, 'right': 90, 'slight right': 45, 'straight': 0, 'slight left': -45, 'left': -90, 'sharp left': -135 }[m.modifier]; return r == null ? 0 : r; }
  const nvFmtDist = m => m < 1000 ? Math.max(10, Math.round(m / 10) * 10) + ' m' : (m / 1000).toFixed(1) + ' km';
  const nvFmtTime = sec => { const m = Math.max(1, Math.round(sec / 60)); return m < 60 ? m + ' dk' : Math.floor(m / 60) + ' sa ' + (m % 60) + ' dk'; };
  function nvSpeak(t) {
    if (!nv.speak || !t) return;
    try {
      const N = window.GarajimNative;
      if (N && typeof N.speakNavigation === 'function') { N.speakNavigation(String(t)); return; }
      const synth = window.speechSynthesis, Utterance = window.SpeechSynthesisUtterance;
      if (!synth || !Utterance) return;
      synth.cancel();
      const u = new Utterance(String(t)); u.lang = 'tr-TR'; u.rate = 1; u.volume = 1;
      if (typeof synth.resume === 'function') synth.resume();
      synth.speak(u);
    } catch (e) {}
  }
  function nvToggleVoice() {
    nv.speak = !nv.speak;
    const b = document.getElementById('navVoiceBtn');
    if (b) { b.innerHTML = '<i class="fa-solid ' + (nv.speak ? 'fa-volume-high' : 'fa-volume-xmark') + '"></i>'; b.setAttribute('aria-label', nv.speak ? 'Sesli yönlendirmeyi kapat' : 'Sesli yönlendirmeyi aç'); }
    nvPersistSession(true);
    toast(nv.speak ? 'Sesli yönlendirme açık' : 'Sesli yönlendirme kapalı');
  }
  async function nvFetch(url) {
    const ac = new AbortController(), to = setTimeout(() => ac.abort(), 15000);
    try { const r = await fetch(url, { signal: ac.signal, cache: 'default' }); if (!r.ok) throw new Error('http ' + r.status); return await r.json(); } finally { clearTimeout(to); }
  }
  function nvGeocodeCacheGet(key) {
    try { const c = JSON.parse(localStorage.getItem(NV_GEOCODE_CACHE_KEY) || '{}'), x = c[key]; return x && Date.now() - Number(x.at) < 30 * 86400000 && Array.isArray(x.data) ? x.data : null; } catch (e) { return null; }
  }
  function nvGeocodeCachePut(key, data) {
    try { const c = JSON.parse(localStorage.getItem(NV_GEOCODE_CACHE_KEY) || '{}'); c[key] = { at: Date.now(), data }; const keys = Object.keys(c).sort((a,b) => Number(c[a].at || 0) - Number(c[b].at || 0)); while (keys.length > 30) delete c[keys.shift()]; localStorage.setItem(NV_GEOCODE_CACHE_KEY, JSON.stringify(c)); } catch (e) {}
  }
  async function nvNominatimSearch(q, url, origin) {
    const key = String(q).toLocaleLowerCase('tr-TR').trim() + '@' + (origin ? Number(origin.lat).toFixed(2)+','+Number(origin.lng).toFixed(2) : 'any');
    const cached = nvGeocodeCacheGet(key); if (cached) return cached;
    // Public Nominatim is capacity-limited: serialize live searches and leave >=1.1s between requests.
    const work = async () => {
      const last = Number(localStorage.getItem('garaj_nav_geocode_last_at') || 0);
      const wait = Math.max(0, 1100 - (Date.now() - Math.max(last, nv._lastGeocodeAt || 0)));
      if (wait) await new Promise(resolve => setTimeout(resolve, wait));
      nv._lastGeocodeAt = Date.now();
      try { localStorage.setItem('garaj_nav_geocode_last_at', String(nv._lastGeocodeAt)); } catch (e) {}
      const data = await nvFetch(url);
      const rows = Array.isArray(data) ? data.slice(0, 6) : [];
      nvGeocodeCachePut(key, rows);
      return rows;
    };
    const task = nv.geocodeQueue.then(work, work);
    nv.geocodeQueue = task.catch(() => {});
    return task;
  }
  function nvBuild(r) {
    const raw = r && r.geometry && Array.isArray(r.geometry.coordinates) ? r.geometry.coordinates : [];
    const pts = raw.filter(c => Array.isArray(c) && Number.isFinite(Number(c[0])) && Number.isFinite(Number(c[1])) && Math.abs(Number(c[0])) <= 180 && Math.abs(Number(c[1])) <= 90).map(c => [Number(c[1]), Number(c[0])]);
    if (pts.length < 2) throw new Error('route geometry empty');
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + rideHav({ lat: pts[i - 1][0], lng: pts[i - 1][1] }, { lat: pts[i][0], lng: pts[i][1] }));
    const steps = []; let from = 0;
    ((r.legs && r.legs[0] && r.legs[0].steps) || []).forEach(st => {
      if (!st || !st.maneuver || !Array.isArray(st.maneuver.location)) return;
      const loc = st.maneuver.location, ll = { lat: Number(loc[1]), lng: Number(loc[0]) }; if (!Number.isFinite(ll.lat) || !Number.isFinite(ll.lng)) return;
      let bi = from, bd = 1e12;
      for (let j = from; j < pts.length; j++) { const d = rideHav(ll, { lat: pts[j][0], lng: pts[j][1] }); if (d < bd) { bd = d; bi = j; } }
      from = bi;
      steps.push({ vtx: bi, text: nvText(st.maneuver, String(st.name || '').trim()), rot: nvRot(st.maneuver), type: String(st.maneuver.type || ''), distance: Number(st.distance) || 0, duration: Number(st.duration) || 0 });
    });
    if (!steps.length || steps[steps.length - 1].type !== 'arrive') steps.push({ vtx: pts.length - 1, text: 'Varış noktasına ulaştın', rot: 0, type: 'arrive', distance: 0, duration: 0 });
    return { pts, cum, steps, total: cum[cum.length - 1] || Number(r.distance) || 0, dur: Math.max(0, Number(r.duration) || 0), dist: Math.max(0, Number(r.distance) || cum[cum.length - 1] || 0) };
  }
  function nvRouteFromSaved(o) {
    if (!o || !Array.isArray(o.pts) || o.pts.length < 2 || o.pts.length > 16000 || !Array.isArray(o.steps)) return null;
    const pts = o.pts.filter(p => Array.isArray(p) && p.length >= 2 && Number.isFinite(Number(p[0])) && Number.isFinite(Number(p[1])) && Math.abs(Number(p[0])) <= 90 && Math.abs(Number(p[1])) <= 180).map(p => [Number(p[0]), Number(p[1])]);
    if (pts.length < 2) return null;
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + rideHav({lat:pts[i-1][0],lng:pts[i-1][1]}, {lat:pts[i][0],lng:pts[i][1]}));
    const steps = o.steps.filter(x => x && Number.isFinite(Number(x.vtx))).map(x => ({vtx:Math.min(pts.length-1,Math.max(0,Math.round(Number(x.vtx)))),text:String(x.text || 'Devam et').slice(0,180),rot:Number(x.rot)||0,type:String(x.type||''),distance:Number(x.distance)||0,duration:Number(x.duration)||0}));
    if (!steps.length) steps.push({vtx:pts.length-1,text:'Varış noktasına ulaştın',rot:0,type:'arrive'});
    return {pts,cum,steps,total:cum[cum.length-1]||Number(o.total)||0,dur:Math.max(0,Number(o.dur)||0),dist:Math.max(0,Number(o.dist)||cum[cum.length-1]||0)};
  }
  function nvPushWearNavigation(active, route, at) {
    try {
      const N = window.GarajimNative;
      if (!N || typeof N.syncWearNavigation !== 'function') return;
      const now = Number(at) || Date.now();
      if (!active || !route || !nv.dest) {
        N.syncWearNavigation(JSON.stringify({ active: false, syncedAt: now }));
        return;
      }
      const along = Math.max(0, Number(nv.along) || 0);
      let stepIndex = route.steps.findIndex(st => route.cum[Math.min(st.vtx, route.cum.length - 1)] > along + 8);
      if (stepIndex < 0) stepIndex = route.steps.length - 1;
      const step = route.steps[stepIndex] || { text: 'Rotayı takip et', vtx: route.pts.length - 1, rot: 0 };
      const stepDistance = Math.max(0, (route.cum[Math.min(step.vtx, route.cum.length - 1)] || 0) - along);
      const remaining = Math.max(0, route.total - along);
      const start = Math.min(route.pts.length - 1, Math.max(0, Number(nv.idx) || 0));
      const path = route.pts.slice(start);
      const current = nvOrigin();
      if (current && Number.isFinite(current.lat) && Number.isFinite(current.lng)) {
        const first = path[0];
        if (!first || rideHav({ lat: current.lat, lng: current.lng }, { lat: first[0], lng: first[1] }) > 8) path.unshift([current.lat, current.lng]);
      }
      const cap = 32, compact = [];
      for (let i = 0; i < Math.min(cap, path.length); i++) {
        const index = path.length <= cap ? i : Math.round(i * (path.length - 1) / (cap - 1));
        const p = path[index];
        if (p && compact.length < cap) compact.push([Number(p[0]), Number(p[1])]);
      }
      N.syncWearNavigation(JSON.stringify({
        active: true, syncedAt: now, destination: String(nv.dest.name || 'Hedef').slice(0, 80),
        routeJson: JSON.stringify(compact), instruction: String(step.text || 'Rotayı takip et').slice(0, 100),
        stepDistanceM: stepDistance, remainingM: remaining, rotation: Number(step.rot) || 0,
        etaSec: route.total > 0 ? Math.max(0, Math.round(route.dur * remaining / route.total)) : 0
      }));
    } catch (e) {}
  }
  function nvPersistSession(force) {
    if (!nv.active || !nv.route || !nv.dest) return false;
    const now = Date.now(); if (!force && now - (nv.lastPersistAt || 0) < 5000) return true;
    try {
      const r = nv.route;
      const row = { version: 1, savedAt: now, dest: { name: String(nv.dest.name || 'Hedef').slice(0,120), lat: Number(nv.dest.lat), lng: Number(nv.dest.lng) }, route: { pts: r.pts.map(p => [Number(p[0].toFixed(5)), Number(p[1].toFixed(5))]), steps: r.steps.map(st => ({vtx:st.vtx,text:st.text,rot:st.rot,type:st.type,distance:st.distance||0,duration:st.duration||0})), total:r.total,dur:r.dur,dist:r.dist }, idx: nv.idx, along: nv.along, speak: nv.speak };
      localStorage.setItem(NV_SESSION_KEY, JSON.stringify(row)); nv.lastPersistAt = now; nvPushWearNavigation(true, r, now); return true;
    } catch (e) { return false; }
  }
  function nvLoadSession() {
    try {
      const row = JSON.parse(localStorage.getItem(NV_SESSION_KEY) || 'null');
      if (!row || row.version !== 1 || !row.dest || !Number.isFinite(Number(row.dest.lat)) || !Number.isFinite(Number(row.dest.lng)) || Date.now() - Number(row.savedAt || 0) > NV_SESSION_MAX_AGE || Date.now() < Number(row.savedAt || 0)) { localStorage.removeItem(NV_SESSION_KEY); return null; }
      const route = nvRouteFromSaved(row.route); if (!route) { localStorage.removeItem(NV_SESSION_KEY); return null; }
      return { ...row, route, idx: Math.min(route.pts.length-2,Math.max(0,Number(row.idx)||0)), along:Math.max(0,Number(row.along)||0) };
    } catch (e) { try { localStorage.removeItem(NV_SESSION_KEY); } catch (x) {} return null; }
  }
  function nvRenderResume() {
    const el = document.getElementById('nvResume'); if (!el) return;
    const saved = !nv.active ? nvLoadSession() : null; nv.resumeCandidate = saved;
    if (!saved) { el.classList.add('hidden'); el.innerHTML = ''; return; }
    el.classList.remove('hidden');
    el.innerHTML = '<div class="rounded-2xl border border-accent/30 bg-accent/10 p-3"><div class="flex items-start gap-2"><i class="fa-solid fa-route text-accent mt-1"></i><div class="min-w-0 flex-1"><p class="text-sm font-bold">Devam eden navigasyon</p><p class="text-xs text-slate-400 mt-1 truncate">'+rideEsc(saved.dest.name)+'</p><p class="text-[10px] text-slate-500 mt-1">'+nvFmtDist(Math.max(0,saved.route.total-saved.along))+' yaklaşık kaldı · konum doğrulanınca yönlendirme yenilenir.</p></div></div><div class="grid grid-cols-2 gap-2 mt-3"><button type="button" onclick="nvResumeSession()" class="py-2.5 rounded-xl btn-red text-white text-xs font-bold">Devam et</button><button type="button" onclick="nvDiscardSession()" class="py-2.5 rounded-xl bg-white/5 text-slate-300 text-xs">Oturumu sil</button></div></div>';
  }
  function nvResumeSession() {
    const saved = nv.resumeCandidate || nvLoadSession(); if (!saved) { toast('Devam edilecek rota bulunamadı'); nvRenderResume(); return; }
    nv.dest = saved.dest; nv.routes = [saved.route]; nv.sel = 0; nv.resumeState = saved; nv.speak = saved.speak !== false;
    const b = document.getElementById('navVoiceBtn'); if (b) b.innerHTML = '<i class="fa-solid '+(nv.speak?'fa-volume-high':'fa-volume-xmark')+'"></i>';
    nvRenderRoutes(); nvStart(true);
  }
  function nvDiscardSession() { try { localStorage.removeItem(NV_SESSION_KEY); } catch (e) {} nv.resumeCandidate = null; nvRenderResume(); toast('Kaydedilmiş navigasyon silindi'); }
  function nvOrigin() {
    const last = ride.last;
    if (last && Number.isFinite(Number(last.lat)) && Number.isFinite(Number(last.lng))) return {lat:Number(last.lat),lng:Number(last.lng),t:Number(last.t)||Date.now(),acc:Number(last.acc)||null};
    const m = ride.marker ? ride.marker.getLatLng() : null;
    return m ? {lat:m.lat,lng:m.lng,t:0,acc:null} : null;
  }
  async function nvFreshOrigin() {
    const cached = nvOrigin();
    if (cached && cached.t && Date.now()-cached.t < 15000 && (!cached.acc || cached.acc <= 75)) return cached;
    if (!navigator.geolocation || typeof navigator.geolocation.getCurrentPosition !== 'function') return cached && cached.t && Date.now()-cached.t < 45000 && (!cached.acc || cached.acc <= 90) ? cached : null;
    return new Promise(resolve => {
      let done = false; const finish = v => { if (done) return; done = true; resolve(v); };
      try {
        navigator.geolocation.getCurrentPosition(pos => {
          try { ride.gotFix = true; rideApplyPos(pos, false); } catch (e) {}
          const c = pos.coords || {}, at = Number(pos.timestamp) || Date.now(), acc = Number(c.accuracy);
          if (Number.isFinite(c.latitude) && Number.isFinite(c.longitude) && (!Number.isFinite(acc) || acc <= 100)) finish({lat:Number(c.latitude),lng:Number(c.longitude),t:at,acc:Number.isFinite(acc)?acc:null});
          else finish(null);
        }, () => finish(cached && cached.t && Date.now()-cached.t < 45000 && (!cached.acc || cached.acc <= 90) ? cached : null), {enableHighAccuracy:true,timeout:12000,maximumAge:5000});
      } catch (e) { finish(cached && cached.t && Date.now()-cached.t < 45000 && (!cached.acc || cached.acc <= 90) ? cached : null); }
      setTimeout(() => finish(cached && cached.t && Date.now()-cached.t < 45000 && (!cached.acc || cached.acc <= 90) ? cached : null), 12500);
    });
  }
  function nvClose() { document.getElementById('navModal').classList.add('hidden'); }
  function nvOpen() {
    if (!ride.map) { toast('Önce Açık Dünya ekranını aç'); return; }
    const p = parkGet(), pins = (typeof ridePinsGet === 'function' ? ridePinsGet() : []).slice(0, 3);
    let rec = []; try { rec = JSON.parse(localStorage.getItem(NV_RECENT) || '[]'); } catch (e) {}
    const quick = [];
    if (p) quick.push({ name: '🅿️ Park yerim', lat: p.lat, lng: p.lng });
    pins.forEach(x => quick.push({ name: '📍 ' + (x.note || x.type || 'İşaret'), lat: x.lat, lng: x.lng }));
    rec.slice(0, Math.max(0,5-quick.length)).forEach(x => quick.push({ name: '🕘 ' + x.name, lat: x.lat, lng: x.lng }));
    nv.list = quick;
    document.getElementById('nvQuick').innerHTML = (quick.length ? '<div class="flex gap-2 overflow-x-auto pb-1">' + quick.map((q,i)=>'<button type="button" onclick="nvGoIdx('+i+')" class="shrink-0 max-w-[210px] px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs truncate">'+rideEsc(q.name.slice(0,32))+'</button>').join('') + '</div>' : '<p class="text-[11px] text-slate-500">Henüz hızlı hedef yok. Adres arayabilir veya haritadan seçebilirsin.</p>') + '<button type="button" onclick="nvPickMap()" class="mt-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs"><i class="fa-solid fa-hand-pointer mr-1"></i>Haritadan hedef seç</button>';
    document.getElementById('nvResults').innerHTML = ''; document.getElementById('nvRoutes').innerHTML = '';
    nvRenderResume();
    document.getElementById('navModal').classList.remove('hidden');
  }
  async function nvSearch() {
    const q = (document.getElementById('nvQ').value || '').trim(), box = document.getElementById('nvResults');
    if (q.length < 2) { box.innerHTML = '<p class="text-xs text-slate-500 py-2">En az iki karakter yaz.</p>'; return; }
    if (navigator.onLine === false) { toast('İnternet yok — adres araması yapılamaz'); box.innerHTML = '<p class="text-xs text-red-400 py-2">İnternet bağlantısı gerekli.</p>'; return; }
    const seq = ++nv.geocodeSeq; box.innerHTML = '<p class="text-xs text-slate-500 py-2">Aranıyor…</p>';
    try {
      const o = nvOrigin(); let vb = '';
      if (o) vb = '&viewbox=' + (o.lng - 1.5) + ',' + (o.lat + 1.5) + ',' + (o.lng + 1.5) + ',' + (o.lat - 1.5);
      const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&accept-language=tr' + vb + '&q=' + encodeURIComponent(q);
      const data = await nvNominatimSearch(q, url, o);
      if (seq !== nv.geocodeSeq) return;
      const list = (data || []).map(x => ({ name: String(x.display_name || '').split(',').slice(0,3).join(',').trim(), full: x.display_name, lat: Number(x.lat), lng: Number(x.lon) })).filter(x => Number.isFinite(x.lat) && Number.isFinite(x.lng) && Math.abs(x.lat)<=90 && Math.abs(x.lng)<=180);
      nv.list = list;
      box.innerHTML = list.length ? list.map((x,i)=>'<button type="button" onclick="nvGoIdx('+i+')" class="w-full text-left rounded-xl bg-white/5 p-3 mb-2"><p class="text-sm font-medium">'+rideEsc(x.name)+'</p><p class="text-[11px] text-slate-500 truncate">'+rideEsc(x.full||'')+'</p></button>').join('') : '<p class="text-xs text-slate-500 py-2">Sonuç bulunamadı.</p>';
    } catch (e) { if (seq === nv.geocodeSeq) box.innerHTML = '<p class="text-xs text-red-400 py-2">Adres araması başarısız. Servis sınırı veya bağlantı sorunu olabilir; biraz sonra tekrar dene.</p>'; }
  }
  function nvPickMap() { nvClose(); toast('Hedefi belirlemek için haritada bir noktaya dokun'); ride.map.once('click', e => nvRouteTo({name:'Seçilen nokta',lat:e.latlng.lat,lng:e.latlng.lng})); }
  function nvGoIdx(i) { const d = nv.list[i]; if (d) nvRouteTo(d); }
  async function nvRouteTo(dest) {
    const box = document.getElementById('nvRoutes'); document.getElementById('navModal').classList.remove('hidden');
    if (!dest || !Number.isFinite(Number(dest.lat)) || !Number.isFinite(Number(dest.lng)) || Math.abs(Number(dest.lat))>90 || Math.abs(Number(dest.lng))>180) { box.innerHTML = '<p class="text-xs text-red-400 py-2">Hedef koordinatı geçersiz.</p>'; return; }
    if (navigator.onLine === false) { box.innerHTML = '<p class="text-xs text-red-400 py-2">İnternet yok — yeni rota hesaplanamaz.</p>'; return; }
    box.innerHTML = '<p class="text-xs text-slate-500 py-2">Güncel GPS konumu doğrulanıyor…</p>';
    const o = await nvFreshOrigin();
    if (!o) { box.innerHTML = '<p class="text-xs text-amber-400 py-2">Güvenilir GPS konumu alınamadı. Konumu açıp açık alanda tekrar dene.</p>'; return; }
    if (o.acc != null && o.acc > 75) { box.innerHTML = '<p class="text-xs text-amber-400 py-2">GPS doğruluğu ±'+Math.round(o.acc)+' m. Daha iyi sinyal bekleyip tekrar dene.</p>'; return; }
    box.innerHTML = '<p class="text-xs text-slate-500 py-2">Rota hesaplanıyor…</p>';
    try {
      const url = 'https://router.project-osrm.org/route/v1/driving/' + o.lng + ',' + o.lat + ';' + Number(dest.lng) + ',' + Number(dest.lat) + '?overview=full&geometries=geojson&steps=true&alternatives=true';
      const data = await nvFetch(url);
      if (!data || !Array.isArray(data.routes) || !data.routes.length) { box.innerHTML = '<p class="text-xs text-red-400 py-2">Araçla gidilebilir rota bulunamadı. Başka hedef noktası deneyebilir veya Google Haritalar’ı açabilirsin.</p>'; return; }
      const routes = data.routes.slice(0,3).map(nvBuild).sort((a,b)=>a.dur-b.dur);
      routes.forEach((r,i)=>{ r.isFastest = i === 0; r.isShortest = r.dist === Math.min(...routes.map(x=>x.dist)); });
      nv.dest = {name:String(dest.name||'Hedef').slice(0,120),lat:Number(dest.lat),lng:Number(dest.lng)}; nv.routes = routes; nv.sel = 0;
      try { const rec = JSON.parse(localStorage.getItem(NV_RECENT) || '[]').filter(x => !(x.lat===nv.dest.lat && x.lng===nv.dest.lng)); rec.unshift({ name:nv.dest.name,lat:nv.dest.lat,lng:nv.dest.lng }); localStorage.setItem(NV_RECENT,JSON.stringify(rec.slice(0,8))); } catch (e) {}
      nvDraw(); nvRenderRoutes();
    } catch (e) { box.innerHTML = '<p class="text-xs text-red-400 py-2">Rota servisi yanıt vermedi. İnterneti kontrol et veya biraz sonra tekrar dene.</p>'; }
  }
  function nvClearLayers() { nv.layers.forEach(l => { try { ride.map.removeLayer(l); } catch (e) {} }); nv.layers = []; }
  function nvDraw() {
    nvClearLayers(); if (!nv.routes.length) return;
    nv.routes.forEach((r,i)=>{ if (i !== nv.sel) nv.layers.push(L.polyline(r.pts,{color:'#94a3b8',weight:6,opacity:0.65}).on('click',()=>nvSelect(i)).addTo(ride.map)); });
    const r = nv.routes[nv.sel]; if (!r || !r.pts.length) return;
    nv.layers.push(L.polyline(r.pts,{color:'#fff',weight:10,opacity:0.9}).addTo(ride.map));
    const main = L.polyline(r.pts,{color:rideAccent(),weight:6,opacity:1}).addTo(ride.map); nv.layers.push(main);
    nv.layers.push(L.circleMarker(r.pts[r.pts.length-1],{radius:8,color:'#fff',weight:3,fillColor:'#ef4444',fillOpacity:1}).addTo(ride.map));
    try { ride.map.fitBounds(main.getBounds(),{padding:[48,48]}); } catch (e) {}
    ride.cam='free'; rideUpdateCamHint();
  }
  function nvSelect(i) { if (!nv.routes[i]) return; nv.sel=i; nvDraw(); nvRenderRoutes(); }
  function nvRenderRoutes() {
    const d = nv.dest, box = document.getElementById('nvRoutes'); if (!d || !nv.routes.length) return;
    const shortest = Math.min(...nv.routes.map(r=>r.dist));
    box.innerHTML = '<p class="text-xs text-slate-500 uppercase mt-3 mb-2">Rota seçenekleri · '+rideEsc(d.name.slice(0,40))+'</p>' +
      nv.routes.map((r,i)=>'<button type="button" onclick="nvSelect('+i+')" class="w-full flex items-center justify-between gap-3 rounded-xl p-3 mb-2 border '+(i===nv.sel?'border-accent bg-white/10':'border-white/10 bg-white/5')+'"><span class="text-left min-w-0"><span class="block text-sm font-semibold">Rota '+(i+1)+(r.isFastest?' · en hızlı':'')+(Math.abs(r.dist-shortest)<1?' · en kısa':'')+'</span><span class="block text-[10px] text-slate-500">Canlı trafik dahil değil</span></span><span class="text-right shrink-0"><span class="block text-sm">'+nvFmtDist(r.dist)+'</span><span class="block text-xs text-slate-400">'+nvFmtTime(r.dur)+'</span></span></button>').join('') +
      '<button type="button" onclick="nvStart()" class="w-full py-3.5 rounded-2xl btn-red text-white font-bold mt-1"><i class="fa-solid fa-play mr-2"></i>Navigasyonu başlat</button>' +
      '<button type="button" onclick="nvOpenGoogle()" class="w-full py-2.5 rounded-2xl bg-white/5 text-slate-300 text-sm mt-2"><i class="fa-brands fa-google mr-2"></i>Google Haritalar’da aç</button>';
  }
  function nvOpenGoogle() { const d=nv.dest; if(d) openExternal('https://www.google.com/maps/dir/?api=1&destination='+d.lat+','+d.lng+'&travelmode=driving'); }
  function nvStart(resuming) {
    const r = nv.routes[nv.sel]; if (!r) return;
    const saved = resuming ? (nv.resumeState || nvLoadSession()) : null;
    nv.route=r; nv.active=true; nv.idx=saved?Math.min(r.pts.length-2,Math.max(0,Number(saved.idx)||0)):0; nv.along=saved?Math.max(0,Number(saved.along)||0):0; nv.off=0; nv.said={}; nv.rerouting=false; nv.retryAt=0; nv.lastFixAt=0; nv.lastGpsReliable=false; nv.lastPersistAt=0;
    nvClose(); nvClearLayers();
    nv.layers.push(L.polyline(r.pts,{color:'#fff',weight:10,opacity:0.9}).addTo(ride.map),L.polyline(r.pts,{color:rideAccent(),weight:6,opacity:1}).addTo(ride.map));
    document.getElementById('navBanner').classList.remove('hidden');
    const mainBtn=document.getElementById('rideNavPrimaryBtn'); if(mainBtn){mainBtn.classList.add('text-accent');mainBtn.title='Navigasyon aktif';}
    ride.cam='follow'; rideUpdateCamHint(); const me=nvOrigin(); if(me) rideSetMe(me.lat,me.lng,17,ride.hasHeading?ride.heading:null); rideGhostChipPos();
    nv.resumeCandidate=null; nv.resumeState=null; nvPersistSession(true);
    nvTick(me?me.lat:r.pts[0][0],me?me.lng:r.pts[0][1],me?me.acc:null,me?me.t:Date.now(),null);
    if (!nv.active) { nvRenderResume(); return; }
    rideShowBgNotification();
    if (navigator.geolocation) rideStartWatch();
    rideBGStart().then(ok=>{ if(!ok && nv.active && isNativeApp()) { nvSetGpsStatus('Arka plan konum servisi kullanılamıyor · ekranı açık tut'); toast('Arka planda navigasyon için konum servisi başlatılamadı. Ekranı açık tut ve konum iznini kontrol et.'); } });
    nvSpeak('Navigasyon başladı. '+(r.steps[1]?r.steps[1].text:'Rotayı takip et'));
    nvRenderResume();
  }
  function nvStop() {
    nv.active=false; nv.route=null; nvPushWearNavigation(false, null, Date.now()); nvClearLayers();
    document.getElementById('navBanner').classList.add('hidden'); rideGhostChipPos();
    const mainBtn=document.getElementById('rideNavPrimaryBtn'); if(mainBtn){mainBtn.classList.remove('text-accent');mainBtn.title='Navigasyon';}
    try { localStorage.removeItem(NV_SESSION_KEY); } catch (e) {}
    try { if(window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
    try { const N = window.GarajimNative; if (N && typeof N.stopNavigationSpeech === 'function') N.stopNavigationSpeech(); } catch (e) {}
    if (!(ride.running && !ride.paused)) {
      rideBGStop(); rideHideBgNotification();
      if (!rideVisible() && ride.watchId != null) { try { navigator.geolocation.clearWatch(ride.watchId); } catch (e) {} ride.watchId=null; }
    }
    nvRenderResume();
  }
  function nvArrived() { toast('Varış noktasına ulaştın 🎉'); nvStop(); nvSpeak('Varış noktasına ulaştın'); }
  async function nvReroute(lat,lng) {
    if(nv.rerouting || Date.now()<nv.retryAt || !nv.dest || !nv.active) return;
    nv.rerouting=true; nv.retryAt=Date.now()+15000; nvSetGpsStatus('Yeni rota hesaplanıyor…'); nvSpeak('Rota dışındasın. Yeniden rota hesaplanıyor');
    try {
      const data=await nvFetch('https://router.project-osrm.org/route/v1/driving/'+lng+','+lat+';'+nv.dest.lng+','+nv.dest.lat+'?overview=full&geometries=geojson&steps=true');
      if(data&&Array.isArray(data.routes)&&data.routes[0]&&nv.active){
        const next=nvBuild(data.routes[0]); nv.route=next; nv.routes=[next]; nv.sel=0; nv.idx=0; nv.along=0; nv.off=0; nv.said={}; nv.lastRerouteAt=Date.now();
        nvClearLayers(); nv.layers.push(L.polyline(next.pts,{color:'#fff',weight:10,opacity:0.9}).addTo(ride.map),L.polyline(next.pts,{color:rideAccent(),weight:6,opacity:1}).addTo(ride.map));
        nv.retryAt=Date.now()+12000; nvPersistSession(true); nvSetGpsStatus('Rota güncellendi'); nvSpeak('Rota güncellendi');
      } else { nv.retryAt=Date.now()+20000; nvSetGpsStatus('Rota alınamadı · mevcut yön korunuyor'); }
    } catch(e) { nv.retryAt=Date.now()+20000; nvSetGpsStatus('Rota servisi yanıt vermedi · mevcut yön korunuyor'); }
    finally { nv.rerouting=false; }
  }
  function nvLocate(r,lat,lng,from) {
    const k=111320*Math.cos(lat*Math.PI/180); let best={i:Math.min(from,r.pts.length-2),along:r.cum[Math.min(from,r.pts.length-2)]||0,dist:1e12};
    const scan=(a,b)=>{ for(let i=Math.max(0,a);i<Math.min(r.pts.length-1,b);i++){
      const ax=(r.pts[i][1]-lng)*k, ay=(r.pts[i][0]-lat)*110574, bx=(r.pts[i+1][1]-lng)*k, by=(r.pts[i+1][0]-lat)*110574;
      const dx=bx-ax,dy=by-ay,len2=dx*dx+dy*dy,t=len2>0?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/len2)):0,px=ax+dx*t,py=ay+dy*t,d=Math.sqrt(px*px+py*py);
      if(d<best.dist) best={i,along:r.cum[i]+t*(r.cum[i+1]-r.cum[i]),dist:d};
    }};
    scan(from-3,from+251);
    if(best.dist>100) scan(0,r.pts.length-1); // büyük sıçramada rota boyunca tam tarama
    return best;
  }
  function nvSetGpsStatus(text) { const el=document.getElementById('navGpsStatus'); if(el) el.textContent=String(text||''); }
  function nvTick(lat,lng,accuracy,timestamp,speedMps) {
    const r=nv.route; if(!nv.active||!r||!Array.isArray(r.pts)||r.pts.length<2) return;
    lat=Number(lat); lng=Number(lng); accuracy=Number(accuracy); timestamp=Number(timestamp)||Date.now();
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180) return;
    if(nv.lastFixAt && timestamp+1000<nv.lastFixAt) return;
    nv.lastFixAt=Math.max(nv.lastFixAt,timestamp);
    const goodAcc=Number.isFinite(accuracy)&&accuracy>0?accuracy:null;
    const loc=nvLocate(r,lat,lng,nv.idx);
    const threshold=goodAcc==null?85:Math.max(55,Math.min(125,goodAcc*1.2+20));
    const reliable=goodAcc!=null && goodAcc<=90;
    nv.lastGpsReliable=reliable;
    if(!reliable){ nv.off=0; nvSetGpsStatus(goodAcc==null?'GPS doğruluğu bilinmiyor · güvenilir konum bekleniyor':'GPS doğruluğu düşük · ±'+Math.round(goodAcc)+' m'); }
    else if(loc.dist>threshold){ nv.off++; nvSetGpsStatus('Rotadan uzaklaşılıyor · '+Math.round(loc.dist)+' m'); if(nv.off>=3 && Date.now()>=nv.retryAt) nvReroute(lat,lng); }
    else {
      nv.off=0; nv.idx=loc.i;
      // Küçük GPS dalgalanmalarının kalan mesafeyi geriye sıçratmasını engelle.
      nv.along=Math.max(0,loc.along<Number(nv.along||0)-35?Number(nv.along||0)-35:loc.along);
      nvSetGpsStatus(goodAcc==null?'GPS konumu alındı':'GPS ±'+Math.round(goodAcc)+' m');
    }
    const along=Math.max(0,Number(nv.along)||0), remain=Math.max(0,r.total-along);
    let k=r.steps.findIndex(st=>r.cum[Math.min(st.vtx,r.cum.length-1)]>along+8); if(k<0)k=r.steps.length-1;
    const st=r.steps[k]||{text:'Devam et',rot:0,vtx:r.pts.length-1,type:'arrive'};
    const dNext=Math.max(0,(r.cum[Math.min(st.vtx,r.cum.length-1)]||0)-along);
    const icon=document.getElementById('navIcon'); if(icon){icon.className='fa-solid '+(st.type==='arrive'?'fa-flag-checkered':st.type==='roundabout'||st.type==='rotary'?'fa-rotate':'fa-arrow-up');icon.style.transform=st.type==='arrive'?'':'rotate('+st.rot+'deg)';}
    const distEl=document.getElementById('navDist'),textEl=document.getElementById('navText'),remainEl=document.getElementById('navRemain'),etaEl=document.getElementById('navEta');
    if(distEl)distEl.textContent=nvFmtDist(dNext); if(textEl)textEl.textContent=st.text;
    const sec=r.total>0?r.dur*remain/r.total:0,eta=new Date(Date.now()+sec*1000);
    if(remainEl)remainEl.textContent=nvFmtDist(remain)+' · '+nvFmtTime(sec);
    if(etaEl)etaEl.textContent='Tahmini varış '+String(eta.getHours()).padStart(2,'0')+':'+String(eta.getMinutes()).padStart(2,'0');
    if(reliable && nv.off===0){if(dNext<=300&&dNext>60&&!nv.said[k+'a']){nv.said[k+'a']=1;nvSpeak(nvFmtDist(dNext)+' sonra '+st.text.toLowerCase());}if(dNext<=60&&!nv.said[k+'b']){nv.said[k+'b']=1;nvSpeak(st.text);}}
    if(reliable && (remain<25||(st.type==='arrive'&&dNext<25)))nvArrived();
    nvPersistSession(false);
  }

  // ---------- CANLI GHOST (en hızlı turunla yarış) ----------

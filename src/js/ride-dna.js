// Ride DNA, driving analysis, and trip insights.
// Classic script: globals are shared with other files in index.html's intentional load order.
function rideDnaCreatePreviewScenario(profileKey) {
    const scenarios = {
      virajci:{dist:32000,time:1900,avg:64,max:95,night:false,speeds:(i)=>58+(i%7)*3,corner:{n:6,avg:86,perfect:4,aggressive:0},step:0.002,hardBrakes:0},
      sehir:{dist:6500,time:1050,avg:25,max:48,night:false,speeds:(i)=>15+(i%8)*3,corner:null,step:0.0015,hardBrakes:1},
      gece:{dist:12000,time:1500,avg:32,max:58,night:true,speeds:(i)=>28+(i%5)*2,corner:null,step:0.002,hardBrakes:0},
      otoyol:{dist:45000,time:1900,avg:85,max:112,night:false,speeds:(i)=>76+(i%7)*4,corner:null,step:0.002,hardBrakes:0},
      turcu:{dist:52000,time:3100,avg:60,max:84,night:false,speeds:(i)=>54+(i%6)*3,corner:null,step:0.002,hardBrakes:0},
      uzunyol:{dist:125000,time:6200,avg:73,max:108,night:false,speeds:(i)=>66+(i%8)*4,corner:null,step:0.002,hardBrakes:1},
      yumusak:{dist:18000,time:1250,avg:52,max:72,night:false,speeds:(i)=>50+(i%4)*2,corner:null,step:0.001,hardBrakes:0},
      kesifci:{dist:18000,time:1750,avg:37,max:64,night:false,speeds:(i)=>30+(i%7)*2,corner:null,step:0.014,hardBrakes:0}
    };
    const cfg = scenarios[profileKey] || scenarios.sehir;
    const start = new Date();
    start.setHours(cfg.night ? 23 : 14, 10, 0, 0);
    const count = 48;
    const pts = Array.from({length:count}, (_, i) => [
      41.0 + i * cfg.step,
      29.0 + i * (cfg.step * 0.42),
      start.getTime() + Math.round((cfg.time * 1000) * i / (count - 1)),
      cfg.speeds(i)
    ]);
    return { summary:{id:'dna-preview-'+profileKey,date:start.toISOString(),dist:cfg.dist,time:cfg.time,avg:cfg.avg,max:cfg.max,pts,hardBrakes:cfg.hardBrakes,gap:false,incompleteGps:false}, corner:cfg.corner };
  }
  function rideDnaTestPreview(profileKey) {
    const select = document.getElementById('rideDnaTestProfile');
    const key = profileKey || (select ? select.value : 'sehir');
    const scenario = rideDnaCreatePreviewScenario(key);
    const analysis = rideDnaAnalyzeTrip(scenario.summary, scenario.corner, []);
    const labels = rideDnaLabels();
    const score = analysis.scores[key];
    const confidence = Math.round((analysis.confidence[key] || 0) * 100);
    const eligible = !!analysis.qualified[key];
    const result = document.getElementById('rideDnaTestPreviewResult');
    if (result) {
      result.innerHTML = '<div class="font-extrabold text-blue-100 mb-1">'+achievementEsc(labels[key] || key)+'</div>'+
        '<div class="flex items-center justify-between gap-3"><span>Profil puanı</span><b class="text-sm">'+(score == null ? 'Yeterli veri yok' : score+'/100')+'</b></div>'+
        '<div class="flex items-center justify-between gap-3 mt-1"><span>Veri yeterliliği</span><b>'+confidence+'%</b></div>'+
        '<div class="flex items-center justify-between gap-3 mt-1"><span>Bu senaryo DNA şartını karşılıyor mu?</span><b>'+(eligible?'Evet':'Henüz değil')+'</b></div>'+
        '<p class="mt-2 text-[10px] text-slate-400">'+achievementEsc(RIDE_DNA_PROFILE_HINTS[key] || 'Sürüş eğilimi')+' · '+analysis.metrics.distanceKm+' km · '+analysis.metrics.gpsPoints+' örnek. Bu yalnızca simülasyondur; gerçek DNA geçmişin değiştirilmedi.</p>';
    }
    return { profile:key, score, confidence:analysis.confidence[key] || 0, qualified:eligible, persistentWrite:false, analysis };
  }
  window.garajimTestRideDnaProfile = rideDnaTestPreview;
  // İsteğe bağlı gizli komut: garajimTestAchievementCelebration('legendary') veya ('rare','watch').
  window.garajimOpenAchievementTestMenu=achievementOpenTestMenu;
  window.garajimTestAchievementCelebration=function(rarity,target){const select=document.getElementById('achievementTestRarity');if(select&&['common','uncommon','rare','epic','legendary'].includes(String(rarity||'').toLowerCase()))select.value=String(rarity).toLowerCase();return achievementRunCelebrationTest(target||'both');};
  function achievementMergeBackup(extras){if(!extras||typeof extras!=='object')return;const local=achievementStateGet(),incoming=extras.achievements;if(incoming&&typeof incoming==='object'){if(incoming.earned&&typeof incoming.earned==='object')Object.keys(incoming.earned).forEach(id=>{if(!local.earned[id])local.earned[id]=incoming.earned[id];else{const a=local.earned[id],b=incoming.earned[id];if(a&&b&&a.earnedAt&&b.earnedAt&&new Date(b.earnedAt)<new Date(a.earnedAt))local.earned[id]=b;}});local.initialized=!!(local.initialized||incoming.initialized);if(!local.initializedAt&&incoming.initializedAt)local.initializedAt=incoming.initializedAt;achievementStateSave(local);}const mergeRows=(key,rows,cap)=>{if(!Array.isArray(rows))return;const cur=key===ACHIEVEMENT_ACTIVITY_KEY?achievementActivityGet():achievementOdoGet(),have=new Set(cur.map(x=>x.id));rows.filter(x=>x&&x.id&&!have.has(x.id)).forEach(x=>{cur.push(x);have.add(x.id);});cur.sort((a,b)=>String(a.at||a.date||'').localeCompare(String(b.at||b.date||'')));try{localStorage.setItem(key,JSON.stringify(cur.slice(-cap)));}catch(e){}};mergeRows(ACHIEVEMENT_ACTIVITY_KEY,extras.activity,1200);mergeRows(ACHIEVEMENT_ODO_KEY,extras.odoHistory,1000);}


  function rideCardsGet() { try { return JSON.parse(localStorage.getItem(RIDE_CARDS_KEY) || '[]'); } catch { return []; } }
  function rideCardsSave(list) { try { localStorage.setItem(RIDE_CARDS_KEY, JSON.stringify(list.slice(0, 120))); } catch (e) {} }
  function rideCardPush(card) {
    const list = rideCardsGet();
    list.unshift(card);
    rideCardsSave(list);
  }
  function rideAsphaltGet() { try { return JSON.parse(localStorage.getItem(RIDE_ASPHALT_KEY) || '[]'); } catch { return []; } }
  function rideAsphaltSave(list) { try { localStorage.setItem(RIDE_ASPHALT_KEY, JSON.stringify(list.slice(-400))); } catch (e) {} }
  function rideDnaGet() { try { return JSON.parse(localStorage.getItem(RIDE_DNA_KEY) || 'null'); } catch { return null; } }
  // Sürüş DNA etiketlerini kutlama, yol kartları ve koleksiyon aynı kaynaktan kullanır.
  function rideDnaLabels() { return ACHIEVEMENT_DNA_LABELS; }
  function rideDnaSave(d) { try { localStorage.setItem(RIDE_DNA_KEY, JSON.stringify(d)); } catch (e) {} }
  function rideDnaDashboardHtml(dna) {
    const state = dna && typeof dna === 'object' ? dna : {};
    const status = state.status === 'confirmed' ? 'PROFİL DOĞRULANDI' : state.status === 'provisional' ? 'ÖN PROFİL' : 'KEŞİF AŞAMASI';
    const candidateName = state.candidateLabel ? achievementEsc(state.candidateLabel) : '';
    const stateName = achievementEsc(state.displayLabel || state.label || 'DNA keşfediliyor');
    const statusTone = state.status === 'confirmed' ? 'confirmed' : state.status === 'provisional' ? 'provisional' : 'discovering';
    const profiles = ACHIEVEMENT_DNA_KEYS.map(key => {
      const stat = state.profileStats && state.profileStats[key];
      const hasScore = stat && Number.isFinite(Number(stat.score));
      const score = hasScore ? Math.round(rideDnaClamp(stat.score)) : null;
      const samples = stat ? Math.max(0, Number(stat.observations || stat.samples) || 0) : 0;
      const evidence = stat ? Math.round(rideDnaClamp(stat.confidence, 0, 1) * 100) : 0;
      const current = state.candidate === key;
      const label = achievementEsc(ACHIEVEMENT_DNA_LABELS[key] || key);
      const hint = achievementEsc(RIDE_DNA_PROFILE_HINTS[key] || 'Yeterli sürüş verisi bekleniyor');
      return '<div class="ride-dna-prof '+(current?'is-candidate':'')+'"><div class="ride-dna-prof-head"><span>'+label+'</span><b>'+(score == null ? '—' : score+'/100')+'</b></div><div class="ride-dna-track"><span style="width:'+(score == null ? 0 : score)+'%"></span></div><div class="ride-dna-prof-hint">'+hint+'</div><div class="ride-dna-prof-meta">'+(samples ? samples+' analiz · veri yeterliliği '+evidence+'%' : 'Veri bekleniyor')+'</div></div>';
    }).join('');
    const recent = Array.isArray(state.history) ? state.history.slice(-4).reverse() : [];
    const recentHtml = recent.length ? '<div class="ride-dna-history"><div class="ride-dna-history-title">Son DNA analizleri</div>'+recent.map(row => {
      const date = row.date && Number.isFinite(new Date(row.date).getTime()) ? new Date(row.date).toLocaleDateString('tr-TR',{day:'numeric',month:'short'}) : '—';
      const rowLabel = achievementEsc(row.label || (row.primary && ACHIEVEMENT_DNA_LABELS[row.primary]) || 'DNA keşfediliyor');
      const score = Number.isFinite(Number(row.score)) ? Math.round(Number(row.score))+'/100' : '—';
      return '<div class="ride-dna-history-row"><span>'+date+' · '+rowLabel+'</span><b>'+score+'</b></div>';
    }).join('')+'</div>' : '';
    return '<div class="ride-dna-dashboard"><div class="ride-dna-dashboard-head"><div><div class="ride-dna-status-label">SÜRÜŞ DNA DURUMU</div><div class="ride-dna-dashboard-title">'+stateName+'</div>'+(candidateName && state.status !== 'confirmed' ? '<div class="ride-dna-candidate-copy">Öne çıkan aday: '+candidateName+'</div>' : '')+'</div><span class="ride-dna-status '+statusTone+'">'+status+'</span></div><div class="ride-dna-dashboard-meta"><span>'+(Number(state.total)||0)+' sürüş analiz edildi</span><span>'+(Array.isArray(state.unlocked)?state.unlocked.length:0)+' doğrulanmış profil</span><span>Veri yeterliliği '+Math.round(rideDnaClamp(state.profileConfidence,0,1)*100)+'%</span></div><div class="ride-dna-grid">'+profiles+'</div>'+recentHtml+'<p class="ride-dna-footnote">Puanlar kaydedilen GPS, süre, hız ve mevcut viraj/fren sinyallerinden hesaplanan eğilimlerdir; yol sınıfı veya araç telemetrisi yoksa kesin sürüş türü iddiasında bulunmaz. Keşif için ham GPS izi yerine yaklaşık kilometrelik bölge hücreleri saklanır.</p></div>';
  }
  function rideSegGet() { try { return JSON.parse(localStorage.getItem(RIDE_SEGMENT_KEY) || '{}'); } catch { return {}; } }
  function rideSegSave(o) { try { localStorage.setItem(RIDE_SEGMENT_KEY, JSON.stringify(o)); } catch (e) {} }
  function rideGeoHash(lat, lng, prec) {
    prec = prec || 3;
    return lat.toFixed(prec) + ',' + lng.toFixed(prec);
  }

  // 2) Asfalt titreşim — DeviceMotion
  function rideMotionStart() {
    if (ride.accelWatch) return;
    const handler = (e) => {
      if (!(ride.running && !ride.paused)) return;
      const a = e.accelerationIncludingGravity || e.acceleration;
      if (!a) return;
      const mag = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2);
      // Yerçekimi ~9.8; sapma titreşim
      const vib = Math.abs(mag - 9.8);
      ride.motionAvg = ride.motionAvg * 0.85 + vib * 0.15;
      // Kara kutu sarsıntı
      if (ride.last) {
        ride.blackbox.push({
          t: Date.now(), lat: ride.last.lat, lng: ride.last.lng,
          spd: ride.lastSpeedKmh || 0, vib: +vib.toFixed(2)
        });
        if (ride.blackbox.length > 60) ride.blackbox.shift();
      }
      // Sert darbe → kara kutu kilidi
      if (vib > 30 && (ride.lastSpeedKmh || 0) > 25 && !ride.impactLocked) {
        ride.impactLocked = true;
        try {
          localStorage.setItem(RIDE_BLACKBOX_KEY, JSON.stringify({
            date: new Date().toISOString(),
            samples: ride.blackbox.slice(),
            note: 'Otomatik kilit — yüksek sarsıntı'
          }));
        } catch (x) {}
        toast('Kara kutu kilitlendi (yüksek sarsıntı)');
        try { if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]); } catch (x) {}
      }
      // Bozuk asfalt örneklemesi (yüksek vib + hareket)
      if (vib > 4.5 && (ride.lastSpeedKmh || 0) > 12 && ride.last) {
        ride.sessionRough++;
        if (ride.sessionRough % 3 === 0) {
          ride.asphaltHits.push({ lat: ride.last.lat, lng: ride.last.lng, v: +vib.toFixed(1), t: Date.now() });
          if (ride.asphaltHits.length > 80) ride.asphaltHits.shift();
        }
      }
    };
    try {
      if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission().then(s => {
          if (s === 'granted') { window.addEventListener('devicemotion', handler); ride.accelWatch = handler; }
        }).catch(() => {});
      } else {
        window.addEventListener('devicemotion', handler);
        ride.accelWatch = handler;
      }
    } catch (e) {}
  }
  function rideMotionStop() {
    if (ride.accelWatch) {
      try { window.removeEventListener('devicemotion', ride.accelWatch); } catch (e) {}
      ride.accelWatch = null;
    }
  }

  // 3) Viraj algılama: aynı yönde dönüş sürdükçe viraj; yön oturunca (3 sakin örnek) biter
  function rideCornerClose(c) {
    if (!c || c.total < 25 || c.samples < 3) return;
    const smooth = c.maxSpd - c.minSpd;
    c.maxTurn = c.total;
    c.score = c.total > 40 ? (smooth < 15 ? 95 : smooth < 30 ? 75 : 55) : (smooth < 12 ? 85 : 65);
    c.label = c.score >= 90 ? 'mükemmel' : c.score >= 70 ? 'iyi' : 'agresif';
    ride.corners.push(c);
  }
  function rideCornerTick(cur, kmh, heading) {
    if (heading == null || !isFinite(heading) || kmh == null || kmh < 15) { rideCornerClose(ride.cornerActive); ride.cornerActive = null; ride.lastHd = null; return; }
    const prev = ride.lastHd; ride.lastHd = heading;
    if (prev == null) return;
    let dh = heading - prev; if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
    const turning = Math.abs(dh) >= 2.5, dir = dh > 0 ? 1 : -1, c = ride.cornerActive;
    const fresh = () => ({ total: Math.abs(dh), dir, samples: 1, calm: 0, minSpd: kmh, maxSpd: kmh, lat: cur.lat, lng: cur.lng });
    if (!c) { if (turning) ride.cornerActive = fresh(); return; }
    c.samples++; c.minSpd = Math.min(c.minSpd, kmh); c.maxSpd = Math.max(c.maxSpd, kmh);
    if (turning && dir === c.dir) { c.total += Math.abs(dh); c.calm = 0; }
    else if (turning) { rideCornerClose(c); ride.cornerActive = fresh(); return; }
    else c.calm++;
    if (c.calm >= 3 || c.samples > 80) { rideCornerClose(c); ride.cornerActive = null; }
  }

  function rideCornerSummary() {
    const cs = ride.corners || [];
    if (!cs.length) return null;
    const avg = cs.reduce((s, c) => s + (c.score || 0), 0) / cs.length;
    const perfect = cs.filter(c => (c.score || 0) >= 90).length;
    const aggressive = cs.filter(c => (c.label === 'agresif')).length;
    return { n: cs.length, avg: Math.round(avg), perfect, aggressive };
  }

  // 5) Sürüş DNA v2 — sekiz profil, veri yeterliliği, yinelenen kayıt koruması.
  function rideDnaClamp(value, min, max) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min == null ? 0 : min, Math.min(max == null ? 100 : max, n)) : 0;
  }
  function rideDnaPoint(p) {
    if (!p) return null;
    const lat = Number(Array.isArray(p) ? p[0] : (p.lat != null ? p.lat : p.latitude));
    const lng = Number(Array.isArray(p) ? p[1] : (p.lng != null ? p.lng : p.longitude));
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    const rawSpeed = Array.isArray(p) ? p[3] : (p.speedKmh != null ? p.speedKmh : (p.speed != null ? p.speed : p.kmh));
    const speed = Number(rawSpeed);
    const rawTime = Array.isArray(p) ? p[2] : (p.t != null ? p.t : p.timestamp);
    const time = Number(rawTime);
    return { lat, lng, speed: Number.isFinite(speed) && speed >= 0 && speed <= 220 ? speed : null, time: Number.isFinite(time) ? time : null };
  }
  function rideDnaStdDev(values) {
    if (!Array.isArray(values) || values.length < 2) return null;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length);
  }
  function rideDnaNightRatio(startDate, durationSec) {
    const start = new Date(startDate || '');
    if (!Number.isFinite(start.getTime())) return 0;
    const duration = Math.max(0, Number(durationSec) || 0);
    const samples = duration > 0 ? Math.max(1, Math.min(240, Math.ceil(duration / 300))) : 1;
    let night = 0;
    for (let i = 0; i < samples; i++) {
      const elapsed = duration > 0 ? ((i + 0.5) / samples) * duration : 0;
      const hour = new Date(start.getTime() + elapsed * 1000).getHours();
      if (hour >= 22 || hour < 5) night++;
    }
    return night / samples;
  }
  // Safely reusable by the live engine and the hidden DNA simulator. It never writes to storage.
  function rideDnaAnalyzeTrip(summary, corner, visitedCellsInput) {
    const s = summary && typeof summary === 'object' ? summary : {};
    const rawPts = Array.isArray(s.pts) ? s.pts : [];
    const points = rawPts.map(rideDnaPoint).filter(Boolean);
    const distKm = Math.max(0, Number(s.dist) || 0) / 1000;
    const duration = Math.max(0, Number(s.time) || 0);
    const speedsFromSummary = Array.isArray(s.speedSamples) ? s.speedSamples.map(Number).filter(v => Number.isFinite(v) && v >= 0 && v <= 220) : [];
    const speedsFromPoints = points.map(p => p.speed).filter(v => v != null);
    const speeds = (speedsFromSummary.length >= 5 ? speedsFromSummary : speedsFromPoints).slice(-600);
    const speedMean = speeds.length ? speeds.reduce((a,b) => a+b,0) / speeds.length : 0;
    const speedStdDev = rideDnaStdDev(speeds);
    const maxObserved = speeds.length ? Math.max(...speeds) : 0;
    const avg = Math.max(0, Number(s.avg) || (duration > 0 ? distKm / (duration / 3600) : 0));
    const max = Math.max(0, Number(s.max) || maxObserved);
    const nightRatio = rideDnaNightRatio(s.date || s.startedAt, duration);
    let dataQuality = points.length >= 30 ? 1 : points.length >= 15 ? 0.88 : points.length >= 8 ? 0.72 : points.length >= 4 ? 0.5 : 0.28;
    if (s.gap) dataQuality *= 0.85;
    if (s.incompleteGps) dataQuality *= 0.65;
    dataQuality = rideDnaClamp(dataQuality, 0.15, 1);

    const routeCells = new Set();
    points.forEach(p => routeCells.add(rideGeoHash(p.lat, p.lng, 2)));
    const visitedCells = new Set(Array.isArray(visitedCellsInput) ? visitedCellsInput : []);
    const freshCells = Array.from(routeCells).filter(cell => !visitedCells.has(cell));
    const cruiseShare = speeds.length >= 5 ? speeds.filter(v => v >= 65 && v <= 110).length / speeds.length : (avg >= 65 && avg <= 110 ? 0.55 : 0.25);
    const safeSpeedEvidence = max > 0 && max <= 130;
    const hasBrakeData = Object.prototype.hasOwnProperty.call(s, 'hardBrakes') && Number.isFinite(Number(s.hardBrakes));
    const hardBrakes = hasBrakeData ? Math.max(0, Number(s.hardBrakes) || 0) : null;
    const scores = {}, confidence = {};
    ACHIEVEMENT_DNA_KEYS.forEach(k => { scores[k] = null; confidence[k] = 0; });
    const put = (key, score, conf) => {
      const c = rideDnaClamp(conf, 0, 1);
      if (!Number.isFinite(Number(score)) || c < 0.18) return;
      scores[key] = Math.round(rideDnaClamp(score));
      confidence[key] = +c.toFixed(3);
    };

    // Virajcı: viraj ölçümü olmayan bir sürüşe varsayılan puan verilmez.
    const cornerCount = Math.max(0, Number(corner && corner.n) || 0);
    const cornerScore = rideDnaClamp(corner && corner.avg, 0, 100);
    if (cornerCount >= 1 && distKm >= 2) {
      put('virajci', cornerScore * 0.8 + Math.min(20, cornerCount * 4), dataQuality * Math.min(1, cornerCount / 4) * Math.min(1, distKm / 5));
    }
    // Şehir akışkanı: şehir yol sınıfı doğrudan bilinmediğinden yalnızca ölçümlere dayalı bir eğilimdir.
    if (distKm >= 2 && distKm < 60 && duration >= 300 && avg > 0 && avg < 60 && points.length >= 3) {
      const speedFit = rideDnaClamp(100 - Math.abs(avg - 28) * 2.1);
      const distanceFit = rideDnaClamp(100 - Math.max(0, distKm - 12) * 2.6 - Math.max(0, 3 - distKm) * 20);
      put('sehir', speedFit * 0.65 + distanceFit * 0.35, dataQuality * Math.min(1, distKm / 6) * Math.min(1, duration / 900));
    }
    // Gece kuşu: başlangıç saatini değil, mümkün olduğunca sürüş süresinin gece oranını kullanır.
    if (nightRatio >= 0.15 && distKm >= 2 && duration >= 300) {
      put('gece', nightRatio * 100, dataQuality * Math.min(1, nightRatio * 1.5) * Math.min(1, distKm / 5) * Math.min(1, duration / 600));
    }
    // Otoyol makinesi: tepe hız puan kazandırmaz; sürekli seyir örnekleri ve ortalama tempo önemlidir.
    if (distKm >= 8 && duration >= 600 && avg >= 45 && avg <= 125 && points.length >= 5) {
      const avgFit = rideDnaClamp(100 - Math.abs(avg - 85) * 1.5);
      const maxPenalty = max > 130 ? 25 : 0;
      put('otoyol', avgFit * 0.45 + cruiseShare * 100 * 0.55 - maxPenalty,
        dataQuality * Math.min(1, distKm / 20) * Math.min(1, duration / 1800) * (speeds.length >= 10 ? 1 : 0.65));
    }
    // Sakin turcu: mesafe, dengeli ortalama hız ve ölçülebilen hız sürekliliğinin birleşimi.
    if (distKm >= 10 && duration >= 600 && avg >= 20 && avg <= 100) {
      const distanceFit = rideDnaClamp(distKm / 55 * 100);
      const avgFit = rideDnaClamp(100 - Math.abs(avg - 60) * 1.8);
      const smoothFit = speedStdDev == null ? 55 : rideDnaClamp(100 - speedStdDev * 1.3);
      put('turcu', distanceFit * 0.25 + avgFit * 0.45 + smoothFit * 0.3,
        dataQuality * Math.min(1, distKm / 30) * Math.min(1, duration / 1800) * (speeds.length >= 5 ? 1 : 0.7));
    }
    // Uzun yol: yalnızca anlamlı mesafe/süre biriktiğinde puan üretir.
    if (distKm >= 15 && duration >= 1200 && avg > 0) {
      const distanceFit = rideDnaClamp(distKm / 120 * 100);
      const durationFit = rideDnaClamp(duration / 5400 * 100);
      const avgFit = rideDnaClamp(100 - Math.abs(avg - 70) * 1.3);
      put('uzunyol', distanceFit * 0.55 + durationFit * 0.3 + avgFit * 0.15,
        dataQuality * Math.min(1, distKm / 80) * Math.min(1, duration / 3600));
    }
    // Yumuşak sürüş: telemetri yoksa tahmin yapılmaz; GPS hız dalgalanması yalnızca yardımcı sinyaldir.
    if (hasBrakeData && distKm >= 8 && duration >= 480 && points.length >= 8 && speeds.length >= 5) {
      const brakeRatePer10Km = hardBrakes / Math.max(distKm, 1) * 10;
      const brakePenalty = Math.min(70, brakeRatePer10Km * 15);
      const variabilityPenalty = speedStdDev == null ? 0 : Math.min(25, Math.max(0, speedStdDev - 8) * 0.9);
      const maxPenalty = max > 130 ? 15 : 0;
      put('yumusak', 100 - brakePenalty - variabilityPenalty - maxPenalty,
        dataQuality * Math.min(1, distKm / 10) * Math.min(1, speeds.length / 15));
    }
    // Kâşif: önceki sürüşlere göre yeni konum hücreleri. Koordinatlar depolanmaz; yalnızca hücre anahtarları tutulur.
    if (distKm >= 3 && points.length >= 5 && routeCells.size >= 3) {
      const freshRatio = routeCells.size ? freshCells.length / routeCells.size : 0;
      put('kesifci', freshRatio * 65 + Math.min(100, freshCells.length / 10 * 100) * 0.35,
        dataQuality * Math.min(1, routeCells.size / 12) * Math.min(1, distKm / 10));
    }

    const qualified = {
      virajci: !!(corner && corner.n >= 3 && Number(corner.avg) >= 70 && distKm >= 3 && confidence.virajci >= 0.4),
      sehir: !!(distKm >= 3 && distKm < 40 && avg >= 5 && avg < 45 && duration >= 480 && confidence.sehir >= 0.4),
      gece: !!(nightRatio >= 0.6 && distKm >= 5 && duration >= 600 && points.length >= 8 && confidence.gece >= 0.4),
      otoyol: !!(distKm >= 20 && avg >= 60 && avg <= 110 && duration >= 900 && speeds.length >= 10 && safeSpeedEvidence && confidence.otoyol >= 0.4),
      turcu: !!(distKm >= 30 && avg >= 40 && avg < 85 && duration >= 1200 && speeds.length >= 5 && safeSpeedEvidence && confidence.turcu >= 0.4),
      uzunyol: !!(distKm >= 80 && duration >= 3600 && safeSpeedEvidence && confidence.uzunyol >= 0.4),
      yumusak: !!(hasBrakeData && hardBrakes === 0 && distKm >= 10 && duration >= 600 && points.length >= 20 && speeds.length >= 5 && safeSpeedEvidence && confidence.yumusak >= 0.4),
      kesifci: !!(distKm >= 10 && freshCells.length >= 10 && safeSpeedEvidence && confidence.kesifci >= 0.4)
    };
    return {
      scores, confidence, qualified,
      routeCells: Array.from(routeCells), freshCells,
      metrics: {
        dataQuality: +dataQuality.toFixed(3), gpsPoints: points.length, speedSamples: speeds.length,
        averageSpeed: +avg.toFixed(1), maximumSpeed: +max.toFixed(1), speedStdDev: speedStdDev == null ? null : +speedStdDev.toFixed(1),
        cruiseShare: +cruiseShare.toFixed(3), nightRatio: +nightRatio.toFixed(3), distanceKm: +distKm.toFixed(1),
        durationSec: Math.round(duration), routeCells: routeCells.size, freshCells: freshCells.length,
        hardBrakes, safeSpeedEvidence
      }
    };
  }
  function rideDnaRefreshIdentity(state) {
    const labels = rideDnaLabels(), stats = state.profileStats || {}, qualifiedCounts = state.qualifiedCounts || {};
    const candidates = ACHIEVEMENT_DNA_KEYS.map(key => {
      const stat = stats[key];
      if (!stat || !Number.isFinite(Number(stat.score)) || Number(stat.observations || stat.samples || 0) < 1) return null;
      const confidence = rideDnaClamp(stat.confidence, 0, 1);
      if (confidence < 0.18) return null;
      const samples = Math.max(1, Number(stat.observations || stat.samples) || 1);
      const stability = 0.45 + 0.55 * Math.min(1, samples / 4);
      const effective = rideDnaClamp(stat.score) * (0.55 + 0.45 * confidence) * stability;
      return { key, stat, score: rideDnaClamp(stat.score), confidence, samples, effective };
    }).filter(Boolean).sort((a,b) => b.effective - a.effective);
    let candidate = candidates[0] || null;
    const current = candidates.find(c => c.key === state.primary && state.status === 'confirmed');
    // Küçük puan farklarında ana DNA'nın her sürüşte değişmesini engelle.
    if (current && candidate && current.effective >= candidate.effective - 8 && current.confidence >= 0.45) candidate = current;
    const profileUnlockAt = candidate ? (RIDE_DNA_PROFILE_UNLOCK_AT[candidate.key] || 3) : 3;
    const isConfirmed = !!(candidate && Number(state.total || 0) >= 3 && candidate.samples >= 3 && candidate.confidence >= 0.48 && (Number(qualifiedCounts[candidate.key]) || 0) >= profileUnlockAt);
    const isProvisional = !!(candidate && Number(state.total || 0) >= 2 && candidate.samples >= 2 && candidate.confidence >= 0.32);
    state.primary = candidate ? candidate.key : null;
    state.candidate = candidate ? candidate.key : null;
    state.candidateLabel = candidate ? labels[candidate.key] : null;
    state.status = isConfirmed ? 'confirmed' : (isProvisional ? 'provisional' : 'discovering');
    state.label = isConfirmed ? labels[candidate.key] : 'DNA keşfediliyor';
    state.displayLabel = isConfirmed ? labels[candidate.key] : (isProvisional && candidate ? labels[candidate.key] + ' · ön profil' : 'DNA keşfediliyor');
    state.profileConfidence = candidate ? candidate.confidence : 0;
    state.primaryScore = candidate ? Math.round(candidate.score) : null;
    return candidate;
  }
  function rideComputeDna(summary, corner) {
    const prev = rideDnaGet() || { counts: {}, total: 0 };
    if (!prev || typeof prev !== 'object' || Array.isArray(prev)) return null;
    const oldTotal = Math.max(0, Number(prev.total) || 0);
    prev.counts = prev.counts && typeof prev.counts === 'object' ? prev.counts : {};
    prev.qualifiedCounts = prev.qualifiedCounts && typeof prev.qualifiedCounts === 'object' ? prev.qualifiedCounts : {};
    prev.qualifiedRides = prev.qualifiedRides && typeof prev.qualifiedRides === 'object' && !Array.isArray(prev.qualifiedRides) ? prev.qualifiedRides : {};
    prev.unlocked = Array.isArray(prev.unlocked) ? prev.unlocked.filter(k => ACHIEVEMENT_DNA_KEYS.includes(k)) : (ACHIEVEMENT_DNA_KEYS.includes(prev.primary) ? [prev.primary] : []);
    prev.visitedCells = Array.isArray(prev.visitedCells) ? prev.visitedCells : [];
    prev.history = Array.isArray(prev.history) ? prev.history.slice(-20) : [];
    prev.profileStats = prev.profileStats && typeof prev.profileStats === 'object' ? prev.profileStats : {};
    // Eski kayıtları silmeden dönüştür: önceki beş profilin ortalama puanları düşük ağırlıklı başlangıç verisi olur.
    if (!Number.isFinite(Number(prev.schemaVersion)) || Number(prev.schemaVersion) < 2) {
      ACHIEVEMENT_DNA_KEYS.forEach(key => {
        if (prev.profileStats[key]) return;
        const legacyTotal = oldTotal;
        const legacySum = Number(prev.counts[key]);
        if (legacyTotal > 0 && Number.isFinite(legacySum) && legacySum > 0) {
          prev.profileStats[key] = {
            score: +rideDnaClamp(legacySum / legacyTotal).toFixed(1),
            observations: Math.min(3, legacyTotal), samples: Math.min(3, legacyTotal),
            confidence: 0.22, lastScore: null, lastConfidence: 0.22, legacySeed: true
          };
        }
      });
      prev.schemaVersion = 2;
      rideDnaRefreshIdentity(prev);
    }
    const rideKey = String(summary && (summary.id || ((summary.date || summary.startedAt || '') + ':' + (summary.dist || 0))));
    // Aynı sürüş normal kayıt ve arka plan aktarımı sırasında iki kez sayılmaz.
    if (Object.prototype.hasOwnProperty.call(prev.qualifiedRides, rideKey)) {
      rideDnaRefreshIdentity(prev);
      rideDnaSave(prev);
      return Object.assign({}, prev, { newlyUnlocked: [], duplicate: true });
    }

    const analysis = rideDnaAnalyzeTrip(summary, corner, prev.visitedCells);
    const previousUnlocks = new Set(prev.unlocked);
    prev.total = oldTotal + 1;
    const scores = analysis.scores;
    ACHIEVEMENT_DNA_KEYS.forEach(key => {
      const score = scores[key];
      if (score == null || analysis.confidence[key] < 0.18) return;
      const conf = analysis.confidence[key];
      const old = prev.profileStats[key];
      if (!old || !Number.isFinite(Number(old.score))) {
        prev.profileStats[key] = { score, observations: 1, samples: 1, confidence: conf, lastScore: score, lastConfidence: conf };
      } else {
        const oldConf = rideDnaClamp(old.confidence, 0, 1);
        const alpha = Math.min(0.45, Math.max(0.22, conf * 0.5));
        old.score = +rideDnaClamp(Number(old.score) + (score - Number(old.score)) * alpha).toFixed(1);
        old.observations = Math.max(0, Number(old.observations || old.samples) || 0) + 1;
        old.samples = old.observations;
        old.confidence = +rideDnaClamp(oldConf + (conf - oldConf) * alpha, 0, 1).toFixed(3);
        old.lastScore = score;
        old.lastConfidence = conf;
        delete old.legacySeed;
        prev.profileStats[key] = old;
      }
      prev.counts[key] = (Number(prev.counts[key]) || 0) + score;
    });

    const qualifiedKeys = ACHIEVEMENT_DNA_KEYS.filter(key => !!analysis.qualified[key]);
    prev.qualifiedRides[rideKey] = qualifiedKeys;
    const newlyUnlocked = [];
    qualifiedKeys.forEach(key => {
      prev.qualifiedCounts[key] = (Number(prev.qualifiedCounts[key]) || 0) + 1;
      const needed = RIDE_DNA_PROFILE_UNLOCK_AT[key] || 3;
      if (prev.qualifiedCounts[key] >= needed && !prev.unlocked.includes(key)) {
        prev.unlocked.push(key);
        if (!previousUnlocks.has(key)) newlyUnlocked.push(key);
      }
    });
    prev.visitedCells = Array.from(new Set(prev.visitedCells.concat(analysis.routeCells))).slice(-6000);
    prev.lastQualified = analysis.qualified;
    prev.lastScores = scores;
    prev.lastConfidence = analysis.confidence;
    prev.lastMetrics = analysis.metrics;
    prev.updated = new Date().toISOString();
    const candidate = rideDnaRefreshIdentity(prev);
    const candidateStat = candidate && prev.profileStats[candidate.key];
    prev.history.push({
      rideId: rideKey, date: summary && (summary.date || summary.startedAt) || new Date().toISOString(),
      primary: candidate ? candidate.key : null,
      label: prev.displayLabel || prev.label,
      status: prev.status,
      score: candidateStat && Number.isFinite(Number(candidateStat.score)) ? Math.round(candidateStat.score) : null,
      qualified: qualifiedKeys.slice(), newlyUnlocked: newlyUnlocked.slice(),
      dataQuality: analysis.metrics.dataQuality
    });
    prev.history = prev.history.slice(-20);
    rideDnaSave(prev);
    return Object.assign({}, prev, { newlyUnlocked, scores, confidence: analysis.confidence, metrics: analysis.metrics });
  }

  // 6) Yol hikâyesi (cihaz kartı)
  function rideBuildStory(s, corner, dna) {
    const d = new Date(s.date);
    const saat = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const gun = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
    const km = ((s.dist || 0) / 1000).toFixed(1);
    const parts = [];
    parts.push(gun + ', saat ' + saat + '.');
    parts.push(km + ' km yol · ' + rideFmtTime(s.time) + ' · en hızlı ' + Math.round(s.max || 0) + ' km/sa.');
    if (corner && corner.n) parts.push(corner.n + ' viraj · ' + corner.perfect + ' mükemmel.');
    if (s.hardBrakes) parts.push(s.hardBrakes + ' sert fren.');
    if (dna && dna.label) parts.push('Bu sürüşte ruhun: ' + dna.label + '.');
    const h = d.getHours();
    if (h >= 5 && h < 8) parts.push('Sabahın ilk ışıklarıyla.');
    else if (h >= 17 && h < 20) parts.push('Altın saat rotası.');
    else if (h >= 22 || h < 5) parts.push('Şehir ışıkları altında.');
    return parts.join(' ');
  }

  function rideShowDnaCelebration(keys) {
    const labels = rideDnaLabels();
    const names = Array.from(new Set((Array.isArray(keys) ? keys : []).map(key => labels[key]).filter(Boolean)));
    if (!names.length) return;

    const previous = document.getElementById('rideDnaCelebration');
    if (previous) previous.remove();

    const card = document.createElement('div');
    card.id = 'rideDnaCelebration';
    card.style.cssText = 'position:fixed;left:12px;right:12px;top:calc(12px + env(safe-area-inset-top));z-index:99999;display:flex;align-items:center;gap:12px;padding:14px;border-radius:20px;border:1px solid rgba(74,222,128,.48);background:rgba(12,18,16,.97);color:#f8fafc;box-shadow:0 18px 48px rgba(0,0,0,.45);backdrop-filter:blur(18px);opacity:0;transform:translateY(-10px);transition:opacity .22s ease,transform .22s ease';

    const trophy = document.createElement('div');
    trophy.textContent = '🏆';
    trophy.style.cssText = 'width:46px;height:46px;flex:0 0 46px;border-radius:15px;display:flex;align-items:center;justify-content:center;background:rgba(74,222,128,.15);font-size:24px';
    const textBox = document.createElement('div');
    textBox.style.cssText = 'min-width:0;flex:1';
    const eyebrow = document.createElement('div');
    eyebrow.textContent = names.length === 1 ? 'YENİ SÜRÜŞ DNA’SI' : names.length + ' YENİ SÜRÜŞ DNA’SI';
    eyebrow.style.cssText = 'font-size:10px;letter-spacing:1.1px;font-weight:800;color:#86efac;margin-bottom:4px';
    const title = document.createElement('div');
    title.textContent = names.join(' · ');
    title.style.cssText = 'font-size:15px;font-weight:800;line-height:1.3;overflow-wrap:anywhere';
    const caption = document.createElement('div');
    caption.textContent = 'Tebrikler! DNA koleksiyonuna eklendi.';
    caption.style.cssText = 'font-size:11px;color:#cbd5e1;margin-top:4px';
    textBox.append(eyebrow, title, caption);
    const close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Kutlamayı kapat');
    close.textContent = '×';
    close.style.cssText = 'align-self:flex-start;border:0;background:transparent;color:#94a3b8;font-size:24px;line-height:1;padding:0 2px';
    card.append(trophy, textBox, close);
    document.body.appendChild(card);
    requestAnimationFrame(() => { card.style.opacity = '1'; card.style.transform = 'translateY(0)'; });

    let timeout = null;
    const dismiss = () => {
      if (timeout) clearTimeout(timeout);
      if (!card.isConnected) return;
      card.style.opacity = '0';
      card.style.transform = 'translateY(-8px)';
      setTimeout(() => { if (card.parentNode) card.remove(); }, 240);
    };
    close.addEventListener('click', dismiss);
    timeout = setTimeout(dismiss, 4500);
    try { if (navigator.vibrate) navigator.vibrate([55, 45, 110]); } catch (e) {}

    try {
      const N = rideNativeBridge();
      if (N && typeof N.pushWearDnaCelebration === 'function') {
        const msg = names.length === 1
          ? '🎉 Yeni sürüş DNA’sı kazandın: ' + names[0]
          : '🎉 ' + names.length + ' yeni DNA kazandın: ' + names.join(' · ');
        N.pushWearDnaCelebration(msg);
      }
    } catch (e) {}
  }

  // 1) Hayalet — benzer başlangıç/bitiş
  function rideFindGhost(summary) {
    if (!summary.start || !summary.pts || summary.pts.length < 5) return null;
    const all = getAllRides().filter(r => r.id !== summary.id && r.pts && r.pts.length > 5);
    let best = null, bestScore = 0;
    all.forEach(r => {
      const a = r.start || (r.pts[0] ? { lat: r.pts[0][0], lng: r.pts[0][1] } : null);
      if (!a || !summary.start) return;
      const ds = rideHav(summary.start, a);
      if (ds > 800) return;
      const score = 1000 - ds + Math.min(500, (r.dist || 0) / 50);
      if (score > bestScore) { bestScore = score; best = r; }
    });
    return best;
  }

  // 7) Sessiz konvoy — segment ziyaret sayacı (kişisel)
  function rideUpdateSegments(pts) {
    if (!pts || pts.length < 2) return { visits: 0, last: null };
    const segs = rideSegGet();
    let key = null;
    const mid = pts[Math.floor(pts.length / 2)];
    key = rideGeoHash(mid[0], mid[1], 2);
    const rec = segs[key] || { n: 0, last: null };
    rec.n += 1;
    rec.last = new Date().toISOString();
    segs[key] = rec;
    // temizle
    const keys = Object.keys(segs);
    if (keys.length > 200) keys.slice(0, keys.length - 150).forEach(k => delete segs[k]);
    rideSegSave(segs);
    return { visits: rec.n, last: rec.last, key };
  }

  // 8) Altın saat / gece HUD
  function rideCheckGoldenHour() {
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    const golden = (h >= 6 && h < 8) || (h >= 17.5 && h < 19.5);
    const night = h >= 20.5 || h < 5.5;
    if (golden && !ride.goldenOn) {
      ride.goldenOn = true;
      rideApplyNight(false);
      const panel = document.getElementById('ridePanelBody');
      if (panel) panel.style.boxShadow = 'inset 0 0 40px rgba(251,191,36,0.12)';
    } else if (night && !ride.goldenOn && !ride.autoNight) {
      ride.autoNight = true;
      rideApplyNight(true);
    }
  }

  // 9) Yakıt: gerçek dolu-depo ortalamasından bu sürüşte harcanan tahmini litre
  function rideFuelGhost(distM) {
    try {
      const vid = ride.vehicleId || localStorage.getItem('garaj_ride_vehicle');
      const v = vid ? vehicles.find(x => x.id === vid) : null;
      const fs = v ? fuelStats(v) : null;
      if (!fs || !(fs.avg > 0)) return null;
      const tank = Number(v.tank || v.tankLiters) || 0;
      return { l100: +fs.avg.toFixed(1), usedL: +((distM || 0) / 1000 * fs.avg / 100).toFixed(1), rangeKm: tank ? Math.round(tank / fs.avg * 100) : null };
    } catch (e) { return null; }
  }

  // 10) Anı pini önerisi (bloklamayan)
  function rideMaybeMemoryPin(cur, kmh) {
    if (!cur || kmh == null) return;
    const now = Date.now();
    if (kmh >= 8) { ride.slowSince = null; return; }
    if (!ride.slowSince) ride.slowSince = now;
    if (now - ride.slowSince < 20000 || now - (ride.lastMemoryAsk || 0) < 600000 || (ride.memAsks || 0) >= 3) return;
    if (ride.accuracy == null || ride.accuracy >= 25) return;
    ride.lastMemoryAsk = now; ride.memAsks = (ride.memAsks || 0) + 1;
    rideShowMemoryChip(cur.lat, cur.lng);
  }
  function rideShowMemoryChip(lat, lng) {
    const old = document.getElementById('rideMemChip'); if (old) old.remove();
    const el = document.createElement('div');
    el.id = 'rideMemChip';
    el.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(230px + env(safe-area-inset-bottom));z-index:900;display:flex;gap:8px;align-items:center;padding:10px 12px;border-radius:16px;background:rgba(0,0,0,.88);border:1px solid rgba(255,255,255,.15);color:#fff;font-size:13px';
    el.innerHTML = '<span style="flex:1">📍 Burası anı noktası gibi duruyor.</span><button type="button" id="rideMemYes" style="padding:6px 12px;border-radius:10px;background:var(--accent);font-weight:700">İşaretle</button><button type="button" id="rideMemNo" style="padding:6px 8px;color:#94a3b8">✕</button>';
    document.body.appendChild(el);
    const close = () => { try { el.remove(); } catch (e) {} };
    document.getElementById('rideMemNo').onclick = close;
    document.getElementById('rideMemYes').onclick = () => { rideSaveMemoryPin(lat, lng); close(); };
    setTimeout(close, 10000);
  }
  function rideSaveMemoryPin(lat, lng) {
    const list = ridePinsGet();
    list.unshift({ id: 'p_' + Date.now().toString(36), type: 'manzara', lat, lng, note: 'Anı noktası', date: new Date().toISOString() });
    ridePinsSave(list); ridePinsRender(); achievementRecordActivity('memory'); achievementEvaluate('memory'); toast('Anı noktası eklendi');
  }

  // Asfalt zonlarını haritaya çiz
  function rideDrawAsphalt(map) {
    if (!map) return;
    (ride.asphaltLayers || []).forEach(l => { try { map.removeLayer(l); } catch (e) {} });
    ride.asphaltLayers = [];
    const hits = rideAsphaltGet().concat(ride.asphaltHits || []);
    hits.slice(-60).forEach(h => {
      const m = L.circleMarker([h.lat, h.lng], {
        radius: 5, color: '#f97316', weight: 1, fillColor: '#ea580c', fillOpacity: 0.55
      }).addTo(map);
      ride.asphaltLayers.push(m);
    });
  }

  function rideEpicSnapshot() { const o = {}; [RIDE_CARDS_KEY, RIDE_DNA_KEY, RIDE_SEGMENT_KEY, RIDE_ASPHALT_KEY].forEach(k => { o[k] = localStorage.getItem(k); }); return o; }
  function rideEpicRestore() {
    const o = ride.epicUndo; ride.epicUndo = null;
    if (!o) return;
    Object.keys(o).forEach(k => { try { if (o[k] == null) localStorage.removeItem(k); else localStorage.setItem(k, o[k]); } catch (e) {} });
  }

  // Özet sonrası kart üret + kaydet
  function rideFinalizeEpic(summary) {
    const corner = rideCornerSummary();
    summary.corners = corner;
    summary.roughHits = (ride.asphaltHits || []).length;
    summary.ghostDelta = ride.ghost && ride.ghost.delta != null ? Math.round(ride.ghost.delta) : null;
    const dna = rideComputeDna(summary, corner);
    summary.dna = dna ? { label: dna.displayLabel || dna.label, primary: dna.primary, candidate: dna.candidate, status: dna.status, unlocked: (dna.unlocked || []).slice() } : null;
    if (dna && dna.newlyUnlocked && dna.newlyUnlocked.length) rideShowDnaCelebration(dna.newlyUnlocked);
    const story = rideBuildStory(summary, corner, summary.dna);
    summary.story = story;
    const ghost = rideFindGhost(summary);
    summary.ghostId = ghost ? ghost.id : null;
    summary.ghostDist = ghost ? ghost.dist : null;
    summary.ghostMax = ghost ? ghost.max : null;
    const seg = rideUpdateSegments(summary.pts);
    summary.segmentVisits = seg.visits;
    const fuel = rideFuelGhost(summary.dist);
    summary.fuelGhost = fuel;
    // asfalt kalıcı
    if (ride.asphaltHits && ride.asphaltHits.length) {
      rideAsphaltSave(rideAsphaltGet().concat(ride.asphaltHits).slice(-400));
    }
    // kartlar
    rideCardPush({
      id: 'c_' + Date.now().toString(36), type: 'story', rideId: summary.id,
      title: 'Yol hikâyesi', body: story, date: summary.date || new Date().toISOString(),
      dist: summary.dist, max: summary.max, dna: summary.dna && summary.dna.label
    });
    if (corner && corner.n >= 3) {
      rideCardPush({
        id: 'c_' + (Date.now() + 1).toString(36), type: 'corner', rideId: summary.id,
        title: 'Viraj ustası', body: corner.n + ' viraj · ort. skor ' + corner.avg + ' · ' + corner.perfect + ' mükemmel, ' + corner.aggressive + ' agresif.',
        date: summary.date || new Date().toISOString()
      });
    }
    if (dna && dna.newlyUnlocked && dna.newlyUnlocked.length) {
      const labels = rideDnaLabels();
      const names = dna.newlyUnlocked.map(key => labels[key]).filter(Boolean);
      rideCardPush({
        id: 'c_' + (Date.now() + 2).toString(36), type: 'dna',
        title: 'Yeni sürüş DNA’sı kazandın', body: names.join(' · '), date: new Date().toISOString()
      });
    } else if (dna && dna.total === 1) {
      rideCardPush({
        id: 'c_' + (Date.now() + 3).toString(36), type: 'dna',
        title: 'Sürüş DNA’sı başladı', body: 'İlk profilin: ' + dna.label, date: new Date().toISOString()
      });
    } else if (dna) {
      rideCardPush({
        id: 'c_' + (Date.now() + 4).toString(36), type: 'dna',
        title: 'DNA profili güncellendi', body: 'Şu anki ruh: ' + dna.label, date: new Date().toISOString()
      });
    }
    if (seg.visits >= 2) {
      rideCardPush({
        id: 'c_' + (Date.now() + 4).toString(36), type: 'convoy',
        title: 'Sessiz konvoy', body: 'Bu güzergâhta ' + seg.visits + '. geçişin. Son: ' + (seg.last ? new Date(seg.last).toLocaleDateString('tr-TR') : '—'),
        date: new Date().toISOString()
      });
    }
    const h = new Date(summary.date || Date.now()).getHours() + new Date().getMinutes() / 60;
    if ((h >= 6 && h < 8) || (h >= 17.5 && h < 19.5)) {
      rideCardPush({
        id: 'c_' + (Date.now() + 5).toString(36), type: 'golden',
        title: 'Altın saat sürüşü', body: 'Işıklar yumuşarken yoldaydın. Nadir ve güzel.',
        date: summary.date || new Date().toISOString()
      });
    }
    return summary;
  }

  function rideCardsOpen() {
    const box = document.getElementById('rideCardsList');
    const ban = document.getElementById('rideDnaBanner');
    const dna = rideDnaGet();
    if (dna && ban) {
      ban.classList.remove('hidden');
      const labels = rideDnaLabels();
      const earnedKeys = Array.isArray(dna.unlocked) ? dna.unlocked : (dna.primary ? [dna.primary] : []);
      const earned = earnedKeys.filter(key => labels[key]).map(key => labels[key]);
      const profileStatusText = dna.status === 'confirmed' ? 'Profil doğrulandı' : dna.status === 'provisional' ? 'Ön profil · yeni sürüşlerle netleşir' : 'Keşif aşaması · veri birikiyor';
      ban.innerHTML = '<div class="text-[10px] text-slate-500 uppercase mb-1">Sürüş DNA koleksiyonu</div><div class="text-lg font-bold text-accent">' +
        achievementEsc(dna.displayLabel || dna.label || 'DNA keşfediliyor') + '</div><div class="text-[11px] text-slate-400 mt-1">' + (dna.total || 0) + ' sürüş analiz edildi · ' + earned.length + ' doğrulanmış DNA</div>' +
        '<div class="text-[10px] text-blue-200 mt-2">' + profileStatusText + (dna.candidateLabel && dna.status !== 'confirmed' ? ' · aday: ' + achievementEsc(dna.candidateLabel) : '') + '</div>' +
        '<div class="text-[11px] text-slate-300 leading-relaxed mt-2">' + (earned.length ? earned.map(key => achievementEsc(key)).join(' · ') : 'Profil kilitleri tekrarlanan nitelikli sürüşlerle açılır.') + '</div>';
    } else if (ban) ban.classList.add('hidden');
    const cards = rideCardsGet();
    if (!cards.length) {
      box.innerHTML = '<p class="text-sm text-slate-500 text-center py-8">Henüz kart yok. Bir sürüşü bitirip kaydedince yol hikâyeleri ve rozet kartları burada birikir.</p>';
    } else {
      const icon = { story: 'fa-book-open', corner: 'fa-road', dna: 'fa-dna', convoy: 'fa-users', golden: 'fa-sun', memory: 'fa-camera', badge: 'fa-medal' };
      box.innerHTML = cards.map(c =>
        '<div class="rounded-2xl border border-white/10 bg-white/5 p-3">' +
        '<div class="flex items-start gap-2"><div class="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center shrink-0"><i class="fa-solid ' + (icon[c.type] || 'fa-layer-group') + ' text-accent"></i></div>' +
        '<div class="min-w-0 flex-1"><p class="text-sm font-semibold">' + (c.title || 'Kart').replace(/</g, '') + '</p>' +
        '<p class="text-[12px] text-slate-400 mt-0.5 leading-relaxed">' + String(c.body || '').replace(/</g, '') + '</p>' +
        '<p class="text-[10px] text-slate-600 mt-1">' + (c.date ? new Date(c.date).toLocaleString('tr-TR') : '') + '</p></div></div></div>'
      ).join('');
    }
    document.getElementById('rideCardsModal').classList.remove('hidden');
  }

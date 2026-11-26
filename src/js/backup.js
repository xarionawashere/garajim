// Backup, restore, and exports.
// Classic script: globals are shared with other files in index.html's intentional load order.
function backupReadJson(key) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  }
  function backupSafePreferences() {
    const out = {};
    const theme = localStorage.getItem('garaj_theme');
    const pack = localStorage.getItem('garaj_pack');
    const remindDays = Number(localStorage.getItem('garaj_remind_days'));
    if (theme && ['dark', 'light', 'auto'].includes(theme)) out.theme = theme;
    if (pack && THEME_PACKS.some(p => p.id === pack)) out.pack = pack;
    if (Number.isFinite(remindDays) && remindDays >= 1 && remindDays <= 365) out.remindDays = remindDays;
    return out;
  }
  function backupBundle() {
    // Dışa aktarma anında son sürüş noktasını da taslağa yaz; uygulama kapanırsa kurtarma şansı artsın.
    try { if (typeof ridePersistDraft === 'function') ridePersistDraft(true); } catch (e) {}
    let pendingRide = backupReadJson('garaj_ride_watch_pending');
    try {
      if (ride && ride.pendingSummary && ride.pendingSummary.id && !ride.pendingSummary._previewOnly) pendingRide = ride.pendingSummary;
    } catch (e) {}
    return {
      app: 'garajim', version: 4, exportedAt: new Date().toISOString(),
      vehicles, rides: getAllRides(), studioProjects: (typeof studioProjectsGet === 'function' ? studioProjectsGet() : []), parking: parkGet(), rideSettings: rideSettings(), extras: rideExtrasGet(),
      preferences: backupSafePreferences(),
      rideDraft: backupReadJson('garaj_ride_draft'),
      pendingRide: pendingRide && pendingRide.id ? pendingRide : null
    };
  }
  async function exportData() {
    const via = await saveFileToast('garajim-yedek-' + todayStr() + '.json', 'application/json', JSON.stringify(backupBundle(), null, 2), 'Yedek');
    if (via !== 'cancel') { localStorage.setItem('garaj_last_backup', todayStr()); updateBackupInfo(); achievementRecordActivity('backup'); achievementEvaluate('backup'); }
  }
  // Sürüş eklentileri (işaretler, kartlar, DNA, güzergâh sayacı, asfalt) — yedeğe dahil
  function rideExtrasGet() {
    const g = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
    return { pins: g(RIDE_PIN_KEY), cards: g(RIDE_CARDS_KEY), dna: g(RIDE_DNA_KEY), segments: g(RIDE_SEGMENT_KEY), asphalt: g(RIDE_ASPHALT_KEY), achievements: g(ACHIEVEMENT_KEY), activity: g(ACHIEVEMENT_ACTIVITY_KEY), odoHistory: g(ACHIEVEMENT_ODO_KEY) };
  }
  function rideExtrasMerge(x) {
    const get = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
    const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
    const mergeList = (k, inc, cap) => { if (!Array.isArray(inc)) return; const cur = Array.isArray(get(k)) ? get(k) : [], have = new Set(cur.map(o => o && o.id)); set(k, cur.concat(inc.filter(o => o && o.id && !have.has(o.id))).slice(0, cap)); };
    mergeList(RIDE_PIN_KEY, x.pins, 300); mergeList(RIDE_CARDS_KEY, x.cards, 150);
    if (x.dna && !get(RIDE_DNA_KEY)) set(RIDE_DNA_KEY, x.dna);
    if (x.segments && !get(RIDE_SEGMENT_KEY)) set(RIDE_SEGMENT_KEY, x.segments);
    if (Array.isArray(x.asphalt)) { const cur = Array.isArray(get(RIDE_ASPHALT_KEY)) ? get(RIDE_ASPHALT_KEY) : []; if (!cur.length) set(RIDE_ASPHALT_KEY, x.asphalt.slice(0, 500)); }
    achievementMergeBackup(x);
  }
  // Sürüşleri kimliğe göre birleştir: mevcut sürüşler asla silinmez
  function mergeRides(incoming) {
    const have = new Set(getAllRides().map(r => r.id));
    let all = getAllRides().concat(incoming.filter(r => r && r.id && r.date && !have.has(r.id)));
    all.sort((a, b) => new Date(b.date) - new Date(a.date));
    all = all.slice(0, 150);
    for (;;) {
      try { localStorage.setItem('garaj_rides', JSON.stringify(all)); break; }
      catch (e) { if (all.length <= 1) break; all = all.slice(0, Math.max(1, all.length - 5)); }
    }
  }
  function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const raw = JSON.parse(r.result);
        const bundle = raw && !Array.isArray(raw) && raw.app === 'garajim' && Array.isArray(raw.vehicles);
        const data = bundle ? raw.vehicles : raw;
        if (!Array.isArray(data) || data.length > 500) throw new Error('Dosya biçimi veya kayıt sayısı geçersiz');
        if (!data.every(v => v && typeof v === 'object' && !Array.isArray(v))) throw new Error('Her araç kaydı nesne olmalı');
        const rides = bundle && Array.isArray(raw.rides) ? raw.rides : [];
        if (!confirm(data.length + ' araç' + (rides.length ? ' ve ' + rides.length + ' sürüş' : '') + ' yüklenecek. Araç listen yenisiyle değişir; cihazdaki kayıtlı sürüşlerin korunur. Devam?')) return;
        vehicles = data.map(v => ({...v, id: v.id || ('import-' + Math.random().toString(36).slice(2) + Date.now().toString(36))}));
        if (rides.length) mergeRides(rides);
        if (bundle && raw.extras) rideExtrasMerge(raw.extras);
        if (bundle && Array.isArray(raw.studioProjects)) {
          const localStudio = (typeof studioProjectsGet === 'function' ? studioProjectsGet() : []);
          const knownStudio = new Set(localStudio.map(p => String(p.id)));
          const importedStudio = raw.studioProjects.filter(p => p && p.id && !knownStudio.has(String(p.id))).slice(0, 80);
          try { localStorage.setItem('garaj_studio_projects', JSON.stringify(localStudio.concat(importedStudio).slice(0, 80))); } catch (e) { toast('Araçlar yüklendi; Studio projeleri depolama sınırı nedeniyle eklenemedi.'); }
        }
        if (bundle && raw.parking && typeof raw.parking.lat === 'number' && !parkGet()) { try { localStorage.setItem(PARK_KEY, JSON.stringify(raw.parking)); } catch (x) {} }
        if (bundle && raw.rideSettings && !localStorage.getItem('garaj_ride_settings')) { try { localStorage.setItem('garaj_ride_settings', JSON.stringify(raw.rideSettings)); } catch (x) {} }
        // Sadece boş cihazda varsayılanları tamamla; mevcut tema/hatırlatma tercihlerini ezme.
        let restoredPreferences = false;
        if (bundle && raw.preferences && typeof raw.preferences === 'object') {
          const pref = raw.preferences;
          if (!localStorage.getItem('garaj_theme') && ['dark', 'light', 'auto'].includes(pref.theme)) { localStorage.setItem('garaj_theme', pref.theme); restoredPreferences = true; }
          if (!localStorage.getItem('garaj_pack') && THEME_PACKS.some(p => p.id === pref.pack)) { localStorage.setItem('garaj_pack', pref.pack); restoredPreferences = true; }
          if (!localStorage.getItem('garaj_remind_days') && Number.isFinite(Number(pref.remindDays)) && Number(pref.remindDays) >= 1 && Number(pref.remindDays) <= 365) { localStorage.setItem('garaj_remind_days', String(Number(pref.remindDays))); restoredPreferences = true; }
        }
        // Yarım sürüşü ve bekleyen özeti yalnızca bu cihazda karşılığı yoksa getir; aktif oturumu ezme.
        let restoredDraft = false, restoredPending = false;
        if (bundle && raw.rideDraft && raw.rideDraft.startedAt && Array.isArray(raw.rideDraft.pts) && raw.rideDraft.pts.length <= 6000
            && !ride.running && !ride.startedAt && !localStorage.getItem('garaj_ride_draft')) {
          const d = raw.rideDraft;
          const pts = d.pts.filter(p => Array.isArray(p) && p.length >= 2 && Number.isFinite(Number(p[0])) && Number.isFinite(Number(p[1]))
            && Math.abs(Number(p[0])) <= 90 && Math.abs(Number(p[1])) <= 180).slice(-6000);
          const safeDraft = { startedAt: d.startedAt, dist: Math.max(0, Number(d.dist) || 0), elapsed: Math.max(0, Number(d.elapsed) || 0),
            maxSpeed: Math.max(0, Number(d.maxSpeed) || 0), pts, startCoord: d.startCoord || null, running: false, paused: true,
            vehicleId: d.vehicleId == null ? null : String(d.vehicleId) };
          try { localStorage.setItem('garaj_ride_draft', JSON.stringify(safeDraft)); restoredDraft = true; } catch (x) {}
        }
        if (bundle && raw.pendingRide && raw.pendingRide.id && !localStorage.getItem('garaj_ride_watch_pending')
            && (!ride.pendingSummary || ride.pendingSummary._previewOnly)) {
          try {
            localStorage.setItem('garaj_ride_watch_pending', JSON.stringify(raw.pendingRide));
            ride.pendingSummary = raw.pendingRide;
            restoredPending = true;
          } catch (x) {}
        }
        persist(); renderList();
        if (restoredPreferences) { try { applyTheme(); } catch (x) {} }
        if (restoredPending) { try { rideWearPush(); } catch (x) {} }
        if (restoredDraft) setTimeout(() => { try { rideTryRecover(); } catch (x) {} }, 250);
        const recovery = [restoredDraft ? 'yarım sürüş taslağı' : '', restoredPending ? 'bekleyen sürüş özeti' : ''].filter(Boolean);
        try { achievementEvaluate('import', { silent: true }); } catch (x) {}
        toast('Geri yükleme tamam' + (rides.length ? ' · ' + rides.length + ' sürüş' : '') + (recovery.length ? ' · ' + recovery.join(' + ') : ''));
      } catch { alert('Geçersiz dosya'); }
    };
    r.readAsText(file);
    e.target.value = '';
  }

  function updateBackupInfo() {
    const el = document.getElementById('backupInfo');
    if (!el) return;
    const last = localStorage.getItem('garaj_last_backup');
    if (!last) { el.textContent = 'Son yedek: hiç alınmamış — düzenli yedek al'; el.classList.add('text-amber-400'); return; }
    const days = daysBetween(last, todayStr());
    el.classList.remove('text-amber-400', 'text-red-400');
    if (days >= 30) { el.textContent = `Son yedek: ${last} (${days} gün önce) — yedek almanı öneririm`; el.classList.add('text-red-400'); }
    else if (days >= 14) { el.textContent = `Son yedek: ${last} (${days} gün önce)`; el.classList.add('text-amber-400'); }
    else el.textContent = `Son yedek: ${last} (${days === 0 ? 'bugün' : days + ' gün önce'})`;
  }

  function exportCSV() {
    const rows = [['Plaka', 'Marka', 'Model', 'Tarih', 'Kategori', 'Açıklama', 'KM', 'Tutar']];
    vehicles.forEach(v => {
      (v.history || []).forEach(h => {
        rows.push([
          v.plate || '', v.brand || '', v.model || '',
          h.date || '', cats[catOf(h)]?.n || h.cat || '', h.desc || '',
          h.km || '', h.cost || ''
        ]);
      });
    });
    if (rows.length === 1) { toast('İndirilecek masraf kaydı yok'); return; }
    const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
    saveFileToast('garajim-masraflar-' + todayStr() + '.csv', 'text/csv;charset=utf-8', '\ufeff' + csv, 'CSV');
  }

  function exportAllPDF() {
    if (!vehicles.length) { toast('Araç yok'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Garajım - Tüm Araçlar Raporu', 14, 18);
    doc.setFontSize(10);
    doc.text('Tarih: ' + todayStr() + '  ·  ' + vehicles.length + ' araç', 14, 26);
    let y = 34;
    vehicles.forEach((v, idx) => {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.setTextColor(200, 40, 40);
      doc.text((v.plate || '—') + '  ' + (v.brand || '') + ' ' + (v.model || ''), 14, y);
      doc.setTextColor(0);
      doc.setFontSize(9);
      y += 6;
      doc.text('KM: ' + formatKm(v.km) + '   Toplam masraf: ' + fmtTL(totalCost(v)), 14, y);
      y += 5;
      const hist = (v.history || []).slice().reverse().slice(0, 8);
      if (hist.length) {
        doc.autoTable({
          startY: y,
          head: [['Tarih', 'Kategori', 'Açıklama', 'Tutar']],
          body: hist.map(h => [h.date || '', cats[catOf(h)]?.n || '', (h.desc || '').slice(0, 40), h.cost ? formatMoney(h.cost) : '']),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [239, 68, 68] },
          margin: { left: 14, right: 14 }
        });
        y = doc.lastAutoTable.finalY + 10;
      } else {
        doc.text('Masraf kaydı yok', 14, y);
        y += 10;
      }
      if (idx < vehicles.length - 1) { doc.setDrawColor(200); doc.line(14, y, 196, y); y += 8; }
    });
    savePdf(doc, 'garajim-tum-rapor-' + todayStr() + '.pdf');
  }

  // ---------- TÜKETİM GRAFİĞİ ----------
  let fuelChart = null;
  function renderFuelChart(series) {
    setTimeout(() => {
      if (fuelChart) { fuelChart.destroy(); fuelChart = null; }
      const ctx = document.getElementById('fuelChart');
      if (!ctx || !series.length) return;
      const fmtD = d => { const x = new Date(d); return isNaN(x) ? d : x.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }); };
      const f1 = n => n.toFixed(1).replace('.', ',');
      const avg = series.reduce((s, p) => s + p.v, 0) / series.length;
      fuelChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: series.map(p => fmtD(p.d)),
          datasets: [
            { data: series.map(p => +p.v.toFixed(2)), borderColor: '#fbbf24', backgroundColor: 'rgba(251,191,36,0.15)', fill: true, tension: 0.35, pointRadius: 4, pointBackgroundColor: '#fbbf24', borderWidth: 2 },
            { data: series.map(() => +avg.toFixed(2)), borderColor: 'rgba(148,163,184,0.6)', borderDash: [5, 4], borderWidth: 1.5, pointRadius: 0, fill: false }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: c => c.datasetIndex === 0 ? f1(c.parsed.y) + ' L/100 km' : 'Ortalama ' + f1(c.parsed.y) } }
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
            y: { grid: { color: isLight() ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b', font: { size: 10 } } }
          }
        }
      });
    }, 80);
  }

  // ---------- TEMA PAKETLERİ ----------
  const THEME_PACKS = [
    {
      id: 'dark-red', name: 'Klasik Koyu', desc: 'Siyah + kırmızı',
      bg: '#0a0a0a', surface: '#111', surface2: '#1a1a1a', card: 'rgba(255,255,255,0.05)',
      border: 'rgba(255,255,255,0.10)', text: '#f1f5f9', muted: '#94a3b8',
      accent: '#ef4444', accentDark: '#dc2626', rgb: '239,68,68',
      input: '#1a1a1a', header: 'rgba(10,10,10,0.95)', modal: 'rgba(0,0,0,0.85)', btnText: '#fff',
      preview: ['#0a0a0a','#ef4444','#1a1a1a','#111']
    },
    {
      id: 'white-red', name: 'Beyaz + Kırmızı', desc: 'Açık zemin, kırmızı vurgu',
      bg: '#f5f5f7', surface: '#ffffff', surface2: '#ffffff', card: 'rgba(0,0,0,0.04)',
      border: 'rgba(0,0,0,0.10)', text: '#0f172a', muted: '#64748b',
      accent: '#e11d48', accentDark: '#be123c', rgb: '225,29,72',
      input: '#ffffff', header: 'rgba(245,245,247,0.96)', modal: 'rgba(15,23,42,0.4)', btnText: '#fff',
      preview: ['#f5f5f7','#e11d48','#ffffff','#ffe4e6']
    },
    {
      id: 'gunmetal', name: 'Metalik Gri', desc: 'Gunmetal + çelik mavi',
      bg: '#12141a', surface: '#1c1f28', surface2: '#252a36', card: 'rgba(148,163,184,0.08)',
      border: 'rgba(148,163,184,0.18)', text: '#e2e8f0', muted: '#94a3b8',
      accent: '#64748b', accentDark: '#475569', rgb: '100,116,139',
      input: '#252a36', header: 'rgba(18,20,26,0.95)', modal: 'rgba(0,0,0,0.8)', btnText: '#fff',
      preview: ['#12141a','#64748b','#252a36','#94a3b8']
    },
    {
      id: 'gold', name: 'Metalik Altın', desc: 'Siyah + altın',
      bg: '#0c0a09', surface: '#1c1917', surface2: '#292524', card: 'rgba(251,191,36,0.08)',
      border: 'rgba(251,191,36,0.2)', text: '#fafaf9', muted: '#a8a29e',
      accent: '#eab308', accentDark: '#ca8a04', rgb: '234,179,8',
      input: '#292524', header: 'rgba(12,10,9,0.95)', modal: 'rgba(0,0,0,0.85)', btnText: '#1c1917',
      preview: ['#0c0a09','#eab308','#292524','#a16207']
    },
    {
      id: 'carbon-orange', name: 'Carbon Turuncu', desc: 'Karbon siyah + turuncu',
      bg: '#0a0a0a', surface: '#141414', surface2: '#1f1f1f', card: 'rgba(249,115,22,0.07)',
      border: 'rgba(249,115,22,0.2)', text: '#fafafa', muted: '#a3a3a3',
      accent: '#f97316', accentDark: '#ea580c', rgb: '249,115,22',
      input: '#1f1f1f', header: 'rgba(10,10,10,0.95)', modal: 'rgba(0,0,0,0.85)', btnText: '#fff',
      preview: ['#0a0a0a','#f97316','#1f1f1f','#431407']
    },
    {
      id: 'ocean', name: 'Okyanus', desc: 'Lacivert + turkuaz',
      bg: '#0b1220', surface: '#111827', surface2: '#1e293b', card: 'rgba(56,189,248,0.07)',
      border: 'rgba(56,189,248,0.18)', text: '#e0f2fe', muted: '#7dd3fc',
      accent: '#0ea5e9', accentDark: '#0284c7', rgb: '14,165,233',
      input: '#1e293b', header: 'rgba(11,18,32,0.95)', modal: 'rgba(0,0,0,0.85)', btnText: '#fff',
      preview: ['#0b1220','#0ea5e9','#1e293b','#0369a1']
    },
    {
      id: 'forest', name: 'Orman', desc: 'Koyu yeşil + emerald',
      bg: '#0a120e', surface: '#102018', surface2: '#1a2e24', card: 'rgba(52,211,153,0.08)',
      border: 'rgba(52,211,153,0.18)', text: '#ecfdf5', muted: '#6ee7b7',
      accent: '#10b981', accentDark: '#059669', rgb: '16,185,129',
      input: '#1a2e24', header: 'rgba(10,18,14,0.95)', modal: 'rgba(0,0,0,0.85)', btnText: '#fff',
      preview: ['#0a120e','#10b981','#1a2e24','#065f46']
    },
    {
      id: 'royal', name: 'Royal Mor', desc: 'Lacivert + mor',
      bg: '#0f0a1a', surface: '#1a1229', surface2: '#2e1065', card: 'rgba(167,139,250,0.1)',
      border: 'rgba(167,139,250,0.22)', text: '#f5f3ff', muted: '#c4b5fd',
      accent: '#8b5cf6', accentDark: '#7c3aed', rgb: '139,92,246',
      input: '#2e1065', header: 'rgba(15,10,26,0.95)', modal: 'rgba(0,0,0,0.85)', btnText: '#fff',
      preview: ['#0f0a1a','#8b5cf6','#2e1065','#4c1d95']
    },
    {
      id: 'rose-gold', name: 'Rose Gold', desc: 'Koyu + rose gold',
      bg: '#140f10', surface: '#1f1719', surface2: '#2a1f22', card: 'rgba(244,114,182,0.08)',
      border: 'rgba(244,114,182,0.2)', text: '#fdf2f8', muted: '#f9a8d4',
      accent: '#f472b6', accentDark: '#db2777', rgb: '244,114,182',
      input: '#2a1f22', header: 'rgba(20,15,16,0.95)', modal: 'rgba(0,0,0,0.85)', btnText: '#fff',
      preview: ['#140f10','#f472b6','#2a1f22','#9d174d']
    },
    {
      id: 'snow-blue', name: 'Kar + Mavi', desc: 'Beyaz zemin, mavi vurgu',
      bg: '#f0f7ff', surface: '#ffffff', surface2: '#ffffff', card: 'rgba(37,99,235,0.06)',
      border: 'rgba(37,99,235,0.15)', text: '#0c1929', muted: '#64748b',
      accent: '#2563eb', accentDark: '#1d4ed8', rgb: '37,99,235',
      input: '#ffffff', header: 'rgba(240,247,255,0.96)', modal: 'rgba(15,23,42,0.4)', btnText: '#fff',
      preview: ['#f0f7ff','#2563eb','#ffffff','#dbeafe']
    },
    {
      id: 'cream-brown', name: 'Krem + Kahve', desc: 'Sıcak krem, kahverengi',
      bg: '#faf6f1', surface: '#ffffff', surface2: '#fff7ed', card: 'rgba(180,83,9,0.06)',
      border: 'rgba(180,83,9,0.15)', text: '#1c1410', muted: '#78716c',
      accent: '#b45309', accentDark: '#92400e', rgb: '180,83,9',
      input: '#ffffff', header: 'rgba(250,246,241,0.96)', modal: 'rgba(28,20,16,0.4)', btnText: '#fff',
      preview: ['#faf6f1','#b45309','#ffffff','#ffedd5']
    },
    {
      id: 'neon-mint', name: 'Neon Mint', desc: 'Siyah + neon yeşil',
      bg: '#050805', surface: '#0c140f', surface2: '#122018', card: 'rgba(74,222,128,0.08)',
      border: 'rgba(74,222,128,0.25)', text: '#f0fdf4', muted: '#86efac',
      accent: '#4ade80', accentDark: '#22c55e', rgb: '74,222,128',
      input: '#122018', header: 'rgba(5,8,5,0.95)', modal: 'rgba(0,0,0,0.85)', btnText: '#052e16',
      preview: ['#050805','#4ade80','#122018','#14532d']
    },
    {
      id: 'mist-teal', name: 'Sisli Turkuaz', desc: 'Yumuşak petrol ve soluk turkuaz',
      bg: '#101a1b', surface: '#192526', surface2: '#243334', card: 'rgba(143,183,176,0.07)',
      border: 'rgba(143,183,176,0.15)', text: '#e3eeeb', muted: '#a6beb8',
      accent: '#5f938a', accentDark: '#47766f', rgb: '95,147,138',
      input: '#243334', header: 'rgba(16,26,27,0.96)', modal: 'rgba(0,0,0,0.82)', btnText: '#f7fbf9',
      preview: ['#101a1b','#5f938a','#243334','#a6beb8']
    },
    {
      id: 'lavender-dusk', name: 'Alacakaranlık Lavanta', desc: 'Dingin mürdüm ve gri lavanta',
      bg: '#18171d', surface: '#24222b', surface2: '#302d39', card: 'rgba(154,136,184,0.07)',
      border: 'rgba(181,166,207,0.15)', text: '#ece8f1', muted: '#b6aec4',
      accent: '#9a88b8', accentDark: '#7b6898', rgb: '154,136,184',
      input: '#302d39', header: 'rgba(24,23,29,0.96)', modal: 'rgba(0,0,0,0.82)', btnText: '#201b29',
      preview: ['#18171d','#9a88b8','#302d39','#b6aec4']
    },
    {
      id: 'slate-blue', name: 'Yumuşak Arduvaz', desc: 'Dumanlı mavi ve grafit',
      bg: '#131a22', surface: '#1d2630', surface2: '#273441', card: 'rgba(147,177,199,0.07)',
      border: 'rgba(147,177,199,0.15)', text: '#e5ebf1', muted: '#a9bac8',
      accent: '#7798b2', accentDark: '#5d7e98', rgb: '119,152,178',
      input: '#273441', header: 'rgba(19,26,34,0.96)', modal: 'rgba(0,0,0,0.82)', btnText: '#14212b',
      preview: ['#131a22','#7798b2','#273441','#a9bac8']
    },
    {
      id: 'soft-sage', name: 'Adaçayı', desc: 'Yumuşak yeşil-gri, açık ve sakin',
      bg: '#e9eee5', surface: '#f5f7f1', surface2: '#dfe7da', card: 'rgba(94,121,95,0.06)',
      border: 'rgba(94,121,95,0.16)', text: '#28352c', muted: '#647364',
      accent: '#5e795f', accentDark: '#4b654d', rgb: '94,121,95',
      input: '#f5f7f1', header: 'rgba(233,238,229,0.97)', modal: 'rgba(34,45,35,0.38)', btnText: '#ffffff',
      preview: ['#e9eee5','#5e795f','#f5f7f1','#dfe7da']
    },
    {
      id: 'warm-sand', name: 'Sıcak Kum', desc: 'Krem, kum ve doğal kahve',
      bg: '#efe7db', surface: '#faf5ec', surface2: '#e5d8c6', card: 'rgba(137,107,77,0.06)',
      border: 'rgba(137,107,77,0.15)', text: '#342a20', muted: '#756552',
      accent: '#896b4d', accentDark: '#705438', rgb: '137,107,77',
      input: '#faf5ec', header: 'rgba(239,231,219,0.97)', modal: 'rgba(52,42,32,0.38)', btnText: '#ffffff',
      preview: ['#efe7db','#896b4d','#faf5ec','#e5d8c6']
    },
    {
      id: 'dusty-rose', name: 'Soluk Gül', desc: 'Toz pembe ve sıcak gri',
      bg: '#f1e7e7', surface: '#fbf4f3', surface2: '#e7d7d8', card: 'rgba(149,94,103,0.06)',
      border: 'rgba(149,94,103,0.15)', text: '#382b2e', muted: '#78666a',
      accent: '#955e67', accentDark: '#794750', rgb: '149,94,103',
      input: '#fbf4f3', header: 'rgba(241,231,231,0.97)', modal: 'rgba(56,43,46,0.38)', btnText: '#ffffff',
      preview: ['#f1e7e7','#955e67','#fbf4f3','#e7d7d8']
    },
    {
      id: 'moss-stone', name: 'Yosun ve Taş', desc: 'Mat taş grisi ve yumuşak yosun',
      bg: '#171b17', surface: '#222720', surface2: '#2d332a', card: 'rgba(168,182,151,0.06)',
      border: 'rgba(168,182,151,0.14)', text: '#e5e9df', muted: '#afb8a6',
      accent: '#84976f', accentDark: '#697d55', rgb: '132,151,111',
      input: '#2d332a', header: 'rgba(23,27,23,0.96)', modal: 'rgba(0,0,0,0.82)', btnText: '#182016',
      preview: ['#171b17','#84976f','#2d332a','#afb8a6']
    },
    {
      id: 'plum-ash', name: 'Mürdüm Grisi', desc: 'Küllü mürdüm ve dumanlı lila',
      bg: '#1b181d', surface: '#262128', surface2: '#332d36', card: 'rgba(186,165,189,0.06)',
      border: 'rgba(186,165,189,0.14)', text: '#e9e3ea', muted: '#bbafbd',
      accent: '#9a7da1', accentDark: '#7d6384', rgb: '154,125,161',
      input: '#332d36', header: 'rgba(27,24,29,0.96)', modal: 'rgba(0,0,0,0.82)', btnText: '#211a23',
      preview: ['#1b181d','#9a7da1','#332d36','#bbafbd']
    },
    {
      id: 'copper-smoke', name: 'Bakır Dumanı', desc: 'Mat bakır ve koyu taş',
      bg: '#1c1917', surface: '#28231f', surface2: '#342e28', card: 'rgba(200,165,139,0.06)',
      border: 'rgba(200,165,139,0.14)', text: '#eee6df', muted: '#b8a99a',
      accent: '#a77d5d', accentDark: '#896346', rgb: '167,125,93',
      input: '#342e28', header: 'rgba(28,25,23,0.96)', modal: 'rgba(0,0,0,0.82)', btnText: '#251b14',
      preview: ['#1c1917','#a77d5d','#342e28','#b8a99a']
    },
    {
      id: 'blue-hour', name: 'Mavi Saat', desc: 'Sessiz gece mavisi ve gri-mavi',
      bg: '#121a27', surface: '#1a2636', surface2: '#25344a', card: 'rgba(152,175,209,0.06)',
      border: 'rgba(152,175,209,0.14)', text: '#e2eaf4', muted: '#a6b5cc',
      accent: '#7e97bd', accentDark: '#617ba2', rgb: '126,151,189',
      input: '#25344a', header: 'rgba(18,26,39,0.96)', modal: 'rgba(0,0,0,0.82)', btnText: '#172033',
      preview: ['#121a27','#7e97bd','#25344a','#a6b5cc']
    },
    {
      id: 'soft-olive', name: 'Yumuşak Zeytin', desc: 'Doğal zeytin ve kırık beyaz',
      bg: '#eceee3', surface: '#f7f8f1', surface2: '#e1e5d3', card: 'rgba(100,111,74,0.06)',
      border: 'rgba(100,111,74,0.15)', text: '#2e3629', muted: '#68725e',
      accent: '#646f4a', accentDark: '#505b38', rgb: '100,111,74',
      input: '#f7f8f1', header: 'rgba(236,238,227,0.97)', modal: 'rgba(46,54,41,0.36)', btnText: '#ffffff',
      preview: ['#eceee3','#646f4a','#f7f8f1','#e1e5d3']
    },
    {
      id: 'paper-ink', name: 'Kâğıt ve Mürekkep', desc: 'Yumuşak kâğıt grisi ve adaçayı',
      bg: '#ecebe4', surface: '#f7f6ef', surface2: '#dfdfd4', card: 'rgba(94,114,104,0.06)',
      border: 'rgba(94,114,104,0.15)', text: '#30322e', muted: '#696e67',
      accent: '#5e7268', accentDark: '#495d53', rgb: '94,114,104',
      input: '#f7f6ef', header: 'rgba(236,235,228,0.97)', modal: 'rgba(48,50,46,0.36)', btnText: '#ffffff',
      preview: ['#ecebe4','#5e7268','#f7f6ef','#dfdfd4']
    }
  ];

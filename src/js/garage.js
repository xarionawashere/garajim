// Garage, vehicle records, service, fuel, and receipts.
// Classic script: globals are shared with other files in index.html's intentional load order.
function setFilter(f) {
    currentFilter = f;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    renderList();
  }

  // ---------- LIST ----------
  function renderList() {
    const q = (document.getElementById('search').value || '').toLowerCase().trim();
    let list = vehicles.slice();

    if (currentFilter === 'alert') list = list.filter(v => getAlerts(v).length > 0);
    if (currentFilter === 'month') {
      const ym = todayStr().slice(0, 7);
      list = list.filter(v => (v.history || []).some(h => (h.date || '').startsWith(ym)));
    }
    if (q) list = list.filter(v => (v.plate + ' ' + v.brand + ' ' + v.model + ' ' + (v.color||'')).toLowerCase().includes(q));

    const totalKm = vehicles.reduce((s, v) => s + (Number(v.km) || 0), 0);
    let alertCount = 0;
    vehicles.forEach(v => { if (getAlerts(v).length) alertCount++; });

    document.getElementById('stats').textContent = vehicles.length === 0 ? '0 araç' : vehicles.length + ' araç';
    document.getElementById('statTotalKm').textContent = totalKm.toLocaleString('tr-TR');
    document.getElementById('statAlerts').textContent = alertCount;
    document.getElementById('statCost').textContent = formatMoney(vehicles.reduce((s, v) => s + totalCost(v), 0)) || '0 ₺';

    const mini = document.getElementById('miniStats');
    const empty = document.getElementById('emptyState');
    const container = document.getElementById('vehicleList');

    if (vehicles.length === 0) {
      mini.classList.add('hidden');
      empty.classList.remove('hidden'); empty.classList.add('flex');
      container.innerHTML = '';
      return;
    }
    mini.classList.remove('hidden');
    empty.classList.add('hidden'); empty.classList.remove('flex');

    if (list.length === 0) {
      container.innerHTML = '<p class="text-center text-slate-500 py-12">Sonuç bulunamadı</p>';
      return;
    }

    container.innerHTML = list.map(v => {
      const prog = serviceProgress(v);
      const alerts = getAlerts(v);
      const hs = healthScore(v);
      const icon = typeIcons[v.type] || 'fa-car';
      const photo = garajimSafeImageSrc(v.photo);
      let barColor = 'bg-emerald-500';
      if (prog) {
        if (prog.overdue) barColor = 'bg-red-500';
        else if (prog.warning) barColor = 'bg-amber-500';
      }
      return `
      <div onclick="openDetail(${garajimInlineJsArg(v.id)})" class="card card-premium rounded-2xl p-4 cursor-pointer">
        <div class="flex gap-3">
          <div class="relative w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-white/10 ${photo ? '' : 'photo-placeholder flex items-center justify-center'}">
            ${photo ? `<img src="${photo}" class="w-full h-full object-cover">` : `<i class="fa-solid ${icon} text-xl text-slate-500"></i>`}
            <div class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full text-[9px] font-bold flex items-center justify-center border-2 border-[var(--bg)]" style="background:${hs.color};color:#fff">${hs.score}</div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-bold tracking-wide">${garajimHtmlEsc(v.plate || '—')}</span>
              ${v.color ? `<span class="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-400">${garajimHtmlEsc(v.color)}</span>` : ''}
            </div>
            <p class="text-slate-400 text-sm mt-0.5">${garajimHtmlEsc(v.brand || '')} ${garajimHtmlEsc(v.model || '')} ${v.year ? '· ' + garajimHtmlEsc(v.year) : ''}</p>
          </div>
          <div class="text-right shrink-0">
            <p class="font-semibold text-sm">${formatKm(v.km)}</p>
            ${totalCost(v) ? `<p class="text-[11px] text-red-400 mt-0.5 font-semibold">${fmtTL(totalCost(v))}</p>` : ''}
          </div>
        </div>
        ${prog ? `
        <div class="mt-3">
          <div class="flex justify-between text-[11px] text-slate-500 mb-1">
            <span>Sonraki bakıma</span>
            <span class="${prog.overdue ? 'text-red-400' : prog.warning ? 'text-amber-400' : 'text-slate-400'}">
              ${prog.overdue ? 'Gecikti ' + formatKm(Math.abs(prog.remaining)) : formatKm(prog.remaining)}
            </span>
          </div>
          <div class="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div class="progress-bar h-full ${barColor} rounded-full" style="width:${Math.min(100, prog.percent)}%"></div>
          </div>
        </div>` : ''}
        ${alerts.length ? `
        <div class="mt-2.5 flex flex-wrap gap-1.5">
          ${alerts.slice(0, 3).map(a => `<span class="text-[10px] px-2 py-1 rounded-lg ${a.includes('dolmuş') || a.includes('gecikti') ? 'status-danger' : 'status-warn'}">${garajimHtmlEsc(a)}</span>`).join('')}
          ${alerts.length > 3 ? `<span class="text-[10px] px-2 py-1 rounded-lg bg-white/10 text-slate-400">+${alerts.length-3}</span>` : ''}
        </div>` : ''}
      </div>`;
    }).join('');
  }

  // ---------- DETAIL ----------
  function openDetail(id) {
    currentId = id;
    const v = vehicles.find(x => x.id === id);
    if (!v) return;
    document.getElementById('listView').classList.add('hidden');
    document.getElementById('socialView').classList.add('hidden');
    const av = document.getElementById('assistantView');
    if (av) av.classList.add('hidden');
    document.getElementById('detailView').classList.remove('hidden');
    const bn = document.getElementById('bottomNav');
    if (bn) bn.classList.add('hidden');
    document.getElementById('detailPlate').textContent = v.plate || '—';
    document.getElementById('detailBrandModel').textContent = `${v.brand || ''} ${v.model || ''} ${v.year ? '· ' + v.year : ''}`;

    const prog = serviceProgress(v);
    const icon = typeIcons[v.type] || 'fa-car';
    const photo = garajimSafeImageSrc(v.photo);
    const vehicleIdArg = garajimInlineJsArg(v.id);
    const alerts = getAlerts(v);
    const hs = healthScore(v);
    const est90 = estimate90Days(v);
    let barColor = 'bg-emerald-500', barWidth = 0;
    if (prog) {
      barWidth = Math.min(100, prog.percent);
      if (prog.overdue) barColor = 'bg-red-500';
      else if (prog.warning) barColor = 'bg-amber-500';
    }

    const history = (v.history || []).map((h, i) => ({ ...h, _i: i })).reverse();
    const hist = v.history || [];
    const total = totalCost(v);
    const yearNow = String(new Date().getFullYear());
    const yearTotal = hist.filter(h => (h.date || '').startsWith(yearNow)).reduce((s, h) => s + (Number(h.cost) || 0), 0);
    const byCat = {};
    hist.forEach(h => { const k = catOf(h); byCat[k] = (byCat[k] || 0) + (Number(h.cost) || 0); });
    const catRows = Object.entries(byCat).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]);

    // Monthly data for chart (last 12 months)
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      const label = d.toLocaleDateString('tr-TR', { month: 'short' });
      const sum = hist.filter(h => (h.date || '').startsWith(key)).reduce((s, h) => s + (Number(h.cost) || 0), 0);
      months.push({ key, label, sum });
    }

    const flogs = v.fuelLogs || [];
    const lastFuel = flogs[flogs.length - 1];
    const fuelNow = lastFuel ? { days: Math.max(0, daysBetween(lastFuel.date, todayStr())), km: Math.max(0, (Number(v.km) || 0) - (Number(lastFuel.km) || 0)) } : null;
    const fuelIntervals = flogs.map((f, i) => i === 0 ? null : fuelInterval(flogs[i - 1], f)).filter(Boolean);
    const avgDays = fuelIntervals.length ? fuelIntervals.reduce((s, x) => s + x.days, 0) / fuelIntervals.length : null;
    const avgKm = fuelIntervals.length ? fuelIntervals.reduce((s, x) => s + x.km, 0) / fuelIntervals.length : null;

    // Tüketim grafiği verisi (L/100 km)
    const fuelSeries = fuelIntervals.filter(x => x.l100).slice(-12).map(x => ({ d: x.to, v: x.l100 }));
    let fuelChartHtml = '';
    if (fuelSeries.length) {
      const vals = fuelSeries.map(p => p.v);
      const avgC = vals.reduce((a, b) => a + b, 0) / vals.length;
      const lastC = vals[vals.length - 1];
      let cSum = 0, kSum = 0;
      fuelIntervals.forEach((x, j) => {
        const c = Number((flogs[j + 1] || {}).cost) || 0;
        if (c > 0 && x.km > 0) { cSum += c; kSum += x.km; }
      });
      const f1 = n => n.toFixed(1).replace('.', ',');
      const chip = (lbl, val, cls) => `<div class="bg-black/40 rounded-xl p-2 text-center"><p class="text-[9px] text-slate-500">${lbl}</p><p class="text-sm font-bold ${cls || ''}">${val}</p></div>`;
      fuelChartHtml = `
        <p class="text-[10px] text-slate-500 uppercase mt-5 mb-2">Tüketim (L/100 km)</p>
        <div class="grid grid-cols-4 gap-2 mb-3">
          ${chip('Ortalama', f1(avgC), 'text-amber-400')}
          ${chip('Son', f1(lastC), lastC > avgC ? 'text-red-400' : 'text-emerald-400')}
          ${chip('En iyi', f1(Math.min(...vals)))}
          ${chip('En kötü', f1(Math.max(...vals)))}
        </div>
        <div class="chart-container" style="height:160px"><canvas id="fuelChart"></canvas></div>
        ${kSum ? `<p class="text-[11px] text-slate-500 mt-3 text-center">Yakıt maliyeti ortalama <b class="text-amber-400">${(cSum / kSum).toFixed(2).replace('.', ',')} ₺/km</b></p>` : ''}`;
    } else if (fuelIntervals.length) {
      fuelChartHtml = `<p class="text-[11px] text-slate-500 mt-4 text-center">Tüketim grafiği için dolumlarda litre bilgisini de gir.</p>`;
    }


    const planDisplay = planDefs.map(p => {
      let dateVal = v[p.key] || null;
      let days = daysLeft(dateVal);
      let statusClass = 'text-slate-500', statusTxt = 'Tarih yok';
      if (days !== null) {
        if (days < 0) { statusClass = 'text-red-400'; statusTxt = Math.abs(days) + ' gün geçti'; }
        else if (days < 7) { statusClass = 'text-red-400'; statusTxt = days + ' gün'; }
        else if (days <= getRemindDays()) { statusClass = 'text-amber-400'; statusTxt = days + ' gün'; }
        else { statusClass = 'text-emerald-400'; statusTxt = days + ' gün'; }
      }
      return { ...p, dateVal, days, statusClass, statusTxt };
    });

    document.getElementById('detailContent').innerHTML = `
      <div class="relative rounded-3xl overflow-hidden border border-white/10">
        <div class="aspect-[16/10] ${photo ? '' : 'photo-placeholder flex items-center justify-center'}">
          ${photo ? `<img src="${photo}" class="w-full h-full object-cover">` : `<i class="fa-solid ${icon} text-6xl text-slate-600"></i>`}
        </div>
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
        <div class="absolute bottom-0 left-0 right-0 p-4 on-photo">
          <h3 class="text-2xl font-extrabold">${garajimHtmlEsc(v.plate || '—')}</h3>
          <p class="text-slate-300 text-sm">${garajimHtmlEsc(v.brand || '')} ${garajimHtmlEsc(v.model || '')} ${v.year ? '· ' + garajimHtmlEsc(v.year) : ''}</p>
        </div>
        ${alerts.length ? `<div class="absolute top-3 left-3"><span class="badge-red text-white text-[11px] font-semibold px-3 py-1.5 rounded-full">${garajimHtmlEsc(alerts[0])}</span></div>` : ''}
      </div>

      <div class="grid grid-cols-5 gap-2">
        <button onclick="openFuelModal()" class="flex flex-col items-center gap-1 py-3 rounded-2xl bg-white/5 border border-white/10">
          <i class="fa-solid fa-gas-pump text-amber-400"></i><span class="text-[10px] text-slate-400">Yakıt</span>
        </button>
        <button onclick="openServiceModal()" class="flex flex-col items-center gap-1 py-3 rounded-2xl bg-white/5 border border-white/10">
          <i class="fa-solid fa-wrench text-red-400"></i><span class="text-[10px] text-slate-400">Servis</span>
        </button>
        <button onclick="openRideForVehicle(currentId)" class="flex flex-col items-center gap-1 py-3 rounded-2xl bg-white/5 border border-white/10" title="Açık Dünya sürüş">
          <i class="fa-solid fa-motorcycle text-accent"></i><span class="text-[10px] text-slate-400">Sürüş</span>
        </button>
        <button onclick="openPlanModal()" class="flex flex-col items-center gap-1 py-3 rounded-2xl bg-white/5 border border-white/10">
          <i class="fa-solid fa-bell text-emerald-400"></i><span class="text-[10px] text-slate-400">Plan</span>
        </button>
        <button onclick="generatePDF()" class="flex flex-col items-center gap-1 py-3 rounded-2xl bg-white/5 border border-white/10">
          <i class="fa-solid fa-file-pdf text-rose-400"></i><span class="text-[10px] text-slate-400">PDF</span>
        </button>
      </div>
      <button type="button" onclick="setWidgetVehicle(${vehicleIdArg})" class="w-full text-[11px] text-slate-400 py-1"><i class="fa-solid fa-grip mr-1"></i>Widget'ta bu aracı göster</button>

      <div class="bg-white/5 rounded-2xl p-4 border border-white/10">
        <div class="flex items-center justify-between mb-3">
          <div>
            <p class="text-xs text-slate-500 uppercase">Güncel Kilometre</p>
            <p class="text-2xl font-extrabold mt-0.5">${formatKm(v.km)}</p>
          </div>
          <button onclick="openKmModal()" class="bg-red-500/15 text-red-400 border border-red-500/30 px-3 py-2 rounded-xl text-xs font-semibold">
            <i class="fa-solid fa-pen mr-1"></i> Güncelle
          </button>
        </div>
        ${prog ? `
        <div class="mt-2">
          <div class="flex justify-between text-xs mb-1.5">
            <span class="text-slate-500">Sonraki bakıma</span>
            <span class="font-semibold ${prog.overdue ? 'text-red-400' : prog.warning ? 'text-amber-400' : 'text-emerald-400'}">
              ${prog.overdue ? 'Gecikti ' + formatKm(Math.abs(prog.remaining)) : formatKm(prog.remaining)}
            </span>
          </div>
          <div class="h-2.5 bg-white/10 rounded-full overflow-hidden">
            <div class="progress-bar h-full ${barColor} rounded-full" style="width:${barWidth}%"></div>
          </div>
          ${(() => {
            const bakimlar = (v.history || []).filter(h => h.cat === 'bakim' && Number(h.cost) > 0);
            if (!bakimlar.length) return '';
            const avg = bakimlar.reduce((s, h) => s + Number(h.cost), 0) / bakimlar.length;
            return `<p class="text-[11px] text-slate-500 mt-2"><i class="fa-solid fa-calculator mr-1"></i>Tahmini sonraki bakım: <span class="text-slate-300 font-semibold">~${fmtTL(avg)}</span> <span class="text-slate-600">(${bakimlar.length} kayıt ort.)</span></p>`;
          })()}
        </div>` : ''}
      </div>

      <!-- Premium: Sağlık + 90 gün -->
      <div class="card-premium rounded-2xl p-4">
        <div class="flex items-center gap-4">
          <div class="relative w-16 h-16 rounded-full score-ring p-[3px] shrink-0" style="--score:${hs.score}">
            <div class="w-full h-full rounded-full flex flex-col items-center justify-center" style="background:var(--surface)">
              <span class="text-lg font-extrabold" style="color:${hs.color}">${hs.score}</span>
              <span class="text-[9px] text-slate-500">skor</span>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-bold" style="color:${hs.color}">${hs.label}</p>
            <p class="text-[11px] text-slate-500 mt-0.5">${hs.reasons.length ? hs.reasons.join(' · ') : 'Her şey yolunda görünüyor'}</p>
            <p class="text-[12px] mt-2"><span class="text-slate-500">90 gün tahmini:</span> <span class="font-bold text-accent">~${fmtTL(est90)}</span></p>
          </div>
        </div>
      </div>

      <!-- TCO -->
      ${(() => {
        const tco = computeTCO(v);
        return `<div class="bg-white/5 rounded-2xl p-4 border border-white/10">
          <div class="flex items-center justify-between mb-2">
            <p class="text-xs text-slate-500 uppercase">Sahip olma maliyeti (TCO)</p>
            <i class="fa-solid fa-coins text-amber-400"></i>
          </div>
          <div class="grid grid-cols-3 gap-2 text-center">
            <div class="bg-black/30 rounded-xl p-2.5">
              <p class="text-[10px] text-slate-500">Toplam</p>
              <p class="text-sm font-bold">${fmtTL(tco.totalCost)}</p>
            </div>
            <div class="bg-black/30 rounded-xl p-2.5">
              <p class="text-[10px] text-slate-500">Sürüş KM</p>
              <p class="text-sm font-bold">${tco.driven > 1 ? Math.round(tco.driven).toLocaleString('tr-TR') : '—'}</p>
            </div>
            <div class="bg-black/30 rounded-xl p-2.5">
              <p class="text-[10px] text-slate-500">₺/km</p>
              <p class="text-sm font-bold text-amber-400">${tco.perKm != null ? tco.perKm.toFixed(2).replace('.', ',') : '—'}</p>
            </div>
          </div>
          <p class="text-[10px] text-slate-600 mt-2">Yakıt + bakım/masraf kayıtlarından. Daha doğru ₺/km için KM ve masraf gir.</p>
        </div>`;
      })()}

      <!-- Bakım Planı -->
      <div class="bg-white/5 rounded-2xl p-4 border border-white/10">
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs text-slate-500 uppercase">Bakım Planı</p>
          <button onclick="openPlanModal()" class="text-xs text-accent font-semibold">Düzenle</button>
        </div>
        <div class="space-y-2.5">
          ${planDisplay.map(p => `
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                <i class="fa-solid ${p.icon} text-sm ${p.days !== null && p.days <= getRemindDays() ? 'text-red-400' : 'text-slate-400'}"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium">${p.label}</p>
                <p class="text-[11px] text-slate-500">${p.dateVal || p.desc}</p>
              </div>
              <div class="flex items-center gap-2">
                ${p.dateVal ? `<button type="button" onclick="addToCalendar(${garajimInlineJsArg((p.label || '') + ' — ' + (v.plate || ''))}, ${garajimInlineJsArg(p.dateVal)})" class="text-[10px] px-2 py-1 rounded-lg bg-white/5 text-slate-400">Takvim</button>` : ''}
                <span class="text-xs font-semibold ${p.statusClass}">${p.statusTxt}</span>
              </div>
            </div>`).join('')}
        </div>
      </div>

      <!-- Lastik -->
      <div class="bg-white/5 rounded-2xl p-4 border border-white/10">
        <p class="text-xs text-slate-500 uppercase mb-3">Lastik Durumu</p>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="bg-black/30 rounded-xl p-3">
            <p class="text-[11px] text-cyan-400 font-semibold mb-1"><i class="fa-solid fa-snowflake mr-1"></i>Kış</p>
            <p class="text-sm">${garajimHtmlEsc(v.kisLastikInfo || '—')}</p>
            <p class="text-xs text-slate-500 mt-1">${garajimHtmlEsc(v.kisLastigi || 'Tarih yok')} ${v.kisLastikDis ? '· ' + garajimHtmlEsc(v.kisLastikDis) + ' mm' : ''}</p>
          </div>
          <div class="bg-black/30 rounded-xl p-3">
            <p class="text-[11px] text-amber-400 font-semibold mb-1"><i class="fa-solid fa-sun mr-1"></i>Yaz</p>
            <p class="text-sm">${garajimHtmlEsc(v.yazLastikInfo || '—')}</p>
            <p class="text-xs text-slate-500 mt-1">${garajimHtmlEsc(v.yazLastigi || 'Tarih yok')} ${v.yazLastikDis ? '· ' + garajimHtmlEsc(v.yazLastikDis) + ' mm' : ''}</p>
          </div>
          <div class="bg-black/30 rounded-xl p-3">
            <p class="text-[11px] text-emerald-400 font-semibold mb-1"><i class="fa-solid fa-cloud-sun mr-1"></i>4 Mevsim</p>
            <p class="text-sm">${garajimHtmlEsc(v.dortMevsimInfo || '—')}</p>
            <p class="text-xs text-slate-500 mt-1">${garajimHtmlEsc(v.dortMevsim || 'Tarih yok')} ${v.dortMevsimDis ? '· ' + garajimHtmlEsc(v.dortMevsimDis) + ' mm' : ''}</p>
          </div>
        </div>
      </div>

      <!-- Yakıt -->
      <div class="bg-white/5 rounded-2xl p-4 border border-white/10">
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs text-slate-500 uppercase">Yakıt Takibi</p>
          <i class="fa-solid fa-gas-pump text-amber-400"></i>
        </div>
        <button onclick="openFuelModal()" class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 font-bold text-sm flex items-center justify-center gap-2">
          <i class="fa-solid fa-gas-pump"></i> Benzin Alındı
        </button>
        ${lastFuel ? `
        <div class="mt-4 bg-black/40 rounded-xl p-3.5">
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="text-[11px] text-slate-500">Son depo: ${lastFuel.date} · ${formatKm(lastFuel.km)}</p>
              <p class="text-[11px] text-slate-400 mt-0.5">${lastFuel.liters ? lastFuel.liters + ' L' : ''}${lastFuel.cost ? ' · ' + formatMoney(lastFuel.cost) : ''}</p>
            </div>
            ${lastFuel.receipt ? `<button onclick="openFuelReceiptByIndex(${flogs.length - 1})" class="w-12 h-12 rounded-lg overflow-hidden border border-white/10 shrink-0"><img src="${lastFuel.receipt}" class="w-full h-full object-cover"></button>` : ''}
          </div>
          <div class="grid grid-cols-2 gap-3 mt-2.5">
            <div><p class="text-2xl font-extrabold text-amber-400">${fuelNow.days}<span class="text-xs text-slate-500 ml-1">gün</span></p></div>
            <div><p class="text-2xl font-extrabold text-amber-400">${fuelNow.km.toLocaleString('tr-TR')}<span class="text-xs text-slate-500 ml-1">km</span></p></div>
          </div>
        </div>
        ${avgDays !== null ? `
        <div class="grid grid-cols-2 gap-2 mt-2">
          <div class="bg-black/40 rounded-xl p-2.5 text-center"><p class="text-[10px] text-slate-500">Ort. süre</p><p class="text-sm font-bold">${avgDays.toFixed(1).replace('.', ',')} gün</p></div>
          <div class="bg-black/40 rounded-xl p-2.5 text-center"><p class="text-[10px] text-slate-500">Ort. menzil</p><p class="text-sm font-bold">${Math.round(avgKm).toLocaleString('tr-TR')} km</p></div>
        </div>` : ''}
        ${(() => {
          const fs = fuelStats(v), cs = costStats(v);
          if (!fs && !cs) return '<p class="text-[11px] text-slate-500 mt-3">Tüketim (L/100 km) için en az iki "depoyu doldurdum" kaydı gir.</p>';
          let h = '';
          if (fs) {
            const chg = fs.change, col = chg == null ? 'text-slate-300' : chg > 15 ? 'text-red-400' : chg < -5 ? 'text-emerald-400' : 'text-slate-300';
            h += `<div class="grid grid-cols-3 gap-2 mt-2">
              <div class="bg-black/40 rounded-xl p-2.5 text-center"><p class="text-[10px] text-slate-500">Son depo</p><p class="text-sm font-bold text-amber-400">${fs.last.toFixed(1).replace('.', ',')}</p><p class="text-[9px] text-slate-600">L/100 km</p></div>
              <div class="bg-black/40 rounded-xl p-2.5 text-center"><p class="text-[10px] text-slate-500">Ortalama</p><p class="text-sm font-bold">${fs.avg.toFixed(1).replace('.', ',')}</p><p class="text-[9px] text-slate-600">L/100 km</p></div>
              <div class="bg-black/40 rounded-xl p-2.5 text-center"><p class="text-[10px] text-slate-500">Değişim</p><p class="text-sm font-bold ${col}">${chg == null ? '—' : (chg > 0 ? '+' : '') + Math.round(chg) + '%'}</p><p class="text-[9px] text-slate-600">${fs.n} dönem</p></div>
            </div>`;
          }
          const boxes = [];
          if (fs && fs.cost100 != null) boxes.push(['Yakıt maliyeti', formatMoney(Math.round(fs.cost100)), '/100 km']);
          if (cs) boxes.push(['Tüm masraflar', formatMoney(Math.round(cs.per100)), '/100 km']);
          if (boxes.length) h += `<div class="grid ${boxes.length === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-2 mt-2">` + boxes.map(b => `<div class="bg-black/40 rounded-xl p-2.5 text-center"><p class="text-[10px] text-slate-500">${b[0]}</p><p class="text-sm font-bold text-amber-400">${b[1]}</p><p class="text-[9px] text-slate-600">${b[2]}</p></div>`).join('') + `</div>`;
          return h;
        })()}
        ${(() => {
          const idxs = [];
          (flogs || []).forEach((f, i) => { if (f.receipt) idxs.push(i); });
          const last = idxs.slice(-4).reverse();
          if (!last.length) return '';
          return `<div class="mt-3"><p class="text-[10px] text-slate-500 mb-1.5">Fişler</p>
            <div class="flex gap-2 overflow-x-auto pb-1">
              ${last.map(i => `<button onclick="openFuelReceiptByIndex(${i})" class="w-14 h-14 rounded-lg overflow-hidden border border-white/10 shrink-0"><img src="${garajimSafeImageSrc(flogs[i].receipt)}" class="w-full h-full object-cover"></button>`).join('')}
            </div></div>`;
        })()}
        ${fuelChartHtml}` : '<p class="text-xs text-slate-600 mt-3 text-center">Henüz yakıt kaydı yok</p>'}
      </div>

      <!-- Açık Dünya sürüşleri -->
      <div class="bg-white/5 rounded-2xl p-4 border border-white/10">
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs text-slate-500 uppercase">Açık Dünya Sürüşleri</p>
          <button onclick="showTab('ride')" class="text-xs text-accent font-semibold">Sürüşe git</button>
        </div>
        ${(() => {
          const rides = getVehicleRides(v.id).slice(0, 8);   // (idx = araca bağlı listedeki sıra)
          if (!rides.length) return '<p class="text-xs text-slate-600 text-center py-3">Bu araca bağlı sürüş yok</p>';
          return `<div class="space-y-2">${rides.map((r, idx) => `
            <button type="button" onclick="openVehicleRidePreview(${vehicleIdArg}, ${idx})" class="w-full bg-black/30 rounded-xl p-3 flex items-center gap-3 text-left">
              <div class="w-14 h-10 rounded-lg bg-black/40 flex items-center justify-center overflow-hidden shrink-0">${rideThumb(r.pts)}</div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium">${rideDistTxt(r.dist)} · ${rideFmtTime(r.time)}</p>
                <p class="text-[11px] text-slate-500">${new Date(r.date).toLocaleString('tr-TR')} · ort ${rideSpdTxt(r.avg)} · maks ${rideSpdTxt(r.max)}</p>
              </div>
              <i class="fa-solid fa-chevron-right text-slate-600 text-xs"></i>
            </button>`).join('')}</div>`;
        })()}
      </div>

      <!-- Masraf + Chart -->
      <div class="bg-white/5 rounded-2xl p-4 border border-white/10">
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs text-slate-500 uppercase">Masraf Özeti</p>
          <i class="fa-solid fa-wallet text-red-400"></i>
        </div>
        <p class="text-3xl font-extrabold text-red-400">${fmtTL(total)}</p>
        <p class="text-[11px] text-slate-500 mt-0.5">Toplam · ${hist.length} kayıt · Bu yıl ${fmtTL(yearTotal)}</p>
        
        <p class="text-[10px] text-slate-500 uppercase mt-5 mb-2">Son 12 Ay</p>
        <div class="chart-container"><canvas id="expenseChart"></canvas></div>

        ${catRows.length ? `
        <p class="text-[10px] text-slate-500 uppercase mt-5 mb-2">Kategori</p>
        <div class="space-y-2">
          ${catRows.slice(0, 5).map(([k, s]) => `
            <div>
              <div class="flex justify-between text-xs mb-1">
                <span><i class="fa-solid ${cats[k].i} mr-1.5" style="color:${cats[k].c}"></i>${cats[k].n}</span>
                <span class="text-slate-400">${fmtTL(s)}</span>
              </div>
              <div class="h-1.5 bg-white/10 rounded-full overflow-hidden"><div class="h-full rounded-full" style="width:${s/total*100}%;background:${cats[k].c}"></div></div>
            </div>`).join('')}
        </div>` : ''}
      </div>

      <!-- History -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-bold text-sm">Geçmiş</h4>
          <span class="text-xs text-slate-500">${history.length} kayıt</span>
        </div>
        ${history.length === 0 ? '<div class="text-center py-8 text-slate-600 text-sm"><p>Henüz kayıt yok</p></div>' : `
        <div class="space-y-2">
          ${history.map(h => `
            <div class="bg-white/5 rounded-xl p-3.5 border border-white/10 flex gap-3">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background:${cats[catOf(h)].c}22">
                <i class="fa-solid ${cats[catOf(h)].i} text-sm" style="color:${cats[catOf(h)].c}"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-sm">${garajimHtmlEsc(h.desc || cats[catOf(h)].n)}</p>
                <p class="text-xs text-slate-500 mt-0.5">${garajimHtmlEsc(h.date || '—')} · ${formatKm(h.km)}</p>
              </div>
              <div class="text-right flex flex-col items-end justify-between">
                <p class="text-sm font-semibold">${h.cost ? formatMoney(h.cost) : ''}</p>
                <button onclick="deleteService(${h._i})" class="text-slate-600 hover:text-red-400 text-xs p-1"><i class="fa-solid fa-trash-can"></i></button>
              </div>
            </div>`).join('')}
        </div>`}
      </div>

      <button onclick="deleteCurrent()" class="w-full py-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold">
        <i class="fa-solid fa-trash mr-2"></i> Aracı Sil
      </button>
    `;

    // Render chart
    setTimeout(() => {
      const ctx = document.getElementById('expenseChart');
      if (!ctx) return;
      if (expenseChart) expenseChart.destroy();
      expenseChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: months.map(m => m.label),
          datasets: [{
            data: months.map(m => m.sum),
            backgroundColor: 'rgba(239,68,68,0.7)',
            borderRadius: 4,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
            y: { grid: { color: isLight() ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b', font: { size: 10 } } }
          }
        }
      });
    }, 50);

    renderFuelChart(fuelSeries);
    window.scrollTo(0, 0);
  }

  function closeDetail() {
    currentId = null;
    if (fuelChart) { fuelChart.destroy(); fuelChart = null; }
    if (expenseChart) { expenseChart.destroy(); expenseChart = null; }
    document.getElementById('detailView').classList.add('hidden');
    const av = document.getElementById('assistantView');
    if (av) av.classList.add('hidden');
    document.getElementById('socialView').classList.add('hidden');
    document.getElementById('listView').classList.remove('hidden');
    const bn = document.getElementById('bottomNav');
    if (bn) bn.classList.remove('hidden');
    document.getElementById('tabGarage').classList.add('active', 'text-accent');
    document.getElementById('tabGarage').classList.remove('text-slate-500');
    ['tabSocial', 'tabAssistant'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('active', 'text-accent');
      el.classList.add('text-slate-500');
    });
    renderList();
  }

  // ---------- FORM ----------
  function openAddModal() {
    document.getElementById('formTitle').textContent = 'Yeni Araç';
    document.getElementById('vehicleForm').reset();
    document.getElementById('editId').value = '';
    document.getElementById('photoData').value = '';
    tempPhoto = null;
    document.getElementById('photoPreview').innerHTML = '<i class="fa-solid fa-camera text-3xl text-slate-600"></i>';
    document.getElementById('formModal').classList.remove('hidden');
  }

  function editCurrent() {
    if (!currentId) return;
    const v = vehicles.find(x => x.id === currentId);
    if (!v) return;
    document.getElementById('formTitle').textContent = 'Aracı Düzenle';
    document.getElementById('editId').value = v.id;
    ['plate','brand','model','year','km','color','fuel','type','muayene','trafikSigorta','kasko','lastService','nextServiceKm','kisLastigi','yazLastigi','dortMevsim','notes'].forEach(k => {
      const el = document.getElementById(k);
      if (el) el.value = v[k] || '';
    });
    document.getElementById('serviceInterval').value = v.interval || '';
    document.getElementById('kisLastikInfo').value = v.kisLastikInfo || '';
    document.getElementById('kisLastikDis').value = v.kisLastikDis || '';
    document.getElementById('yazLastikInfo').value = v.yazLastikInfo || '';
    document.getElementById('yazLastikDis').value = v.yazLastikDis || '';
    document.getElementById('dortMevsimInfo').value = v.dortMevsimInfo || '';
    document.getElementById('dortMevsimDis').value = v.dortMevsimDis || '';
    tempPhoto = v.photo || null;
    document.getElementById('photoData').value = v.photo || '';
    document.getElementById('photoPreview').innerHTML = v.photo ? `<img src="${v.photo}" class="w-full h-full object-cover">` : '<i class="fa-solid fa-camera text-3xl text-slate-600"></i>';
    document.getElementById('formModal').classList.remove('hidden');
  }

  function closeFormModal() { document.getElementById('formModal').classList.add('hidden'); }

  function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Lütfen bir resim dosyası seçin.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Sıkıştır: max 800px, JPEG kalite 0.7
        const maxW = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxW) {
          h = Math.round(h * (maxW / w));
          w = maxW;
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.7);
        tempPhoto = compressed;
        document.getElementById('photoData').value = compressed;
        document.getElementById('photoPreview').innerHTML = `<img src="${compressed}" class="w-full h-full object-cover">`;
      };
      img.onerror = () => alert('Resim yüklenemedi.');
      img.src = reader.result;
    };
    reader.onerror = () => alert('Dosya okunamadı.');
    reader.readAsDataURL(file);
  }

  function saveVehicle(e) {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const data = {
      id: id || Date.now().toString(),
      plate: document.getElementById('plate').value.trim().toUpperCase(),
      brand: document.getElementById('brand').value.trim(),
      model: document.getElementById('model').value.trim(),
      year: document.getElementById('year').value,
      km: document.getElementById('km').value,
      color: document.getElementById('color').value.trim(),
      fuel: document.getElementById('fuel').value,
      type: document.getElementById('type').value,
      muayene: document.getElementById('muayene').value,
      trafikSigorta: document.getElementById('trafikSigorta').value,
      kasko: document.getElementById('kasko').value,
      lastService: document.getElementById('lastService').value,
      nextServiceKm: document.getElementById('nextServiceKm').value,
      interval: document.getElementById('serviceInterval').value,
      kisLastigi: document.getElementById('kisLastigi').value,
      kisLastikInfo: document.getElementById('kisLastikInfo').value.trim(),
      kisLastikDis: document.getElementById('kisLastikDis').value,
      yazLastigi: document.getElementById('yazLastigi').value,
      yazLastikInfo: document.getElementById('yazLastikInfo').value.trim(),
      yazLastikDis: document.getElementById('yazLastikDis').value,
      dortMevsim: document.getElementById('dortMevsim').value,
      dortMevsimInfo: document.getElementById('dortMevsimInfo').value.trim(),
      dortMevsimDis: document.getElementById('dortMevsimDis').value,
      notes: document.getElementById('notes').value.trim(),
      photo: (document.getElementById('photoData').value || tempPhoto || (id ? (vehicles.find(x => x.id === id)?.photo || null) : null)),
      history: id ? (vehicles.find(x => x.id === id)?.history || []) : [],
      fuelLogs: id ? (vehicles.find(x => x.id === id)?.fuelLogs || []) : [],
      trips: id ? (vehicles.find(x => x.id === id)?.trips || []) : []
    };
    if (id) {
      const idx = vehicles.findIndex(x => x.id === id);
      if (idx > -1) { const oldVehicle = vehicles[idx]; if (Number(data.km) > Number(oldVehicle.km || 0)) achievementRecordOdometer(oldVehicle, oldVehicle.km, data.km, 'vehicle_edit'); vehicles[idx] = { ...oldVehicle, ...data }; }
    } else { vehicles.unshift(data); }
    persist(); achievementRecordActivity(id ? 'vehicle_edit' : 'vehicle_add'); achievementEvaluate(id ? 'vehicle_edit' : 'vehicle_add');
    closeFormModal();
    if (currentId) openDetail(currentId); else renderList();
  }

  function deleteCurrent() {
    if (!currentId || !confirm('Bu aracı silmek istediğine emin misin?')) return;
    vehicles = vehicles.filter(x => x.id !== currentId);
    persist();
    closeDetail();
  }

  // ---------- KM / SERVICE / FUEL / TRIP ----------
  function openKmModal() {
    const v = vehicles.find(x => x.id === currentId);
    if (!v) return;
    document.getElementById('kmModalPlate').textContent = v.plate;
    document.getElementById('newKm').value = v.km || '';
    document.getElementById('kmModal').classList.remove('hidden');
  }
  function closeKmModal() { document.getElementById('kmModal').classList.add('hidden'); }
  function saveKm() {
    const v = vehicles.find(x => x.id === currentId);
    if (!v || !document.getElementById('newKm').value) return;
    const oldKm = Number(v.km) || 0, nextKm = Number(document.getElementById('newKm').value) || 0, increased = nextKm > oldKm;
    if (increased) achievementRecordOdometer(v, oldKm, nextKm, 'manual');
    v.km = document.getElementById('newKm').value; persist();
    if (increased) { achievementRecordActivity('odometer'); achievementEvaluate('odometer'); }
    closeKmModal(); openDetail(currentId);
  }

  function openServiceModal() {
    const v = vehicles.find(x => x.id === currentId);
    if (!v) return;
    document.getElementById('svcDate').value = todayStr();
    document.getElementById('svcKm').value = v.km || '';
    document.getElementById('svcDesc').value = '';
    document.getElementById('svcCost').value = '';
    document.getElementById('svcCat').value = 'bakim';
    document.getElementById('serviceModal').classList.remove('hidden');
  }
  function closeServiceModal() { document.getElementById('serviceModal').classList.add('hidden'); }
  function saveService() {
    const v = vehicles.find(x => x.id === currentId);
    if (!v) return;
    if (!v.history) v.history = [];
    const cat = document.getElementById('svcCat').value;
    const svcKm = document.getElementById('svcKm').value;
    if (Number(svcKm) > Number(v.km || 0)) achievementRecordOdometer(v, v.km, svcKm, 'service');
    v.history.push({
      date: document.getElementById('svcDate').value,
      km: svcKm,
      desc: document.getElementById('svcDesc').value.trim(),
      cost: document.getElementById('svcCost').value,
      cat
    });
    if (svcKm && Number(svcKm) > Number(v.km || 0)) v.km = svcKm;
    if (cat === 'bakim') {
      if (document.getElementById('svcDate').value) v.lastService = document.getElementById('svcDate').value;
      if (svcKm) v.nextServiceKm = Number(svcKm) + (Number(v.interval) || 15000);
    }
    persist(); achievementRecordActivity('service'); achievementEvaluate('service'); closeServiceModal(); openDetail(currentId);
  }
  function deleteService(i) {
    const v = vehicles.find(x => x.id === currentId);
    if (!v || !v.history?.[i] || !confirm('Silinsin mi?')) return;
    v.history.splice(i, 1);
    persist(); openDetail(currentId);
  }

  function fuelInterval(prev, cur) {
    const km = Math.max(0, (Number(cur.km)||0) - (Number(prev.km)||0));
    const l = Number(cur.liters)||0;
    return { to: cur.date, days: Math.max(0, daysBetween(prev.date, cur.date)), km, l100: l && km ? l/km*100 : null };
  }
  function openFuelModal() {
    const v = vehicles.find(x => x.id === currentId);
    if (!v) return;
    document.getElementById('fuelDate').value = todayStr();
    document.getElementById('fuelKm').value = v.km || '';
    document.getElementById('fuelLiters').value = '';
    document.getElementById('fuelCost').value = '';
    const ff = document.getElementById('fuelFull'); if (ff) ff.checked = true;
    document.getElementById('fuelReceiptData').value = '';
    document.getElementById('fuelReceiptPreview').innerHTML = '<i class="fa-solid fa-receipt text-slate-600 text-xl"></i>';
    document.getElementById('fuelOcrStatus').textContent = 'Fiş okununca litre ve tutar dolar';
    document.getElementById('fuelForm').classList.remove('hidden');
    document.getElementById('fuelResult').classList.add('hidden');
    document.getElementById('fuelModal').classList.remove('hidden');
  }
  function closeFuelModal() { document.getElementById('fuelModal').classList.add('hidden'); }

  function compressImage(dataUrl, maxW, quality) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  function parseFuelReceiptText(text) {
    // Türk pompa fişi:
    // 6,320 LT X 4,740
    // MOTORIN %18    *30,00
    // TOP            *30,00
    let raw = (text || '')
      .replace(/[|]/g, ' ')
      .replace(/[Oo](?=\d)/g, '0')
      .replace(/(\d)[ ]+(\d)/g, '$1$2')
      .replace(/\s+/g, ' ')
      .trim();
    const num = s => {
      let t = String(s).replace(/\s/g, '').replace(/[^\d.,]/g, '');
      if (!t) return null;
      if (/\d+\.\d{3},\d{2}/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
      else t = t.replace(',', '.');
      const n = parseFloat(t);
      return isNaN(n) ? null : n;
    };

    let liters = null, unitPrice = null, cost = null;

    // --- LİTRE x BİRİM (çok toleranslı) ---
    const linePatterns = [
      /(\d{1,3}[.,]\d{2,3})\s*(?:LT|LİTRE|LITRE|L)\s*[xX×*]\s*(\d{1,3}[.,]\d{2,3})/i,
      /(\d{1,3}[.,]\d{2,3})\s*LT\s*X\s*(\d{1,3}[.,]\d{2,3})/i,
      /(\d{1,3}[.,]\d{3})\s*[xX]\s*(\d{1,3}[.,]\d{3})/,
      // OCR: 6.320LTX4.740
      /(\d{1,3}[.,]\d{2,3})\s*L\s*T?\s*[xX]\s*(\d{1,3}[.,]\d{2,3})/i
    ];
    for (const re of linePatterns) {
      const m = raw.match(re);
      if (m) { liters = num(m[1]); unitPrice = num(m[2]); break; }
    }

    // Sadece litre
    if (liters == null) {
      const m = raw.match(/(\d{1,3}[.,]\d{2,3})\s*(?:LT|LİTRE|LITRE)\b/i);
      if (m) liters = num(m[1]);
    }

    // Sadece birim: "X 4,740" veya "/L"
    if (unitPrice == null) {
      let m = raw.match(/[xX×]\s*(\d{1,3}[.,]\d{2,3})/);
      if (m) unitPrice = num(m[1]);
      if (unitPrice == null) {
        m = raw.match(/(\d{1,3}[.,]\d{2,3})\s*(?:TL|₺)?\s*\/\s*L/i);
        if (m) unitPrice = num(m[1]);
      }
    }

    // --- TUTAR: TOP / NAKİT / tekrarlayan * ---
    let m = raw.match(/\bTOP(?:LAM)?\b[^\d*]{0,12}\*?(\d{1,5}[.,]\d{2})/i);
    if (m) cost = num(m[1]);
    if (cost == null) {
      m = raw.match(/\bNAK[İI]T\b[^\d*]{0,12}\*?(\d{1,5}[.,]\d{2})/i);
      if (m) cost = num(m[1]);
    }
    const stars = [...raw.matchAll(/\*\s*(\d{1,5}[.,]\d{2})/g)].map(x => num(x[1])).filter(n => n != null && n >= 1);
    if (stars.length) {
      const freq = {};
      stars.forEach(n => { const k = n.toFixed(2); freq[k] = (freq[k] || 0) + 1; });
      const ranked = Object.entries(freq).map(([k, c]) => ({ n: parseFloat(k), c }))
        .sort((a, b) => b.c - a.c || b.n - a.n);
      const multi = ranked.find(r => r.c >= 2);
      if (multi) cost = multi.n;
      else if (cost == null) cost = ranked[0].n;
    }

    // --- LİTRE ZORUNLU DOLDURMA ---
    // Tutar + birim varsa litre = tutar / birim  (motor fişi için en sağlam yol)
    if (cost != null && unitPrice != null && unitPrice > 0) {
      const fromCost = Math.round((cost / unitPrice) * 1000) / 1000;
      if (fromCost >= 0.3 && fromCost <= 80) {
        if (liters == null || Math.abs(liters * unitPrice - cost) > Math.max(1, cost * 0.12)) {
          liters = fromCost;
        }
      }
    } else if (liters != null && unitPrice != null && cost == null) {
      cost = Math.round(liters * unitPrice * 100) / 100;
    }

    // Son çare: ham metinden "L" öncesi sayıyı al
    if (liters == null) {
      const allLt = [...raw.matchAll(/(\d{1,3}[.,]\d{2,3})\s*(?:LT|L\b)/gi)].map(x => num(x[1])).filter(n => n != null && n >= 0.5 && n <= 80);
      if (allLt.length) liters = allLt[0];
    }

    if (liters != null && (liters < 0.3 || liters > 80)) liters = null;
    if (unitPrice != null && (unitPrice < 1 || unitPrice > 100)) unitPrice = null;
    if (cost != null && (cost < 3 || cost > 8000)) cost = null;

    // Yakıt türü
    let fuelType = null;
    if (/MOTOR[İI]N|D[İI]ZEL|DIESEL/i.test(raw)) fuelType = 'Motorin';
    else if (/LPG/i.test(raw)) fuelType = 'LPG';
    else if (/BENZ[İI]N|KUR[ŞS]UNSUZ|95|97/i.test(raw)) fuelType = 'Benzin';

    // İstasyon / marka (yaygın TR zincirleri + üst satırlar)
    let station = null;
    const brands = ['OPET','SHELL','BP','TOTAL','PETROL OFİSİ','POAŞ','AYTEMİZ','AREA','KADOİL','KADOIL','GO','ALPET','SUNPET','LUKOİL','LUKOIL','OMV','TURKUVAZ','BALPET','ERMAN','MOLA','STAR','EMİRCAN','EMIRCAN'];
    for (const b of brands) {
      if (raw.toUpperCase().includes(b)) { station = b.replace('EMIRCAN','EMİRCAN').replace('KADOIL','KADOİL').replace('LUKOIL','LUKOİL'); break; }
    }
    if (!station) {
      const lines = (text || '').split(/\n+/).map(l => l.trim()).filter(Boolean);
      for (const ln of lines.slice(0, 6)) {
        if (/[A-Za-zÇĞİÖŞÜçğıöşü]{3,}/.test(ln) && !/LT|TOP|KDV|NAKIT|FIŞ|FİŞ|TARIH|SAAT|POMPA/i.test(ln) && ln.length < 40) {
          station = ln.slice(0, 40); break;
        }
      }
    }

    return {
      liters: liters != null ? Math.round(liters * 1000) / 1000 : null,
      cost: cost != null ? Math.round(cost * 100) / 100 : null,
      unitPrice: unitPrice != null ? Math.round(unitPrice * 1000) / 1000 : null,
      fuelType, station,
      raw: raw.slice(0, 320)
    };
  }

  function preprocessReceiptForOCR(dataUrl) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        // Daha yüksek çözünürlük + kontrast (termal fiş)
        let w = img.width, h = img.height;
        const maxW = 1400;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        // Çok küçükse büyüt
        if (w < 700) { const s = 700 / w; w = 700; h = Math.round(h * s); }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const id = ctx.getImageData(0, 0, w, h);
        const d = id.data;
        // Gri + kontrast + hafif eşik
        for (let i = 0; i < d.length; i += 4) {
          let g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          g = (g - 128) * 1.6 + 128;
          g = g < 0 ? 0 : g > 255 ? 255 : g;
          // yumuşak binarize
          g = g > 165 ? 255 : g < 110 ? 0 : g;
          d[i] = d[i + 1] = d[i + 2] = g;
        }
        ctx.putImageData(id, 0, 0);
        resolve(c.toDataURL('image/png'));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  async function handleFuelReceipt(e) {
    const file = e.target.files[0];
    if (!file) return;
    const status = document.getElementById('fuelOcrStatus');
    status.textContent = 'Fiş yükleniyor...';
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const compressed = await compressImage(reader.result, 1200, 0.75);
        document.getElementById('fuelReceiptData').value = compressed;
        document.getElementById('fuelReceiptPreview').innerHTML = `<img src="${compressed}" class="w-full h-full object-cover">`;
        status.textContent = 'Fiş hazırlanıyor...';
        if (typeof Tesseract === 'undefined') {
          status.textContent = 'OCR yüklenemedi — litre/tutarı elle gir';
          return;
        }
        const ocrImage = await preprocessReceiptForOCR(reader.result);
        status.textContent = 'Fiş okunuyor (OCR)...';
        const runOcr = async (img, label) => {
          const result = await Tesseract.recognize(img, 'tur+eng', Object.assign({
            logger: m => {
              if (m.status === 'recognizing text' && m.progress)
                status.textContent = label + ' ' + Math.round(m.progress * 100) + '%';
            }
          }, window.TESS_OPTS || {}));
          return parseFuelReceiptText(result.data.text || '');
        };
        // Hem netleştirilmiş hem orijinal — hangisi litreyi bulursa o
        let parsed = await runOcr(ocrImage, 'Okunuyor...');
        if (parsed.liters == null || parsed.cost == null) {
          const parsed2 = await runOcr(compressed, 'Yedek okuma...');
          if (parsed.liters == null && parsed2.liters != null) parsed.liters = parsed2.liters;
          if (parsed.unitPrice == null && parsed2.unitPrice != null) parsed.unitPrice = parsed2.unitPrice;
          if (parsed.cost == null && parsed2.cost != null) parsed.cost = parsed2.cost;
          // birim+tutar ile litre tamamla
          if (parsed.liters == null && parsed.cost != null && parsed.unitPrice != null && parsed.unitPrice > 0) {
            const L = Math.round((parsed.cost / parsed.unitPrice) * 1000) / 1000;
            if (L >= 0.3 && L <= 80) parsed.liters = L;
          }
        }
        let filled = [];
        if (parsed.liters != null) {
          document.getElementById('fuelLiters').value = parsed.liters;
          filled.push(parsed.liters + ' L');
        }
        if (parsed.cost != null) {
          document.getElementById('fuelCost').value = parsed.cost;
          filled.push(parsed.cost + ' ₺');
        }
        document.getElementById('fuelStation').value = parsed.station || '';
        document.getElementById('fuelTypeOcr').value = parsed.fuelType || '';
        const stLbl = document.getElementById('fuelStationLbl');
        if (parsed.station || parsed.fuelType) {
          stLbl.textContent = [parsed.station, parsed.fuelType].filter(Boolean).join(' · ');
          stLbl.classList.remove('hidden');
          filled.push(stLbl.textContent);
        } else {
          stLbl.classList.add('hidden');
        }
        status.textContent = filled.length
          ? 'Okundu: ' + filled.join(' · ') + (parsed.unitPrice ? ' (birim ' + parsed.unitPrice + ')' : '')
          : 'Net okunamadı — değerleri elle kontrol et';
        if (filled.length) toast('Fişten dolduruldu');
      } catch (err) {
        status.textContent = 'Okuma başarısız — elle gir';
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function viewFuelReceiptPreview() {
    const src = document.getElementById('fuelReceiptData').value;
    if (src) openReceiptViewer(src);
  }
  function openReceiptViewer(src) {
    if (!src) return;
    document.getElementById('receiptViewerImg').src = src;
    document.getElementById('receiptViewer').classList.remove('hidden');
  }
  function closeReceiptViewer() {
    document.getElementById('receiptViewer').classList.add('hidden');
    document.getElementById('receiptViewerImg').src = '';
  }
  function openFuelReceiptByIndex(i) {
    const v = vehicles.find(x => x.id === currentId);
    const r = v && v.fuelLogs && v.fuelLogs[i] && v.fuelLogs[i].receipt;
    if (r) openReceiptViewer(r);
    else toast('Fiş bulunamadı');
  }

  function saveFuel() {
    const v = vehicles.find(x => x.id === currentId);
    if (!v) return;
    const km = document.getElementById('fuelKm').value;
    if (!km) { alert('Kilometre gir.'); return; }
    if (!v.fuelLogs) v.fuelLogs = [];
    const prev = v.fuelLogs[v.fuelLogs.length-1];
    if (Number(km) > Number(v.km || 0)) achievementRecordOdometer(v, v.km, km, 'fuel');
    const entry = {
      date: document.getElementById('fuelDate').value || todayStr(),
      km,
      liters: document.getElementById('fuelLiters').value,
      cost: document.getElementById('fuelCost').value,
      full: !document.getElementById('fuelFull') || document.getElementById('fuelFull').checked,
      receipt: document.getElementById('fuelReceiptData').value || null,
      station: document.getElementById('fuelStation')?.value || null,
      fuelType: document.getElementById('fuelTypeOcr')?.value || null
    };
    v.fuelLogs.push(entry);
    if (Number(km) > Number(v.km||0)) v.km = km;
    if (entry.cost) {
      if (!v.history) v.history = [];
      const descBits = ['Yakıt'];
      if (entry.fuelType) descBits.push(entry.fuelType);
      if (entry.station) descBits.push(entry.station);
      if (entry.liters) descBits.push(entry.liters + ' L');
      v.history.push({ date: entry.date, km, desc: descBits.join(' · '), cost: entry.cost, cat: 'yakit' });
    }
    persist(); achievementRecordActivity('fuel'); achievementEvaluate('fuel');
    let html = prev ? (() => {
      const r = fuelInterval(prev, entry);
      return `<div class="text-center">
        <div class="w-14 h-14 mx-auto rounded-2xl bg-amber-500/15 flex items-center justify-center mb-3"><i class="fa-solid fa-gas-pump text-2xl text-amber-400"></i></div>
        <h3 class="text-lg font-bold">Kaydedildi</h3>
        <div class="grid grid-cols-2 gap-3 mt-4">
          <div class="bg-white/5 rounded-2xl p-4"><p class="text-3xl font-extrabold text-amber-400">${r.days}</p><p class="text-xs text-slate-500">gün</p></div>
          <div class="bg-white/5 rounded-2xl p-4"><p class="text-3xl font-extrabold text-amber-400">${r.km.toLocaleString('tr-TR')}</p><p class="text-xs text-slate-500">km</p></div>
        </div>
        ${r.l100 ? `<p class="text-sm mt-4">Tüketim: <b class="text-amber-400">${r.l100.toFixed(1).replace('.',',')} L/100km</b></p>` : ''}
      </div>`;
    })() : `<div class="text-center py-2"><div class="w-14 h-14 mx-auto rounded-2xl bg-amber-500/15 flex items-center justify-center mb-3"><i class="fa-solid fa-circle-check text-2xl text-amber-400"></i></div><h3 class="text-lg font-bold">İlk kayıt</h3></div>`;
    document.getElementById('fuelResult').innerHTML = html + `<button onclick="closeFuelModal()" class="w-full mt-5 py-3 rounded-2xl bg-amber-500 text-slate-900 font-bold">Tamam</button>`;
    document.getElementById('fuelForm').classList.add('hidden');
    document.getElementById('fuelResult').classList.remove('hidden');
    openDetail(currentId);
  }

  function openPlanModal() {
    const v = vehicles.find(x => x.id === currentId);
    if (!v) return;
    document.getElementById('planItems').innerHTML = planDefs.map(p => `
      <div class="bg-white/5 rounded-xl p-3.5 border border-white/10">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center"><i class="fa-solid ${p.icon} text-red-400 text-sm"></i></div>
          <div><p class="text-sm font-semibold">${p.label}</p><p class="text-[11px] text-slate-500">${p.desc}</p></div>
        </div>
        <input type="date" id="plan_${p.key}" value="${v[p.key] || ''}" class="w-full rounded-xl px-3 py-2.5 text-sm border border-white/10">
      </div>`).join('');
    document.getElementById('planModal').classList.remove('hidden');
  }
  function closePlanModal() { document.getElementById('planModal').classList.add('hidden'); }
  function savePlan() {
    const v = vehicles.find(x => x.id === currentId);
    if (!v) return;
    planDefs.forEach(p => {
      const el = document.getElementById('plan_' + p.key);
      if (el) v[p.key] = el.value;
    });
    persist(); closePlanModal(); openDetail(currentId); checkAndNotify(); achievementRecordActivity('plan'); achievementEvaluate('plan');
  }

  // ---------- PDF ----------
  function generatePDF() {
    const v = vehicles.find(x => x.id === currentId);
    if (!v) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const hs = healthScore(v);
    const est = estimate90Days(v);
    const year = String(new Date().getFullYear());

    // Kapak şeridi
    doc.setFillColor(15, 15, 15);
    doc.rect(0, 0, 210, 42, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('Garajım Premium Rapor', 14, 18);
    doc.setFontSize(11);
    doc.setTextColor(200, 200, 200);
    doc.text(`${v.plate || '—'}  ·  ${v.brand || ''} ${v.model || ''} ${v.year || ''}`, 14, 28);
    doc.text(`Rapor: ${todayStr()}  ·  Sağlık skoru: ${hs.score}/100 (${hs.label})`, 14, 36);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    let y = 52;
    doc.text(`Kilometre: ${formatKm(v.km)}`, 14, y);
    y += 7;
    doc.text(`Toplam masraf: ${fmtTL(totalCost(v))}   ·   Bu yıl: ${fmtTL((v.history||[]).filter(h => (h.date||'').startsWith(year)).reduce((s,h)=>s+(Number(h.cost)||0),0))}`, 14, y);
    y += 7;
    doc.text(`90 gün tahmini maliyet: ~${fmtTL(est)}`, 14, y);
    y += 7;
    if (hs.reasons.length) {
      doc.setTextColor(180, 80, 80);
      doc.text('Dikkat: ' + hs.reasons.join(' · '), 14, y);
      doc.setTextColor(0, 0, 0);
      y += 8;
    } else y += 4;

    const hist = (v.history || []).slice().reverse();
    const rows = hist.map(h => [
      h.date || '',
      cats[catOf(h)]?.n || h.cat,
      (h.desc || '').slice(0, 36),
      h.km ? Number(h.km).toLocaleString('tr-TR') : '',
      h.cost ? Number(h.cost).toLocaleString('tr-TR') + ' TL' : ''
    ]);

    doc.autoTable({
      startY: y,
      head: [['Tarih', 'Kategori', 'Aciklama', 'KM', 'Tutar']],
      body: rows.length ? rows : [['—', '—', 'Kayit yok', '—', '—']],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 30, 30], textColor: 255 }
    });

    const finalY = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Garajim ile olusturuldu — premium ozet rapor', 14, finalY);
    savePdf(doc, `garajim-premium-${v.plate || 'rapor'}-${todayStr()}.pdf`);
  }

  // ---------- EXPORT / IMPORT ----------
  // Yedek v4: araçlar + Studio projeleri + kayıtlı sürüşler + park/ayarlar + güvenli tercihler + kurtarılabilir sürüş durumu.
  // Gizli veriler (PIN ve yapay zekâ API anahtarı) özellikle dışa aktarılmaz.

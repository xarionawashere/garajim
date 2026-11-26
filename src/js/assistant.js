// Tab routing and assistant compatibility.
// Classic script: globals are shared with other files in index.html's intentional load order.
function showTab(tab) {
    const detail = document.getElementById('detailView');
    if (detail) { detail.classList.add('hidden'); detail.style.display = 'none'; }
    const bn = document.getElementById('bottomNav');
    if (bn) { bn.classList.remove('hidden'); bn.style.display = ''; }
    const views = { garage: 'listView', social: 'socialView', assistant: 'assistantView', ride: 'rideView' };
    Object.entries(views).forEach(([k, id]) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (k === tab) {
        el.classList.remove('hidden');
        el.style.display = '';
        el.style.visibility = '';
        el.style.pointerEvents = '';
      } else {
        el.classList.add('hidden');
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.pointerEvents = 'none';
      }
    });
    document.body.classList.toggle('tab-ride', tab === 'ride');
    const tabs = { garage: 'tabGarage', social: 'tabSocial', assistant: 'tabAssistant', ride: 'tabRide' };
    Object.entries(tabs).forEach(([k, id]) => {
      const el = document.getElementById(id);
      if (!el) return;
      const on = k === tab;
      el.classList.toggle('active', on);
      el.classList.toggle('text-slate-500', !on);
      if (on) el.classList.add('text-accent');
      else el.classList.remove('text-accent');
    });
    if (tab === 'garage') renderList();
    else if (tab === 'social') renderSocial();
    else if (tab === 'assistant') renderAssistant();
    else if (tab === 'ride') rideOpen();
    if (tab !== 'ride') rideLeave();
  }

  function buildAssistantTips() {
    const tips = [];
    const ridesAll = getAllRides();
    if (!vehicles.length) {
      return [{
        level: 'info', icon: 'fa-car', title: 'Garaj boş',
        body: 'İlk aracını ekle; bakım, yakıt, açık dünya sürüşü ve hatırlatmalar devreye girsin.'
      }];
    }

    const scores = vehicles.map(v => healthScore(v));
    const avg = Math.round(scores.reduce((s, x) => s + x.score, 0) / scores.length);
    const alertCount = vehicles.reduce((s, v) => s + getAlerts(v).length, 0);
    const ym = todayStr().slice(0, 7);
    const monthCost = vehicles.reduce((s, v) => s + (v.history || []).filter(h => (h.date || '').startsWith(ym)).reduce((a, h) => a + (Number(h.cost) || 0), 0), 0);
    const est90 = vehicles.reduce((s, v) => s + estimate90Days(v), 0);

    // Bu ay sürüş
    const monthRides = ridesAll.filter(r => (r.date || '').slice(0, 7) === ym);
    const monthRideKm = monthRides.reduce((s, r) => s + (r.dist || 0), 0) / 1000;

    tips.push({
      level: avg >= 80 ? 'ok' : avg >= 55 ? 'warn' : 'danger',
      icon: 'fa-heart-pulse',
      title: `Garaj sağlığı ${avg}/100`,
      body: alertCount
        ? `${vehicles.length} araç · ${alertCount} uyarı · bu ay ${fmtTL(monthCost)} · sürüş ${monthRideKm.toFixed(0)} km. Önce kırmızı uyarıları kapat.`
        : `${vehicles.length} araç yolunda. Bu ay ${fmtTL(monthCost)}, açık dünya ${monthRideKm.toFixed(0)} km. 90 gün tahmini ~${fmtTL(est90)}.`
    });

    // En pahalı / en çok yiyen araç
    if (vehicles.length >= 2) {
      const costs = vehicles.map(v => ({
        v, c: (v.history || []).filter(h => (h.date || '').startsWith(ym)).reduce((a, h) => a + (Number(h.cost) || 0), 0)
      })).sort((a, b) => b.c - a.c);
      if (costs[0].c > 0) {
        tips.push({
          level: 'info', icon: 'fa-chart-pie',
          title: `Bu ay en yüksek masraf: ${costs[0].v.plate || 'Araç'}`,
          body: `${fmtTL(costs[0].c)} — diğer araçlarla kıyasla bütçeyi burada izle.`
        });
      }
    }

    vehicles.forEach(v => {
      const plate = v.plate || 'Araç';
      const hs = healthScore(v);
      const prog = serviceProgress(v);
      const flogs = v.fuelLogs || [];
      const vRides = ridesAll.filter(r => r.vehicleId === v.id);

      if (prog && prog.overdue) {
        tips.push({
          level: 'danger', icon: 'fa-wrench', title: `${plate} · bakım gecikti`,
          body: `${formatKm(Math.abs(prog.remaining))} geçmiş. Servise yazıl; aralık ${formatKm(v.interval || 15000)}.`
        });
      } else if (prog && prog.warning) {
        tips.push({
          level: 'warn', icon: 'fa-gauge-high', title: `${plate} · bakım yaklaşıyor`,
          body: `~${formatKm(prog.remaining)} kaldı. Randevuyu şimdiden al.`
        });
      }

      ['muayene', 'trafikSigorta', 'kasko'].forEach(k => {
        const d = daysLeft(v[k]);
        const label = planDefs.find(p => p.key === k)?.label || k;
        if (d === null) {
          tips.push({ level: 'warn', icon: 'fa-calendar-xmark', title: `${plate} · ${label} yok`,
            body: `Plan kısmına tarih ekle; Garajım zamanı gelince hatırlatır.` });
        } else if (d < 0) {
          tips.push({ level: 'danger', icon: 'fa-triangle-exclamation', title: `${plate} · ${label} dolmuş`,
            body: `${Math.abs(d)} gün geçmiş. Yenileme için işlem başlat.` });
        } else if (d <= getRemindDays()) {
          tips.push({ level: 'warn', icon: 'fa-bell', title: `${plate} · ${label} ${d} gün`,
            body: `Süre daralıyor; evrak/ödemeyi planla.` });
        }
      });

      const month = new Date().getMonth() + 1;
      const winter = month >= 10 || month <= 3;
      if (winter && v.kisLastigi) {
        const d = daysLeft(v.kisLastigi);
        if (d !== null && d <= 45) {
          tips.push({ level: d < 0 ? 'danger' : 'warn', icon: 'fa-snowflake', title: `${plate} · kış lastiği`,
            body: d < 0 ? 'Tarih geçmiş; kontrol et.' : `Plan ${d} gün içinde.` });
        }
      } else if (winter && !v.kisLastigi && !v.dortMevsim) {
        tips.push({ level: 'info', icon: 'fa-snowflake', title: `${plate} · kış hazırlığı`,
          body: 'Kış lastiği veya 4 mevsim bilgisi yok. Lastik bölümünü doldur.' });
      }
      if (!winter && v.yazLastigi) {
        const d = daysLeft(v.yazLastigi);
        if (d !== null && d <= 45) {
          tips.push({ level: d < 0 ? 'danger' : 'info', icon: 'fa-sun', title: `${plate} · yaz lastiği`,
            body: d < 0 ? 'Tarih geçmiş; diş derinliğini kontrol et.' : `Plan ${d} gün içinde.` });
        }
      }

      // Yakıt ortalaması (son 3 dolum)
      if (flogs.length >= 2) {
        let sumL100 = 0, n = 0, fuelCost = 0, fuelKm = 0;
        for (let i = 1; i < flogs.length; i++) {
          const km = Math.max(0, Number(flogs[i].km) - Number(flogs[i - 1].km));
          const L = Number(flogs[i].liters) || 0;
          if (km > 30 && L > 0) { sumL100 += L / km * 100; n++; fuelKm += km; }
          fuelCost += Number(flogs[i].cost) || 0;
        }
        if (n) {
          const avgL = sumL100 / n;
          const tlKm = fuelKm > 0 && fuelCost > 0 ? fuelCost / fuelKm : null;
          tips.push({
            level: avgL > 12 ? 'warn' : 'ok',
            icon: 'fa-gas-pump',
            title: `${plate} · yakıt ort. ${avgL.toFixed(1).replace('.', ',')} L/100km`,
            body: (tlKm != null ? `~${tlKm.toFixed(2)} ₺/km. ` : '') + (avgL > 12 ? 'Yüksek; basınç ve sürüş tarzına bak.' : 'Makul aralıkta.')
          });
        }
      } else if (!flogs.length) {
        tips.push({ level: 'info', icon: 'fa-receipt', title: `${plate} · yakıt kaydı yok`,
          body: 'Benzin Alındı + fiş ile tüketim ve ₺/km netleşir.' });
      }

      // Sürüş analizi
      if (vRides.length) {
        const totKm = vRides.reduce((s, r) => s + (r.dist || 0), 0) / 1000;
        const totT = vRides.reduce((s, r) => s + (r.time || 0), 0);
        const maxV = Math.max(...vRides.map(r => r.max || 0));
        const avgRide = totT > 0 ? (totKm / (totT / 3600)) : 0;
        tips.push({
          level: 'ok', icon: 'fa-motorcycle',
          title: `${plate} · ${vRides.length} açık dünya sürüşü`,
          body: `Toplam ${totKm.toFixed(0)} km · ort ${avgRide.toFixed(0)} km/sa · tepe ${Math.round(maxV)} km/sa.`
        });
      } else {
        tips.push({
          level: 'info', icon: 'fa-route',
          title: `${plate} · sürüş bağlı değil`,
          body: 'Açık Dünya’da üstten bu plakayı seçip sür; rota ve KM araca yazılır.'
        });
      }

      // Uzun süre hareketsiz (son sürüş veya yakıt)
      const lastDates = [];
      if (flogs.length) lastDates.push(flogs[flogs.length - 1].date);
      if (vRides.length) lastDates.push(vRides[0].date);
      if ((v.history || []).length) lastDates.push(v.history[v.history.length - 1].date);
      const last = lastDates.filter(Boolean).sort().pop();
      if (last) {
        const idle = daysBetween(last, todayStr());
        if (idle >= 45) {
          tips.push({
            level: 'warn', icon: 'fa-moon',
            title: `${plate} · ${idle} gündür kayıt yok`,
            body: 'Uzun parkta akü ve lastik kontrolü iyi olur; kısa bir tur + kayıt önerilir.'
          });
        }
      }

      if (hs.score < 55 && hs.reasons.length) {
        tips.push({ level: 'danger', icon: 'fa-stethoscope', title: `${plate} · skor ${hs.score}`,
          body: hs.reasons.join(' · ') });
      }
    });

    // Garaj geneli sürüş ipucu
    if (ridesAll.length && ridesAll.filter(r => !r.vehicleId).length) {
      tips.push({
        level: 'info', icon: 'fa-link',
        title: 'Bağlanmamış sürüşler var',
        body: 'Bazı açık dünya kayıtları araçsız. Bundan sonra üstten plaka seçerek sür.'
      });
    }

    vehicles.forEach(v => {
      const fs = fuelStats(v);
      if (fs && fs.change != null && fs.change > 20) tips.push({ level: 'warn', icon: 'fa-gas-pump', title: (v.plate || 'Araç') + ' · yakıt tüketimi arttı', body: `Son depo ${fs.last.toFixed(1)} L/100 km (önceki ort. ${fs.prevAvg.toFixed(1)}). Lastik basıncı, zincir/yağ ve hava filtresini kontrol et.` });
    });
    const order = { danger: 0, warn: 1, info: 2, ok: 3 };
    tips.sort((a, b) => (order[a.level] ?? 9) - (order[b.level] ?? 9));
    return tips.slice(0, 16);
  }

  // ---------- YZ SOHBET ASISTANI ----------
  let aiChat = [];
  try { aiChat = JSON.parse(localStorage.getItem('garaj_ai_chat') || '[]'); } catch { aiChat = []; }
  let aiBusy = false;

  function aiGetSettings() {
    try { return JSON.parse(localStorage.getItem('garaj_ai_settings') || '{}'); }
    catch { return {}; }
  }
  function aiSaveSettings() {
    const provider = document.getElementById('aiProvider')?.value || 'gemini';
    const apiKey = (document.getElementById('aiApiKey')?.value || '').trim();
    localStorage.setItem('garaj_ai_settings', JSON.stringify({ provider, apiKey }));
    toast(apiKey ? 'API kaydedildi' : 'Anahtar silindi');
    aiUpdateStatus();
  }
  function aiPersistChat() {
    // foto base64 depoyu doldurmasın diye sadece rol+metin saklanır
    try { localStorage.setItem('garaj_ai_chat', JSON.stringify(aiChat.slice(-40).map(m => ({ role: m.role, text: m.text })))); } catch (e) {}
  }

  function buildGarageContext() {
    const lines = [];
    lines.push('Bugün: ' + todayStr());
    lines.push('Araç sayısı: ' + vehicles.length);
    vehicles.forEach(v => {
      const hs = healthScore(v);
      const prog = serviceProgress(v);
      const alerts = getAlerts(v);
      const flogs = v.fuelLogs || [];
      const rides = (typeof getVehicleRides === 'function' ? getVehicleRides(v.id) : []).slice(0, 3);
      lines.push('---');
      lines.push(`Plaka: ${v.plate || '—'} | ${v.brand || ''} ${v.model || ''} ${v.year || ''} | tip: ${v.type || '—'} | KM: ${v.km || '—'}`);
      lines.push(`Sağlık skoru: ${hs.score}/100` + (hs.reasons?.length ? ' (' + hs.reasons.join('; ') + ')' : ''));
      if (prog) lines.push(`Bakım: ${prog.overdue ? 'GECİKMİŞ' : prog.warning ? 'yaklaşıyor' : 'ok'} · kalan ~${prog.remaining} km · aralık ${v.interval || 15000}`);
      lines.push(`Muayene: ${v.muayene || 'yok'} | Trafik sig: ${v.trafikSigorta || 'yok'} | Kasko: ${v.kasko || 'yok'}`);
      lines.push(`Lastik: 4mevsim=${v.dortMevsim || '—'} kış=${v.kisLastigi || '—'} yaz=${v.yazLastigi || '—'}`);
      if (alerts.length) lines.push('Uyarılar: ' + alerts.join(' | '));
      if (flogs.length) {
        const last = flogs[flogs.length - 1];
        lines.push(`Son yakıt: ${last.date} ${last.liters || '?'}L ${last.cost || '?'}₺ @${last.km || '?'}km`);
      }
      if (rides.length) {
        lines.push('Son sürüşler: ' + rides.map(r => `${(r.dist/1000).toFixed(1)}km ${Math.round(r.avg)}ort`).join(', '));
      }
      const ym = todayStr().slice(0, 7);
      const mc = (v.history || []).filter(h => (h.date || '').startsWith(ym)).reduce((a, h) => a + (Number(h.cost) || 0), 0);
      lines.push('Bu ay masraf: ' + mc + ' TL');
    });
    return lines.join('\n');
  }

  function aiSystemPrompt() {
    return `Sen "Garajım" uygulamasının motosiklet/araç asistanısın. Türkçe, net ve pratik konuş.
Kullanıcının garaj verisi aşağıda. Buna dayanarak bakım, lastik, sigorta, yakıt, sürüş ve masraf konusunda yardım et.
Uydurma yasal/garanti bilgisi verme; emin değilsen genel bilgi olduğunu söyle.
Kısa paragraflar ve madde işaretleri kullan. Tehlikeli mekanik müdahalede usta/servis öner.
--- GARAJ VERİSİ ---
${buildGarageContext()}
---`;
  }

  function aiUpdateStatus() {
    const s = aiGetSettings();
    const el = document.getElementById('aiStatusLine');
    if (!el) return;
    if (s.apiKey) el.textContent = (s.provider === 'openai' ? 'OpenAI' : 'Gemini') + ' · hazır';
    else el.textContent = 'API anahtarı yok · Ayarlar → YZ Asistan';
  }

  function aiEscape(t) {
    return String(t || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g, '<br>');
  }

  function aiRenderChat() {
    const log = document.getElementById('aiChatLog');
    if (!log) return;
    if (!aiChat.length) {
      log.innerHTML = `<div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400 leading-relaxed">
        Merhaba — garaj verine bakıp sorularını yanıtlarım.<br><br>
        Örnek: <b class="text-slate-300">"Bakım ne zaman?"</b> · <b class="text-slate-300">"Bu ay ne kadar yaktım?"</b> · <b class="text-slate-300">"Kış lastiği şart mı?"</b>
        <br><br><span class="text-[11px]">İlk kullanım: Ayarlar (anahtar ikonu) → Gemini API anahtarı kaydet.</span>
      </div>`;
    } else {
      log.innerHTML = aiChat.map(m => {
        const mine = m.role === 'user';
        return `<div class="flex ${mine ? 'justify-end' : 'justify-start'}">
          <div class="max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${mine ? 'bg-accent text-white' : 'bg-white/5 border border-white/10 text-slate-200'}">${aiEscape(m.text)}</div>
        </div>`;
      }).join('');
    }
    log.scrollTop = log.scrollHeight;
  }

  function aiRenderQuickTips() {
    const box = document.getElementById('aiQuickTips');
    if (!box) return;
    const tips = buildAssistantTips().slice(0, 6);
    const chips = [
      'Özet ver',
      'Bakım durumum ne?',
      ...tips.slice(0, 3).map(t => t.title.replace(/·/g, '-').slice(0, 42))
    ];
    box.innerHTML = chips.map(c =>
      `<button type="button" data-q="${rideEsc(c)}" onclick="aiAsk(this.dataset.q)" class="shrink-0 text-[11px] px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300">${rideEsc(c)}</button>`
    ).join('');
  }

  function renderAssistant() { renderStudio(); }

  // ---------- GARAJIM STUDIO ----------

// Assistant compatibility and application startup.
// Classic script: globals are shared with other files in index.html's intentional load order.
function aiClearChat() {
    if (aiChat.length && !confirm('Sohbet temizlensin mi?')) return;
    aiChat = [];
    aiPersistChat();
    aiRenderChat();
  }

  function aiAsk(text) {
    document.getElementById('aiInput').value = text;
    aiSend();
  }
  function aiPickPhoto(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const compressed = await compressImage(reader.result, 1024, 0.72);
        document.getElementById('aiPhotoData').value = compressed;
        const hint = document.getElementById('aiPhotoHint');
        if (hint) { hint.classList.remove('hidden'); hint.textContent = 'Foto eklendi · gönderince YZ görür'; }
        toast('Fotoğrafa eklendi');
      } catch (err) { toast('Foto yüklenemedi'); }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function aiTestConnection() {
    aiSaveSettings();
    const s = aiGetSettings();
    if (!s.apiKey) { toast('Önce API anahtarı gir'); return; }
    const hint = document.getElementById('aiSettingsHint');
    if (hint) hint.textContent = 'Test ediliyor…';
    try {
      const reply = await aiCallModel([{ role: 'user', text: 'Sadece "ok" yaz.' }], true);
      if (hint) hint.textContent = 'Bağlantı OK: ' + String(reply).slice(0, 40);
      toast('Asistan bağlantısı çalışıyor');
    } catch (e) {
      if (hint) hint.textContent = 'Hata: ' + (e.message || e);
      toast('Bağlantı başarısız');
    }
  }

  async function aiSend() {
    if (aiBusy) return;
    const input = document.getElementById('aiInput');
    const text = (input?.value || '').trim();
    if (!text) return;
    const s = aiGetSettings();
    if (!s.apiKey) {
      toast('Ayarlar → YZ Asistan → API anahtarı kaydet');
      openSettings();
      return;
    }
    input.value = '';
    const photo = document.getElementById('aiPhotoData')?.value || '';
    const userText = photo ? (text + (text ? '\n' : '') + '[Kullanıcı bir fotoğraf ekledi]') : text;
    aiChat.push({ role: 'user', text: userText, photo: photo || null });
    document.getElementById('aiPhotoData').value = '';
    const hint = document.getElementById('aiPhotoHint');
    if (hint) hint.classList.add('hidden');
    aiPersistChat();
    aiRenderChat();
    aiBusy = true;
    const btn = document.getElementById('aiSendBtn');
    if (btn) btn.disabled = true;
    aiChat.push({ role: 'assistant', text: '…' });
    aiRenderChat();
    try {
      const history = aiChat.filter(m => m.text !== '…').slice(-12);
      const reply = await aiCallModel(history, false);
      aiChat = aiChat.filter(m => m.text !== '…');
      aiChat.push({ role: 'assistant', text: reply || 'Yanıt boş geldi.' });
    } catch (e) {
      aiChat = aiChat.filter(m => m.text !== '…');
      aiChat.push({ role: 'assistant', text: 'Hata: ' + (e.message || 'istek başarısız') + '\nAPI anahtarını ve interneti kontrol et.' });
    }
    aiPersistChat();
    aiRenderChat();
    aiBusy = false;
    if (btn) btn.disabled = false;
  }

  async function aiCallModel(history, minimal) {
    history = history.slice();
    while (history.length && history[0].role !== 'user') history.shift();   // konuşma kullanıcıyla başlamalı
    const s = aiGetSettings();
    const provider = s.provider || 'gemini';
    const key = s.apiKey;
    if (provider === 'openai') return aiCallOpenAI(key, history, minimal);
    return aiCallGemini(key, history, minimal);
  }

  async function aiCallGemini(key, history, minimal) {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';
    const contents = history.map((m, idx) => {
      const parts = [{ text: m.text || '' }];
      // son kullanıcı mesajında foto varsa vision
      if (m.role === 'user' && m.photo && idx === history.length - 1) {
        const raw = m.photo;
        const comma = raw.indexOf(',');
        const meta = raw.slice(0, comma);
        const data = raw.slice(comma + 1);
        const mime = (meta.match(/data:([^;]+)/) || [])[1] || 'image/jpeg';
        parts.push({ inline_data: { mime_type: mime, data } });
      }
      return { role: m.role === 'assistant' ? 'model' : 'user', parts };
    });
    const body = {
      contents,
      generationConfig: { temperature: 0.6, maxOutputTokens: minimal ? 32 : 1024 }
    };
    if (!minimal) body.systemInstruction = { parts: [{ text: aiSystemPrompt() }] };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },   // anahtar URL'de görünmesin
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error?.message || res.statusText || ('HTTP ' + res.status);
      throw new Error(msg);
    }
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
    return text.trim();
  }

  async function aiCallOpenAI(key, history, minimal) {
    const messages = [];
    if (!minimal) messages.push({ role: 'system', content: aiSystemPrompt() });
    history.forEach(m => messages.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text }));
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.6,
        max_tokens: minimal ? 32 : 1024
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || ('HTTP ' + res.status));
    return (data?.choices?.[0]?.message?.content || '').trim();
  }

  function openCompose() {
    const sel = document.getElementById('postVehicle');
    sel.innerHTML = '<option value="">Araç seçme</option>' +
      vehicles.map(v => `<option value="${v.id}">${v.plate || '—'} · ${v.brand || ''} ${v.model || ''}</option>`).join('');
    document.getElementById('postText').value = '';
    document.getElementById('postPhotoData').value = '';
    document.getElementById('postPhotoPreview').innerHTML = '<i class="fa-solid fa-image text-slate-600"></i>';
    document.getElementById('composeModal').classList.remove('hidden');
  }
  function closeCompose() { document.getElementById('composeModal').classList.add('hidden'); }

  function handlePostPhoto(e) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 900;
        let w = img.width, h = img.height;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        const data = c.toDataURL('image/jpeg', 0.72);
        document.getElementById('postPhotoData').value = data;
        document.getElementById('postPhotoPreview').innerHTML = `<img src="${data}" class="w-full h-full object-cover">`;
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function useVehiclePhoto() {
    const id = document.getElementById('postVehicle').value;
    if (!id) { toast('Önce araç seç'); return; }
    const v = vehicles.find(x => x.id === id);
    if (!v || !v.photo) { toast('Bu araçta fotoğraf yok'); return; }
    document.getElementById('postPhotoData').value = v.photo;
    document.getElementById('postPhotoPreview').innerHTML = `<img src="${v.photo}" class="w-full h-full object-cover">`;
  }

  function publishPost() {
    const text = document.getElementById('postText').value.trim();
    const photo = document.getElementById('postPhotoData').value || '';
    const vid = document.getElementById('postVehicle').value;
    if (!text && !photo) { toast('Yazı veya fotoğraf ekle'); return; }
    const v = vid ? vehicles.find(x => x.id === vid) : null;
    const post = {
      id: Date.now().toString(),
      text,
      photo,
      vehicleId: v ? v.id : null,
      plate: v ? v.plate : '',
      brand: v ? v.brand : '',
      model: v ? v.model : '',
      author: localStorage.getItem('garaj_display_name') || 'Sen',
      createdAt: new Date().toISOString(),
      likes: 0,
      liked: false
    };
    socialPosts.unshift(post);
    saveSocial();
    closeCompose();
    renderSocial();
    toast('Paylaşıldı');
  }

  function toggleLike(id) {
    const p = socialPosts.find(x => x.id === id);
    if (!p) return;
    if (p.liked) { p.liked = false; p.likes = Math.max(0, (p.likes || 0) - 1); }
    else { p.liked = true; p.likes = (p.likes || 0) + 1; }
    saveSocial();
    renderSocial();
  }

  function deletePost(id) {
    if (!confirm('Bu paylaşımı sil?')) return;
    socialPosts = socialPosts.filter(x => x.id !== id);
    saveSocial();
    renderSocial();
  }

  function timeAgo(iso) {
    const s = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (s < 60) return 'şimdi';
    if (s < 3600) return Math.floor(s / 60) + ' dk';
    if (s < 86400) return Math.floor(s / 3600) + ' sa';
    return Math.floor(s / 86400) + ' g';
  }

  function renderSocial() {
    const box = document.getElementById('socialFeed');
    if (!socialPosts.length) {
      box.innerHTML = `<div class="text-center py-16 px-6">
        <div class="w-20 h-20 mx-auto rounded-3xl insight-card flex items-center justify-center mb-4">
          <i class="fa-solid fa-globe text-3xl text-accent"></i>
        </div>
        <h2 class="text-lg font-bold">Henüz paylaşım yok</h2>
        <p class="text-sm text-slate-500 mt-2">İlk postu sen at — araç fotoğrafı ve yazıyla garajını paylaş.</p>
        <button onclick="openCompose()" class="mt-6 btn-red text-white px-6 py-3 rounded-2xl font-semibold">+ Post at</button>
        <p class="text-[11px] text-slate-600 mt-4">Not: Paylaşımlar bu cihazda saklanır (gerçek global sunucu yok).</p>
      </div>`;
      return;
    }
    box.innerHTML = socialPosts.map(p => {
      const photo = garajimSafeImageSrc(p.photo);
      const postIdArg = garajimInlineJsArg(p.id);
      const author = garajimHtmlEsc(p.author || 'Sen');
      const plate = garajimHtmlEsc(p.plate || '');
      const brand = garajimHtmlEsc(p.brand || '');
      const model = garajimHtmlEsc(p.model || '');
      return `
      <article class="post-card">
        <div class="p-4 flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-accent">${garajimHtmlEsc(String(p.author || 'S').charAt(0))}</div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold">${author}</p>
            <p class="text-[11px] text-slate-500">${timeAgo(p.createdAt)}${p.plate ? ' · ' + plate : ''}</p>
          </div>
          <button onclick="deletePost(${postIdArg})" class="w-8 h-8 rounded-lg text-slate-500 hover:text-red-400"><i class="fa-solid fa-trash text-xs"></i></button>
        </div>
        ${photo ? `<img class="post-img" src="${photo}" alt="">` : ''}
        <div class="p-4 ${photo ? 'pt-3' : 'pt-0'}">
          ${p.text ? `<p class="text-sm leading-relaxed whitespace-pre-wrap">${garajimHtmlEsc(p.text)}</p>` : ''}
          ${p.plate ? `<div class="mt-2"><span class="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400"><i class="fa-solid fa-car mr-1"></i>${plate} · ${brand} ${model}</span></div>` : ''}
          <div class="mt-3 flex items-center gap-4">
            <button onclick="toggleLike(${postIdArg})" class="flex items-center gap-1.5 text-sm ${p.liked ? 'text-accent' : 'text-slate-400'}">
              <i class="fa-${p.liked ? 'solid' : 'regular'} fa-heart"></i> ${p.likes || 0}
            </button>
          </div>
        </div>
      </article>`;
    }).join('');
  }

  // Saatten seçilmiş aracı, telefon yeniden açıldığında yerel sürüş seçimine geri al.
  // Native servis bir sürüşü yönetiyorsa seçim kilitli kalır; yerel oturumda eski seçimi ezmeyiz.
  function syncSelectedVehicleFromNative() {
    try {
      const N = window.GarajimNative;
      if (!N || typeof N.getNativeRideState !== 'function') return;
      const s = JSON.parse(N.getNativeRideState() || '{}');
      if (s.nativeMode || s.pendingSummary || !s.vehicleId) return;
      const id = String(s.vehicleId);
      if (!vehicles.some(v => String(v.id) === id)) return;
      ride.vehicleId = id;
      localStorage.setItem('garaj_ride_vehicle', id);
    } catch (e) {}
  }

  // Saat kapalı telefon oturumunda kaydedilen native sürüş özetlerini idempotent biçimde yerel geçmişe aktar.
  function importNativeRideHandoffs() {
    const N = window.GarajimNative;
    if (!N || typeof N.getNativeRideHandoffs !== 'function' || typeof N.ackNativeRideHandoffs !== 'function') return;
    let handoffs;
    try { handoffs = JSON.parse(N.getNativeRideHandoffs() || '[]'); } catch (e) { return; }
    if (!Array.isArray(handoffs) || !handoffs.length) return;
    try {
      let rides = getAllRides();
      const ids = new Set(rides.map(r => String(r && r.id || '')));
      const acknowledge = [];
      let ridesChanged = false, vehiclesChanged = false;
      handoffs.forEach(summary => {
        if (!summary || !summary.id) return;
        const id = String(summary.id);
        if (summary.nativeBackground && summary.date) {
          try {
            const draft = JSON.parse(localStorage.getItem('garaj_ride_draft') || 'null');
            const draftStart = draft && draft.startedAt ? Date.parse(draft.startedAt) : NaN;
            const summaryStart = Date.parse(summary.date);
            if (Number.isFinite(draftStart) && Number.isFinite(summaryStart) && Math.abs(draftStart - summaryStart) < 5000) {
              localStorage.removeItem('garaj_ride_draft');
            }
          } catch (e) {}
        }
        if (!ids.has(id)) {
          if (!Array.isArray(summary.pts)) summary.pts = [];
          summary.nativeBackground = true;
          if (!summary.dna) {
            const handoffDna = rideComputeDna(summary, summary.corners || null);
            summary.dna = handoffDna ? { label: handoffDna.displayLabel || handoffDna.label, primary: handoffDna.primary, candidate: handoffDna.candidate, status: handoffDna.status, unlocked: (handoffDna.unlocked || []).slice() } : null;
            summary.story = rideBuildStory(summary, summary.corners || null, summary.dna);
            if (handoffDna && handoffDna.newlyUnlocked && handoffDna.newlyUnlocked.length) {
              rideShowDnaCelebration(handoffDna.newlyUnlocked);
              const labels = rideDnaLabels();
              const names = handoffDna.newlyUnlocked.map(key => labels[key]).filter(Boolean);
              rideCardPush({
                id: 'c_' + Date.now().toString(36), type: 'dna',
                title: 'Yeni sürüş DNA’sı kazandın', body: names.join(' · '), date: summary.endedAt || summary.date || new Date().toISOString()
              });
            }
          }
          rides.unshift(summary);
          ids.add(id);
          ridesChanged = true;
        }
        const vehicle = vehicles.find(v => String(v.id) === String(summary.vehicleId));
        if (vehicle) {
          if (!Array.isArray(vehicle.rides)) vehicle.rides = [];
          if (!vehicle.rides.some(r => String(r && r.id || '') === id)) {
            vehicle.rides.unshift({ id, date: summary.date, dist: summary.dist, time: summary.time, avg: summary.avg, max: summary.max });
            vehicle.rides = vehicle.rides.slice(0, 30);
            const addKm = Math.round((Number(summary.dist) || 0) / 1000);
            const currentKm = Number(vehicle.km);
            if (addKm > 0 && vehicle.km !== '' && vehicle.km != null && Number.isFinite(currentKm)) vehicle.km = currentKm + addKm;
            vehiclesChanged = true;
          }
        }
        acknowledge.push(id);
      });
      if (!acknowledge.length) return;
      if (ridesChanged) localStorage.setItem('garaj_rides', JSON.stringify(rides.slice(0, 150)));
      if (vehiclesChanged) persist();
      else if (ridesChanged) { try { syncNative(); runAutoBackup(false); } catch (e) {} }
      // Handoff yalnızca yerel yazmalar başarıyla bittikten sonra onaylanır; çökme olursa tekrar denenebilir.
      N.ackNativeRideHandoffs(JSON.stringify(acknowledge));
      if (ridesChanged) { achievementRecordActivity('ride'); achievementEvaluate('ride'); }
      toast('Saatte kaydedilen ' + acknowledge.length + ' sürüş telefon geçmişine aktarıldı.');
    } catch (e) {
      toast('Arka plan sürüşü içe aktarılamadı; yedek kayıt korunuyor.');
    }
  }

  // Init
  document.getElementById('svcCat').innerHTML = Object.entries(cats).map(([k,c]) => `<option value="${k}">${c.n}</option>`).join('');
  ['formModal','kmModal','serviceModal','fuelModal','planModal','composeModal'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', e => {
      if (e.target.id === id) {
        if (id==='formModal') closeFormModal();
        if (id==='kmModal') closeKmModal();
        if (id==='serviceModal') closeServiceModal();
        if (id==='fuelModal') closeFuelModal();
        if (id==='planModal') closePlanModal();
        if (id==='composeModal') closeCompose();
      }
    });
  });

  applyTheme();
  buildThemePacks();
  buildPinPad();
  updatePinUI();
  if (hasPin()) showLock('unlock');
  setupPWA();
  updateNotifBadge();
  checkAndNotify();
  updateAutoBackupUI();
  renderList();
  achievementInit();
  syncSelectedVehicleFromNative();
  syncNative();
  importNativeRideHandoffs();
  setTimeout(() => {
    // Native arayüz bazen ilk script çalıştıktan sonra bağlanır; önce saat seçimini oku, sonra JS durumunu yayınla.
    try { syncSelectedVehicleFromNative(); } catch (e) {}
    try { syncNative(); } catch (e) {}
    try { importNativeRideHandoffs(); } catch (e) {}
  }, 1500);
  // Uygulama yeniden açılırsa, saatten kaydet/sil kararı bekleyen sürüş özetini geri yükle.
  try {
    const pendingWatchSummary = JSON.parse(localStorage.getItem('garaj_ride_watch_pending') || 'null');
    if (pendingWatchSummary && pendingWatchSummary.id && !ride.pendingSummary) ride.pendingSummary = pendingWatchSummary;
  } catch (e) {}
  // Telefon uygulaması açıldığında saatin araç listesini ve ilk durum bilgisini de gönder.
  // Böylece saat, ilk sürüş başlatılana kadar "Telefona bağlan" yazısında kalmaz.
  setTimeout(() => { try { rideWearPush(); } catch (e) {} }, 2000);
  // Saatteki araç seçimi ve bağlantı göstergesi sürüş dışında da güncel kalsın.
  // Phone WebView çalıştığı sürece 10 saniyede bir durum + araç listesi yayımlanır.
  if (!window.__garajimWearHeartbeat) {
    window.__garajimWearHeartbeat = setInterval(() => {
      try { rideWearPush(); } catch (e) {}
    }, 10000);
  }
  setTimeout(checkWidgetAction, 700);                         // widget'tan soğuk açılış
  setTimeout(checkWidgetAction, 2500);
  // İlk açılışta kısa tanıtım; sonraki açılışlarda tek, atlanabilir ipucu. PIN ekranından sonra da kontrol edilir.
  setTimeout(discoveryMaybeBoot, 3200);

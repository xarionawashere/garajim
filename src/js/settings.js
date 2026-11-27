// Appearance, settings, onboarding, and privacy.
// Classic script: globals are shared with other files in index.html's intentional load order.
function themePref() { return localStorage.getItem('garaj_theme') || 'dark'; }
  function packPref() { return localStorage.getItem('garaj_pack') || 'dark-red'; }
  const BRAND_LOGOS = [
    { id: 'garage', name: 'Orijinal Garajım', desc: 'Ana logo; aynen korundu', mark: 'G', tier: 'free' },
    { id: 'monogram', name: 'Obsidyen', desc: 'Altın mühür ve monogram', mark: 'G', tier: 'free' },
    { id: 'route', name: 'Monaco', desc: 'Lacivert rota mührü', mark: '↗', tier: 'free' },
    { id: 'sport', name: 'Rosso GT', desc: 'Kırmızı GT otomobili', mark: 'GT', tier: 'free' },
    { id: 'heritage', name: 'Heritage', desc: 'Klasik koleksiyon rozeti', mark: 'H', tier: 'free' },
    { id: 'turbo', name: 'Apex', desc: 'Titanyum türbin mührü', mark: 'A', tier: 'free' },
    { id: 'electric', name: 'E-Motion', desc: 'Zümrüt elektrik amblemi', mark: 'E', tier: 'free' },
    { id: 'rally', name: 'Carbon GT', desc: 'Karbon yarış arması', mark: 'GT', tier: 'free' },
    { id: 'imperial', name: 'Sovereign', desc: 'Kraliyet altın arması', mark: 'S', tier: 'free' },
    { id: 'platinum', name: 'Platinum', desc: 'Platin garaj çizgisi', mark: 'P', tier: 'free' },
    { id: 'copper', name: 'Copperline', desc: 'Bakır işçilik mührü', mark: 'C', tier: 'free' },
    { id: 'midnight', name: 'Midnight', desc: 'Gece mavisi otomobil', mark: 'M', tier: 'free' },
    { id: 'alpine', name: 'Alpine', desc: 'Alp zirvesi ve rota', mark: 'A', tier: 'free' },
    { id: 'grandtour', name: 'Grand Tour', desc: 'Klasik touring şeridi', mark: 'GT', tier: 'free' },
    { id: 'signature', name: 'Signature', desc: 'Zümrüt imza mührü', mark: 'G', tier: 'free' },
    { id: 'atelier', name: 'Atelier', desc: 'Özel üretim kalkanı', mark: 'A', tier: 'free' }
  ];
  function brandLogoPref() {
    const id = localStorage.getItem('garaj_logo_v1') || 'garage';
    return BRAND_LOGOS.some(x => x.id === id) ? id : 'garage';
  }
  function brandLogoSvg(id) {
    const artwork = {"garage":"<path d=\"M3 14 16 4l13 10\" stroke=\"#ef4444\" stroke-width=\"2.6\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M7 14v13h18V14\" stroke=\"#f1f5f9\" stroke-width=\"1.8\" fill=\"#151515\"/><path d=\"M11 25v-8h10v8\" fill=\"#ef4444\"/><path d=\"M12 19h8l2 3H10z\" fill=\"#f1f5f9\"/>","monogram":"<circle cx=\"16\" cy=\"16\" r=\"13\" fill=\"#101114\" stroke=\"#D7B975\"/><path d=\"M22 9a8 8 0 1 0 2 10h-7v-3h11v3a12 12 0 1 1-2-12z\" fill=\"#D7B975\"/>","route":"<circle cx=\"16\" cy=\"16\" r=\"13\" fill=\"#071B2B\" stroke=\"#D9B775\"/><path d=\"M8 24c0-7 9-3 9-10 0-3 3-5 7-6\" stroke=\"#75C5D6\" fill=\"none\" stroke-width=\"2.4\" stroke-linecap=\"round\"/><path d=\"m22 5 5 2-4 4\" fill=\"#D9B775\"/>","sport":"<path d=\"M5 20 8 14l5-3h7l6 4 2 5v4H5z\" fill=\"#D93B42\"/><path d=\"M12 13h7l4 4H9z\" fill=\"#E9D9C5\"/><circle cx=\"10\" cy=\"23\" r=\"2\" fill=\"#E9D9C5\"/><circle cx=\"24\" cy=\"23\" r=\"2\" fill=\"#E9D9C5\"/>","heritage":"<circle cx=\"16\" cy=\"16\" r=\"13\" fill=\"#E7D9BD\" stroke=\"#6C472B\" stroke-width=\"2\"/><path d=\"m5 18 2-4 4-2h8l4 3 4 1v4H5z\" fill=\"#6C472B\"/><circle cx=\"10\" cy=\"21\" r=\"1.7\" fill=\"#6C472B\"/><circle cx=\"22\" cy=\"21\" r=\"1.7\" fill=\"#6C472B\"/>","turbo":"<circle cx=\"16\" cy=\"16\" r=\"13\" fill=\"#17151B\" stroke=\"#B5BBC4\"/><path d=\"M15 14V6c0-2 3-2 3 0v8m1 1 6-5c2-1 4 1 2 3l-7 5m0 2 7 1c2 0 2 3 0 3l-8-1m-3-1 5 6c1 2-1 4-3 2l-5-7m-2-4-6 4c-2 1-4-1-2-3l7-5\" fill=\"#B5BBC4\"/><circle cx=\"16\" cy=\"16\" r=\"3\" fill=\"#E14D45\"/>","electric":"<rect x=\"8\" y=\"5\" width=\"16\" height=\"23\" rx=\"3\" fill=\"#071B1A\" stroke=\"#54D8B5\" stroke-width=\"1.8\"/><path d=\"M13 3h6v3h-6z\" fill=\"#54D8B5\"/><path d=\"m18 9-7 10h5l-2 7 8-12h-5z\" fill=\"#E3FFF8\"/>","rally":"<path d=\"M8 4v24\" stroke=\"#F1EBDD\" stroke-width=\"2\"/><path d=\"M10 5h15v11H10z\" fill=\"#D9473D\"/><path d=\"M10 5h7v5h-7zm7 5h8v6h-8z\" fill=\"#F1EBDD\"/><path d=\"m5 22 3-4h10l5 3 4 1 1 3H5z\" fill=\"#F1EBDD\"/>","imperial":"<path d=\"m5 10 6 4 5-8 5 8 6-4-2 9H7z\" fill=\"#D9B56F\"/><path d=\"M7 19h18v5l-9 5-9-5z\" fill=\"#101015\" stroke=\"#D9B56F\"/><path d=\"m10 23 2-3h7l3 3\" stroke=\"#F7E9C7\" fill=\"none\"/>","platinum":"<path d=\"m4 18 12-12 12 12M8 20v8h16v-8\" stroke=\"#D5D9DF\" stroke-width=\"2\" fill=\"none\"/><path d=\"M10 22h12v4H10z\" fill=\"#D5D9DF\"/>","copper":"<path d=\"m4 16 12-11 12 11\" stroke=\"#C47A50\" stroke-width=\"2.5\" fill=\"none\"/><path d=\"M8 16v10h16V16\" stroke=\"#F2D1B4\" fill=\"none\"/><path d=\"m9 22 3-4h8l3 4v3H9z\" fill=\"#C47A50\"/>","midnight":"<path d=\"M4 22c4-8 7-11 12-11s9 3 12 11v3H4z\" fill=\"#D5F7FF\"/><path d=\"m11 14h10l4 5H7z\" fill=\"#07131F\"/><circle cx=\"9\" cy=\"24\" r=\"2\" fill=\"#4BA7C7\"/><circle cx=\"23\" cy=\"24\" r=\"2\" fill=\"#4BA7C7\"/>","alpine":"<path d=\"m3 19 8-11 4 6 4-9 10 14\" stroke=\"#C9D6DE\" stroke-width=\"2\" fill=\"none\"/><path d=\"m17 11 2-6 4 7-3-1-2 3z\" fill=\"#F0F7F9\"/><path d=\"M5 24q6-5 11 0t11 0v4H5z\" fill=\"#C9D6DE\"/>","grandtour":"<path d=\"M5 4h3v24H5zm5 0h2v24h-2z\" fill=\"#D9C79B\"/><path d=\"m5 19 4-5h10l6 4 3 1v5H5z\" fill=\"#F8F0DE\"/><circle cx=\"10\" cy=\"24\" r=\"2\" fill=\"#D9C79B\"/><circle cx=\"23\" cy=\"24\" r=\"2\" fill=\"#D9C79B\"/>","signature":"<circle cx=\"16\" cy=\"16\" r=\"13\" fill=\"#F0E9DA\" stroke=\"#B69152\" stroke-width=\"1.6\"/><path d=\"M22 9a8 8 0 1 0 2 10h-7v-3h11v3a12 12 0 1 1-2-12z\" fill=\"#183D35\"/>","atelier":"<path d=\"m16 2 13 7v14l-13 7L3 23V9z\" fill=\"#17111F\" stroke=\"#C8A5D6\" stroke-width=\"1.5\"/><path d=\"m16 7 8 7h-3v8H11v-8H8z\" fill=\"#F4EAF7\"/><path d=\"m12 17 2-3h4l2 3v2h-8z\" fill=\"#17111F\"/>"};
    const art = artwork[id] || artwork.garage;
    return '<svg viewBox="0 0 32 32" aria-hidden="true">' + art + '</svg>';
  }
  function applyBrandLogo() {
    const id = brandLogoPref();
    document.querySelectorAll('.brand-logo-option').forEach(b => {
      const active = b.dataset.logoId === id;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }
  function buildBrandLogoOptions() {
    const box = document.getElementById('brandLogoOptions');
    if (!box) return;
    const current = brandLogoPref();
    box.innerHTML = BRAND_LOGOS.map(logo => `
      <button type="button" class="brand-logo-option ${logo.id === current ? 'active' : ''}" data-logo-id="${logo.id}" aria-pressed="${logo.id === current ? 'true' : 'false'}" onclick="setBrandLogo('${logo.id}')">
        <span class="brand-logo-preview">${brandLogoSvg(logo.id)}</span>
        <span class="min-w-0"><span class="block text-xs font-bold">${logo.name}</span><span class="block text-[10px] text-slate-500 mt-0.5">${logo.desc}</span></span>
      </button>`).join('');
  }
  function setBrandLogo(id) {
    if (!BRAND_LOGOS.some(logo => logo.id === id)) return;
    const previousLogo = brandLogoPref();
    localStorage.setItem('garaj_logo_v1', id);
    applyBrandLogo();
    try {
      const N = window.GarajimNative;
      if (N && typeof N.setLauncherLogo === 'function') N.setLauncherLogo(id);
      if (N && typeof N.pushWearBranding === 'function') N.pushWearBranding(packPref(), themePref(), id);
    } catch (e) {}
    if (previousLogo !== id && typeof achievementRecordActivity === 'function') { achievementRecordActivity('logo_change'); achievementEvaluate('logo_change'); }
    toast((BRAND_LOGOS.find(logo => logo.id === id) || {}).name + ' uygulama simgesi seçildi');
  }


  // ---------- HARİTA KARELERİ ----------
  // Harita sağlayıcısının HTTP önbellek yönergelerini tarayıcıya bırak.
  // OpenStreetMap standart karo sunucusu toplu indirme/çevrimdışı ön indirmeye izin vermez.
  function tileLayerCached(url, opt) { return L.tileLayer(url, opt); }

  function addBaseTiles(map) {
    const osm = tileLayerCached('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' });
    const esri = tileLayerCached('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Tiles © Esri' });
    let errs = 0, swapped = false;
    osm.on('tileerror', () => {
      if (navigator.onLine === false) return;                   // çevrimdışıyken sağlayıcı değiştirme
      errs++;
      if (errs >= 4 && !swapped) {                              // OSM engellenirse Esri'ye geç
        swapped = true; map.removeLayer(osm); esri.addTo(map); map.__base = esri; rideUpdateMapAttribution();
      }
    });
    osm.addTo(map);
    map.__base = osm;
    map.getContainer().classList.toggle('map-dark', !isLight());
    setTimeout(rideUpdateMapAttribution, 0);
    return osm;
  }

  window.addEventListener('offline', () => toast('İnternet yok — GPS çalışabilir; yeni arama ve rota hesaplama için internet gerekir.'));
  window.addEventListener('online', () => toast('Tekrar çevrimiçi'));

  // OSM standart karo sunucusu için toplu/çevrimdışı karo indirmesi desteklenmez.
  // Eski ayar çağrıları güvenle açıklama gösterir; ağ isteği oluşturmaz.
  async function rideSaveOfflineArea() {
    toast('Toplu çevrimdışı harita indirme desteklenmiyor. Harita ekranda görüntülenirken sağlayıcının normal önbelleği kullanılır; rota için internet gerekir.');
    return false;
  }

  // Harici bağlantı: APK'da sistem tarayıcısı/Haritalar, web'de yeni sekme
  function openExternal(url) {
    const native = !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
    if (native) window.location.href = url; else window.open(url, '_blank');
  }

  // ---------- DOSYA KAYDET / PAYLAŞ (APK'da indirme çalışmaz → paylaş menüsü) ----------
  const isNativeApp = () => !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
  function toBase64(data) {
    return new Promise((res, rej) => {
      if (typeof data === 'string') { try { res(btoa(unescape(encodeURIComponent(data)))); } catch (e) { rej(e); } return; }
      const blob = data instanceof Blob ? data : new Blob([data]);
      const r = new FileReader();
      r.onload = () => res(String(r.result).split(',')[1] || '');
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  }
  // Dönüş: 'share' | 'download' | 'cancel'
  async function saveOrShare(name, mime, data, title) {
    const P = window.Capacitor && Capacitor.Plugins;
    if (isNativeApp() && P && P.Filesystem && P.Share) {
      try {
        const r = await P.Filesystem.writeFile({ path: name, data: await toBase64(data), directory: 'CACHE' });
        await P.Share.share({ title: title || name, url: r.uri, dialogTitle: 'Dosyayı gönder veya kaydet' });
        return 'share';
      } catch (e) { if (/cancel/i.test(String((e && e.message) || e))) return 'cancel'; }
    }
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
    try {
      const file = new File([blob], name, { type: mime });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: title || name }); return 'share'; }
    } catch (e) { if (e && e.name === 'AbortError') return 'cancel'; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    return 'download';
  }
  async function saveFileToast(name, mime, data, what) {
    const via = await saveOrShare(name, mime, data, what);
    if (via === 'share') toast(what + ' hazır — Drive, WhatsApp veya Dosyalar ile kaydedebilirsin');
    else if (via === 'download') toast(what + ' indirildi');
    return via;
  }
  function savePdf(doc, name) { return saveFileToast(name, 'application/pdf', doc.output('arraybuffer'), 'PDF'); }

  function isLight() {
    // light packs themselves handle light look; keep auto/dark/light for legacy toggle
    const t = themePref();
    return t === 'light' || (t === 'auto' && window.matchMedia('(prefers-color-scheme: light)').matches);
  }
  function applyPack(pack) {
    const p = pack || THEME_PACKS.find(x => x.id === packPref()) || THEME_PACKS[0];
    const r = document.documentElement.style;
    r.setProperty('--bg', p.bg);
    r.setProperty('--surface', p.surface);
    r.setProperty('--surface2', p.surface2);
    r.setProperty('--card', p.card);
    r.setProperty('--border', p.border);
    r.setProperty('--text', p.text);
    r.setProperty('--muted', p.muted);
    r.setProperty('--accent', p.accent);
    r.setProperty('--accent-dark', p.accentDark);
    r.setProperty('--accent-rgb', p.rgb);
    r.setProperty('--input-bg', p.input);
    r.setProperty('--header-bg', p.header);
    r.setProperty('--modal-bg', p.modal);
    r.setProperty('--btn-text', p.btnText);
    document.body.style.background = p.bg;
    document.body.style.color = p.text;
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.content = p.bg;
    const titleSpans = document.querySelectorAll('h1 span');
    if (titleSpans[1]) titleSpans[1].style.color = p.accent;
    document.querySelectorAll('.theme-pack').forEach(b => b.classList.toggle('active', b.dataset.id === p.id));
    try { const N = window.GarajimNative; if (N && typeof N.pushWearTheme === 'function') N.pushWearTheme(p.id, themePref()); } catch (e) {}
  }
  function applyTheme() {
    // light class only for legacy light toggle compatibility
    const l = isLight() && !packPref().includes('white') && !packPref().includes('snow') && !packPref().includes('cream');
    document.documentElement.classList.toggle('light', themePref() === 'light');
    document.querySelectorAll('.theme-opt').forEach(b => b.classList.toggle('active', b.dataset.t === themePref()));
    applyPack();
  }
  function setTheme(t) {
    localStorage.setItem('garaj_theme', t);
    applyTheme();
    if (currentId) openDetail(currentId);
  }
  function setPack(id) {
    localStorage.setItem('garaj_pack', id);
    applyPack();
    toast((THEME_PACKS.find(x => x.id === id) || {}).name + ' seçildi');
    if (currentId) openDetail(currentId);
  }
  function buildThemePacks() {
    const box = document.getElementById('themePacks');
    if (!box) return;
    const cur = packPref();
    box.innerHTML = THEME_PACKS.map(p => `
      <button type="button" class="theme-pack ${p.id === cur ? 'active' : ''}" data-id="${p.id}" onclick="setPack('${p.id}')">
        <div class="preview">
          <span style="background:${p.preview[0]}"></span>
          <span style="background:${p.preview[1]}"></span>
          <span style="background:${p.preview[2]}"></span>
          <span style="background:${p.preview[3]}"></span>
        </div>
        <div class="meta">
          <div class="name">${p.name}</div>
          <div class="desc">${p.desc}</div>
        </div>
      </button>`).join('');
  }
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if (themePref() === 'auto') applyTheme(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyBrandLogo); else applyBrandLogo();

  // ---------- AYARLAR ----------
  function wearPairReadStatus() {
    try {
      const N = window.GarajimNative;
      const raw = N && typeof N.getWearStatus === 'function' ? N.getWearStatus() : '';
      return raw ? JSON.parse(raw) : { connected: false, unavailable: true };
    } catch (e) { return { connected: false, unavailable: true }; }
  }
  function wearPairRender() {
    const card = document.getElementById('wearPairCard');
    if (!card) return;
    const state = wearPairReadStatus();
    const title = document.getElementById('wearPairTitle');
    const detail = document.getElementById('wearPairStatus');
    const action = document.getElementById('wearPairAction');
    if (state.connected) {
      if (title) title.textContent = state.name ? state.name + ' bağlı' : 'Saatin Garajım’a bağlı';
      if (detail) detail.textContent = 'Telefon ve saat Garajım verilerini eşitliyor.';
      if (action) action.textContent = 'Bağlantıyı kes';
      card.classList.add('wear-pair-connected');
    } else {
      if (title) title.textContent = 'Saatini Garajım’a bağla';
      if (detail) detail.textContent = 'Saat uygulaması isteğe bağlı. Telefon uygulaması tam olarak kullanılabilir.';
      if (action) action.textContent = 'Saati bağla';
      card.classList.remove('wear-pair-connected');
    }
  }
  function wearPairRefresh() {
    try { if (typeof rideWearPush === 'function') rideWearPush(); } catch (e) {}
    wearPairRender();
    setTimeout(wearPairRender, 900);
    toast('Saat bağlantısı kontrol ediliyor');
  }
  function wearPairManage() {
    const state = wearPairReadStatus();
    const message = state.connected
      ? 'Garajım telefon-saat sistem eşleşmesini kendisi silemez. Bağlantıyı kesmek için saati Wear OS veya Galaxy Wearable içinden kaldırabilirsin.'
      : 'Saati önce Wear OS veya Galaxy Wearable uygulamasından telefona eşleştir; sonra Garajım’ı iki cihazda da aç. Bağlantı otomatik bulunur.';
    if (!confirm(message + '\n\nİlgili cihaz ayarını açalım mı?')) return;
    try {
      const N = window.GarajimNative;
      if (N && typeof N.openWearSettings === 'function') N.openWearSettings();
      else toast('Eşleştirme Wear OS veya Galaxy Wearable içinden yapılır');
    } catch (e) { toast('Wear OS veya Galaxy Wearable uygulamasını aç'); }
  }
  function wearPairLater() {
    localStorage.setItem('garaj_wear_pair_later', '1');
    closeSettings();
    toast('Saat olmadan da Garajım’ı kullanabilirsin');
  }

  function openSettings() {
    updatePinUI();
    applyTheme();
    buildThemePacks();
    buildBrandLogoOptions();
    applyBrandLogo();
    const rd = getRemindDays();
    document.querySelectorAll('.remind-opt').forEach(b => b.classList.toggle('active', Number(b.dataset.d) === rd));
    updateBackupInfo();
    updateAutoBackupUI();
    discoveryUpdateSettingsUI();
    wearPairRender();
    setTimeout(wearPairRender, 900);
    const ai = aiGetSettings();
    const prov = document.getElementById('aiProvider');
    const key = document.getElementById('aiApiKey');
    if (prov) prov.value = ai.provider || 'gemini';
    if (key) key.value = ai.apiKey || '';
    document.getElementById('settingsModal').classList.remove('hidden');
  }
  function closeSettings() { document.getElementById('settingsModal').classList.add('hidden'); }

  function toast(m) {
    let t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.style.cssText = 'position:fixed;left:50%;bottom:32px;transform:translateX(-50%);z-index:120;padding:10px 16px;border-radius:12px;font-size:14px;font-weight:500;background:#1f1f1f;color:#fff;border:1px solid rgba(255,255,255,.12);box-shadow:0 8px 24px rgba(0,0,0,.35)';
      document.body.appendChild(t);
    }
    t.textContent = m;
    t.style.display = 'block';
    clearTimeout(t._h);
    t._h = setTimeout(() => { t.style.display = 'none'; }, 2200);
  }


  // ---------- GARAJIM'I KEŞFET / SUNU DENE ----------
  const DISCOVERY_KEY = 'garaj_discovery_v1';
  const DISCOVERY_SLIDES = [
    { kind:'garage', icon:'fa-car-side', tag:'GARAJINI TANI', title:'Her şey aracınla başlar', body:'Araç bilgilerini ve fotoğraflarını ekle; bakım, sigorta, lastik ve kilometre geçmişini tek yerde tut.', points:['Kayıtlı araçların ve önemli tarihlerin bir arada','Bakım geçmişi ve yaklaşan işler gözünün önünde'] },
    { kind:'fuel', icon:'fa-gas-pump', tag:'MASRAFLARINI GÖR', title:'Yakıtın ve masrafların kontrolünde', body:'Yakıt fişini kaydet, tüketimi ve kilometre başına maliyeti takip et. Tahmin yerine kendi kayıtlarınla ilerle.', points:['Fiş fotoğrafıyla kayıt oluşturmayı dene','Araç geçmişindeki giderleri karşılaştır'] },
    { kind:'navigation', icon:'fa-route', tag:'YOLA ÇIK', title:'Rotanı oluştur, yola odaklan', body:'Açık Dünya üzerinden konumunu gör, hedef ara ve rota seçeneklerini karşılaştır. Kaydettiğin park yerine de geri dönebilirsin.', points:['Haritada hedef seçme ve adres arama','GPS doğruluğu ile rota durumunu izleme'] },
    { kind:'dna', icon:'fa-dna', tag:'SÜRÜŞÜNÜ KEŞFET', title:'Sürüş DNA’n zamanla oluşur', body:'Nitelikli sürüşlerin sekiz farklı profil için ipucu verir. Yeterli veri birikmeden kesin bir profil varsayılmaz.', points:['DNA puanlarını ve veri yeterliliğini incele','Başarı hedeflerini gerçek sürüşlerinle tamamla'] },
    { kind:'watch', icon:'fa-clock', tag:'İSTEĞE BAĞLI', title:'Garajım bileğinde de seninle', body:'Saatini Wear OS veya Galaxy Wearable üzerinden telefona eşleştir; Garajım bağlantıyı bulup verileri eşitler. Saatin yoksa telefon uygulamasının tüm özellikleri kullanılabilir.', points:['Bağlantıyı Ayarlar bölümünden yönet','Saat olmadan da aracı, bakımı ve yakıtı telefondan takip et'] },
    { kind:'backup', icon:'fa-shield-halved', tag:'VERİNİ KORU', title:'Yedeğini almadan yola çıkma', body:'Araç ve uygulama kayıtlarını düzenli dışa aktar. Yedek dosyanı güvenli bir konumda sakla.', points:['Ayarlar → Yedekle ile dosya oluştur','Yeni cihaza geçmeden önce geri yüklemeyi planla'] }
  ];
  const DISCOVERY_TIPS = [
    { id:'vehicle', kind:'garage', icon:'fa-car-side', tag:'İLK ADIM', title:'Aracını Garajım’a ekle', body:'Plaka, kilometre ve temel bilgilerini ekleyerek bakım ve masraf takibini kişiselleştir.', action:'Aracı ekle', eligible:()=>!vehicles.length, run:()=>{showTab('garage');setTimeout(openAddModal,120);} },
    { id:'maintenance', kind:'garage', icon:'fa-screwdriver-wrench', tag:'GARAJINI TANI', title:'Bakım geçmişini gözden geçir', body:'Kayıtlı aracının detayını açıp bakım tarihleri, kilometre ve yaklaşan işleri kontrol et.', action:'Araç detayını aç', eligible:()=>vehicles.length>0, run:()=>{showTab('garage');const v=vehicles[0];if(v)setTimeout(()=>openDetail(v.id),120);} },
    { id:'fuel', kind:'fuel', icon:'fa-gas-pump', tag:'MASRAF TAKİBİ', title:'Bir yakıt kaydı dene', body:'Son dolumunu litre, tutar ve kilometreyle kaydet. Böylece tüketim hesabı için veri biriktirmeye başlarsın.', action:'Yakıt kaydı aç', eligible:()=>vehicles.length>0, run:()=>{showTab('garage');const v=vehicles[0];if(v)setTimeout(()=>{openDetail(v.id);setTimeout(()=>{try{openFuelModal();}catch(e){toast('Araç detayından yakıt kaydını açabilirsin.');}},180);},120);} },
    { id:'navigation', kind:'navigation', icon:'fa-route', tag:'AÇIK DÜNYA', title:'Bir hedef belirleyip rotanı gör', body:'Adres aramasını veya haritadan hedef seçmeyi dene. Rota hesaplamak için internet ve güvenilir GPS gerekir.', action:'Navigasyonu aç', eligible:()=>true, run:()=>{showTab('ride');setTimeout(()=>{if(ride.map)nvOpen();else toast('Harita açılınca Navigasyon düğmesine dokun.');},900);} },
    { id:'dna', kind:'dna', icon:'fa-dna', tag:'SÜRÜŞ DNA', title:'Sürüş DNA profillerini keşfet', body:'Sekiz profilin puanlarını ve hangi verinin eksik olduğunu incele. Gerçek sürüş yapmadan test etmek için gizli simülatör de var.', action:'DNA panosunu aç', eligible:()=>true, run:()=>achievementOpen('dna') },
    { id:'park', kind:'navigation', icon:'fa-square-parking', tag:'PRATİK KISAYOL', title:'Park yerini kaydetmeyi dene', body:'Aracından inince park konumunu sakla. Daha sonra haritada gösterip geri dönüş yolunu açabilirsin.', action:'Park yerini göster', eligible:()=>true, run:()=>{showTab('ride');setTimeout(()=>{if(ride.map)parkOpen();else toast('Harita açılınca Araçlar menüsünden Park yerim’i aç.');},900);} },
    { id:'backup', kind:'backup', icon:'fa-shield-halved', tag:'VERİ GÜVENLİĞİ', title:'Bir yedek oluşturmayı unutma', body:'Araç kayıtların bu cihazda saklanır. Düzenli yedek dosyası, cihaz değiştirirken işini kolaylaştırır.', action:'Yedekleme ayarlarını aç', eligible:()=>true, run:()=>openSettings() }
  ];
  let discoveryMode = 'tour', discoverySlideIndex = 0, discoveryCurrentTip = null, discoveryBootTimer = null, discoveryBodyOverflow = '', discoveryBootHandled = false;
  function discoveryGetState(){
    const defaults={version:1,introComplete:false,tipsEnabled:true,lastTipId:'',shownTips:0};
    try { const x=JSON.parse(localStorage.getItem(DISCOVERY_KEY)||'{}');return Object.assign({},defaults,x,{version:1,tipsEnabled:x.tipsEnabled!==false,introComplete:x.introComplete===true,shownTips:Math.max(0,Number(x.shownTips)||0)}); }
    catch(e){return defaults;}
  }
  function discoverySaveState(v){try{localStorage.setItem(DISCOVERY_KEY,JSON.stringify(v));return true;}catch(e){return false;}}
  function discoveryVisible(){const el=document.getElementById('discoveryOverlay');return !!el&&!el.classList.contains('hidden');}
  function discoveryClose(){
    const el=document.getElementById('discoveryOverlay');if(el){el.classList.add('hidden');el.setAttribute('aria-hidden','true');}
    document.body.style.overflow=discoveryBodyOverflow;discoveryBodyOverflow='';discoveryCurrentTip=null;
  }
  function discoveryOpen(){
    const el=document.getElementById('discoveryOverlay');if(!el)return;
    if(!discoveryVisible())discoveryBodyOverflow=document.body.style.overflow||'';
    el.classList.remove('hidden');el.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
    const dialog=document.getElementById('discoveryDialog');if(dialog){dialog.classList.remove('discovery-enter');void dialog.offsetWidth;dialog.classList.add('discovery-enter');}
    try{document.getElementById('discoverySkipBtn').focus({preventScroll:true});}catch(e){}
  }
  function discoverySetContent(item, eyebrow, stepText, points){
    const scene=document.getElementById('discoveryScene');scene.dataset.kind=item.kind||'garage';
    document.getElementById('discoveryIcon').className='fa-solid '+(item.icon||'fa-sparkles');
    document.getElementById('discoveryEyebrow').textContent=eyebrow||item.tag||'GARAJIM’I KEŞFET';
    document.getElementById('discoveryTitle').textContent=item.title||'';
    document.getElementById('discoveryBody').textContent=item.body||'';
    const pointList=points||item.points||[];const pointBox=document.getElementById('discoveryPoints');pointBox.innerHTML=pointList.map(t=>'<div class="discovery-point"><i class="fa-solid fa-circle-check"></i><span>'+String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</span></div>').join('');pointBox.classList.toggle('hidden',pointList.length===0);
  }
  function discoveryRenderTour(){
    const slide=DISCOVERY_SLIDES[discoverySlideIndex];if(!slide)return;
    discoveryMode='tour';discoveryCurrentTip=null;
    document.getElementById('discoveryDialog').classList.remove('tip-mode');
    document.getElementById('discoveryTopLabel').textContent='GARAJIM’I KEŞFET';
    document.getElementById('discoveryStepLabel').textContent=(discoverySlideIndex+1)+' / '+DISCOVERY_SLIDES.length+' · Kısa tanıtım';
    document.getElementById('discoveryProgress').classList.remove('hidden');
    document.getElementById('discoveryProgress').innerHTML=DISCOVERY_SLIDES.map((_,i)=>'<span class="'+(i<=discoverySlideIndex?'active':'')+'"></span>').join('');
    document.getElementById('discoveryBackBtn').classList.toggle('hidden',discoverySlideIndex===0);
    const next=document.getElementById('discoveryActionBtn');next.onclick=discoveryNext;next.innerHTML=discoverySlideIndex===DISCOVERY_SLIDES.length-1?'Başlayalım <i class="fa-solid fa-check ml-1.5"></i>':'Devam et <i class="fa-solid fa-arrow-right ml-1.5"></i>';
    document.getElementById('discoveryFootnote').textContent='İstediğin an atlayabilir, tanıtımı ayarlardan tekrar açabilirsin.';
    discoverySetContent(slide,slide.tag,'',slide.points);discoveryOpen();
  }
  function discoveryStartTour(){discoverySlideIndex=0;discoveryRenderTour();}
  function discoveryPrevious(){if(discoveryMode!=='tour'||discoverySlideIndex<=0)return;discoverySlideIndex--;discoveryRenderTour();}
  function discoveryNext(){
    if(discoveryMode==='tip'){discoveryRunCurrentTip();return;}
    if(discoverySlideIndex<DISCOVERY_SLIDES.length-1){discoverySlideIndex++;discoveryRenderTour();return;}
    const state=discoveryGetState();state.introComplete=true;discoverySaveState(state);discoveryClose();toast('Garajım hazır. İstediğin zaman keşfetmeye devam edebilirsin.');
  }
  function discoverySkip(){
    const state=discoveryGetState();
    if(discoveryMode==='tour'){state.introComplete=true;discoverySaveState(state);}
    discoveryClose();
  }
  function discoverySelectTip(force){
    const state=discoveryGetState();if(!force&&!state.tipsEnabled)return null;
    const list=DISCOVERY_TIPS.filter(t=>{try{return t.eligible();}catch(e){return false;}});if(!list.length)return null;
    let idx=list.findIndex(t=>t.id===state.lastTipId);const tip=list[(idx+1)%list.length]||list[0];
    state.lastTipId=tip.id;state.shownTips++;discoverySaveState(state);return tip;
  }
  function discoveryShowNextTip(force){
    const tip=discoverySelectTip(!!force);if(!tip)return false;
    discoveryMode='tip';discoveryCurrentTip=tip;
    document.getElementById('discoveryDialog').classList.add('tip-mode');
    document.getElementById('discoveryTopLabel').textContent='ŞUNU DENE!';
    document.getElementById('discoveryStepLabel').textContent='Garajım’dan küçük bir ipucu';
    document.getElementById('discoveryProgress').classList.add('hidden');document.getElementById('discoveryProgress').innerHTML='';
    document.getElementById('discoveryBackBtn').classList.add('hidden');
    const action=document.getElementById('discoveryActionBtn');action.onclick=discoveryRunCurrentTip;action.innerHTML=tip.action+' <i class="fa-solid fa-arrow-right ml-1.5"></i>';
    document.getElementById('discoveryFootnote').textContent='Atlayabilirsin. Önerileri Ayarlar’dan istediğin zaman kapatabilirsin.';
    discoverySetContent(tip,tip.tag,'',[]);discoveryOpen();return true;
  }
  function discoveryRunCurrentTip(){const t=discoveryCurrentTip;discoveryClose();if(!t)return;try{t.run();}catch(e){toast('Bu bölümü şimdi açamadım. Ana menüden deneyebilirsin.');}}
  function discoveryMaybeBoot(){
    if(discoveryBootHandled)return;
    if(discoveryBootTimer)clearTimeout(discoveryBootTimer);
    discoveryBootTimer=setTimeout(()=>{
      discoveryBootTimer=null;
      if(document.hidden||discoveryVisible())return;
      try { const resume=JSON.parse(localStorage.getItem('garaj_nav_session_v2')||'null'); if(resume&&resume.dest&&Date.now()-Number(resume.savedAt||0)<12*60*60*1000){discoveryBootHandled=true;return;} } catch(e) {}
      if(typeof lockVisible==='function'&&lockVisible())return;
      try { if (ride && (ride.running || ride.pendingSummary)) { discoveryBootHandled=true; return; } const rv=document.getElementById('rideView'); if (rv && !rv.classList.contains('hidden')) { discoveryBootHandled=true; return; } } catch(e) {}
      const blocked=['formModal','detailView','settingsModal','navModal','achievementModal','achievementCelebration','notificationPanel','composeModal','fuelModal','serviceModal','planModal','kmModal'];
      if(blocked.some(id=>{const e=document.getElementById(id);return e&&!e.classList.contains('hidden');}))return;
      const state=discoveryGetState();if(!state.introComplete){discoveryBootHandled=true;discoveryStartTour();return;}if(state.tipsEnabled){discoveryBootHandled=true;discoveryShowNextTip(false);}else discoveryBootHandled=true;
    },1200);
  }
  function discoveryToggleTips(){const state=discoveryGetState();state.tipsEnabled=!state.tipsEnabled;discoverySaveState(state);discoveryUpdateSettingsUI();toast(state.tipsEnabled?'Açılış önerileri açıldı':'Açılış önerileri kapatıldı');}
  function discoveryUpdateSettingsUI(){const state=discoveryGetState();const btn=document.getElementById('discoveryTipsToggle');if(btn){btn.textContent=state.tipsEnabled?'Açık':'Kapalı';btn.classList.toggle('active',state.tipsEnabled);btn.setAttribute('aria-pressed',state.tipsEnabled?'true':'false');}const note=document.getElementById('discoveryStatus');if(note)note.textContent=state.introComplete?'Tanıtım tamamlandı · açılış ipuçları '+(state.tipsEnabled?'açık':'kapalı'):'İlk açılış tanıtımı henüz tamamlanmadı';}
  function discoveryReplayTour(){closeSettings();setTimeout(()=>discoveryStartTour(),160);}
  function discoveryShowTipNow(){closeSettings();setTimeout(()=>discoveryShowNextTip(true),160);}
  document.addEventListener('keydown',e=>{if(discoveryVisible()&&e.key==='Escape'){e.preventDefault();discoverySkip();}});

  // ---------- PIN KİLİDİ ----------
  const PIN_KEY = 'garaj_pin';
  const PIN_SALT = 'garajim::';
  const hasPin = () => !!localStorage.getItem(PIN_KEY);
  let pinMode = 'unlock', pinBuf = '', pinTmp = '', pinErr = '', pinFails = 0, pinLockUntil = 0, lastHidden = 0;

  async function hashPin(p) {
    const s = PIN_SALT + p;
    try {
      if (window.crypto && crypto.subtle) {
        const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
        return 'S' + Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) {}
    let h = 5381;
    for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
    return 'D' + h;
  }

  function buildPinPad() {
    document.getElementById('pinDots').innerHTML = [0, 1, 2, 3].map(() => '<span class="pin-dot"></span>').join('');
    const keys = ['1','2','3','4','5','6','7','8','9','','0','del'];
    document.getElementById('pinPad').innerHTML = keys.map(k => {
      if (k === '') return '<div></div>';
      if (k === 'del') return '<button class="pin-key" onclick="pinKey(\'del\')"><i class="fa-solid fa-delete-left text-lg"></i></button>';
      return '<button class="pin-key" onclick="pinKey(\'' + k + '\')">' + k + '</button>';
    }).join('');
  }

  function updateLockUI() {
    const t = {
      unlock: ['Garajım kilitli', 'PIN’ini gir'],
      new: ['Yeni PIN', '4 haneli bir PIN seç'],
      confirm: ['PIN’i doğrula', 'Aynı PIN’i tekrar gir'],
      verifyChange: ['Mevcut PIN', 'Devam etmek için mevcut PIN’i gir'],
      verifyRemove: ['Mevcut PIN', 'PIN’i kaldırmak için gir']
    }[pinMode];
    document.getElementById('lockTitle').textContent = t[0];
    const msg = document.getElementById('lockMsg');
    msg.textContent = pinErr || t[1];
    msg.className = 'text-sm mt-1 h-5 ' + (pinErr ? 'text-red-400' : 'text-slate-500');
    document.querySelectorAll('#pinDots .pin-dot').forEach((d, i) => d.classList.toggle('on', i < pinBuf.length));
    document.getElementById('lockCancel').classList.toggle('hidden', pinMode === 'unlock');
    document.getElementById('lockForgot').classList.toggle('hidden', pinMode !== 'unlock');
  }

  function showLock(mode) { pinMode = mode; pinBuf = ''; pinTmp = ''; pinErr = ''; updateLockUI(); document.getElementById('lockScreen').classList.remove('hidden'); }
  function hideLock() { document.getElementById('lockScreen').classList.add('hidden'); pinBuf = ''; setTimeout(discoveryMaybeBoot, 350); }
  const lockVisible = () => !document.getElementById('lockScreen').classList.contains('hidden');

  function lockError(m) {
    pinErr = m;
    updateLockUI();
    const d = document.getElementById('pinDots');
    d.classList.add('shake');
    setTimeout(() => d.classList.remove('shake'), 400);
    setTimeout(() => { pinErr = ''; updateLockUI(); }, 1600);
  }

  function pinKey(k) {
    if (Date.now() < pinLockUntil) { lockError('Biraz bekle, çok fazla deneme'); return; }
    if (k === 'del') { pinBuf = pinBuf.slice(0, -1); updateLockUI(); return; }
    if (pinBuf.length >= 4) return;
    pinBuf += k;
    updateLockUI();
    if (pinBuf.length === 4) setTimeout(pinSubmit, 120);
  }

  async function pinSubmit() {
    const entered = pinBuf;
    pinBuf = '';
    if (pinMode === 'new') { pinTmp = entered; pinMode = 'confirm'; updateLockUI(); return; }
    if (pinMode === 'confirm') {
      if (entered === pinTmp) {
        localStorage.setItem(PIN_KEY, await hashPin(entered));
        hideLock(); updatePinUI(); toast('PIN kaydedildi');
      } else {
        pinTmp = ''; pinMode = 'new'; lockError('PIN’ler uyuşmadı, tekrar dene');
      }
      return;
    }
    const ok = (await hashPin(entered)) === localStorage.getItem(PIN_KEY);
    if (!ok) {
      pinFails++;
      if (pinFails >= 5) { pinFails = 0; pinLockUntil = Date.now() + 30000; lockError('Çok fazla deneme, 30 sn bekle'); }
      else lockError('Yanlış PIN');
      return;
    }
    pinFails = 0;
    if (pinMode === 'unlock') hideLock();
    else if (pinMode === 'verifyChange') { pinMode = 'new'; updateLockUI(); }
    else if (pinMode === 'verifyRemove') { localStorage.removeItem(PIN_KEY); hideLock(); updatePinUI(); toast('PIN kaldırıldı'); }
  }

  function updatePinUI() {
    const on = hasPin();
    document.getElementById('pinStatus').textContent = on ? 'PIN açık' : 'PIN kapalı';
    const cls = 'flex-1 seg';
    document.getElementById('pinBtns').innerHTML = on
      ? `<button class="${cls}" onclick="startPin('verifyChange')">PIN’i Değiştir</button><button class="${cls}" onclick="startPin('verifyRemove')">Kaldır</button>`
      : `<button class="${cls}" onclick="startPin('new')">PIN Ayarla</button>`;
  }
  function startPin(mode) { closeSettings(); showLock(mode); }
  function forgotPin() {
    alert('PIN’i kurtarmanın yolu yok, çünkü PIN bu cihazda saklanıyor.\n\nÇözüm: tarayıcı ayarlarından bu sitenin verilerini silmek PIN’i sıfırlar ama araç kayıtlarını da siler. Bu yüzden Ayarlar > Yedekle ile düzenli yedek almanı öneririm.');
  }

  // Arka plandan dönünce 1 dk geçtiyse tekrar kilitle
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { lastHidden = Date.now(); return; }
    if (hasPin() && lastHidden && Date.now() - lastHidden > 60000 && !lockVisible()) showLock('unlock');
  });
  // Klavye desteği
  document.addEventListener('keydown', e => {
    if (!lockVisible()) return;
    if (/^[0-9]$/.test(e.key)) pinKey(e.key);
    else if (e.key === 'Backspace') pinKey('del');
  });
  document.getElementById('settingsModal').addEventListener('click', e => { if (e.target.id === 'settingsModal') closeSettings(); });

  // ---------- SOSYAL AKIŞ ----------
  let socialPosts = [];
  try { socialPosts = JSON.parse(localStorage.getItem('garaj_social') || '[]'); } catch { socialPosts = []; }

  function saveSocial() {
    try { localStorage.setItem('garaj_social', JSON.stringify(socialPosts)); }
    catch (e) { toast('Depolama dolu — fotoğrafı küçült'); }
  }


  // ---------- AÇIK DÜNYA SÜRÜŞ ----------
  const ride = {
    map: null, marker: null, line: null, tile: null, satTile: null,
    watchId: null, running: false, paused: false,
    cam: 'follow', // free | follow | heading
    mapStyle: 'road', // road | sat
    panelCollapsed: false,
    pts: [], dist: 0, maxSpeed: 0, elapsed: 0, lastTick: 0,
    timer: null, wake: null, last: null, heading: 0, hasHeading: false,
    startedAt: null, startCoord: null, pendingSummary: null, sumMap: null,
    lastSpeedKmh: null, accuracy: null, gotFix: false,
    vehicleId: null,
    speedSamples: [], hardBrakes: 0, lastAccel: null, accelWatch: null,
    favorite: false, gap: false, bgId: null, bg: undefined, bgStarting: null,
    // Açık Dünya "oha" özellikleri
    corners: [], cornerActive: null, asphaltHits: [], blackbox: [],
    motionAvg: 0, lastMemoryAsk: 0, ghostLayer: null, asphaltLayers: [],
    goldenOn: false, sessionRough: 0, impactLocked: false,
    weather: { code: null, mode: 'clear', label: '', temp: null, lastFetch: 0, lastLat: null, lastLng: null, particles: [], raf: 0, enabled: true }
  };

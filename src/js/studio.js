// Garajım Studio projects and design tools.
// Classic script: globals are shared with other files in index.html's intentional load order.
function studioProjectsGet() {
    try {
      const rows = JSON.parse(localStorage.getItem(STUDIO_PROJECTS_KEY) || '[]');
      return Array.isArray(rows) ? rows.filter(p => p && typeof p === 'object' && p.id).slice(0, 80) : [];
    } catch (e) { return []; }
  }
  function studioProjectsSave(rows) {
    try {
      localStorage.setItem(STUDIO_PROJECTS_KEY, JSON.stringify(rows.slice(0, 80)));
      return true;
    } catch (e) {
      toast('Studio kaydedilemedi. Depolama dolu olabilir; fotoğrafı küçült veya eski projeleri dışa aktar.');
      return false;
    }
  }
  function studioProjectById(id) { return studioProjectsGet().find(p => String(p.id) === String(id)) || null; }
  function studioLinkedVehicle(p) { return p && p.vehicleId != null ? (vehicles.find(v => String(v.id) === String(p.vehicleId)) || null) : null; }
  function studioProjectName(p) {
    const v = studioLinkedVehicle(p), brand = (v && v.brand) || (p && p.brand) || '', model = (v && v.model) || (p && p.model) || '';
    const year = (v && v.year) || (p && p.year) || '';
    return [brand, model, year].filter(Boolean).join(' ') || (p && p.title) || 'Adsız araç';
  }
  function studioProjectPhoto(p) {
    const v = studioLinkedVehicle(p);
    return (p && p.photo) || (v && v.photo) || '';
  }
  function studioColor(paint) { return STUDIO_COLORS.find(c => c.hex.toLowerCase() === String(paint || '').toLowerCase()) || STUDIO_COLORS[0]; }
  function studioGetCurrent() {
    const rows = studioProjectsGet();
    return rows.find(p => String(p.id) === String(studioActiveProjectId)) || rows[0] || null;
  }
  function studioUpdateProject(mutator, eventText) {
    const rows = studioProjectsGet(), idx = rows.findIndex(p => String(p.id) === String(studioActiveProjectId));
    if (idx < 0) return false;
    const p = rows[idx];
    mutator(p);
    p.updatedAt = new Date().toISOString();
    if (eventText) {
      if (!Array.isArray(p.log)) p.log = [];
      p.log.unshift({ id: 'log-' + Date.now() + '-' + Math.random().toString(36).slice(2,6), at: p.updatedAt, text: eventText });
      p.log = p.log.slice(0, 150);
    }
    return studioProjectsSave(rows);
  }
  function studioFormatMoney(n) { return (Number(n) || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' ₺'; }
  function studioFormatDate(d) {
    try { return new Date(d || Date.now()).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch (e) { return 'Tarih yok'; }
  }
  function studioCarSvg(paint) {
    const c = studioColor(paint).hex;
    return `<svg viewBox="0 0 420 190" role="img" aria-label="Seçili boya rengini gösteren genel otomobil silüeti" style="width:100%;height:auto;display:block">
      <defs><linearGradient id="studioBodyPaint" x1="0" x2="0.2" y1="0" y2="1"><stop offset="0%" stop-color="${c}"/><stop offset="48%" stop-color="${c}"/><stop offset="100%" stop-color="#111820"/></linearGradient><linearGradient id="studioGlass" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#91a5b7" stop-opacity=".83"/><stop offset="100%" stop-color="#17222f"/></linearGradient></defs>
      <ellipse cx="210" cy="153" rx="158" ry="15" fill="#000" opacity=".34"/><path d="M42 122 L55 109 Q61 104 76 102 L111 91 Q139 59 183 54 L251 55 Q278 58 301 83 L339 94 Q361 98 371 112 L380 129 L376 143 L354 146 L331 146 Q325 118 299 118 Q272 118 266 146 L153 146 Q147 119 121 119 Q94 119 88 146 L57 144 Q43 141 42 132Z" fill="url(#studioBodyPaint)" stroke="#dbe3ec" stroke-opacity=".38" stroke-width="1.4"/>
      <path d="M125 89 Q147 63 184 62 L220 63 L220 90Z" fill="url(#studioGlass)" stroke="#dce5ed" stroke-opacity=".5"/><path d="M229 63 L250 64 Q274 67 294 88 L229 90Z" fill="url(#studioGlass)" stroke="#dce5ed" stroke-opacity=".5"/><path d="M222 63 L224 101" stroke="#0b1118" stroke-width="4"/><path d="M66 111 L102 104 L117 104" stroke="#f6e6c6" stroke-width="5" stroke-linecap="round" opacity=".88"/><path d="M343 108 L367 116" stroke="#ff6b64" stroke-width="5" stroke-linecap="round"/><path d="M161 101 L159 111 M261 101 L263 111" stroke="#101820" stroke-width="3"/><path d="M170 118 L241 118" stroke="#f7fafc" stroke-opacity=".22" stroke-width="2"/><path d="M48 127 L377 128" stroke="#fff" stroke-opacity=".12" stroke-width="1.5"/>
      <g><circle cx="121" cy="143" r="27" fill="#0a0e13" stroke="#7d8997" stroke-width="2"/><circle cx="121" cy="143" r="17" fill="#3e4855" stroke="#d3dae2" stroke-width="2"/><circle cx="121" cy="143" r="5" fill="#cbd5e1"/><path d="M121 127 V159 M105 143 H137 M110 132 L132 154 M132 132 L110 154" stroke="#aab4c1" stroke-width="2"/><circle cx="299" cy="143" r="27" fill="#0a0e13" stroke="#7d8997" stroke-width="2"/><circle cx="299" cy="143" r="17" fill="#3e4855" stroke="#d3dae2" stroke-width="2"/><circle cx="299" cy="143" r="5" fill="#cbd5e1"/><path d="M299 127 V159 M283 143 H315 M288 132 L310 154 M310 132 L288 154" stroke="#aab4c1" stroke-width="2"/></g>
    </svg>`;
  }
  function studioRenderGarageChoices() {
    const box = document.getElementById('studioGarageChoicesList');
    const count = document.getElementById('studioGarageCount');
    if (!box || !count) return;
    count.textContent = vehicles.length + ' araç';
    if (!vehicles.length) {
      box.innerHTML = `<div class="text-center py-4"><i class="fa-solid fa-warehouse text-2xl studio-muted"></i><p class="text-xs font-bold mt-2">Garajında henüz araç yok</p><p class="text-[10px] studio-muted mt-1">Kendi profilini oluşturup devam edebilirsin.</p><button class="studio-secondary mt-3" onclick="studioOpenSetup()">Manuel profil oluştur</button></div>`;
      return;
    }
    box.innerHTML = vehicles.map(v => {
      const photo = garajimSafeImageSrc(v.photo), name = [v.brand, v.model, v.year].filter(Boolean).join(' ') || 'Araç';
      return `<button class="w-full flex items-center gap-3 rounded-2xl p-3 text-left border border-white/10 bg-white/5" onclick="studioCreateFromGarage(${garajimInlineJsArg(v.id)})">
        <div class="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center shrink-0" style="background:rgba(var(--accent-rgb),.10)">${photo ? `<img src="${photo}" alt="${garajimHtmlEsc(name)}" class="w-full h-full object-cover">` : '<i class="fa-solid fa-car-side text-xl text-accent"></i>'}</div>
        <div class="flex-1 min-w-0"><p class="text-xs font-extrabold truncate">${garajimHtmlEsc(name)}</p><p class="text-[10px] studio-muted mt-1 truncate">${garajimHtmlEsc(v.plate || 'Plaka girilmemiş')} · ${garajimHtmlEsc(v.km || 'KM yok')} km</p></div><i class="fa-solid fa-arrow-up-right-from-square text-xs studio-muted"></i>
      </button>`;
    }).join('');
  }
  function studioUpdateModelSuggestions() {
    const brandInput = document.getElementById('studioSetupBrand'), list = document.getElementById('studioModelSuggestions');
    if (!brandInput || !list) return;
    const brand = String(brandInput.value || '').trim().toLocaleLowerCase('tr-TR');
    const match = Object.keys(STUDIO_MODEL_CATALOG).find(k => k.toLocaleLowerCase('tr-TR') === brand);
    const models = match ? STUDIO_MODEL_CATALOG[match] : Array.from(new Set(Object.values(STUDIO_MODEL_CATALOG).flat())).sort((a,b)=>a.localeCompare(b,'tr'));
    list.innerHTML = models.map(m => `<option value="${garajimHtmlEsc(m)}"></option>`).join('');
  }
  function studioOpenNewProject() { studioOpenSetup(); }
  function studioScrollGarageChoices() { const el = document.getElementById('studioGarageChoices'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  function studioOpenSetup() {
    studioDraftPhoto = null;
    const ids = ['studioSetupBrand','studioSetupModel','studioSetupYear','studioSetupTitle'];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const body = document.getElementById('studioSetupBody'); if (body) body.value = 'Sedan';
    const hint = document.getElementById('studioSetupHint'); if (hint) hint.textContent = 'Fotoğrafı eklersen Studio çalışma alanında referans olarak saklanır. Aracının fotoğrafındaki boya otomatik değiştirilmiş gibi gösterilmez; renk maketi seçimi ayrı gösterir.';
    const preview = document.getElementById('studioSetupPhotoPreview'); if (preview) preview.innerHTML = '<i class="fa-solid fa-camera text-xl studio-muted"></i>';
    const file = document.getElementById('studioSetupPhoto'); if (file) file.value = '';
    studioUpdateModelSuggestions();
    const form = document.getElementById('studioSetupForm'); if (form) form.classList.remove('hidden');
    document.getElementById('studioWelcome')?.classList.add('hidden');
    document.getElementById('studioDashboard')?.classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function studioCloseSetup() { studioDraftPhoto = null; const f = document.getElementById('studioSetupForm'); if (f) f.classList.add('hidden'); renderStudio(); }
  async function studioPickSetupPhoto(e) {
    const file = e && e.target && e.target.files && e.target.files[0]; if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) { toast('Lütfen bir görsel dosyası seç.'); return; }
    if (file.size > 15 * 1024 * 1024) { toast('Fotoğraf 15 MB altında olmalı.'); e.target.value = ''; return; }
    try {
      const data = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); });
      studioDraftPhoto = await compressImage(data, 1000, .68);
      const preview = document.getElementById('studioSetupPhotoPreview');
      if (preview) preview.innerHTML = `<img src="${garajimSafeImageSrc(studioDraftPhoto)}" alt="Araç fotoğrafı önizleme" class="w-full h-full object-cover">`;
      const hint = document.getElementById('studioSetupHint'); if (hint) hint.textContent = 'Fotoğraf hazır. Tasarımı oluşturunca bu cihazda proje fotoğrafı olarak saklanacak.';
    } catch (err) { toast('Fotoğraf okunamadı. Başka bir görsel dene.'); }
  }
  function studioCreateProject() {
    const brand = (document.getElementById('studioSetupBrand')?.value || '').trim();
    const model = (document.getElementById('studioSetupModel')?.value || '').trim();
    const yearRaw = (document.getElementById('studioSetupYear')?.value || '').trim();
    const year = yearRaw && Number(yearRaw) >= 1950 && Number(yearRaw) <= 2035 ? yearRaw : '';
    const bodyType = document.getElementById('studioSetupBody')?.value || 'Diğer';
    const title = (document.getElementById('studioSetupTitle')?.value || '').trim();
    if (!brand || !model) { toast('Başlamak için marka ve model yaz.'); return; }
    const now = new Date().toISOString();
    const p = { id: 'studio-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,7), vehicleId: null, brand: brand.slice(0,60), model: model.slice(0,60), year, bodyType, title: title.slice(0,70) || `${brand} ${model} Studio`, photo: studioDraftPhoto || null, paint: STUDIO_COLORS[0].hex, parts: [], variants: [], log: [{id:'log-' + Date.now(),at:now,text:'Studio projesi oluşturuldu'}], notes:'', createdAt: now, updatedAt: now };
    const rows = studioProjectsGet(); rows.unshift(p);
    if (!studioProjectsSave(rows)) return;
    studioActiveProjectId = p.id; localStorage.setItem('garaj_studio_selected_project', p.id); studioDraftPhoto = null;
    document.getElementById('studioSetupForm')?.classList.add('hidden');
    studioSubView = 'design'; studioPartFormOpen = false; studioJournalFormOpen = false;
    renderStudio(); toast('Studio projen oluşturuldu');
  }
  function studioCreateFromGarage(vehicleId) {
    const v = vehicles.find(x => String(x.id) === String(vehicleId)); if (!v) { toast('Araç kaydı bulunamadı.'); return; }
    const existing = studioProjectsGet().find(p => String(p.vehicleId) === String(v.id));
    if (existing) { studioActiveProjectId = existing.id; localStorage.setItem('garaj_studio_selected_project', existing.id); renderStudio(); toast('Mevcut Studio projen açıldı'); return; }
    const now = new Date().toISOString();
    const p = { id:'studio-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,7), vehicleId:v.id, brand:v.brand || '', model:v.model || '', year:v.year || '', bodyType:v.type || 'Diğer', title:[v.brand,v.model].filter(Boolean).join(' ') + ' Studio', photo:null, paint:STUDIO_COLORS[0].hex, parts:[], variants:[], log:[{id:'log-' + Date.now(),at:now,text:'Garajım araç kaydından Studio projesi oluşturuldu'}], notes:'', createdAt:now, updatedAt:now };
    const rows = studioProjectsGet(); rows.unshift(p); if (!studioProjectsSave(rows)) return;
    studioActiveProjectId = p.id; localStorage.setItem('garaj_studio_selected_project', p.id); studioSubView='design'; renderStudio(); toast('Araç Studio’ya bağlandı');
  }
  function studioSelectProject(id) {
    if (!studioProjectById(id)) return;
    studioActiveProjectId = id; localStorage.setItem('garaj_studio_selected_project', id); studioSubView='design'; studioPartFormOpen=false; studioJournalFormOpen=false; renderStudio();
  }
  function studioSetView(view) { if (!['design','parts','journal'].includes(view)) return; studioSubView = view; studioPartFormOpen = view === 'parts' ? studioPartFormOpen : false; studioJournalFormOpen = view === 'journal' ? studioJournalFormOpen : false; renderStudio(); }
  function studioSetPaint(hex) {
    if (!STUDIO_COLORS.some(c => c.hex.toLowerCase() === String(hex).toLowerCase())) return;
    const color = studioColor(hex);
    if (studioUpdateProject(p => { p.paint = color.hex; }, 'Tasarım rengi: ' + color.name)) renderStudio();
  }
  function studioOpenVariantForm() { const el = document.getElementById('studioVariantSavePanel'); if (el) el.classList.toggle('hidden'); const input = document.getElementById('studioVariantName'); if (input && !el?.classList.contains('hidden')) input.focus(); }
  function studioSaveVariant() {
    const name = (document.getElementById('studioVariantName')?.value || '').trim(); if (!name) { toast('Varyanta bir isim ver.'); return; }
    const p = studioGetCurrent(); if (!p) return;
    const id = 'variant-' + Date.now().toString(36);
    const v = { id, name:name.slice(0,45), paint:studioColor(p.paint).hex, parts:(p.parts || []).map(x => ({...x})), notes:String(p.notes || ''), createdAt:new Date().toISOString() };
    if (studioUpdateProject(x => { if (!Array.isArray(x.variants)) x.variants=[]; x.variants.unshift(v); x.variants=x.variants.slice(0,24); x.activeVariantId=id; }, 'Tasarım varyantı kaydedildi: ' + v.name)) { studioSubView='design'; renderStudio(); toast('Varyant kaydedildi'); }
  }
  function studioApplyVariant(id) {
    const p = studioGetCurrent(); if (!p) return;
    const v = (p.variants || []).find(x => String(x.id) === String(id)); if (!v) return;
    if (studioUpdateProject(x => { x.paint = studioColor(v.paint).hex; x.parts = (v.parts || []).map(part => ({...part})); x.notes = v.notes || x.notes || ''; x.activeVariantId = v.id; }, 'Varyant uygulandı: ' + v.name)) { studioSubView='design'; renderStudio(); toast('Varyant uygulandı'); }
  }
  function studioOpenGarageVehicle() {
    const p = studioGetCurrent(), v = studioLinkedVehicle(p); if (!v) { toast('Bu proje bağımsız bir Studio profili.'); return; }
    currentId = v.id; openDetail(v.id);
  }
  function studioPickProjectPhoto(e) {
    const file = e && e.target && e.target.files && e.target.files[0]; if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) { toast('Lütfen bir görsel dosyası seç.'); return; }
    if (file.size > 15 * 1024 * 1024) { toast('Fotoğraf 15 MB altında olmalı.'); e.target.value = ''; return; }
    const reader = new FileReader(); reader.onload = async () => {
      try { const data = await compressImage(reader.result, 1000, .68); if (studioUpdateProject(p => { p.photo = data; }, 'Araç referans fotoğrafı güncellendi')) { renderStudio(); toast('Fotoğraf Studio’ya eklendi'); } }
      catch (err) { toast('Fotoğraf okunamadı.'); }
    }; reader.onerror = () => toast('Fotoğraf okunamadı.'); reader.readAsDataURL(file); e.target.value = '';
  }
  function studioTogglePartForm() { studioPartFormOpen = !studioPartFormOpen; renderStudio(); }
  function studioAddPart() {
    const name = (document.getElementById('studioPartName')?.value || '').trim();
    const category = document.getElementById('studioPartType')?.value || 'Diğer';
    const brand = (document.getElementById('studioPartBrand')?.value || '').trim();
    const priceText = (document.getElementById('studioPartPrice')?.value || '').trim();
    const normalizedPrice = priceText.includes(',') ? priceText.replace(/\./g,'').replace(',','.') : (/^\d{1,3}(?:\.\d{3})+$/.test(priceText) ? priceText.replace(/\./g,'') : priceText);
    const cost = priceText === '' ? 0 : Number(normalizedPrice);
    const status = document.getElementById('studioPartStatus')?.value || 'planned';
    if (!name) { toast('Parçanın adını yaz.'); return; }
    if (!Number.isFinite(cost) || cost < 0 || cost > 100000000) { toast('Fiyatı kontrol et.'); return; }
    const id = 'part-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,5);
    if (studioUpdateProject(p => { if (!Array.isArray(p.parts)) p.parts=[]; p.parts.unshift({id,name:name.slice(0,80),category,brand:brand.slice(0,60),cost,status,fitment:'unverified',createdAt:new Date().toISOString()}); }, 'Parça eklendi: ' + name)) { studioPartFormOpen=false; renderStudio(); toast('Parça projeye eklendi'); }
  }
  function studioUpdatePartStatus(id, status) {
    if (!['planned','ordered','installed'].includes(status)) return;
    if (studioUpdateProject(p => { const part=(p.parts||[]).find(x=>String(x.id)===String(id)); if (part) part.status=status; }, 'Modifikasyon durumu güncellendi')) renderStudio();
  }
  function studioUpdatePartFitment(id, value) {
    if (!['unverified','verified_by_user'].includes(value)) return;
    if (studioUpdateProject(p => { const part=(p.parts||[]).find(x=>String(x.id)===String(id)); if (part) part.fitment=value; }, value==='verified_by_user'?'Kullanıcı uyumluluk kontrolünü yaptığını işaretledi':'Uyumluluk kontrolü beklemede')) renderStudio();
  }
  function studioRemovePart(id) {
    if (studioUpdateProject(p => { p.parts=(p.parts||[]).filter(x=>String(x.id)!==String(id)); }, 'Bir parça proje listesinden çıkarıldı')) { renderStudio(); toast('Parça kaldırıldı'); }
  }
  function studioToggleJournalForm() { studioJournalFormOpen=!studioJournalFormOpen; renderStudio(); }
  function studioAddJournalEntry() {
    const text = (document.getElementById('studioJournalText')?.value || '').trim(); if (!text) { toast('Günlük notunu yaz.'); return; }
    if (studioUpdateProject(p => { p.notes = String(p.notes || ''); }, text.slice(0,240))) { studioJournalFormOpen=false; renderStudio(); toast('Proje günlüğüne eklendi'); }
  }
  function studioDeleteProject(id) {
    const p = studioProjectById(id); if (!p) return;
    if (!confirm('“' + studioProjectName(p) + '” Studio projesi silinsin mi? Garajındaki araç kaydı silinmez.')) return;
    const rows = studioProjectsGet().filter(x => String(x.id)!==String(id));
    if (!studioProjectsSave(rows)) return;
    studioActiveProjectId = rows[0]?.id || null;
    if (studioActiveProjectId) localStorage.setItem('garaj_studio_selected_project', studioActiveProjectId); else localStorage.removeItem('garaj_studio_selected_project');
    renderStudio(); toast('Studio projesi silindi');
  }
  function studioExportProject() {
    const p = studioGetCurrent(); if (!p) return;
    const safe = {...p};
    const payload = {app:'garajim-studio',version:1,exportedAt:new Date().toISOString(),project:safe};
    const blob = new Blob([JSON.stringify(payload,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='garajim-studio-' + (String(p.brand||'arac')+'-'+String(p.model||'proje')).replace(/[^a-z0-9çğıöşü_-]+/gi,'-').toLowerCase() + '.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1500); toast('Studio proje dosyası indirildi');
  }
  async function studioShareBuild() {
    const p=studioGetCurrent(); if (!p) return;
    const parts=p.parts||[], planned=parts.filter(x=>x.status==='planned').length, installed=parts.filter(x=>x.status==='installed').length, total=parts.reduce((s,x)=>s+(Number(x.cost)||0),0);
    const msg=`Garajım Studio · ${studioProjectName(p)}
Tasarım: ${studioColor(p.paint).name}
Modifikasyonlar: ${parts.length} parça · ${installed} takıldı · ${planned} planlandı
Bütçe planı: ${studioFormatMoney(total)}
Not: Bu bir kullanıcı proje planıdır; parça uyumluluğu ayrıca doğrulanmalıdır.`;
    try { if (navigator.share) await navigator.share({title:'Garajım Studio projem',text:msg}); else if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(msg); toast('Proje özeti panoya kopyalandı'); } else { studioDownloadText(msg); } } catch (e) { if (e && e.name!=='AbortError') studioDownloadText(msg); }
  }
  function studioDownloadText(txt) { const b=new Blob([txt],{type:'text/plain;charset=utf-8'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='garajim-studio-ozet.txt';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1200); }
  function studioRenderDesign(p) {
    const paint=studioColor(p.paint), photo=garajimSafeImageSrc(studioProjectPhoto(p)), variants=Array.isArray(p.variants)?p.variants:[];
    return `<div class="space-y-4">
      <section class="studio-hero rounded-3xl p-4">
        <div class="flex items-start justify-between gap-3"><div class="min-w-0"><div class="studio-eyebrow mb-1.5">YOUR BUILD / 01</div><h2 class="text-xl font-extrabold leading-tight">${garajimHtmlEsc(studioProjectName(p))}</h2><p class="text-[10px] studio-muted mt-1">${garajimHtmlEsc(p.title || 'Kişisel modifikasyon projesi')} · ${garajimHtmlEsc(p.bodyType || (studioLinkedVehicle(p)?.type) || 'Araç')}</p></div><span class="text-[10px] rounded-lg px-2 py-1 shrink-0" style="background:rgba(var(--accent-rgb),.13);color:var(--accent);border:1px solid rgba(var(--accent-rgb),.2)">STUDIO</span></div>
        ${photo ? `<div class="mt-4 relative"><img class="studio-photo" src="${photo}" alt="${garajimHtmlEsc(studioProjectName(p))} referans fotoğrafı"><div class="absolute bottom-2 left-2 rounded-lg px-2.5 py-1.5 bg-black/70 text-white text-[9px] backdrop-blur">REFERANS FOTOĞRAFI</div></div>` : `<div class="studio-car-stage mt-4 p-2">${studioCarSvg(paint.hex)}<div class="text-center text-[9px] text-slate-400 pb-2">Genel araç maketi · seçilen renk canlı güncellenir</div></div>`}
        <div class="grid grid-cols-2 gap-2 mt-3"><div class="rounded-xl p-3 border border-white/10 bg-white/5"><p class="text-[9px] studio-muted uppercase tracking-wider">Aktif boya</p><div class="flex items-center gap-2 mt-2"><span class="w-5 h-5 rounded-lg border border-white/20" style="background:${paint.hex}"></span><span class="text-xs font-extrabold">${garajimHtmlEsc(paint.name)}</span></div></div><div class="rounded-xl p-3 border border-white/10 bg-white/5"><p class="text-[9px] studio-muted uppercase tracking-wider">Modifikasyonlar</p><p class="text-lg font-extrabold mt-1">${(p.parts||[]).length}<span class="text-[10px] font-semibold studio-muted ml-1">parça</span></p></div></div>
        <div class="flex flex-wrap gap-2 mt-3"><label class="studio-secondary inline-flex items-center gap-2 cursor-pointer"><i class="fa-solid fa-camera"></i> ${photo?'Fotoğrafı değiştir':'Fotoğraf ekle'}<input type="file" class="hidden" accept="image/*" capture="environment" onchange="studioPickProjectPhoto(event)"></label>${studioLinkedVehicle(p)?`<button onclick="studioOpenGarageVehicle()" class="studio-secondary"><i class="fa-solid fa-car mr-1"></i>Garaj kaydını aç</button>`:''}<button onclick="studioDeleteProject(${garajimInlineJsArg(p.id)})" class="text-[10px] font-bold text-slate-500 px-2"><i class="fa-regular fa-trash-can mr-1"></i>Projeyi sil</button></div>
      </section>
      <section class="studio-panel p-4"><div class="flex items-start justify-between gap-3"><div><h3 class="text-sm font-extrabold">Renk laboratuvarı</h3><p class="text-[10px] studio-muted mt-1">Kombinasyonu seç; maket anında değişsin.</p></div><span class="text-[10px] font-bold" style="color:${paint.hex}">${garajimHtmlEsc(paint.name)}</span></div>
        <div class="studio-car-stage mt-3 p-2">${studioCarSvg(paint.hex)}</div>
        ${photo?'<p class="text-[9px] studio-muted mt-2 leading-relaxed"><i class="fa-solid fa-circle-info mr-1"></i>Üstteki fotoğraf gerçek aracına aittir. Alttaki maket yalnızca boya rengini gösteren genel silüettir; fotoğrafın boyası değiştirilmiş değildir.</p>':'<p class="text-[9px] studio-muted mt-2 leading-relaxed">Bu silüet renk fikrini karşılaştırmak içindir; aracının birebir 3D modeli veya parça uyumluluk kanıtı değildir.</p>'}
        <div class="grid grid-cols-4 gap-2 mt-4">${STUDIO_COLORS.map(c=>`<button class="studio-swatch ${paint.hex===c.hex?'active':''}" onclick="studioSetPaint('${c.hex}')" aria-label="${garajimHtmlEsc(c.name)} rengini seç"><div class="studio-swatch-chip" style="background:${c.hex}"></div><div class="text-[9px] font-extrabold leading-tight">${garajimHtmlEsc(c.name)}</div><div class="text-[8px] studio-muted mt-1">${garajimHtmlEsc(c.note)}</div></button>`).join('')}</div>
      </section>
      <section class="studio-panel p-4"><div class="flex items-center justify-between gap-2"><div><h3 class="text-sm font-extrabold">Tasarım varyantları</h3><p class="text-[10px] studio-muted mt-1">Farklı kombinasyonları kaydet, sonra geri dön.</p></div><button onclick="studioOpenVariantForm()" class="studio-secondary shrink-0"><i class="fa-solid fa-bookmark mr-1"></i>Kaydet</button></div>
        <div id="studioVariantSavePanel" class="hidden rounded-2xl p-3 mt-3 border border-white/10 bg-white/5"><label class="text-[10px] studio-muted font-bold block mb-1.5">Varyant adı</label><input id="studioVariantName" class="studio-field" maxlength="45" placeholder="Örn. OEM+ günlük"><button onclick="studioSaveVariant()" class="studio-primary w-full mt-2">Varyantı kaydet</button></div>
        <div class="space-y-2 mt-3">${variants.length?variants.map(v=>`<button class="studio-variant" onclick="studioApplyVariant(${garajimInlineJsArg(v.id)})"><span class="studio-variant-color" style="background:${studioColor(v.paint).hex}"></span><span class="flex-1 min-w-0"><span class="text-xs font-extrabold block truncate">${garajimHtmlEsc(v.name)}</span><span class="text-[9px] studio-muted block mt-1">${garajimHtmlEsc(studioColor(v.paint).name)} · ${(v.parts||[]).length} parça · ${studioFormatDate(v.createdAt)}</span></span><i class="fa-solid fa-arrow-rotate-left text-xs studio-muted"></i></button>`).join(''):'<div class="text-center py-5"><i class="fa-regular fa-bookmark text-xl studio-muted"></i><p class="text-xs font-bold mt-2">Henüz varyant yok</p><p class="text-[10px] studio-muted mt-1">Örneğin “OEM+”, “Track” veya “Günlük” tasarımını kaydet.</p></div>'}</div>
      </section>
    </div>`;
  }
  function studioRenderParts(p) {
    const parts=Array.isArray(p.parts)?p.parts:[], total=parts.reduce((s,x)=>s+(Number(x.cost)||0),0), spent=parts.filter(x=>x.status==='installed').reduce((s,x)=>s+(Number(x.cost)||0),0), pending=total-spent;
    const statusLabel={planned:'Planlandı',ordered:'Sipariş edildi',installed:'Takıldı'};
    return `<div class="space-y-4">
      <section class="studio-hero rounded-3xl p-4"><div class="studio-eyebrow">BUILD SHEET / 02</div><h2 class="text-xl font-extrabold mt-1">Parça ve bütçe planı</h2><p class="text-[11px] studio-muted mt-2 leading-relaxed">Beğendiğin parçaları topla; fiyatı, satın alma durumunu ve gerçek montaj maliyetini kendin takip et.</p>
        <div class="grid grid-cols-3 gap-2 mt-4"><div class="studio-kpi"><p class="text-[9px] studio-muted">Plan toplamı</p><p class="text-sm font-extrabold mt-1">${studioFormatMoney(total)}</p></div><div class="studio-kpi"><p class="text-[9px] studio-muted">Takılan</p><p class="text-sm font-extrabold mt-1">${studioFormatMoney(spent)}</p></div><div class="studio-kpi"><p class="text-[9px] studio-muted">Kalan plan</p><p class="text-sm font-extrabold mt-1">${studioFormatMoney(pending)}</p></div></div>
        <p class="text-[9px] studio-muted mt-2">Fiyatlar senin girdiğin plan değerleridir; canlı piyasa fiyatı değildir.</p>
      </section>
      <section class="studio-panel p-4"><div class="flex items-center justify-between"><div><h3 class="text-sm font-extrabold">Modifikasyon listesi</h3><p class="text-[10px] studio-muted mt-1">${parts.length} kayıtlı parça</p></div><button onclick="studioTogglePartForm()" class="studio-primary"><i class="fa-solid fa-plus mr-1"></i>Parça ekle</button></div>
      ${studioPartFormOpen?`<div class="rounded-2xl p-3 mt-3 space-y-3 border border-white/10 bg-white/5"><div class="grid grid-cols-2 gap-2"><label class="text-[10px] studio-muted font-bold">Kategori<select id="studioPartType" class="studio-field mt-1"><option>Jant / Lastik</option><option>Süspansiyon</option><option>Gövde kiti</option><option>Fren</option><option>Egzoz</option><option>İç mekân</option><option>Multimedya</option><option>Motor / Performans</option><option>Folyo / Boya</option><option>Aydınlatma</option><option>Diğer</option></select></label><label class="text-[10px] studio-muted font-bold">Durum<select id="studioPartStatus" class="studio-field mt-1"><option value="planned">Planlandı</option><option value="ordered">Sipariş edildi</option><option value="installed">Takıldı</option></select></label></div><label class="text-[10px] studio-muted font-bold block">Parça / modifikasyon adı<input id="studioPartName" class="studio-field mt-1" maxlength="80" placeholder="Örn. 18 inç jant seti"></label><label class="text-[10px] studio-muted font-bold block">Marka / ürün kodu <span class="font-normal">(isteğe bağlı)</span><input id="studioPartBrand" class="studio-field mt-1" maxlength="60" placeholder="Marka, model veya referans"></label><label class="text-[10px] studio-muted font-bold block">Tahmini fiyat (₺)<input id="studioPartPrice" class="studio-field mt-1" inputmode="decimal" placeholder="0"></label><div class="flex gap-2"><button onclick="studioTogglePartForm()" class="studio-secondary flex-1">İptal</button><button onclick="studioAddPart()" class="studio-primary flex-1">Listeye ekle</button></div></div>`:''}
      <div class="space-y-2 mt-3">${parts.length?parts.map(x=>`<article class="studio-part"><div class="flex gap-3 items-start"><div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style="background:rgba(var(--accent-rgb),.10);color:var(--accent)"><i class="fa-solid ${x.category==='Jant / Lastik'?'fa-compact-disc':x.category==='Süspansiyon'?'fa-arrows-up-down':x.category==='Gövde kiti'?'fa-car-side':x.category==='Fren'?'fa-gauge-high':'fa-screwdriver-wrench'}"></i></div><div class="flex-1 min-w-0"><div class="flex justify-between gap-2"><div class="min-w-0"><p class="text-xs font-extrabold break-words">${garajimHtmlEsc(x.name)}</p><p class="text-[9px] studio-muted mt-1">${garajimHtmlEsc(x.category||'Diğer')}${x.brand?' · '+garajimHtmlEsc(x.brand):''}</p></div><p class="text-xs font-extrabold whitespace-nowrap">${studioFormatMoney(x.cost)}</p></div><div class="grid grid-cols-2 gap-2 mt-3"><label class="text-[9px] studio-muted">Durum<select class="studio-field mt-1 py-2" onchange="studioUpdatePartStatus(${garajimInlineJsArg(x.id)},this.value)"><option value="planned" ${x.status==='planned'?'selected':''}>Planlandı</option><option value="ordered" ${x.status==='ordered'?'selected':''}>Sipariş edildi</option><option value="installed" ${x.status==='installed'?'selected':''}>Takıldı</option></select></label><label class="text-[9px] studio-muted">Uyumluluk<select class="studio-field mt-1 py-2" onchange="studioUpdatePartFitment(${garajimInlineJsArg(x.id)},this.value)"><option value="unverified" ${x.fitment!=='verified_by_user'?'selected':''}>Doğrulanmadı</option><option value="verified_by_user" ${x.fitment==='verified_by_user'?'selected':''}>Ben doğruladım</option></select></label></div><div class="flex items-center justify-between mt-2"><span class="text-[9px] ${x.status==='installed'?'text-emerald-400':x.status==='ordered'?'text-blue-400':'text-amber-400'}"><span class="studio-dot ${x.status||'planned'} mr-1"></span>${statusLabel[x.status]||'Planlandı'}</span><button onclick="studioRemovePart(${garajimInlineJsArg(x.id)})" class="text-[10px] text-slate-500 hover:text-red-400"><i class="fa-regular fa-trash-can mr-1"></i>Kaldır</button></div></div></div></article>`).join(''):'<div class="studio-empty-dashed py-8 px-4 text-center"><i class="fa-solid fa-screwdriver-wrench text-2xl studio-muted"></i><p class="text-xs font-extrabold mt-2">İlk parçanı listeye ekle</p><p class="text-[10px] studio-muted mt-1 max-w-xs mx-auto">Jant, yay, spoiler, multimedya ya da aklındaki başka bir işi kaydet. Fiyatını bilmiyorsan boş bırakabilirsin.</p></div>'}</div>
      </section><div class="rounded-2xl p-3 flex items-start gap-2" style="background:rgba(234,179,8,.07);border:1px solid rgba(234,179,8,.18)"><i class="fa-solid fa-triangle-exclamation text-amber-400 mt-0.5"></i><p class="text-[10px] studio-muted leading-relaxed">Studio henüz otomatik bir parça kataloğu veya araç teknik veri tabanı değildir. “Ben doğruladım” yalnızca kendi kontrolünü kaydeder; kritik uyumluluğu üretici belgesi veya uzmanla doğrula.</p></div>
    </div>`;
  }
  function studioRenderJournal(p) {
    const log=Array.isArray(p.log)?p.log:[];
    return `<div class="space-y-4"><section class="studio-hero rounded-3xl p-4"><div class="studio-eyebrow">PROJECT JOURNAL / 03</div><h2 class="text-xl font-extrabold mt-1">Projenin hikâyesi</h2><p class="text-[11px] studio-muted mt-2">Planları, kararları ve yapılan işleri tarihle kaydet. Sonra neden bu parçayı seçtiğini unutmazsın.</p><button onclick="studioToggleJournalForm()" class="studio-primary mt-4"><i class="fa-solid fa-pen-to-square mr-1.5"></i>Günlük notu ekle</button></section>
    ${studioJournalFormOpen?`<section class="studio-panel p-3"><label class="text-[10px] studio-muted font-bold block mb-1.5">Notun</label><textarea id="studioJournalText" class="studio-field" rows="4" maxlength="500" placeholder="Örn. Önce jant ölçüsünü serviste doğrulat, sonra sipariş ver."></textarea><div class="flex gap-2 mt-2"><button onclick="studioToggleJournalForm()" class="studio-secondary flex-1">İptal</button><button onclick="studioAddJournalEntry()" class="studio-primary flex-1">Notu kaydet</button></div></section>`:''}
    <section class="studio-panel p-4"><h3 class="text-sm font-extrabold mb-4">Zaman çizelgesi <span class="studio-muted font-normal">· ${log.length} olay</span></h3>${log.length?`<div class="relative pl-5 space-y-4 before:content-[''] before:absolute before:left-[5px] before:top-1 before:bottom-1 before:w-px before:bg-white/10">${log.map(row=>`<article class="relative"><span class="absolute -left-[19px] top-1.5 w-[9px] h-[9px] rounded-full" style="background:var(--accent);box-shadow:0 0 0 4px rgba(var(--accent-rgb),.12)"></span><p class="text-[9px] studio-muted">${studioFormatDate(row.at)}</p><p class="text-xs font-semibold mt-1 leading-relaxed">${garajimHtmlEsc(row.text)}</p></article>`).join('')}</div>`:'<p class="text-xs studio-muted py-4">Henüz kayıt yok.</p>'}</section>
    <section class="studio-panel p-4"><h3 class="text-sm font-extrabold">Proje notları</h3><p class="text-[10px] studio-muted mt-1 mb-3">Servisle konuşulacaklar, ölçüler veya hatırlatmalar.</p><textarea id="studioNotesField" class="studio-field" rows="4" maxlength="1200" placeholder="Notlarını burada tut...">${garajimHtmlEsc(p.notes||'')}</textarea><button onclick="studioSaveNotes()" class="studio-secondary mt-2 w-full"><i class="fa-solid fa-floppy-disk mr-1.5"></i>Notları kaydet</button></section></div>`;
  }
  function studioSaveNotes() { const text=(document.getElementById('studioNotesField')?.value||'').trim(); if(studioUpdateProject(p=>{p.notes=text;},'Proje notları güncellendi')) { renderStudio(); toast('Notlar kaydedildi'); } }
  function renderStudio() {
    const welcome=document.getElementById('studioWelcome'), setup=document.getElementById('studioSetupForm'), dashboard=document.getElementById('studioDashboard');
    if (!welcome || !setup || !dashboard) return;
    studioRenderGarageChoices();
    const rows=studioProjectsGet();
    if (studioActiveProjectId && !rows.some(p=>String(p.id)===String(studioActiveProjectId))) studioActiveProjectId=null;
    if (!studioActiveProjectId && rows.length) { studioActiveProjectId=rows[0].id; try{localStorage.setItem('garaj_studio_selected_project',studioActiveProjectId);}catch(e){} }
    if (setup.classList.contains('hidden')===false) return;
    if (!rows.length) { welcome.classList.remove('hidden'); dashboard.classList.add('hidden'); return; }
    welcome.classList.add('hidden'); dashboard.classList.remove('hidden');
    const select=document.getElementById('studioProjectSelect');
    if (select) select.innerHTML=rows.map(p=>`<option value="${garajimHtmlEsc(p.id)}" ${String(p.id)===String(studioActiveProjectId)?'selected':''}>${garajimHtmlEsc(p.title || studioProjectName(p))} · ${garajimHtmlEsc(studioProjectName(p))}</option>`).join('');
    const p=rows.find(x=>String(x.id)===String(studioActiveProjectId))||rows[0];
    const content=document.getElementById('studioProjectContent'); if (!content) return;
    const tabs=[['design','fa-palette','Tasarım'],['parts','fa-screwdriver-wrench','Parça & bütçe'],['journal','fa-book-open','Proje günlüğü']];
    content.innerHTML=`<div class="flex gap-1 p-1 rounded-2xl border border-white/10 bg-white/5 mb-4">${tabs.map(t=>`<button onclick="studioSetView('${t[0]}')" class="studio-tab flex-1 ${studioSubView===t[0]?'active':''}"><i class="fa-solid ${t[1]} mr-1.5"></i>${t[2]}</button>`).join('')}</div>${studioSubView==='design'?studioRenderDesign(p):studioSubView==='parts'?studioRenderParts(p):studioRenderJournal(p)}<p class="text-center text-[9px] studio-muted pt-1">Proje verileri bu cihazda saklanır · Ayarlar → Yedekle ile dışa aktarılabilir</p>`;
  }

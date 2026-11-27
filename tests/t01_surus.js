const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');
const root = path.dirname(process.argv[2]);
const { readIndexWithAppSource } = require('./helpers/read-app-source');
const html = readIndexWithAppSource(root);
let watchCb=null, errors=[];
function mkL(){
  const chain=()=>new Proxy(function(){},{get:(t,k)=>{ if(k==='getContainer') return ()=>({classList:{toggle(){}}}); if(k==='getZoom') return ()=>12; if(k==='getBounds') return ()=>({}); if(k==='getLatLng') return ()=>({lat:41,lng:29}); if(k==='getElement') return ()=>({querySelector:()=>({style:{}})}); if(k==='then') return undefined; if(k==='__base') return undefined; return chain();},apply:()=>chain()});
  return {map:()=>chain(),tileLayer:()=>chain(),polyline:()=>({addTo(){return this},setLatLngs(){},getBounds(){return{}}}),marker:()=>({addTo(){return this},setLatLng(){},getLatLng:()=>({lat:41,lng:29}),getElement:()=>({querySelector:()=>({style:{}})})}),divIcon:()=>({}),latLng:(a,b)=>({lat:a,lng:b}),Icon:{Default:{}}};
}
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://localhost/',beforeParse(w){
  w.L=mkL(); w.matchMedia=w.matchMedia||(()=>({matches:false,addListener(){},addEventListener(){}}));
  w.navigator.geolocation={getCurrentPosition:(ok)=>ok(P(41,29,10,0)),watchPosition:(ok)=>{watchCb=ok;return 7},clearWatch(){}};
  w.confirm=()=>true; w.alert=()=>{}; w.scrollTo=()=>{}; w.URL.createObjectURL=()=>'blob:x'; w.URL.revokeObjectURL=()=>{};
  w.addEventListener('error',e=>errors.push('ERR '+e.message));
}});
function P(lat,lng,acc,speed,t){return {coords:{latitude:lat,longitude:lng,accuracy:acc,speed:speed,heading:null},timestamp:t||Date.now()}}
const w=dom.window; const ev=s=>w.eval(s);
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m); if(!c) process.exitCode=1;};
(async()=>{
 await new Promise(r=>setTimeout(r,300));
 ok(errors.length===0,'sayfa hatasız yüklendi '+errors.join('|'));
 w.showTab('ride'); await new Promise(r=>setTimeout(r,50));
 ok(ev('ride.gotFix')===true,'ilk GPS konumu alındı');
 ok(!!watchCb,'canlı izleme başladı');
 w.rideToggle(); ok(ev('ride.running')===true,'sürüş başladı');
 // 10 adım ~111m (0.001° enlem), 1 sn arayla, hız 11 m/s (~40 km/sa)
 let t=Date.now(), lat=41;
 for(let i=0;i<10;i++){ t+=10000; lat+=0.001; watchCb(P(lat,29,8,11,t)); }
 const d1=ev('ride.dist'); ok(d1>1000&&d1<1200,'mesafe ~1.1 km hesaplandı: '+d1.toFixed(0));
 ok(Math.abs(ev('ride.maxSpeed')-39.6)<0.5,'maks hız '+ev('ride.maxSpeed').toFixed(1));
 // GPS titremesi (durarak) mesafe eklememeli
 for(let i=0;i<20;i++){ t+=1000; watchCb(P(lat+(i%2?0.00001:-0.00001),29,12,0,t)); }
 ok(Math.abs(ev('ride.dist')-d1)<1,'duran araçta titreme mesafe eklemedi');
 // kötü doğruluk (80m) mesafe eklememeli
 const d2=ev('ride.dist'); t+=2000; watchCb(P(lat+0.002,29,80,10,t)); ok(ev('ride.dist')===d2,'80m doğruluklu konum yok sayıldı');
 // 200m doğruluk işaretçiyi/ istatistiği etkilememeli
 t+=2000; watchCb(P(50,50,200,10,t)); ok(ev('ride.dist')===d2,'200m doğruluklu konum atlandı');
 // zaman boşluğu (60 sn) -> mesafe eklenmez, gap işaretlenir
 t+=60000; lat+=0.01; watchCb(P(lat,29,8,11,t)); ok(ev('ride.gap')===true && Math.abs(ev('ride.dist')-d2)<1,'kayıt boşluğu işaretlendi, sahte mesafe yok');
 // duraklat / devam
 w.rideToggle(); ok(ev('ride.paused')===true,'duraklatıldı');
 const dp=ev('ride.dist'); t+=5000; watchCb(P(lat+0.005,29,8,11,t)); ok(ev('ride.dist')===dp,'duraklatmada mesafe eklenmedi');
 w.rideToggle(); ok(ev('ride.paused')===false&&ev('ride.running'),'devam edildi');
 // panel gizlenince butonlar görünür kalmalı
 w.rideTogglePanel(); const hidden=w.document.getElementById('ridePanelBody').classList.contains('hidden');
 const stopInBody=w.document.getElementById('ridePanelBody').contains(w.document.getElementById('rideStopBtn'));
 const startInBody=w.document.getElementById('ridePanelBody').contains(w.document.getElementById('rideStartBtn'));
 ok(hidden&&!stopInBody&&!startInBody,'panel küçülünce Başlat/Bitir butonları açıkta kalıyor'); w.rideTogglePanel();
 // sekme değiş-gel: aktif sürüş için kurtarma sorusu çıkıp oturumu bozmamalı
 let asked=0; w.confirm=()=>{asked++;return true}; w.showTab('garage'); w.showTab('ride');
 ok(asked===0 && ev('ride.running')===true,'sekme değişince aktif sürüş bozulmadı (soru sorulmadı)');
 // kamera döngüsü: free moduna ulaşılabilmeli
 ev("ride.cam='follow'"); w.rideCycleCamera(); const c1=ev('ride.cam'); w.rideCycleCamera(); const c2=ev('ride.cam');
 ok(c1==='heading'&&c2==='free','kamera follow→heading→free ('+c1+','+c2+')');
 // birim
 w.rideSetUnit('mph'); ok(w.document.getElementById('rideUnitLbl').textContent==='mph' && w.document.getElementById('rideDistLbl').textContent==='mi','mph birimi mesafe etiketiyle birlikte');
 w.rideSetUnit('kmh');
 // bitir -> özet -> kaydet
 w.confirm=()=>true; w.rideStopConfirm();
 ok(!!ev('ride.pendingSummary'),'özet oluştu');
 const ptsOK=ev('ride.pendingSummary.pts.length'); ok(ptsOK>=5,'rota noktası var: '+ptsOK);
 ok(w.document.getElementById('rideSumAvg').textContent.includes('km/sa'),'özet birimi km/sa');
 w.rideKeepSummary(); const saved=JSON.parse(w.localStorage.getItem('garaj_rides')||'[]'); ok(saved.length===1,'sürüş kaydedildi');
 ok(saved[0].gap===true,'boşluk bilgisi kayıtta');
 // geçmiş + önizleme + favori kalıcılığı
 w.rideOpenHistory(); ok(w.document.getElementById('rideHistoryList').children.length===1,'geçmişte 1 kayıt');
 w.ridePreviewFromHistory(0); ok(w.document.getElementById('rideSumKeepBtn').textContent==='Kapat','önizlemede Kapat butonu');
 w.rideToggleFavorite(); ok(JSON.parse(w.localStorage.getItem('garaj_rides'))[0].favorite===true,'favori kalıcı');
 w.rideClosePreview(); w.rideOpenHistory(); w.ridePreviewFromHistory(0); ok(w.document.getElementById('rideSumDiscardBtn').classList.contains('hidden'),'önizlemede Sil gizli');
 w.rideClosePreview();
 // yeni özet: butonlar geri Kaydet
 w.rideToggle(); t+=1000; watchCb(P(41,29,8,0,t)); w.rideToggle(); w.rideToggle();
 w.rideStopConfirm(); ok(w.document.getElementById('rideSumKeepBtn').textContent==='Kaydet' && !w.document.getElementById('rideSumDiscardBtn').classList.contains('hidden'),'yeni özet: Kaydet/Sil geri geldi');
 w.rideDiscardSummary();
 // takvim ics
 let blobText=null; w.Blob=function(parts){blobText=parts.join('')}; w.URL.createObjectURL=()=>'blob:x'; w.URL.revokeObjectURL=()=>{}; w.open=()=>{};
 w.document.createElement=(function(o){return function(n){const e=o.call(w.document,n); if(n==='a') e.click=()=>{}; return e}})(w.document.createElement);
 w.addToCalendar('Muayene, Nişantaşı','2026-12-01');
 ok(blobText&&blobText.includes('\r\n')&&!blobText.includes('\\r\\n')&&blobText.includes('SUMMARY:Muayene  Nişantaşı'),'.ics: gerçek CRLF + başlıkta harf bozulmuyor');
 // native senkron
 let sent={}; w.GarajimNative={syncWidget:j=>sent.w=j,setReminders:j=>sent.r=j};
 w.eval("vehicles=[{id:'a',plate:'34 ABC 123',brand:'Honda',model:'CB',km:12500,muayene:'2020-01-01'}]"); w.syncNative();
 ok(sent.w&&JSON.parse(sent.w).vehicles[0].plate==='34 ABC 123','widget verisi gönderildi'); ok(sent.r!==undefined&&Array.isArray(JSON.parse(sent.r)),'hatırlatma satırları gönderildi: '+sent.r);
 // AI: foto kaydedilmesin
 w.eval("aiChat=[{role:'user',text:'merhaba',photo:'data:image/jpeg;base64,'+'A'.repeat(5000)},{role:'assistant',text:'selam'}]; aiPersistChat()");
 ok(!w.localStorage.getItem('garaj_ai_chat').includes('AAAA'),'AI sohbetine foto base64 yazılmıyor');
 // kurtarma: kapanmış uygulamadan taslak
 w.localStorage.setItem('garaj_ride_draft',JSON.stringify({startedAt:new Date().toISOString(),dist:5000,elapsed:600,maxSpeed:50,pts:[[41,29],[41.01,29]],running:true,paused:false}));
 w.eval("ride.startedAt=null;ride.running=false;ride.paused=false"); w.showTab('garage'); w.showTab('ride');
 ok(ev('ride.paused')===true&&ev('ride.dist')===5000,'kapanan sürüş taslaktan kurtarıldı');
 console.log(errors.length?errors.join('\n'):'(sayfa hatası yok)');
 process.exit(process.exitCode||0);
})();

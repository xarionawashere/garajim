const {JSDOM}=require('jsdom');const http=require('http'),fsx=require('fs'),pth=require('path');
let errors=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
const ROOT=require('path').join(__dirname,'..','www');
const srv=http.createServer((rq,rs)=>{const f=pth.join(ROOT,decodeURIComponent(rq.url.split('?')[0]).replace(/\/$/,'/index.html'));fsx.readFile(f,(e,d)=>{if(e){rs.statusCode=404;rs.end();return}rs.end(d)})}).listen(0);
let watchCb=null,rec={bg:[],bgRemove:0,notif:[],stop:0,draft:0,shared:null};
const mk=async(seed)=>{await new Promise(r=>srv.listening?r():srv.on('listening',r));
 const dom=await JSDOM.fromURL('http://localhost:'+srv.address().port+'/',{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,beforeParse(w){
  w.TextEncoder = require('util').TextEncoder; w.TextDecoder = require('util').TextDecoder;
 w.matchMedia=()=>({matches:false,addListener(){},addEventListener(){}}); w.confirm=()=>{rec.confirm=(rec.confirm||0)+1;return true}; w.alert=()=>{}; w.scrollTo=()=>{};
 w.URL.createObjectURL=()=>'blob:x'; w.URL.revokeObjectURL=()=>{}; w.HTMLCanvasElement.prototype.getContext=()=>null; w.SVGSVGElement.prototype.createSVGRect=function(){return{}};
 w.navigator.geolocation={getCurrentPosition:ok_=>ok_({coords:{latitude:41,longitude:29,accuracy:5,speed:0,heading:null},timestamp:Date.now()}),watchPosition:cb=>{watchCb=cb;return 1},clearWatch(){}};
 const BG={addWatcher:async()=>{rec.bg.push(1);return 'w1'},removeWatcher:async()=>{rec.bgRemove++},openSettings(){}};
 w.Capacitor={isNativePlatform:()=>true,registerPlugin:()=>BG,Plugins:{Filesystem:{writeFile:async o=>{rec.shared=o;return{uri:'f://x'}}},Share:{share:async()=>{}}}};
 w.GarajimNative={syncWidget(){},setReminders(){},consumeAction:()=>'',startRideNotification:(t,m)=>rec.notif.push(t),stopRideNotification:()=>{rec.stop++}};
 const so=w.Storage.prototype.setItem; w.Storage.prototype.setItem=function(k,v){ if(k==='garaj_ride_draft') rec.draft++; return so.call(this,k,v) };
 for(const [k,v] of Object.entries(seed||{})) w.localStorage.setItem(k,JSON.stringify(v));
 w.addEventListener('error',e=>errors.push(e.message));}});
 await new Promise(r=>dom.window.addEventListener('load',r)); await new Promise(r=>setTimeout(r,700)); return dom.window};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
const V=[{id:'v1',plate:'34 ABC 123',brand:'Honda',model:'CB',km:2000,history:[],fuelLogs:[{date:'2026-01-01',km:1000,liters:10,cost:400},{date:'2026-02-01',km:1300,liters:12,cost:500},{date:'2026-03-01',km:1700,liters:16,cost:640}]}];
let w=await mk({garaj_v4:V}),d=w.document,ev=s=>w.eval(s);
ok(errors.length===0,'yeni dosya hatasız yükleniyor '+errors.join('|'));
// 1) servis + GPS eklentisi sürüş BAŞLARKEN
w.showTab('ride'); await sleep(80); w.rideToggle(); await sleep(60);
ok(rec.notif.length===1&&rec.bg.length===1,'sürüş başlarken (ön planda) servis bildirimi + arka plan GPS başlatıldı');
Object.defineProperty(d,'hidden',{value:true,configurable:true}); d.dispatchEvent(new w.Event('visibilitychange')); await sleep(60);
ok(rec.notif.length===1&&rec.bg.length===1&&rec.stop===0&&rec.bgRemove===0,'arka plana geçince servis/GPS yeniden başlatılmadı, durdurulmadı');
Object.defineProperty(d,'hidden',{value:false,configurable:true}); d.dispatchEvent(new w.Event('visibilitychange')); await sleep(60);
ok(rec.stop===0&&rec.bgRemove===0,'öne dönünce servis kapanmadı (sürüş sürüyor)');
// 7) taslak kaydı throttle
rec.draft=0; let t=Date.now(); for(let i=0;i<30;i++){t+=1000;watchCb({coords:{latitude:41+i*0.0003,longitude:29,accuracy:5,speed:12,heading:0},timestamp:t})}
ok(rec.draft<=2,'30 GPS örneğinde taslak yalnızca '+rec.draft+' kez yazıldı (önceden 30)');
ev("ride.pts=Array.from({length:7000},(_,i)=>[41,29,1.7e12+i*1000,30])"); ev("ridePersistDraft(true)"); ok(JSON.parse(w.localStorage.getItem('garaj_ride_draft')).pts.length===6000,'taslakta son 6000 nokta (önceden 500)');
// bitir
ev("ride.pts=ride.pts.slice(0,50)"); w.rideStopConfirm(); await sleep(250); ok(rec.stop>=1,'bitirince servis kapatıldı');
// 2) Sil → epic verisi geri alınır
const before=[w.localStorage.getItem(ev('RIDE_CARDS_KEY')),w.localStorage.getItem(ev('RIDE_DNA_KEY'))];
ev("ride.epicUndo=rideEpicSnapshot(); localStorage.setItem(RIDE_CARDS_KEY,'[{\"id\":\"x\"}]'); localStorage.setItem(RIDE_DNA_KEY,'{\"counts\":{}}')");
w.rideDiscardSummary(); ok(w.localStorage.getItem(ev('RIDE_CARDS_KEY'))===before[0]&&w.localStorage.getItem(ev('RIDE_DNA_KEY'))===before[1],'"Sil" → kart/DNA sürüşten önceki hâline döndü');
ev("ride.pendingSummary={id:'k',date:new Date().toISOString(),dist:5000,time:600,avg:30,max:50,pts:[]}; ride.epicUndo=rideEpicSnapshot(); localStorage.setItem(RIDE_CARDS_KEY,'[{\"id\":\"x\"}]')"); w.rideKeepSummary(); ok(w.localStorage.getItem(ev('RIDE_CARDS_KEY'))!==null&&ev('ride.epicUndo')===null,'"Kaydet" → kart kalır');
// 3) viraj
ev("ride.corners=[];ride.cornerActive=null;ride.lastHd=null");
const hs=[0,0,0,9,18,27,36,45,54,63,72,81,90,90,90,90,90]; hs.forEach(h=>w.rideCornerTick({lat:41,lng:29},60,h));
ok(ev('ride.corners.length')===1&&Math.abs(ev('ride.corners[0].total')-90)<1&&!!ev('ride.corners[0].label'),'90° tek yönlü viraj algılandı: toplam '+Math.round(ev('ride.corners[0]&&ride.corners[0].total')||0)+'° → '+ev('ride.corners[0]&&ride.corners[0].label'));
ev("ride.corners=[];ride.cornerActive=null;ride.lastHd=null"); [0,0,10,20,30,30,30,30,30,20,10,0,0,0,0,0].forEach(h=>w.rideCornerTick({lat:41,lng:29},50,h));
ok(ev('ride.corners.length')===2,'S virajı: sağ + sol = 2 viraj');
ev("ride.corners=[];ride.cornerActive=null;ride.lastHd=null"); [0,1,0,1,2,1,0].forEach(h=>w.rideCornerTick({lat:41,lng:29},50,h)); ok(ev('ride.corners.length')===0&&!ev('ride.cornerActive'),'düz yolda küçük sapmalar viraj sayılmadı');
// 4) anı pini bloklamasın
w=await mk({garaj_v4:V}); d=w.document; ev=s=>w.eval(s); rec.confirm=0;
ev("ride.accuracy=5; ride.slowSince=Date.now()-25000; ride.lastMemoryAsk=0; ride.memAsks=0"); ev("rideMaybeMemoryPin({lat:41.5,lng:29.5},3)");
ok(!!d.getElementById('rideMemChip')&&!rec.confirm,'anı önerisi bloklamayan küçük kutu (confirm yok)');
ev("rideMaybeMemoryPin({lat:41.5,lng:29.5},3)"); ok(ev('ride.memAsks')===1,'10 dk içinde tekrar sormuyor');
d.getElementById('rideMemYes').click(); const pins=ev("ridePinsGet()"); ok(pins.length===1&&pins[0].lat===41.5,'"İşaretle" pini kaydetti');
ev("ride.slowSince=null"); ev("rideMaybeMemoryPin({lat:41,lng:29},40)"); ok(ev('ride.slowSince')===null,'hızlanınca bekleme sıfırlandı');
// 5) yakıt
ev("ride.vehicleId='v1'"); const fg=ev("rideFuelGhost(50000)"); const fs=ev("fuelStats(vehicles[0]).avg");
ok(fg&&Math.abs(fg.usedL-50*fs/100)<0.06&&fg.rangeKm===null,'yakıt: 50 km → ~'+(fg&&fg.usedL)+' L (ortalama '+fs.toFixed(2)+' L/100), depo bilinmeyince menzil uydurmuyor');
ev("vehicles[0].tank=12"); ok(ev("rideFuelGhost(1000).rangeKm")===Math.round(12/fs*100),'depo girilince menzil hesaplanıyor');
ev("vehicles[0].fuelLogs=[]"); ok(ev("rideFuelGhost(1000)")===null,'yakıt verisi yoksa null');
// 9) renk parçaları
const pts=[];for(let i=0;i<300;i++){const blk=Math.floor(i/50);pts.push([41+i*0.0002,29,1.7e12+i*1000,[20,50,80,100,130,20][blk]])}
const host=d.createElement('div');host.style.height='200px';d.body.appendChild(host);const map=w.L.map(host,{}).setView([41,29],14); const layers=w.rideAddSpeedColoredLine(map,pts);
ok(layers.length>=6&&layers.length<=7,'300 noktalı rota '+layers.length+' çizgi (önceden 299)');
// 10-11) özet: tekrar hızı 1x, yedek ekleri
w.localStorage.setItem('garaj_rides',JSON.stringify([{id:'r1',vehicleId:'v1',date:new Date().toISOString(),dist:9000,time:900,avg:36,max:70,pts}]));
w.openVehicleRidePreview('v1',0); await sleep(500); ok(d.getElementById('rideReplaySpeed')&&d.getElementById('rideReplaySpeed').value==='1','tekrar hızı varsa
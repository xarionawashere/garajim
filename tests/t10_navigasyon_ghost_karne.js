const {JSDOM}=require('jsdom');const http=require('http'),fsx=require('fs'),pth=require('path');const {createCanvas}=require('@napi-rs/canvas');
const ROOT=require('path').join(__dirname,'..','www');
let errors=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
const srv=http.createServer((rq,rs)=>{const f=pth.join(ROOT,decodeURIComponent(rq.url.split('?')[0]).replace(/\/$/,'/index.html'));fsx.readFile(f,(e,d)=>{if(e){rs.statusCode=404;rs.end();return}rs.end(d)})}).listen(0);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let watchCb=null,fetched=[],said=[],shared=null;
const line=(la0,la1,n,lng)=>Array.from({length:n},(_,i)=>[lng+0,0].length&&[lng,la0+(la1-la0)*i/(n-1)]);   // [lng,lat]
const mkRoute=(lng,off)=>{const co=Array.from({length:21},(_,i)=>[lng+(i>10?off:0),41+i*0.001]);return{distance:2220,duration:240,geometry:{coordinates:co},legs:[{steps:[
 {distance:1110,name:'Bağdat Cd.',maneuver:{type:'depart',location:co[0]}},{distance:1110,name:'Moda Cd.',maneuver:{type:'turn',modifier:'right',location:co[10]}},{distance:0,name:'',maneuver:{type:'arrive',modifier:'right',location:co[20]}}]}]}};
(async()=>{await new Promise(r=>srv.on('listening',r));
const dom=await JSDOM.fromURL('http://localhost:'+srv.address().port+'/',{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,beforeParse(w){
 w.TextEncoder = require('util').TextEncoder; w.TextDecoder = require('util').TextDecoder;
 w.matchMedia=()=>({matches:false,addListener(){},addEventListener(){}}); w.confirm=()=>true; w.alert=()=>{}; w.scrollTo=()=>{};
 w.URL.createObjectURL=()=>'blob:x'; w.URL.revokeObjectURL=()=>{}; w.SVGSVGElement.prototype.createSVGRect=function(){return{}};
 w.HTMLCanvasElement.prototype.getContext=function(t){ if(!this.__n||this.__n.width!==this.width||this.__n.height!==this.height) this.__n=createCanvas(this.width||300,this.height||150); return this.__n.getContext(t) };
 w.HTMLCanvasElement.prototype.toBlob=function(cb,type){cb(new w.Blob([this.__n.toBuffer('image/png')],{type}))};
 w.navigator.geolocation={getCurrentPosition:ok_=>ok_({coords:{latitude:41,longitude:29,accuracy:5,speed:0,heading:null},timestamp:Date.now()}),watchPosition:cb=>{watchCb=cb;return 1},clearWatch(){}};
 w.Capacitor={isNativePlatform:()=>true,Plugins:{Filesystem:{writeFile:async o=>{shared=o;return{uri:'f://x'}}},Share:{share:async()=>{}}}};
 w.speechSynthesis={cancel(){},speak(u){said.push(u.text)}}; w.SpeechSynthesisUtterance=function(t){this.text=t};
 w.fetch=async u=>{fetched.push(u); if(u.includes('nominatim')) return {ok:true,json:async()=>[{display_name:'Kadıköy, İstanbul, Türkiye',lat:'41.02',lon:'29.0'},{display_name:'Kadıköy İskele, İstanbul',lat:'41.019',lon:'29.001'}]};
   if(u.includes('osrm')) return {ok:true,json:async()=>({routes:u.includes('alternatives=true')?[mkRoute(29,0),mkRoute(29,0.004)]:[mkRoute(29.003,0)]})}; return {ok:false}};
 const ts=1.7e12, gp=Array.from({length:31},(_,i)=>[41+i*0.001,29,ts+i*10000,40]);
 w.localStorage.setItem('garaj_v4',JSON.stringify([{id:'v1',plate:'34 ABC 123',brand:'Honda',model:'CB',km:5,history:[],fuelLogs:[]}]));
 w.localStorage.setItem('garaj_rides',JSON.stringify([{id:'g1',vehicleId:'v1',date:new Date(Date.now()-864e5).toISOString(),dist:3330,time:300,avg:40,max:70,pts:gp}]));
 w.localStorage.setItem('garaj_parking',JSON.stringify({lat:41.001,lng:29.001,acc:5,t:Date.now()}));
 w.addEventListener('error',e=>errors.push(e.message));}});
const w=dom.window,d=w.document,ev=s=>w.eval(s),vis=id=>!d.getElementById(id).classList.contains('hidden');
await new Promise(r=>w.addEventListener('load',r)); await sleep(800);
ok(errors.length===0,'yüklendi '+errors.join('|'));
// ---- yönerge metinleri
const T=(t,m,x)=>ev(`nvText(${JSON.stringify({type:t,modifier:m,exit:x})},'')`);
ok(T('turn','right')==='Sağa dön'&&T('turn','left')==='Sola dön'&&T('turn','slight left')==='Hafif sola dön'&&T('turn','uturn')==='U dönüşü yap','dönüş metinleri Türkçe');
ok(T('roundabout',null,2)==='Göbekten 2. çıkıştan devam et'&&T('arrive','left').startsWith('Varış')&&T('fork','right')==='Çatalda sağa tut'&&T('end of road','left')==='Yolun sonunda sola dön','kavşak, varış, çatal, yol sonu');
// ---- arama + rota
w.showTab('ride'); await sleep(100); w.nvOpen();
ok(d.getElementById('nvQuick').textContent.includes('Park yerim'),'hızlı hedef: Park yerim');
d.getElementById('nvQ').value='kadikoy'; await w.nvSearch(); ok(d.querySelectorAll('#nvResults button').length===2&&/nominatim.*q=kadikoy/.test(fetched.find(u=>u.includes('nominatim'))||''),'adres arama: 2 sonuç');
await w.nvGoIdx(0); await sleep(50);
ok(d.querySelectorAll('#nvRoutes button').length>=4&&d.getElementById('nvRoutes').textContent.includes('Rota 2'),'2 alternatif rota seçeneği + başlat düğmesi');
ok(ev("nv.routes.length")===2&&ev("nv.routes[0].steps.length")===3&&ev("nv.routes[0].steps[1].vtx")===10,'rota ve adımlar çözüldü (dönüş 10. noktada)');
w.nvSelect(1); ok(ev('nv.sel')===1,'rota 2 seçildi'); w.nvSelect(0);
w.nvStart(); ok(vis('navBanner')&&ev('nv.active'),'navigasyon başladı, üst bilgi kutusu açık');
ok(d.getElementById('navText').textContent==='Sağa dön · Moda Cd.','ilk yönerge: '+d.getElementById('navText').textContent);
ok(/1[,.]1 km/.test(d.getElementById('navDist').textContent),'dönüşe mesafe: '+d.getElementById('navDist').textContent);
ok(/(?:Tahmini )?varış \d\d:\d\d/i.test(d.getElementById('navEta').textContent),'varış saati: '+d.getElementById('navEta').textContent);
ok(d.getElementById('navGpsStatus').textContent.includes('GPS'),'navigasyon GPS doğruluk durumu gösteriliyor: '+d.getElementById('navGpsStatus').textContent);
ok(!!JSON.parse(w.localStorage.getItem('garaj_nav_session_v2')||'null'),'aktif navigasyon oturumu güvenli biçimde kaydedildi');
const fix=(la,lo)=>watchCb({coords:{latitude:la,longitude:lo,accuracy:5,speed:10,heading:0},timestamp:Date.now()});
fix(41.0075,29); ok(said.some(t=>/sonra sağa dön/.test(t)),'~250 m kala sesli uyarı: "'+(said.find(t=>/sonra/.test(t))||'')+'"');
ok(/2[0-9]0 m|3[0-9]0 m/.test(d.getElementById('navDist').textContent),'mesafe azaldı: '+d.getElementById('navDist').textContent);
fix(41.0098,29); ok(said.filter(t=>t==='Sağa dön · Moda Cd.').length===1,'dönüşte tam yönerge okundu');
fix(41.0112,29); ok(d.getElementById('navText').textContent.startsWith('Varış noktasına'),'dönüşü geçince sıradaki yönerge: varış');
fix(41.0199,29); await sleep(30); ok(!vis('navBanner')&&!ev('nv.active'),'varışta navigasyon kapandı');
ok(!w.localStorage.getItem('garaj_nav_session_v2'),'varışta devam oturumu temizlendi');
// ---- rotadan çıkma → yeniden rota
fix(41.0,29); w.nvRouteTo({name:'Kadıköy',lat:41.02,lng:29}); await sleep(60); w.nvStart(); const before=fetched.filter(u=>u.includes('osrm')).length;
fix(41.005,29.003); fix(41.0052,29.0031); fix(41.0054,29.0032); await sleep(80);
ok(fetched.filter(u=>u.includes('osrm')).length===before+1&&said.some(t=>/Yeniden rota/.test(t)),'3 örnek rota dışında → otomatik yeniden rota');
ok(ev('nv.active')&&ev('nv.route.pts[0][1]')===29.003,'yeni rota mevcut konumdan başlıyor'); w.nvStop();
// ---- ses kapama
w.nvToggleVoice(); const n0=said.length; ev("nvSpeak('x')"); ok(said.length===n0,'ses kapatılınca konuşmuyor'); w.nvToggleVoice();
// ---- canlı ghost
w.showTab('garage'); w.showTab('ride'); await sleep(60); w.rideToggle(); await sleep(120);
ok(!!ev('ride.ghost')&&ev('ride.ghost.id')==='g1','ghost seçildi (başlangıç noktası yakın, zaman damgalı tur)');
fix(41.010,29); ev('ride.elapsed=50'); ev('rideGhostUpdate()'); ok(/50 sn önde/.test(d.getElementById('rideGhostChip').textContent),'ghost 100 sn\'de geldiği yere ben 50 sn\'de geldim: '+d.getElementById('rideGhostChip').textContent);
ev('ride.elapsed=150'); ev('rideGhostUpdate()'); ok(/50 sn geride/.test(d.getElementById('rideGhostChip').textContent),'150 sn\'de → 50 sn geride');
const gm=ev("ride.ghost.marker.getLatLng()"); ok(gm.lat>41.012&&gm.lat<41.016,'ghost motoru zamanla ilerliyor: '+gm.lat.toFixed(4));
fix(41.0,29.05); ev('rideGhostUpdate()'); ok(/rota dışı/.test(d.getElementById('rideGhostChip').textContent),'rotadan ayrılınca "rota dışı"');
ev("ride.pts=ride.pts.length?ride.pts:[[41,29,1.7e12,10],[41.001,29,1.7e12+9000,40]]"); w.rideStopConfirm(); await sleep(300);
ok(ev('ride.ghost')===null&&!vis('rideGhostChip'),'sürüş bitince ghost kaldırıldı');
// ---- karne
const kp=Array.from({length:60},(_,i)=>[41+i*0.0004,29+Math.sin(i/7)*0.004,1.7e12+i*5000,[25,55,85,110,50,35][Math.floor(i/10)]]);
const S={id:'k',vehicleId:'v1',date:new Date().toISOString(),dist:24000,time:2400,avg:36,max:112,pts:kp,corners:{n:14,avg:84,perfect:6,aggressive:1},roughHits:5,hardBrakes:2,dna:{label:'Akıcı gezgin'},ghostDelta:12};
const kr=ev("rideKarneRows("+JSON.stringify(S)+")"); ok(kr.rows.length>=3&&kr.overall>0,'karne notları: '+kr.rows.map(r=>r.k+' '+r.v).join(', ')+' → genel '+kr.overall);
ok(ev("rideGrade(95)+rideGrade(80)+rideGrade(65)+rideGrade(10)")==='ABCD','harf notları A/B/C/D');
ev("ride.pendingSummary="+JSON.stringify(S)); await w.rideShareKarne(); const png=Buffer.from(shared.data,'base64');
ok(shared.path.includes('karne')&&png.slice(1,4).toString()==='PNG','karne PNG olarak paylaşıldı'); const shareTestDir=pth.join(__dirname,'.tmp');fsx.mkdirSync(shareTestDir,{recursive:true});fsx.writeFileSync(pth.join(shareTestDir,'karne.png'),png);
const dim=[png.readUInt32BE(16),png.readUInt32BE(20)]; ok(dim[0]===1080&&dim[1]===1920,'boyut 1080x1920');
ok(d.getElementById('rideSummaryModal').innerHTML.includes('rideShareKarne()'),'özet ekranında Karne düğmesi');
ok(errors.length===0,'sayfa hatası yok '+errors.join('|'));
process.exit(process.exitCode||0);})();


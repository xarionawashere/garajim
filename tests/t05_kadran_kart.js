const {JSDOM}=require('jsdom');const http=require('http'),fsx=require('fs'),pth=require('path');const {createCanvas}=require('@napi-rs/canvas');
let errors=[]; const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
(async()=>{
const srv=http.createServer((rq,rs)=>{const f=pth.join(require('path').join(__dirname,'..','www'),decodeURIComponent(rq.url.split('?')[0]).replace(/\/$/,'/index.html'));fsx.readFile(f,(e,d)=>{if(e){rs.statusCode=404;rs.end();return}rs.end(d)})}).listen(0);
await new Promise(r=>srv.on('listening',r));
const calls={w:[],s:[],bridge:[]}; let q=[];
const dom=await JSDOM.fromURL('http://localhost:'+srv.address().port+'/',{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,beforeParse(w){
 w.matchMedia=()=>({matches:false,addListener(){},addEventListener(){}}); w.confirm=()=>true; w.alert=()=>{}; w.scrollTo=()=>{};
 w.URL.createObjectURL=()=>'blob:x'; w.URL.revokeObjectURL=()=>{}; w.SVGSVGElement.prototype.createSVGRect=function(){return{}};
 w.HTMLCanvasElement.prototype.getContext=function(t){ if(!this.__n||this.__n.width!==this.width||this.__n.height!==this.height) this.__n=createCanvas(this.width||300,this.height||150); return this.__n.getContext(t) };
 w.HTMLCanvasElement.prototype.toBlob=function(cb,type){cb(new w.Blob([this.__n.toBuffer('image/png')],{type}))};
 w.navigator.geolocation={getCurrentPosition(ok_){ok_({coords:{latitude:41,longitude:29,accuracy:9,speed:0,heading:null},timestamp:Date.now()})},watchPosition:()=>1,clearWatch(){}};
 w.GarajimNative={syncWidget:j=>w.__w=j,setReminders(){},consumeAction:()=>q.shift()||'',setWidgetVehicle:id=>calls.bridge.push(id)};
 w.Capacitor={isNativePlatform:()=>true,Plugins:{Filesystem:{writeFile:async o=>{calls.w.push(o);return{uri:'file:///c/'+o.path}}},Share:{share:async o=>{calls.s.push(o)}}}};
 w.localStorage.setItem('garaj_v4',JSON.stringify([
  {id:'v1',plate:'34 ABC 123',brand:'Honda',model:'CB',km:12000,history:[],fuelLogs:[],trips:[{from:'A',to:'B',km:5}]},
  {id:'v2',plate:'06 XYZ 789',brand:'Yamaha',model:'MT',km:88000,history:[],fuelLogs:[]}]));
 const pts=[];for(let i=0;i<120;i++){const t=i/119*Math.PI*1.6;pts.push([41+0.02*Math.sin(t*1.3)+i*0.00015,29+0.03*Math.cos(t)+0.01*Math.sin(t*3)])}
 w.localStorage.setItem('garaj_rides',JSON.stringify([{id:'r1',vehicleId:'v1',date:new Date().toISOString(),dist:48200,time:5400,avg:32.1,max:97.4,pts}]));
 w.addEventListener('error',e=>errors.push(e.message));
}});
const w=dom.window,ev=s=>w.eval(s);
await new Promise(r=>w.addEventListener('load',r)); await new Promise(r=>setTimeout(r,1200));
ok(errors.length===0,'yüklendi '+errors.join('|'));

// ---- rotalar kaldırıldı
const d=w.document;
ok(!d.getElementById('tripModal')&&!d.getElementById('tripMap')&&typeof w.openTripModal==='undefined'&&typeof w.saveTrip==='undefined','rota penceresi/haritası/fonksiyonları kaldırıldı');
w.openDetail('v1'); const dh=d.getElementById('detailView').innerHTML;
ok(!dh.includes('Son Rotalar')&&!dh.includes('openTripModal')&&!dh.includes('Henüz rota yok'),'araç detayında "Son Rotalar" bölümü yok');
ok(dh.includes('openRideForVehicle(currentId)')&&dh.includes('fa-motorcycle'),'küçük Rota düğmesi → Açık Dünya Sürüş düğmesi oldu');
ok(ev("vehicles[0].trips.length")===1,'eski rota verisi silinmedi (gizli kaldı)');
ev("openRideForVehicle('v2')"); ok(!d.getElementById('rideView').classList.contains('hidden')&&ev('ride.vehicleId')==='v2'&&w.localStorage.getItem('garaj_ride_vehicle')==='v2','düğme: Açık Dünya açıldı, araç v2 seçildi');
ok(d.getElementById('rideVehicleSelect').value==='v2','sürüş ekranındaki araç seçici v2');

// ---- widget: araç bazlı eylemler
w.showTab('garage'); for(const m of ['fuelModal','kmModal','serviceModal'])d.getElementById(m).classList.add('hidden');
q.push('fuel|v2'); w.garajimCheckAction(); ok(!d.getElementById('fuelModal').classList.contains('hidden')&&ev('currentId')==='v2','widget "fuel|v2" → v2 yakıt penceresi');
d.getElementById('fuelModal').classList.add('hidden'); q.push('km|v1'); w.garajimCheckAction(); ok(ev('currentId')==='v1'&&!d.getElementById('kmModal').classList.contains('hidden'),'widget "km|v1" → v1 km penceresi');
d.getElementById('kmModal').classList.add('hidden'); q.push('ride|v2'); w.garajimCheckAction(); ok(ev('ride.vehicleId')==='v2','widget "ride|v2" → sürüş v2');
q.push('park|v1'); w.garajimCheckAction(); await new Promise(r=>setTimeout(r,50)); ok(ev('ride.vehicleId')==='v1'&&ev('parkGet().vehicleId')==='v1','widget "park|v1" → v1 için park kaydı');
q.push('fuel'); w.showTab('garage'); w.garajimCheckAction(); ok(ev('currentId')==='v1','araç belirtilmezse ilk araç');
w.syncNative(); const sy=JSON.parse(w.__w); ok(sy.length===2&&sy[0].id==='v1'&&sy[1].id==='v2','widget verisinde araç kimlikleri var');
w.openDetail('v2'); ok(d.getElementById('detailView').innerHTML.includes("setWidgetVehicle('v2')"),'detayda "Widget\'ta bu aracı göster"'); w.setWidgetVehicle('v2'); ok(calls.bridge[0]==='v2','köprüye seçim gönderildi');

// ---- kadran okuma (arayüz akışı, OCR sahte)
const wk={setParameters:async()=>{},recognize:async()=>({data:{words:[{text:'12345',confidence:90}],lines:[{text:'12 345',confidence:88}],text:'12345'}}),terminate:async()=>{}};
w.Tesseract={createWorker:async()=>wk}; w.odoLoadImage=async()=>({img:{width:400,height:200,naturalWidth:400,naturalHeight:200,},url:'blob:x'});
w.eval("odoPrepare=function(i){return [i,i]}"); w.openDetail('v1'); w.openKmModal(); w.odoScan('newKm');
await w.odoRun(new w.File(['x'],'k.jpg')); const chips=d.getElementById('odoChips').innerHTML;
ok(chips.includes('odoPick(12345)')&&chips.includes('+345'),'kadran: aday 12.345 km, fark +345 gösterildi');
w.odoPick(12345); ok(d.getElementById('newKm').value==='12345'&&d.getElementById('odoModal').classList.contains('hidden'),'seçilince KM kutusuna yazıldı, kaydedilmedi');
ok(ev("vehicles[0].km")===12000,'araç km\'si otomatik değişmedi');
for(const id of ['km','svcKm','fuelKm']) ok(d.documentElement.innerHTML.includes("odoScan('"+id+"')"),'"Kadran" düğmesi var: '+id);
w.Tesseract={createWorker:async()=>({setParameters:async()=>{},recognize:async()=>({data:{words:[],lines:[],text:''}}),terminate:async()=>{}})}; await w.odoRun(new w.File(['x'],'k.jpg')); ok(/Rakam bulunamadı/.test(d.getElementById('odoStatus').textContent),'rakam yoksa açıklayıcı mesaj');
w.Tesseract={createWorker:async()=>{throw new Error('x')}}; await w.odoRun(new w.File(['x'],'k.jpg')); ok(/Okunamadı/.test(d.getElementById('odoStatus').textContent),'OCR hatasında elle girme önerisi');
delete w.Tesseract; await w.odoRun(new w.File(['x'],'k.jpg')); ok(/yüklenemedi/.test(d.getElementById('odoStatus').textContent),'OCR yoksa (çevrimdışı derleme dışı) mesaj');

// ---- paylaşım kartı
calls.w.length=0; calls.s.length=0;
w.showTab('ride'); w.openVehicleRidePreview('v1',0); ok(d.getElementById('rideSummaryModal').innerHTML.includes('rideShareCard()'),'özet ekranında Kart düğmesi');
await w.rideShareCard(); const f=calls.w[0];
ok(f&&f.path.endsWith('.png')&&Buffer.from(f.data,'base64').slice(1,4).toString()==='PNG','kart PNG olarak paylaşıldı');
fsx.writeFileSync('/tmp/lint/card.png',Buffer.from(f.data,'base64'));
ok(calls.s.length===1&&calls.s[0].url.endsWith('.png'),'paylaşım menüsü açıldı');
process.exit(process.exitCode||0);
})();

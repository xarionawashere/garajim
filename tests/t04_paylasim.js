const {JSDOM}=require('jsdom');
const http=require('http'),fsx=require('fs'),pth=require('path');
let errors=[]; const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
(async()=>{
const srv=http.createServer((rq,rs)=>{const f=pth.join(require('path').join(__dirname,'..','www'),decodeURIComponent(rq.url.split('?')[0]).replace(/\/$/,'/index.html'));fsx.readFile(f,(e,d)=>{if(e){rs.statusCode=404;rs.end();return}rs.end(d)})}).listen(0);
await new Promise(r=>srv.on('listening',r));
const day=n=>{const d=new Date();d.setDate(d.getDate()-n);d.setHours(12);return d.toISOString()};
const dom=await JSDOM.fromURL('http://localhost:'+srv.address().port+'/',{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,beforeParse(w){
 w.matchMedia=()=>({matches:false,addListener(){},addEventListener(){}}); w.confirm=()=>true; w.alert=()=>{}; w.scrollTo=()=>{};
 w.URL.createObjectURL=()=>'blob:x'; w.URL.revokeObjectURL=()=>{}; w.HTMLCanvasElement.prototype.getContext=()=>null; w.SVGSVGElement.prototype.createSVGRect=function(){return{}};
 w.navigator.geolocation={getCurrentPosition(){},watchPosition:()=>1,clearWatch(){}};
 w.GarajimNative={syncWidget:j=>w.__w=j,setReminders(){},consumeAction:()=>''};
 w.localStorage.setItem('garaj_v4',JSON.stringify([{id:'v1',plate:'34 ABC 123',brand:'Honda',model:'CB',km:20000,nextServiceKm:20900,interval:15000,
   history:[{date:'2026-01-02',km:10000,desc:'Bakım',cost:3000,cat:'bakim'},{date:'2026-03-02',km:15000,desc:'Lastik',cost:2000,cat:'lastik'}],
   fuelLogs:[{date:'2026-01-01',km:10000,liters:10,cost:400},{date:'2026-02-01',km:12000,liters:80,cost:3200},{date:'2026-03-01',km:15000,liters:240,cost:9600}]}]));
 w.localStorage.setItem('garaj_rides',JSON.stringify([
  {id:'a',date:day(0),dist:20000,time:1800,avg:40,max:90},{id:'b',date:day(2),dist:50000,time:3600,avg:50,max:120},{id:'c',date:day(40),dist:30000,time:2400,avg:45,max:100}]));
 w.addEventListener('error',e=>errors.push(e.message));
}});
const w=dom.window,ev=s=>w.eval(s);
await new Promise(r=>w.addEventListener('load',r)); await new Promise(r=>setTimeout(r,1200));
ok(errors.length===0,'yüklendi '+errors.join('|'));

// ---- 1) Paylaş menüsü
const calls={w:[],s:[]};
w.Capacitor={isNativePlatform:()=>true,Plugins:{Filesystem:{writeFile:async o=>{calls.w.push(o);return{uri:'file:///cache/'+o.path}}},Share:{share:async o=>{calls.s.push(o)}}}};
await ev("exportData()");
ok(calls.w.length===1&&/^garajim-yedek-\d{4}-\d{2}-\d{2}\.json$/.test(calls.w[0].path)&&calls.w[0].directory==='CACHE','yedek: cache klasörüne yazıldı ('+(calls.w[0]&&calls.w[0].path)+')');
ok(JSON.parse(Buffer.from(calls.w[0].data,'base64').toString('utf8')).vehicles[0].plate==='34 ABC 123','yedek içeriği doğru (yeni biçim: vehicles + rides)');
ok(calls.s.length===1&&calls.s[0].url==='file:///cache/'+calls.w[0].path,'paylaş menüsü dosya adresiyle açıldı');
ok(w.localStorage.getItem('garaj_last_backup'),'son yedek tarihi güncellendi');
// Türkçe karakter
await ev("saveOrShare('t.csv','text/csv','\\ufeffŞğİıç,ö','CSV')"); ok(Buffer.from(calls.w[1].data,'base64').toString('utf8')==='\ufeffŞğİıç,ö','Türkçe karakterler bozulmuyor');
// PDF
calls.w.length=0; await ev("exportAllPDF()"); await new Promise(r=>setTimeout(r,200));
ok(calls.w.length===1&&calls.w[0].path.endsWith('.pdf')&&Buffer.from(calls.w[0].data,'base64').slice(0,4).toString()==='%PDF','PDF üretildi ve paylaşıldı (%PDF başlığı)');
// CSV
calls.w.length=0; ev("exportCSV()"); await new Promise(r=>setTimeout(r,100)); ok(calls.w.length===1&&calls.w[0].path.endsWith('.csv'),'CSV paylaşıldı');
// iptal
calls.w.length=0; w.localStorage.removeItem('garaj_last_backup'); w.Capacitor.Plugins.Share.share=async()=>{throw new Error('Share canceled')};
await ev("exportData()"); ok(!w.localStorage.getItem('garaj_last_backup'),'paylaşım iptalinde yedek tarihi güncellenmedi');
// tarayıcı yedeği (Capacitor yok)
delete w.Capacitor; let dl=null; const oc=w.document.createElement.bind(w.document); w.document.createElement=function(n){const e=oc(n); if(n==='a') e.click=()=>{dl=e.download}; return e};
const via=await ev("saveOrShare('x.json','application/json','{}','Yedek')"); ok(via==='download'&&dl==='x.json','tarayıcıda indirme yöntemi çalışıyor');

// ---- 2) 100 km maliyeti
const cs=ev("costStats(vehicles[0])"); // toplam = 3000+2000+400+3200+9600 = 18200 ; aralık 10000..20000
ok(cs&&Math.round(cs.per100)===182&&cs.span===10000,'tüm masraflar ₺/100 km = '+(cs&&Math.round(cs.per100))+' (beklenen 182)');
const fs=ev("fuelStats(vehicles[0])"); // 12000: 80L/2000km, 3200₺ ; 15000: 240L/3000km 9600₺
ok(fs&&Math.abs(fs.cost100-(3200+9600)/5000*100)<0.01,'yakıt ₺/100 km = '+(fs&&fs.cost100.toFixed(1))+' (beklenen 256)');
ok(ev("fuelStats({fuelLogs:[{km:100,liters:5,cost:0},{km:300,liters:10,cost:0}]}).cost100")===null,'tutarsız kayıtta maliyet uydurulmaz');
ok(ev("costStats({km:100,history:[{km:100,cost:50}],fuelLogs:[]})")===null,'kısa aralıkta (<200 km) toplam maliyet hesaplanmaz');
w.openDetail('v1'); const h=w.document.getElementById('detailView').innerHTML; ok(h.includes('Yakıt maliyeti')&&h.includes('Tüm masraflar'),'detayda iki maliyet kutusu');

// ---- 3) Widget bakım
w.syncNative(); const wv=JSON.parse(w.__w)[0];
ok(wv.svc&&wv.svc.remaining===900&&wv.svc.state==='warn'&&wv.svc.percent===94,'widget bakım: kalan 900 km, durum warn, %94 → '+JSON.stringify(wv.svc));
ev("vehicles[0].km=21000"); w.syncNative(); const wo=JSON.parse(w.__w)[0].svc; ok(wo.remaining===-100&&wo.state==='bad','bakım geçince durum bad (-100 km)');
ev("vehicles[0].nextServiceKm=''"); w.syncNative(); ok(JSON.parse(w.__w)[0].svc===null,'bakım verisi yoksa svc null');

// ---- 5) Sürüş istatistikleri
const wk=ev("rideStatsData('week')"); ok(wk.n===2&&wk.dist===70000&&wk.time===5400&&wk.max===120&&Math.abs(wk.avg-70000/5400*3.6)<0.01,'hafta: 2 sürüş, 70 km, 1.5 sa, maks 120, ort '+wk.avg.toFixed(1));
const mo=ev("rideStatsData('month')"); ok(mo.n===2,'ay (30 gün): 40 gün önceki sürüş dışarıda');
const yr=ev("rideStatsData('year')"); ok(yr.n===3&&yr.buckets.length===12,'yıl: 12 aylık çubuk, 3 sürüş');
ok(wk.rec.longest.id==='b'&&wk.rec.fastest.id==='b'&&wk.rec.longTime.id==='b','rekorlar tüm zamanlardan');
w.showTab('ride'); w.rideStatsOpen('week'); const sh=w.document.getElementById('rideStatsBody').innerHTML;
ok(!w.document.getElementById('rideStatsModal').classList.contains('hidden')&&sh.includes('70.0 km')&&sh.includes('<svg')&&sh.includes('En uzun sürüş'),'istatistik penceresi: toplam, çubuk grafik, rekorlar');
ev("localStorage.setItem('garaj_ride_settings',JSON.stringify({unit:'mph'}))"); w.rideStatsOpen('week'); ok(w.document.getElementById('rideStatsBody').innerHTML.includes('mi'),'mph biriminde mil gösteriliyor');
w.localStorage.setItem('garaj_rides','[]'); w.rideStatsOpen('week'); ok(w.document.getElementById('rideStatsBody').textContent.includes('Henüz kayıtlı sürüş yok'),'sürüş yokken boş durum mesajı');
// Tailwind kapsama
const css=fsx.readFileSync(require('path').join(__dirname,'..','www','vendor','tailwind.css'),'utf8'), inl=w.document.querySelector('style').textContent;
w.rideStatsOpen('year'); w.openDetail('v1');
const toks=new Set(); w.document.querySelectorAll('[class]').forEach(e=>(e.getAttribute('class')||'').split(/\s+/).filter(Boolean).forEach(t=>toks.add(t)));
const miss=[...toks].filter(t=>{const e=t.replace(/([^a-zA-Z0-9_-])/g,'\\$1');return !t.includes('[')&&!css.includes('.'+e)&&!inl.includes('.'+t)&&!/^(theme-opt|remind-opt|fa-|fas|far|fab|leaflet|ride-|map-|seg|btn|card|status|tab|glass|modal|slide|score|insight|progress|lock|pin|text-accent|bg-accent|border-accent|from-|to-)/.test(t)});
ok(miss.length===0,'Tailwind kapsama '+(miss.join(' ')||'tamam'));
process.exit(process.exitCode||0);
})();

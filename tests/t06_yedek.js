const {JSDOM}=require('jsdom');const http=require('http'),fsx=require('fs'),pth=require('path');
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
const srv=http.createServer((rq,rs)=>{const f=pth.join(require('path').join(__dirname,'..','www'),decodeURIComponent(rq.url.split('?')[0]).replace(/\/$/,'/index.html'));fsx.readFile(f,(e,d)=>{if(e){rs.statusCode=404;rs.end();return}rs.end(d)})}).listen(0);
const mk=async(seed,calls)=>{await new Promise(r=>srv.listening?r():srv.on('listening',r));
 const dom=await JSDOM.fromURL('http://localhost:'+srv.address().port+'/',{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,beforeParse(w){
  w.matchMedia=()=>({matches:false,addListener(){},addEventListener(){}}); w.confirm=m=>{(calls.conf=calls.conf||[]).push(m);return true}; w.alert=()=>{}; w.scrollTo=()=>{};
  w.URL.createObjectURL=()=>'blob:x'; w.URL.revokeObjectURL=()=>{}; w.HTMLCanvasElement.prototype.getContext=()=>null; w.SVGSVGElement.prototype.createSVGRect=function(){return{}};
  w.navigator.geolocation={getCurrentPosition(){},watchPosition:()=>1,clearWatch(){}};
  w.Capacitor={isNativePlatform:()=>true,Plugins:{Filesystem:{writeFile:async o=>{calls.w=o;return{uri:'f://'+o.path}}},Share:{share:async()=>{}}}};
  for(const [k,v] of Object.entries(seed)) w.localStorage.setItem(k,JSON.stringify(v));
 }}); await new Promise(r=>dom.window.addEventListener('load',r)); await new Promise(r=>setTimeout(r,800)); return dom.window};
const day=n=>new Date(Date.now()-n*864e5).toISOString();
(async()=>{
 const rides=[{id:'r1',vehicleId:'v1',date:day(1),dist:10000,time:1200,avg:30,max:80,pts:[[41,29],[41.01,29.01]]},{id:'r2',vehicleId:'v1',date:day(2),dist:20000,time:2400,avg:30,max:90,pts:[[41,29],[41.02,29.02]]}];
 const veh=[{id:'v1',plate:'34 ABC 123',brand:'Honda',model:'CB',km:5000,history:[],fuelLogs:[]}];
 const c1={}; const w1=await mk({garaj_v4:veh,garaj_rides:rides,garaj_parking:{lat:41,lng:29,acc:5,t:Date.now()},garaj_ride_settings:{unit:'mph'}},c1);
 w1.localStorage.setItem('garaj_theme','light'); w1.localStorage.setItem('garaj_pack','neon-mint'); w1.localStorage.setItem('garaj_remind_days','14');
 w1.localStorage.setItem('garaj_ride_draft',JSON.stringify({startedAt:new Date().toISOString(),dist:2500,elapsed:300,maxSpeed:65,pts:[[41,29],[41.001,29.001]],vehicleId:'v1'}));
 w1.localStorage.setItem('garaj_ride_watch_pending',JSON.stringify({id:'pending-1',vehicleId:'v1',date:day(0),dist:2500,time:300,avg:30,max:65,pts:[[41,29],[41.001,29.001]]}));
 await w1.eval('exportData()'); const bundle=JSON.parse(Buffer.from(c1.w.data,'base64').toString('utf8'));
 ok(bundle.app==='garajim'&&bundle.version===3&&bundle.vehicles.length===1&&bundle.rides.length===2&&bundle.parking&&bundle.rideSettings.unit==='mph','yedek v3: araçlar + sürüşler + park + ayarlar');
 ok(bundle.preferences.theme==='light'&&bundle.preferences.pack==='neon-mint'&&bundle.preferences.remindDays===14,'güvenli tercihler yedekte (PIN/API anahtarı değil)');
 ok(bundle.rideDraft&&bundle.rideDraft.startedAt&&bundle.rideDraft.pts.length===2,'kurtarılabilir yarım sürüş taslağı yedekte');
 ok(bundle.pendingRide&&bundle.pendingRide.id==='pending-1','bekleyen sürüş özeti yedekte');
 // yeni (boş) cihaza geri yükleme
 const c2={}; const w2=await mk({},c2);
 const load=(w,obj)=>{const f=new w.File([JSON.stringify(obj)],'y.json'); const inp={target:{files:[f],value:''}}; w.importData(inp); return new Promise(r=>setTimeout(r,300))};
 await load(w2,bundle); const got=JSON.parse(w2.localStorage.getItem('garaj_rides')||'[]');
 ok(got.length===2&&got[0].id==='r1'&&got[0].pts.length===2,'boş cihaza geri yüklemede sürüşler ve rotaları geldi');
 ok(/1 araç ve 2 sürüş/.test(c2.conf[0]||''),'onay penceresi sürüş sayısını söylüyor');
 ok(!!JSON.parse(w2.localStorage.getItem('garaj_parking')||'null')&&JSON.parse(w2.localStorage.getItem('garaj_ride_settings')).unit==='mph','park yeri ve sürüş ayarı da geldi');
 ok(JSON.parse(w2.localStorage.getItem('garaj_ride_draft')||'null')?.pts?.length===2,'yarım sürüş taslağı geri yüklendi');
 ok(JSON.parse(w2.localStorage.getItem('garaj_ride_watch_pending')||'null')?.id==='pending-1','bekleyen sürüş özeti geri yüklendi');
 ok(w2.localStorage.getItem('garaj_theme')==='light'&&w2.localStorage.getItem('garaj_pack')==='neon-mint'&&w2.localStorage.getItem('garaj_remind_days')==='14','boş cihazda güvenli tercihler geri yüklendi');
 // mevcut sürüşler silinmesin: cihazda r3 var, yedekte r1,r2
 const c3={}; const w3=await mk({garaj_v4:veh,garaj_rides:[{id:'r3',vehicleId:'v1',date:day(0),dist:5000,time:600,avg:30,max:60,pts:[]}]},c3);
 await load(w3,bundle); const g3=JSON.parse(w3.localStorage.getItem('garaj_rides')).map(r=>r.id).sort();
 ok(JSON.stringify(g3)==='["r1","r2","r3"]','cihazdaki sürüş (r3) silinmedi, yedektekilerle birleşti');
 await load(w3,bundle); ok(JSON.parse(w3.localStorage.getItem('garaj_rides')).length===3,'aynı yedeği tekrar yüklemek çift kayıt üretmedi');
 // eski biçim (sadece araç dizisi) hâlâ açılıyor ve sürüşlere dokunmuyor
 await load(w3,veh); ok(JSON.parse(w3.localStorage.getItem('garaj_rides')).length===3,'eski yedek biçimi açıldı, sürüşler korundu');
 // Eski sürüm bundle v2 de içe aktarılabilmeli.
 const oldV2={app:'garajim',version:2,vehicles:veh,rides:[{id:'r-v2',vehicleId:'v1',date:day(4),dist:1000,time:100,avg:36,max:50,pts:[]}],parking:null,rideSettings:{unit:'kmh'}};
 await load(w3,oldV2); ok(JSON.parse(w3.localStorage.getItem('garaj_rides')).some(r=>r.id==='r-v2'),'eski yedek v2 geriye dönük uyumlu');
 // 40 sınırı
 const many=Array.from({length:60},(_,i)=>({id:'m'+i,vehicleId:'v1',date:day(i+3),dist:1000,time:100,avg:30,max:50,pts:[]}));
 const c4={}; const w4=await mk({garaj_v4:veh,garaj_rides:many},c4); w4.eval("ride.pendingSummary={id:'new',vehicleId:'v1',date:new Date().toISOString(),dist:2000,time:200,avg:36,max:60,pts:[]}; rideKeepSummary()");
 ok(JSON.parse(w4.localStorage.getItem('garaj_rides')).length===61,'61. sürüş kaydedilince eskiler silinmedi (eski sınır 40)');
 // tasarım katmanı
 const css=w4.document.querySelector('style').textContent; ok(css.includes('PREMIUM KATMAN')&&css.includes('#bottomNav'),'premium CSS katmanı yüklendi');
 process.exit(process.exitCode||0);
})();

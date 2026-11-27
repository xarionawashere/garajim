const {JSDOM}=require('jsdom');const path=require('path');const fsx=require('fs');
let errors=[], fetched=[];
const cacheStore=new Map();
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
(async()=>{
const http=require('http'),fsx=require('fs'),pth=require('path');
const srv=http.createServer((rq,rs)=>{const f=pth.join(require('path').join(__dirname,'..','www'),decodeURIComponent(rq.url.split('?')[0]).replace(/\/$/,'/index.html'));fsx.readFile(f,(e,d)=>{if(e){rs.statusCode=404;rs.end();return}rs.end(d)})}).listen(0);
await new Promise(r=>srv.on('listening',r)); const PORT=srv.address().port;
const dom=await JSDOM.fromURL('http://localhost:'+PORT+'/',{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,
 beforeParse(w){
  w.matchMedia=()=>({matches:false,addListener(){},addEventListener(){}}); w.URL.createObjectURL=()=>'blob:x'; w.URL.revokeObjectURL=()=>{};
  w.confirm=()=>true; w.alert=()=>{}; w.scrollTo=()=>{};
  w.HTMLCanvasElement.prototype.getContext=()=>null; w.SVGSVGElement.prototype.createSVGRect=function(){return {}};
  const fakeCache={match:async u=>cacheStore.get(u)||undefined,put:async(u,r)=>{cacheStore.set(u,r)},keys:async()=>[...cacheStore.keys()],delete:async u=>cacheStore.delete(u)};
  w.caches={open:async()=>fakeCache};
  w.fetch=async u=>{fetched.push(u);return {ok:true,clone(){return this},blob:async()=>new w.Blob(['tile'])}};
  w.navigator.geolocation={getCurrentPosition:(ok_)=>ok_({coords:{latitude:41.0,longitude:29.0,accuracy:9,speed:0,heading:null},timestamp:Date.now()}),watchPosition:()=>1,clearWatch(){}};
  let q=[]; w.GarajimNative={syncWidget:j=>w.__w=j,setReminders(){},consumeAction:()=>q.shift()||''}; w.__q=a=>q.push(a);
  w.localStorage.setItem('garaj_v4',JSON.stringify([{id:'v1',plate:'34 ABC 123',brand:'Honda',model:'CB',km:1700,history:[],
    fuelLogs:[{date:'2026-01-01',km:1000,liters:10,cost:400},{date:'2026-01-10',km:1300,liters:12,cost:500},{date:'2026-01-15',km:1500,liters:5,cost:200,full:false},{date:'2026-01-20',km:1700,liters:9,cost:380}]}]));
  w.addEventListener('error',e=>errors.push(e.message));
 }});
const w=dom.window,ev=s=>w.eval(s);
await new Promise(r=>w.addEventListener('load',r)); await new Promise(r=>setTimeout(r,1500));
ok(errors.length===0,'sayfa hatasız yüklendi '+errors.join('|'));
ok(['Chart','L','jspdf','Tesseract'].every(k=>typeof w[k]!=='undefined'),'yerel kütüphaneler yüklendi: Chart, Leaflet, jsPDF, Tesseract');
ok(typeof w.tileLayerCached==='function','harita katmanı sağlayıcı önbelleğine bağlı');
ok(!/cdn\.|unpkg|cdnjs|googleapis/.test(w.document.documentElement.outerHTML.replace(/https:\/\/(www\.)?(google|router|tile|server|api|generative|calendar)[^"' ]*/g,'')),'sayfada CDN bağlantısı yok');
// OCR yolları
const T=w.TESS_OPTS; ok(T&&/vendor\/tesseract\/worker\.min\.js$/.test(T.workerPath)&&/vendor\/tesseract\/core$/.test(T.corePath)&&/vendor\/tesseract\/lang$/.test(T.langPath),'OCR yolları yerel');
// Yakıt tüketimi
const fs=ev("fuelStats(vehicles[0])");
ok(fs&&Math.abs(fs.last-3.5)<0.01&&Math.abs(fs.prevAvg-4.0)<0.01&&Math.abs(fs.change+12.5)<0.1&&Math.abs(fs.avg-26/700*100)<0.01,'L/100km: son 3.5, önceki 4.0, değişim %-12.5 (kısmi dolum doğru toplandı) '+JSON.stringify(fs&&{l:+fs.last.toFixed(2),a:+fs.avg.toFixed(2),c:+fs.change.toFixed(1)}));
ok(ev("fuelStats({fuelLogs:[{km:100,liters:5}]})")===null,'tek kayıtla tüketim hesaplanmaz');
ok(ev("fuelStats({fuelLogs:[{km:100,liters:5},{km:110,liters:50}]})")===null,'saçma değer (10 km/50 L) elenir');
w.syncNative(); ok(JSON.parse(w.__w).vehicles[0].cons==='3.7','widget\'a tüketim gönderildi: '+JSON.parse(w.__w).vehicles[0].cons);
// detay kartı
w.openDetail('v1'); const html=w.document.getElementById('detailView').innerHTML;
ok(html.includes('L/100 km')&&html.includes('-13%')||html.includes('-12%'),'detay ekranında tüketim kartı');
ok(!!w.document.getElementById('fuelFull'),'"Depoyu doldurdum" kutusu var');
// kısmi dolum kaydı
w.eval("currentId='v1'"); w.openFuelModal(); w.document.getElementById('fuelFull').checked=false; w.document.getElementById('fuelKm').value='1800'; w.document.getElementById('fuelLiters').value='4'; w.document.getElementById('fuelCost').value='160'; w.saveFuel();
ok(ev("vehicles[0].fuelLogs[vehicles[0].fuelLogs.length-1].full")===false,'kısmi dolum full:false kaydedildi');
// tavsiye (tüketim %25 artışı)
ev("vehicles[0].fuelLogs=[{km:1000,liters:10},{km:1300,liters:12},{km:1600,liters:12},{km:1900,liters:16}]");
ok(ev("buildAssistantTips().some(t=>t.icon==='fa-gas-pump')"),'tüketim artışında asistan uyarısı');
// Park
ok(ev("parkGet()")===null,'başlangıçta park yok'); w.showTab('ride'); w.parkSave(); await new Promise(r=>setTimeout(r,50));
const pk=ev("parkGet()"); ok(pk&&pk.lat===41&&pk.lng===29,'park yeri kaydedildi');
ok(!w.document.getElementById('parkModal').classList.contains('hidden')&&w.document.getElementById('parkBody').textContent.includes('Yön tarifi'),'park penceresi açıldı');
ok(/az önce/.test(w.document.getElementById('parkBody').textContent),'park zamanı gösterildi');
ev("ride.marker={getLatLng:()=>({lat:41.003,lng:29.0})}"); w.parkOpen(); ok(/\d+ m/.test(w.document.getElementById('parkBody').textContent)&&/güney/.test(w.document.getElementById('parkBody').textContent),'mesafe ve yön: '+w.document.getElementById('parkBody').textContent.slice(0,40));
let ext=null; w.open=u=>{ext=u}; w.parkNavigate(); ok(/destination=41,29&travelmode=walking/.test(ext||''),'yön tarifi bağlantısı');
w.parkDelete(); ok(ev("parkGet()")===null,'park silindi');
// widget park eylemi
w.__q('park'); w.garajimCheckAction(); await new Promise(r=>setTimeout(r,50)); ok(ev("parkGet()")!==null,'widget 🅿 tuşu park yerini kaydetti');
// harita önbelleği
ok(!/tileFetchStore|tileFromCache|TileLayer\.Cached/.test(fsx.readFileSync(path.join(__dirname,'..','index.html'),'utf8')),'uygulama OSM karesi için toplu özel önbellek indirmesi yapmıyor');
w.__rm=ev('ride.map'); fetched.length=0; ev("ride.map={getBounds:()=>({getWest:()=>28.99,getEast:()=>29.0,getNorth:()=>41.01,getSouth:()=>41.0}),getZoom:()=>15,__base:{_url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png'}}");
await ev("rideSaveOfflineArea()"); ok(fetched.length===0,'OSM toplu çevrimdışı karo indirmesi devre dışı; rota için internet gerekir');
ev('ride.map=__rm');
// Tailwind kapsama
w.eval("vehicles=[{id:'v1',plate:'34 ABC 123',brand:'Honda',model:'CB',km:1700,history:[{date:'2026-01-02',km:1000,desc:'x',cost:100,cat:'bakim'}],fuelLogs:[]}]"); w.showTab('garage'); w.openDetail('v1'); w.showTab('ride'); w.showTab('assistant'); w.showTab('social'); w.showTab('garage');
const css=require('fs').readFileSync(require('path').join(__dirname,'..','www','vendor','tailwind.css'),'utf8'), inline=w.document.querySelector('style').textContent;
const toks=new Set(); w.document.querySelectorAll('[class]').forEach(e=>(e.getAttribute('class')||'').split(/\s+/).filter(Boolean).forEach(t=>toks.add(t)));
const miss=[...toks].filter(t=>{const e=t.replace(/([^a-zA-Z0-9_-])/g,'\\$1'); return !css.includes('.'+e)&&!inline.includes('.'+t)&&!/\[|^(theme-opt|remind-opt|fa-|fas|far|fab|leaflet|ride-|map-|post-|seg|btn|card|status|tab|glass|modal|slide|score|insight|progress|lock|pin|on-photo|shake|text-accent|bg-accent|border-accent|from-|to-)/.test(t)});
console.log('DOM sınıfı:',toks.size,'· CSS karşılığı olmayan (özel olmayan):',miss.length?miss.join(' '):'yok');
ok(miss.length===0,'tüm Tailwind sınıfları derlenmiş CSS\'te');
process.exit(process.exitCode||0);
})();

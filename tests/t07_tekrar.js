const {JSDOM}=require('jsdom');const http=require('http'),fsx=require('fs'),pth=require('path');
let errors=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
const srv=http.createServer((rq,rs)=>{const f=pth.join(require('path').join(__dirname,'..','www'),decodeURIComponent(rq.url.split('?')[0]).replace(/\/$/,'/index.html'));fsx.readFile(f,(e,d)=>{if(e){rs.statusCode=404;rs.end();return}rs.end(d)})}).listen(0);
(async()=>{await new Promise(r=>srv.on('listening',r));
const pts=[];for(let i=0;i<60;i++)pts.push([41+i*0.001,29+Math.sin(i/6)*0.004]);
const dom=await JSDOM.fromURL('http://localhost:'+srv.address().port+'/',{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,beforeParse(w){
 w.TextEncoder = require('util').TextEncoder; w.TextDecoder = require('util').TextDecoder;
 w.matchMedia=()=>({matches:false,addListener(){},addEventListener(){}}); w.confirm=()=>true; w.alert=()=>{}; w.scrollTo=()=>{};
 w.URL.createObjectURL=()=>'blob:x'; w.URL.revokeObjectURL=()=>{}; w.HTMLCanvasElement.prototype.getContext=()=>null; w.SVGSVGElement.prototype.createSVGRect=function(){return{}};
 w.navigator.geolocation={getCurrentPosition(){},watchPosition:()=>1,clearWatch(){}};
 w.localStorage.setItem('garaj_v4',JSON.stringify([{id:'v1',plate:'34 ABC 123',brand:'Honda',model:'CB',km:5000,history:[],fuelLogs:[]}]));
 w.localStorage.setItem('garaj_rides',JSON.stringify([{id:'r1',vehicleId:'v1',date:new Date().toISOString(),dist:6600,time:900,avg:26,max:61,pts}]));
 w.addEventListener('error',e=>errors.push(e.message));
}});
const w=dom.window,ev=s=>w.eval(s),sleep=ms=>new Promise(r=>setTimeout(r,ms));
await new Promise(r=>w.addEventListener('load',r)); await sleep(900);
ok(errors.length===0,'yüklendi '+errors.join('|'));
w.openDetail('v1'); ok(w.document.getElementById('detailView').innerHTML.includes("openVehicleRidePreview('v1', 0)")&&w.document.getElementById('detailView').innerHTML.includes('<polyline'),'araç detayında sürüş tıklanabilir + minik rota önizlemesi');
w.openVehicleRidePreview('v1',0); await sleep(500);
ok(!w.document.getElementById('rideSummaryModal').classList.contains('hidden')&&!!ev('ride.sumMap'),'sürüşe tıklayınca özet + rota haritası açıldı');
ok(w.document.getElementById('rideSumDist').textContent.includes('6.60')&&!!w.document.getElementById('rideReplayBtn'),'bilgiler ve "Oynat" düğmesi var');
// animasyon
ev("rideReplay(600)"); await sleep(250);
const mid=ev("ride.replayMarker.getLatLng()"); const first=pts[0],last=pts[pts.length-1];
ok(mid.lat>first[0]+0.003&&mid.lat<last[0]-0.003,'animasyon ortasında motor rota üzerinde ilerliyor: lat '+mid.lat.toFixed(4));
ok(ev("ride.replayTrail.getLatLngs().length")>2&&ev("ride.replayTrail.getLatLngs().length")<pts.length,'gidilen kısım çiziliyor ('+ev("ride.replayTrail.getLatLngs().length")+' nokta)');
ok(/\d\.\d\d km \/ 6\.60 km/.test(w.document.getElementById('rideReplayInfo').textContent),'ilerleme sayacı: '+w.document.getElementById('rideReplayInfo').textContent);
ok(w.document.getElementById('rideReplayBtn').style.display==='none','oynarken düğme gizli');
await sleep(700);
const end=ev("ride.replayMarker.getLatLng()"); ok(Math.abs(end.lat-last[0])<1e-6&&Math.abs(end.lng-last[1])<1e-6,'motor rotanın sonunda duruyor');
ok(/Tekrar oynatmak/.test(w.document.getElementById('rideReplayInfo').textContent)&&/Tekrar/.test(w.document.getElementById('rideReplayBtn').innerHTML),'bitince "tekrar" teklifi');
// haritaya tıklayınca yeniden
ev("ride.sumMap.fire('click')"); await sleep(60); ok(ev("!!ride.replayRaf"),'haritaya dokununca animasyon yeniden başladı');
// animasyon sırasında kapatma hata vermemeli
w.rideClosePreview(); await sleep(300); ok(errors.length===0&&ev("ride.replayRaf")===null,'animasyon sırasında kapatmak hata vermedi '+errors.join('|'));
// rota verisi olmayan sürüş
w.eval("ride.pendingSummary={id:'x',date:new Date().toISOString(),dist:0,time:0,avg:0,max:0,pts:[]}"); w.rideReplay(); ok(errors.length===0,'rotasız sürüşte oynat hata vermedi');
process.exit(process.exitCode||0);})();

const {JSDOM}=require('jsdom');const http=require('http'),fsx=require('fs'),pth=require('path');
let errors=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
const srv=http.createServer((rq,rs)=>{const f=pth.join(require('path').join(__dirname,'..','www'),decodeURIComponent(rq.url.split('?')[0]).replace(/\/$/,'/index.html'));fsx.readFile(f,(e,d)=>{if(e){rs.statusCode=404;rs.end();return}rs.end(d)})}).listen(0);
let watchCb=null;
const mk=async(seed)=>{await new Promise(r=>srv.listening?r():srv.on('listening',r));
 const dom=await JSDOM.fromURL('http://localhost:'+srv.address().port+'/',{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,beforeParse(w){
 w.matchMedia=()=>({matches:false,addListener(){},addEventListener(){}}); w.confirm=()=>true; w.alert=()=>{}; w.scrollTo=()=>{};
 w.URL.createObjectURL=()=>'blob:x'; w.URL.revokeObjectURL=()=>{}; w.HTMLCanvasElement.prototype.getContext=()=>null; w.SVGSVGElement.prototype.createSVGRect=function(){return{}};
 const P=(la,lo,sp)=>({coords:{latitude:la,longitude:lo,accuracy:6,speed:sp,heading:null},timestamp:Date.now()});
 w.__P=P; w.navigator.geolocation={getCurrentPosition:ok_=>ok_(P(41,29,0)),watchPosition:cb=>{watchCb=cb;return 1},clearWatch(){}};
 for(const [k,v] of Object.entries(seed||{})) w.localStorage.setItem(k,JSON.stringify(v));
 w.addEventListener('error',e=>errors.push(e.message));}});
 await new Promise(r=>dom.window.addEventListener('load',r)); await new Promise(r=>setTimeout(r,700)); return dom.window};
(async()=>{
 const w=await mk({garaj_v4:[{id:'v1',plate:'34 ABC 123',brand:'Honda',model:'CB',km:5,history:[],fuelLogs:[]}]}); const d=w.document,vis=id=>!d.getElementById(id).classList.contains('hidden'),ev=s=>w.eval(s);
 w.showTab('ride'); await new Promise(r=>setTimeout(r,80));
 ok(vis('ridePanelBody')&&!vis('rideMiniGauge'),'açıkken büyük gösterge, mini daire gizli');
 w.rideToggle(); ok(ev('ride.running'),'sürüş başladı');
 w.rideTogglePanel();
 ok(!vis('ridePanelBody')&&vis('rideMiniGauge'),'gösterge kapanınca küçük daire göründü');
 ok(vis('rideStartBtn')&&vis('rideStopBtn')&&!d.getElementById('ridePanelBody').contains(d.getElementById('rideStartBtn')),'Duraklat/Bitir butonları açıkta');
 let t=Date.now(); watchCb({coords:{latitude:41.001,longitude:29,accuracy:6,speed:25,heading:null},timestamp:t+2000});
 ok(d.getElementById('rideMiniNum').textContent==='90','daire içinde hız görünüyor: '+d.getElementById('rideMiniNum').textContent+' km/sa');
 ok(Math.abs(parseFloat(d.getElementById('rideMiniArc').style.strokeDashoffset)-119.4)<0.2,'yay 90/180 oranında dolu ('+d.getElementById('rideMiniArc').style.strokeDashoffset+')');
 ok(d.getElementById('rideMiniUnit').textContent==='km/sa','birim etiketi');
 watchCb({coords:{latitude:41.003,longitude:29,accuracy:6,speed:42,heading:null},timestamp:t+4000});
 ok(d.getElementById('rideMiniNum').textContent==='151'&&d.getElementById('rideMiniArc').style.stroke==='#ef4444','140 üstünde yay kırmızı: '+d.getElementById('rideMiniNum').textContent);
 ok(vis('rideMiniRec'),'kayıt noktası yanıyor');
 w.rideToggle(); ok(!vis('rideMiniRec'),'duraklatınca kayıt noktası söndü');
 w.rideSetUnit('mph'); ok(d.getElementById('rideMiniUnit').textContent==='mph'&&d.getElementById('rideMiniNum').textContent==='94','mph: 151 km/sa → '+d.getElementById('rideMiniNum').textContent+' mph');
 w.rideSetUnit('kmh');
 d.getElementById('rideMiniGauge').click(); ok(vis('ridePanelBody')&&!vis('rideMiniGauge'),'daireye dokununca büyük gösterge geri açıldı');
 // tercih kalıcı: kapat, sekmeden çık-gel
 w.rideTogglePanel(); w.showTab('garage'); w.showTab('ride'); await new Promise(r=>setTimeout(r,50));
 ok(!vis('ridePanelBody')&&vis('rideMiniGauge'),'tercih hatırlandı: yeniden girince daire modunda');
 // ayarlardaki anahtar
 w.rideToggleHud&&w.rideToggleHud(); ok(errors.length===0,'hata yok '+errors.join('|'));
 process.exit(process.exitCode||0);})();

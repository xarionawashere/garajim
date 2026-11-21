const {JSDOM}=require('jsdom');const http=require('http'),fsx=require('fs'),pth=require('path');
const ROOT=require('path').join(__dirname,'..','www');
let errors=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
const srv=http.createServer((rq,rs)=>{const f=pth.join(ROOT,decodeURIComponent(rq.url.split('?')[0]).replace(/\/$/,'/index.html'));fsx.readFile(f,(e,d)=>{if(e){rs.statusCode=404;rs.end();return}rs.end(d)})}).listen(0);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const mk=async(withBridge,state,calls)=>{await new Promise(r=>srv.listening?r():srv.on('listening',r));
 const dom=await JSDOM.fromURL('http://localhost:'+srv.address().port+'/',{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,beforeParse(w){
 w.matchMedia=()=>({matches:false,addListener(){},addEventListener(){}}); w.confirm=()=>true; w.alert=()=>{}; w.scrollTo=()=>{};
 w.URL.createObjectURL=()=>'blob:x'; w.URL.revokeObjectURL=()=>{}; w.HTMLCanvasElement.prototype.getContext=()=>null; w.SVGSVGElement.prototype.createSVGRect=function(){return{}};
 w.navigator.geolocation={getCurrentPosition:ok_=>ok_({coords:{latitude:41,longitude:29,accuracy:5,speed:0,heading:null},timestamp:Date.now()}),watchPosition:()=>1,clearWatch(){}};
 if(withBridge) w.GarajimNative={syncWidget(){},setReminders(){},consumeAction:()=>'',mediaState:()=>JSON.stringify(state.cur),mediaArt:()=>state.art||'',mediaCmd:c=>calls.push(c),mediaOpenAccess:()=>calls.push('access'),mediaOpenApp:()=>calls.push('app')};
 w.localStorage.setItem('garaj_v4',JSON.stringify([{id:'v1',plate:'34 ABC 123',brand:'Honda',model:'CB',km:5,history:[],fuelLogs:[]}]));
 w.addEventListener('error',e=>errors.push(e.message));}});
 await new Promise(r=>dom.window.addEventListener('load',r)); await sleep(600); return dom.window};
(async()=>{
// 1) tarayıcıda (köprü yok) müzik düğmesi görünmez
let calls=[],state={cur:{access:false,session:false}};
let w=await mk(false,state,calls),d=w.document,vis=id=>!d.getElementById(id).classList.contains('hidden');
w.showTab('ride'); await sleep(80); ok(!vis('musOrb'),'köprü yoksa (tarayıcı) müzik düğmesi gizli — ekran kalabalıklaşmaz');
// 2) APK, izin yok
w=await mk(true,state,calls); d=w.document; w.showTab('ride'); await sleep(120);
ok(vis('musOrb')&&!vis('musCard'),'APK: yalnızca küçük müzik düğmesi görünür, kart kapalı');
const card=d.getElementById('musCard'); ok(card.nextElementSibling.contains(d.getElementById('musOrb')),'kart, düğmenin üstünde (panel akışında), diğer öğelerle çakışmıyor');
w.musToggleCard(); ok(vis('musCard')&&d.getElementById('musTitle').textContent==='Müzik kontrolü'&&vis('musNote'),'izin yokken kart: açıklama + "Bildirim erişimi ver"');
w.musCmd('next'); w.musCmd('prev'); w.musCmd('toggle'); ok(calls.join()==='next,prev,toggle','izin olmadan da prev/play/next çalışır (medya tuşu)');
w.musAccess(); ok(calls.includes('access'),'izin ekranı açıldı');
// 3) izin var, çalmıyor
state.cur={access:true,session:false}; w.musPoll(); ok(d.getElementById('musTitle').textContent==='Çalan müzik yok'&&!vis('musNote'),'izin var, müzik yok → "Çalan müzik yok"');
w.musApp(); ok(calls.includes('app'),'kapağa dokununca müzik uygulaması açılır');
// 4) Spotify çalıyor
state.art='QUJD'; state.cur={access:true,session:true,app:'Spotify',title:'Yaz Gülü',artist:'Sezen Aksu',playing:true,pos:60000,dur:240000,key:'Yaz Gülü|Sezen Aksu'};
w.musClose(); w.musPoll();
ok(d.getElementById('musTitle').textContent==='Yaz Gülü'&&d.getElementById('musArtist').textContent==='Sezen Aksu','şarkı adı ve sanatçı görünüyor');
ok(parseFloat(d.getElementById('musBar').style.width)===25,'ilerleme çubuğu 60/240 sn = %25');
ok(/base64,QUJD/.test(d.getElementById('musOrb').style.backgroundImage)&&!vis('musOrbRing')===false,'düğme albüm kapağına döndü ve çalarken halka yanıyor');
ok(vis('musCard')&&w.eval('mus.peek')===true,'şarkı değişince kart kısa süre kendiliğinden açıldı');
ok(d.getElementById('musPlay').innerHTML.includes('fa-pause'),'çalarken duraklat simgesi');
w.eval('mus.openAt=Date.now()-5000'); w.musPoll(); ok(!vis('musCard'),'4,5 sn sonra kart kendiliğinden kapandı (ekran temiz kalır)');
w.musToggleCard(); w.eval('mus.openAt=Date.now()-5000'); w.musPoll(); ok(vis('musCard'),'elle açılan kart 9 sn açık kalır');
w.musCmd('toggle'); ok(d.getElementById('musPlay').innerHTML.includes('fa-play'),'duraklatma tuşu anında simgeyi çevirir');
state.cur=Object.assign({},state.cur,{title:'Kalbim Dörtnala',key:'Kalbim Dörtnala|Sezen Aksu',playing:true}); w.musClose(); w.musPoll(); ok(vis('musCard')&&d.getElementById('musTitle').textContent==='Kalbim Dörtnala','sonraki şarkıda yine kısa süre görünür');
// 5) ayar kapatılırsa
w.rideToggleMusic(); ok(!vis('musOrb')&&!vis('musCard')&&w.eval('mus.timer')===null,'ayarda kapatılınca düğme gizlenir, sorgulama durur');
w.rideToggleMusic(); ok(vis('musOrb')&&w.eval('mus.timer')!==null,'tekrar açılınca geri gelir');
// 6) sekmeden çıkınca
w.musToggleCard(); w.showTab('garage'); ok(w.eval('mus.timer')===null&&!vis('musCard'),'sürüş ekranından çıkınca sorgulama durur, kart kapanır');
ok(errors.length===0,'sayfa hatası yok '+errors.join('|'));
process.exit(process.exitCode||0);})();

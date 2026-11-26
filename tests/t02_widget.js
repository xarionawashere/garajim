const {JSDOM}=require('jsdom');const fs=require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const { readIndexWithAppSource } = require('./helpers/read-app-source');
const html = readIndexWithAppSource(root);
let errors=[];
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://localhost/',beforeParse(w){
 const c=()=>new Proxy(function(){},{get:(t,k)=>k==='then'?undefined:c(),apply:()=>c()});
 w.L={map:c,tileLayer:c,polyline:c,marker:c,divIcon:c}; w.Chart=function(){this.destroy=()=>{}}; w.Chart.register=()=>{}; w.matchMedia=()=>({matches:false,addListener(){},addEventListener(){}});
 w.URL.createObjectURL=()=>'x'; w.confirm=()=>true; w.alert=()=>{}; w.scrollTo=()=>{};
 w.addEventListener('error',e=>errors.push(e.message));
 let q=['fuel']; w.GarajimNative={syncWidget(){},setReminders(){},consumeAction:()=>q.shift()||''}; w.__q=a=>q.push(a);
 w.localStorage.setItem('garaj_v4',JSON.stringify([{id:'v1',plate:'34 ABC 123',brand:'Honda',model:'CB',km:12500,history:[],fuelLogs:[]}]));
}});
const w=dom.window,ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
const vis=id=>!w.document.getElementById(id).classList.contains('hidden');
(async()=>{
 await new Promise(r=>setTimeout(r,1000));
 ok(errors.length===0,'yüklendi '+errors.join('|'));
 ok(vis('fuelModal')&&w.eval('currentId')==='v1','soğuk açılış: Yakıt düğmesi -> yakıt penceresi açıldı');
 w.document.getElementById('fuelModal').classList.add('hidden');
 for(const [a,id] of [['km','kmModal'],['service','serviceModal']]){ w.__q(a); w.garajimCheckAction(); ok(vis(id),a+' -> '+id+' açıldı'); w.document.getElementById(id).classList.add('hidden'); }
 w.__q('ride'); w.garajimCheckAction(); ok(vis('rideView'),'ride -> Açık Dünya sekmesi');
 w.__q('alerts'); w.garajimCheckAction(); ok(vis('notifPanel'),'alerts -> bildirim paneli');
 // PIN kilidi açıkken bekle
 w.showTab('garage'); w.document.getElementById('notifPanel').classList.add('hidden'); w.showLock('unlock'); w.__q('fuel'); w.garajimCheckAction();
 ok(!vis('fuelModal'),'kilit açıkken pencere açılmadı'); w.hideLock(); await new Promise(r=>setTimeout(r,700));
 ok(vis('fuelModal'),'kilit açılınca yakıt penceresi geldi');
 // araç yokken
 w.eval("vehicles=[]"); w.document.getElementById('fuelModal').classList.add('hidden'); w.__q('km'); w.garajimCheckAction();
 ok(vis('formModal'),'araç yoksa araç ekleme ekranı açıldı');
 process.exit(process.exitCode||0);
})();

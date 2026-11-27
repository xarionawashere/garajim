// Garajım 1.4.7: sakin tema katalogu + ilk çizim + telefon/Wear OS eşlemesi.
const fs = require('fs');
const path = require('path');
const htmlPath = process.argv[2] || path.join(__dirname, '..', 'index.html');
const root = path.dirname(htmlPath);
const { readIndexWithAppSource } = require('./helpers/read-app-source');
const html = readIndexWithAppSource(root);
const wearPath = path.join(root, 'native-wear', 'src', 'main', 'java', 'com', 'garajim', 'wear', 'WearMainActivity.java');
const wear = fs.readFileSync(wearPath, 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const gradle = fs.readFileSync(path.join(root, 'native-wear', 'build.gradle'), 'utf8');
const ok = (condition, message) => { console.log((condition ? 'PASS ' : 'FAIL ') + message); if (!condition) process.exitCode = 1; };

const start = html.indexOf('const THEME_PACKS = [');
const end = html.indexOf('\n  ];', start);
const block = start >= 0 && end > start ? html.slice(start, end) : '';
const ids = Array.from(block.matchAll(/id:\s*'([^']+)'/g), m => m[1]);
const unique = new Set(ids);
const added = ['mist-teal','lavender-dusk','slate-blue','soft-sage','warm-sand','dusty-rose','moss-stone','plum-ash','copper-smoke','blue-hour','soft-olive','paper-ink'];
const preload = html.slice(html.indexOf('var packs = {'), html.indexOf('\n      };', html.indexOf('var packs = {')));
const lum = hex => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return NaN;
  const c = [0,2,4].map(i => parseInt(m[1].slice(i, i+2), 16) / 255).map(v => v <= 0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4));
  return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2];
};
const contrast = (a,b) => { const x=lum(a), y=lum(b); return Number.isFinite(x)&&Number.isFinite(y) ? (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05) : NaN; };
const getObj = id => {
  const at = block.indexOf(`id: '${id}'`);
  if (at < 0) return '';
  const next = block.indexOf("\n    {\n      id:", at + 1);
  return block.slice(at, next < 0 ? block.length : next);
};

ok(ids.length === 24 && unique.size === 24, `tema kataloğu 24 benzersiz paket içeriyor (bulunan ${ids.length})`);
ok(added.every(id => ids.includes(id)), '12 yeni sakin tema paketi katalogda bulunuyor');
ok(ids.every(id => preload.includes(`'${id}':`)), 'bütün paketler ilk çizim renk haritasında tanımlı');
ok(added.every(id => new RegExp(`case \\"${id}\\"`).test(wear)), '12 yeni tema Wear OS renk eşlemesinde bulunuyor');
ok(html.includes("typeof N.pushWearTheme === 'function'") && html.includes('N.pushWearTheme(p.id, themePref())'), 'tema seçimi telefondan Wear Data Layer köprüsüne gönderiliyor');
ok(wear.includes('applyPhoneTheme(map.getString("pack", "dark-red")') && wear.includes('PATH_THEME'), 'saat tema paketini telefonun tema mesajından uyguluyor');
ok(wear.includes('b.setTextColor(contrastText(themeAccent))') && wear.includes('private int contrastText(int color)'), 'saatin ana düğmesi vurgu rengine göre okunabilir metin rengi seçiyor');
ok(pkg.version === '1.4.7' && /versionCode\s+1004007/.test(gradle) && /versionName\s+"1\.4\.7"/.test(gradle), 'web ve Wear OS sürümleri 1.4.7 olarak hizalı');

let missingFields = [], poorContrast = [];
for (const id of ids) {
  const obj = getObj(id);
  for (const field of ['name','desc','bg','surface','surface2','card','border','text','muted','accent','accentDark','rgb','input','header','modal','btnText','preview']) {
    if (!new RegExp(`\\b${field}:`).test(obj)) missingFields.push(`${id}.${field}`);
  }
  const bg = (obj.match(/\bbg:\s*'([^']+)'/) || [])[1];
  const fg = (obj.match(/\btext:\s*'([^']+)'/) || [])[1];
  const muted = (obj.match(/\bmuted:\s*'([^']+)'/) || [])[1];
  if (contrast(bg, fg) < 4.5 || contrast(bg, muted) < 3) poorContrast.push(`${id}(metin ${contrast(bg,fg).toFixed(2)}, soluk ${contrast(bg,muted).toFixed(2)})`);
}
ok(missingFields.length === 0, missingFields.length ? 'tema alanları eksik: ' + missingFields.join(', ') : 'her temada tam palet/önizleme alanları var');
ok(poorContrast.length === 0, poorContrast.length ? 'zemin metni kontrast kontrolü sorunlu: ' + poorContrast.join(', ') : 'tüm temalarda metin/zemin kontrastı okunabilirlik eşiklerini karşılıyor');

const softNames = added.map(id => (getObj(id).match(/name:\s*'([^']+)'/) || [])[1]).filter(Boolean);
ok(softNames.length === 12 && !/neon|fluor|electric/i.test(softNames.join(' ')), 'yeni tema adları neon/floresan vurguya dayanmıyor');

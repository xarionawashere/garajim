// Garajım: tüm dış bağımlılıkları (Tailwind, FontAwesome, Chart.js, jsPDF, Leaflet, Tesseract, Inter)
// www/vendor altına gömer ve index.html'i yerel yollara çevirir -> uygulama internetsiz açılır.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const OUT = 'www', V = path.join(OUT, 'vendor');
const nm = p => path.join('node_modules', p);

function copy(src, dst) {
  if (!fs.existsSync(src)) throw new Error('Eksik dosya: ' + src);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}
function copyDir(src, dst, filter) {
  for (const f of fs.readdirSync(src)) if (!filter || filter(f)) copy(path.join(src, f), path.join(dst, f));
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(V, { recursive: true });
// App JavaScript modules are copied alongside www/index.html and loaded as classic scripts.
copyDir(path.join('src', 'js'), path.join(OUT, 'src', 'js'));

// --- JS kütüphaneleri
copy(nm('chart.js/dist/chart.umd.js'), path.join(V, 'chart.umd.min.js'));
copy(nm('jspdf/dist/jspdf.umd.min.js'), path.join(V, 'jspdf.umd.min.js'));
copy(nm('jspdf-autotable/dist/jspdf.plugin.autotable.min.js'), path.join(V, 'jspdf.plugin.autotable.min.js'));

// --- Leaflet (css + görseller)
copy(nm('leaflet/dist/leaflet.js'), path.join(V, 'leaflet/leaflet.js'));
copy(nm('leaflet/dist/leaflet.css'), path.join(V, 'leaflet/leaflet.css'));
copyDir(nm('leaflet/dist/images'), path.join(V, 'leaflet/images'));

// --- Font Awesome (yalnızca woff2)
copy(nm('@fortawesome/fontawesome-free/css/all.min.css'), path.join(V, 'fa/css/all.min.css'));
copyDir(nm('@fortawesome/fontawesome-free/webfonts'), path.join(V, 'fa/webfonts'), f => f.endsWith('.woff2'));

// --- Inter (latin + latin-ext: Türkçe karakterler)
const FD = path.join(V, 'fonts');
let fontCss = '';
const ranges = {
  'latin': 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  'latin-ext': 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'
};
for (const w of [400, 500, 600, 700, 800]) for (const sub of ['latin-ext', 'latin']) {
  const f = `inter-${sub}-${w}-normal.woff2`;
  copy(nm('@fontsource/inter/files/' + f), path.join(FD, f));
  fontCss += `@font-face{font-family:'Inter';font-style:normal;font-display:swap;font-weight:${w};src:url(${f}) format('woff2');unicode-range:${ranges[sub]};}\n`;
}
fs.writeFileSync(path.join(FD, 'inter.css'), fontCss);

// --- Tesseract (OCR): worker + çekirdek (lstm) + Türkçe/İngilizce dil verisi
const T = path.join(V, 'tesseract');
copy(nm('tesseract.js/dist/tesseract.min.js'), path.join(V, 'tesseract.min.js'));
copy(nm('tesseract.js/dist/worker.min.js'), path.join(T, 'worker.min.js'));
for (const f of ['tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js']) copy(nm('tesseract.js-core/' + f), path.join(T, 'core', f));
for (const l of ['tur', 'eng']) copy(nm(`@tesseract.js-data/${l}/4.0.0_best_int/${l}.traineddata.gz`), path.join(T, 'lang', `${l}.traineddata.gz`));

// --- Tailwind (CDN yerine derlenmiş CSS)
cp.execSync(`npx tailwindcss -c tailwind.config.js -i tw-input.css -o ${path.join(V, 'tailwind.css')} --minify`, { stdio: 'inherit' });

// --- index.html -> yerel yollar
let h = fs.readFileSync('index.html', 'utf8');
function sub(from, to) {
  if (!h.includes(from)) throw new Error('index.html içinde bulunamadı: ' + from);
  h = h.replace(from, to);
}
sub('<script src="https://cdn.tailwindcss.com"></script>\n', '');
sub('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css', 'vendor/fa/css/all.min.css');
sub('https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js', 'vendor/chart.umd.min.js');
sub('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'vendor/jspdf.umd.min.js');
sub('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js', 'vendor/jspdf.plugin.autotable.min.js');
sub('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'vendor/leaflet/leaflet.css');
sub('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'vendor/leaflet/leaflet.js');
sub('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js', 'vendor/tesseract.min.js');
sub("@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');", "@import url('vendor/fonts/inter.css');");
// Tesseract yolları (worker içinde çözülebilmesi için mutlak URL)
sub('</head>', `<script>window.TESS_OPTS={workerPath:new URL('vendor/tesseract/worker.min.js',location.href).href,corePath:new URL('vendor/tesseract/core',location.href).href,langPath:new URL('vendor/tesseract/lang',location.href).href};</script>\n<link rel="stylesheet" href="vendor/tailwind.css">\n</head>`);

const left = h.match(/https?:\/\/(cdn\.|unpkg|cdnjs|fonts\.g)[^\s"')]*/g);
if (left) throw new Error('Hâlâ CDN bağlantısı var: ' + [...new Set(left)].join(', '));
fs.writeFileSync(path.join(OUT, 'index.html'), h);

let total = 0; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f), s = fs.statSync(p); s.isDirectory() ? walk(p) : (total += s.size); } })(OUT);
console.log('www hazır: ' + (total / 1048576).toFixed(1) + ' MB');

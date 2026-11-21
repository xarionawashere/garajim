// Garajım otomatik testleri: npm test
// Her test dosyası ayrı süreçte çalışır; hata varsa bir kez daha denenir (zamanlama kaynaklı titremelere karşı).
const { spawnSync } = require('child_process'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
if (!fs.existsSync(path.join(root, 'www', 'index.html'))) {
  console.log('www yok, derleniyor...');
  const b = spawnSync('node', ['build-web.js'], { cwd: root, stdio: 'inherit' });
  if (b.status) process.exit(1);
}
const suites = fs.readdirSync(__dirname).filter(f => /^t\d+.*\.js$/.test(f)).sort();
let failed = 0, total = 0;
function run(f) {
  const r = spawnSync('node', [path.join(__dirname, f), path.join(root, 'index.html')], { cwd: root, encoding: 'utf8', timeout: 240000 });
  const out = (r.stdout || '') + (r.stderr || '');
  const pass = (out.match(/^PASS /gm) || []).length, fail = (out.match(/^FAIL /gm) || []).length;
  return { ok: r.status === 0 && fail === 0 && pass > 0, pass, fail, out };
}
for (const f of suites) {
  let r = run(f);
  if (!r.ok) { console.log('  (' + f + ' ilk denemede başarısız, tekrar deneniyor)'); r = run(f); }
  total += r.pass;
  console.log((r.ok ? 'OK    ' : 'HATA  ') + f + '  PASS=' + r.pass + ' FAIL=' + r.fail);
  if (!r.ok) { failed++; console.log(r.out.split('\n').filter(l => /^FAIL |Error|at /.test(l)).slice(0, 15).join('\n')); }
}
console.log('\nToplam ' + total + ' kontrol, ' + (failed ? failed + ' test dosyası BAŞARISIZ' : 'hepsi geçti'));
process.exit(failed ? 1 : 0);

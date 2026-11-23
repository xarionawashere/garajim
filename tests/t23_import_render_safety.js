// Regression tests for safe HTML rendering of imported/local user data.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.dirname(process.argv[2]);
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
let failures = 0;
function check(ok, name) { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) failures++; }
const a = source.indexOf('  function garajimHtmlEsc(value) {');
const b = source.indexOf('  function openNotifPanel()', a);
let helpers = null;
try {
  if (a < 0 || b < 0) throw new Error('helper functions missing');
  const ctx = {};
  vm.runInNewContext(source.slice(a, b) + '\nglobalThis.__helpers = { esc: garajimHtmlEsc, arg: garajimInlineJsArg, img: garajimSafeImageSrc };', ctx);
  helpers = ctx.__helpers;
} catch (e) { console.error(e.message); }
const payload = `x"); globalThis.compromised = true;// <svg onload='boom'>&`;
if (helpers) {
  const escaped = helpers.esc(`<img src=x onerror='boom'>&"`);
  check(escaped === '&lt;img src=x onerror=&#39;boom&#39;&gt;&amp;&quot;', 'HTML kaçış fonksiyonu ampersand, işaret ve iki tırnak türünü güvenli kaçırır');
  const encodedArg = helpers.arg(payload);
  const decode = x => x.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const sandbox = { compromised: false, capture: value => value };
  let result = null, evalOk = false;
  try { result = vm.runInNewContext('capture(' + decode(encodedArg) + ')', sandbox); evalOk = true; } catch (e) {}
  check(evalOk && result === payload && sandbox.compromised === false, 'Inline JS argümanı kötü niyetli metni dize içinde tutar, komut çalıştırmaz');
  check(helpers.img('javascript:alert(1)') === '' && helpers.img('data:image/svg+xml,<svg onload=alert(1)>') === '', 'Görsel kaynağı javascript ve SVG data URL şemalarını reddeder');
  check(helpers.img('data:image/png;base64,iVBORw0KGgo=') === 'data:image/png;base64,iVBORw0KGgo=' && helpers.img('https://example.com/car.png') === 'https://example.com/car.png', 'PNG data URL ve HTTPS görseli desteklenir');
} else {
  check(false, 'HTML güvenlik yardımcıları yüklenir');
  check(false, 'Inline JS argümanı güvenli kalır');
  check(false, 'Güvensiz görsel URL şemaları reddedilir');
  check(false, 'Güvenli görsel URL şemaları desteklenir');
}
check(/openDetail\(\$\{garajimInlineJsArg\(v\.id\)\}\)/.test(source) && /openDetailFromNotif\(\$\{garajimInlineJsArg\(n\.id\)\}\)/.test(source), 'Araç ve bildirim kimlikleri çift katmanlı HTML/JS güvenli argümanla yazılır');
check(/<p class="text-sm font-semibold truncate">\$\{garajimHtmlEsc\(n\.title\)\}<\/p>/.test(source) && /\$\{garajimHtmlEsc\(n\.body\)\}/.test(source), 'Bildirim başlığı ve gövdesi HTML olarak yorumlanmaz');
check(/\$\{garajimHtmlEsc\(p\.text\)\}/.test(source) && /deletePost\(\$\{postIdArg\}\)/.test(source) && /toggleLike\(\$\{postIdArg\}\)/.test(source), 'Sosyal içerik ve eylem kimlikleri güvenli render edilir');
check(/garajimSafeImageSrc\(v\.photo\)/.test(source) && /garajimSafeImageSrc\(p\.photo\)/.test(source), 'Araç ve sosyal fotoğrafları izin verilen görsel kaynaklarıyla sınırlandırılır');
process.exit(failures ? 1 : 0);

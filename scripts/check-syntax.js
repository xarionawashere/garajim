const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('index.html', 'utf8');
const scripts = [...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
  .filter(([, attrs]) => !/\bsrc\s*=/.test(attrs));
if (!scripts.length) throw new Error('HTML içinde inline JavaScript bulunamadı');
for (let i = 0; i < scripts.length; i++) {
  new vm.Script(scripts[i][2], { filename: `index-inline-${i + 1}.js` });
}
new vm.Script(fs.readFileSync('build-web.js', 'utf8'), { filename: 'build-web.js' });
console.log(`JavaScript sözdizimi başarılı: ${scripts.length} inline blok + build-web.js`);

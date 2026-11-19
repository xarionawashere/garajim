import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function extractFn(src, name) {
  const key = 'function ' + name + '(';
  const i = src.indexOf(key);
  if (i < 0) throw new Error('fonksiyon yok: ' + name);
  let depth = 0, started = false;
  for (let j = src.indexOf('{', i); j < src.length; j++) {
    const c = src[j];
    if (c === '{') { depth++; started = true; }
    else if (c === '}') {
      depth--;
      if (started && depth === 0) return src.slice(i, j + 1);
    }
  }
  throw new Error('kapanmadi: ' + name);
}

const names = [
  'rideHav', 'rideVehicleModeOf', 'rideGhostTimeline', 'rideGhostAt', 'rideGhostGapSec',
  'rideManeuverTr', 'rideNearestOnLine', 'rideOffRouteLimit', 'rideCueMeters', 'rideKarneBits'
];
const sandbox = { Math, Number, isFinite };
vm.runInNewContext(names.map(n => extractFn(html, n)).join('\n') + '\n' + names.map(n => 'this.' + n + '=' + n + ';').join('\n'), sandbox);

test('index.html icindeki scriptler sozdizimi olarak gecerli', () => {
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m, n = 0;
  while ((m = re.exec(html))) { new Function(m[1]); n++; }
  assert.ok(n >= 1);
});

test('arac tipi motor disinda araba moduna duser', () => {
  assert.equal(sandbox.rideVehicleModeOf('motorcycle'), 'moto');
  assert.equal(sandbox.rideVehicleModeOf('car'), 'car');
  assert.equal(sandbox.rideVehicleModeOf('suv'), 'car');
  assert.equal(sandbox.rideVehicleModeOf(undefined), 'car');
});

test('hayalet zaman cizelgesi monoton ve baslangicta sifir', () => {
  const pts = [[41, 29, 1_000], [41.01, 29, 11_000], [41.02, 29.01, 21_000]];
  const tl = sandbox.rideGhostTimeline(pts, 20);
  assert.equal(tl.cumT[0], 0);
  assert.ok(tl.cumT[1] > tl.cumT[0]);
  assert.ok(tl.cumT[2] >= tl.cumT[1]);
  assert.ok(tl.totalD > 100);
});

test('hayalet t=0 baslangic, sonda son nokta', () => {
  const pts = [[41, 29, 0], [41.01, 29, 10_000], [41.02, 29, 20_000]];
  const tl = sandbox.rideGhostTimeline(pts, 20);
  const a = sandbox.rideGhostAt(pts, tl, 0);
  const b = sandbox.rideGhostAt(pts, tl, 999);
  assert.ok(Math.abs(a.lat - 41) < 1e-6);
  assert.equal(b.done, true);
  assert.ok(Math.abs(b.lat - 41.02) < 1e-4);
});

test('hayalet mesafe ondeyse pozitif saniye', () => {
  const ahead = sandbox.rideGhostGapSec(100, 280, 36);
  const behind = sandbox.rideGhostGapSec(400, 100, 36);
  assert.ok(ahead > 0);
  assert.ok(behind < 0);
});

test('manevra turkce', () => {
  assert.equal(sandbox.rideManeuverTr('turn', 'right'), 'sağa dön');
  assert.equal(sandbox.rideManeuverTr('arrive', ''), 'Hedefe vardın');
  assert.equal(sandbox.rideManeuverTr('continue', ''), 'Düz devam');
});

test('en yakin rota noktasi dogru segmentte', () => {
  const line = [[41, 29], [41, 29.01]];
  const mid = sandbox.rideNearestOnLine(41, 29.005, line);
  assert.ok(mid.d < 30);
  const far = sandbox.rideNearestOnLine(41.01, 29.005, line);
  assert.ok(far.d > mid.d);
});

test('motor daha erken uyarir ve daha siki sapma siniri kullanir', () => {
  assert.ok(sandbox.rideCueMeters('moto') > sandbox.rideCueMeters('car'));
  assert.ok(sandbox.rideOffRouteLimit('moto') < sandbox.rideOffRouteLimit('car'));
});

test('karne dna viraj asfalt satiri uretir', () => {
  const k = sandbox.rideKarneBits({ dna: { label: 'Viraj avcısı' }, corners: { n: 4, avg: 80 }, roughHits: 1 });
  assert.equal(k.dna, 'Viraj avcısı');
  assert.match(k.corner, /4 viraj/);
  assert.equal(k.asphalt, 'Asfalt temiz');
  const bad = sandbox.rideKarneBits({ roughHits: 20 });
  assert.match(bad.asphalt, /bozuk/);
});

test('canli ozellikler dosyada bagli', () => {
  for (const s of ['function rideArmLiveGhost', 'function rideBuildRoute', 'function rideKarneBits', 'id="rideNavBanner"', 'id="rideModeChip"', 'Karne']) {
    assert.ok(html.includes(s), s);
  }
  const yml = fs.readFileSync(path.join(root, '.github/workflows/build-apk.yml'), 'utf8');
  assert.match(yml, /node --test tests\/ride-logic\.test\.mjs/);
});

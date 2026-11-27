// Garajım 1.4.7 — Studio: araç profili, tasarım varyantları, parça planı ve yedekleme.
const fs = require('fs');
const path = require('path');
const htmlPath = process.argv[2] || path.join(__dirname, '..', 'index.html');
const root = path.dirname(htmlPath);
const { readIndexWithAppSource } = require('./helpers/read-app-source');
const html = readIndexWithAppSource(root);
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const gradle = fs.readFileSync(path.join(root, 'native-wear', 'build.gradle'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/build-apk.yml'), 'utf8');
let passed = 0, failed = 0;
const ok = (condition, label) => { console.log((condition ? 'PASS ' : 'FAIL ') + label); condition ? passed++ : failed++; };

ok(html.includes('Garajım <span class="text-accent">Studio</span>') && html.includes('>Studio</span>'), 'Asistan navigasyonda Studio olarak sunuluyor');
ok(html.includes('id="studioSetupBrand"') && html.includes('id="studioSetupModel"') && html.includes('function studioCreateProject()'), 'Katalogda olmayan araç için bağımsız profil oluşturulabiliyor');
ok(html.includes('function studioCreateFromGarage(vehicleId)') && html.includes('function studioLinkedVehicle(p)'), 'Mevcut Garajım aracı Studio projesine bağlanabiliyor');
ok(html.includes('const STUDIO_MODEL_CATALOG = {') && html.includes('function studioUpdateModelSuggestions()') && html.includes('studioBrandSuggestions'), 'Yaygın marka/model hızlı kataloğu var; katalog dışı metin de kabul ediliyor');
ok(html.includes('function studioPickSetupPhoto(e)') && html.includes('function studioPickProjectPhoto(e)') && html.includes('compressImage(reader.result, 1000, .68)'), 'Fotoğraf akışı doğrulanıyor ve cihaz içinde sıkıştırılıyor');
ok(html.includes('const STUDIO_COLORS = [') && (html.match(/\{name:'[^']+',hex:'#/g) || []).length >= 8 && html.includes('function studioCarSvg(paint)'), 'Renk laboratuvarında canlı değişen genel SVG otomobil maketi var');
ok(html.includes('function studioSaveVariant()') && html.includes('function studioApplyVariant(id)'), 'Tasarım kombinasyonları kaydedilip tekrar uygulanabiliyor');
ok(html.includes('function studioAddPart()') && html.includes('function studioUpdatePartStatus(id, status)') && html.includes('planned') && html.includes('ordered') && html.includes('installed'), 'Modifikasyon listesi parça ve satın alma/montaj durumunu tutuyor');
ok(html.includes('function studioUpdatePartFitment(id, value)') && html.includes('Doğrulanmadı'), 'Parça uyumluluğu otomatik doğrulanmış gibi gösterilmiyor');
ok(html.includes('function studioAddJournalEntry()') && html.includes('function studioSaveNotes()'), 'Proje günlüğü ve kullanıcı notları saklanıyor');
ok(html.includes("studioProjects: (typeof studioProjectsGet === 'function' ? studioProjectsGet() : [])") && html.includes("raw.studioProjects"), 'Studio projeleri uygulama yedeğine eklenip geri alınabiliyor');
ok(html.includes('function studioExportProject()') && html.includes('function studioShareBuild()'), 'Proje JSON olarak dışa aktarılabiliyor ve özet paylaşımı var');
ok(pkg.version === '1.4.7' && /versionCode\s+1004007/.test(gradle) && /versionName\s+"1\.4\.7"/.test(gradle) && /python3 scripts\/ci-version\.py/.test(workflow) && /major \* 1_000_000 \+ minor \* 1_000 \+ patch/.test(fs.readFileSync(path.join(__dirname, '..', 'scripts/ci-version.py'), 'utf8')), 'Web, telefon ve Wear OS sürümleri ortak kuralla hizalanıyor');
console.log(`\nStudio: ${passed} PASS, ${failed} FAIL`);
process.exit(failed ? 1 : 0);

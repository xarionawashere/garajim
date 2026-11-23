#!/usr/bin/env python3
from pathlib import Path
import shutil

root = Path('.')
app_gradle = root / 'android' / 'app' / 'build.gradle'
if app_gradle.exists():
    t = app_gradle.read_text(encoding='utf-8')
    dep = '    implementation "com.google.android.gms:play-services-wearable:18.1.0"'
    if 'play-services-wearable' not in t:
        if 'dependencies {' in t:
            t = t.replace('dependencies {', 'dependencies {\n' + dep, 1)
        else:
            t += '\n\ndependencies {\n' + dep + '\n}\n'
        app_gradle.write_text(t, encoding='utf-8')
        print('phone wearable dependency added')

src = root / 'native-wear'
dst = root / 'android' / 'wear'
if not src.is_dir():
    print('native-wear missing, skip')
    raise SystemExit(0)

if dst.exists():
    shutil.rmtree(dst)
shutil.copytree(src, dst)
print('copied native-wear -> android/wear')

for name in ('android/settings.gradle', 'android/settings.gradle.kts'):
    p = root / name
    if not p.exists():
        continue
    t = p.read_text(encoding='utf-8')
    print('--- before', name, '---')
    print(t)
    lines = []
    for ln in t.splitlines():
        s = ln.strip()
        if 'wear' in s.lower() and ('include' in s or 'project(' in s):
            continue
        lines.append(ln)
    body = '\n'.join(lines).rstrip() + '\n'
    if name.endswith('.kts'):
        body += '\ninclude(":wear")\n'
        body += 'project(":wear").projectDir = file("wear")\n'
    else:
        body += "\ninclude ':wear'\n"
        body += "project(':wear').projectDir = new File(rootDir, 'wear')\n"
    p.write_text(body, encoding='utf-8')
    print('--- after', name, '---')
    print(body)

print('ci-wear-setup done')

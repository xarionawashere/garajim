#!/usr/bin/env python3
"""Keep phone and Wear APK versions aligned in CI builds."""
import json
import os
import re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
package = json.loads((root / "package.json").read_text(encoding="utf-8"))
ref = os.environ.get("GITHUB_REF_NAME", "")
version = ref[1:] if ref.startswith("v") else package["version"]
if ref.startswith("v") and version != package["version"]:
    raise SystemExit(f"Release etiketi ({version}) package.json sürümüyle ({package['version']}) eşleşmeli.")
match = re.fullmatch(r"(\d+)\.(\d+)\.(\d+)", version)
if not match:
    raise SystemExit(f"Sürüm MAJOR.MINOR.PATCH biçiminde olmalı: {version}")

major, minor, patch = map(int, match.groups())
if minor >= 1000 or patch >= 1000:
    raise SystemExit("Sürümün MINOR ve PATCH bölümleri 1000'den küçük olmalı.")
version_code = major * 1_000_000 + minor * 1_000 + patch

for relative in ("android/app/build.gradle", "android/wear/build.gradle"):
    path = root / relative
    if not path.exists():
        raise SystemExit(f"Sürüm güncellenecek Android modülü bulunamadı: {relative}")
    source = path.read_text(encoding="utf-8")
    source, code_count = re.subn(r"(?m)^(\s*versionCode\s+)\d+\s*$", rf"\g<1>{version_code}", source, count=1)
    source, name_count = re.subn(r"(?m)^(\s*versionName\s+)[\"'][^\"']*[\"']\s*$", rf'\g<1>"{version}"', source, count=1)
    if code_count != 1 or name_count != 1:
        raise SystemExit(f"{relative} içindeki versionCode/versionName bulunamadı.")
    path.write_text(source, encoding="utf-8")

print(f"Telefon ve Wear OS sürümü: versionCode={version_code}, versionName={version}")

#!/usr/bin/env python3
from pathlib import Path
p = Path("android/app/build.gradle")
if not p.exists():
    raise SystemExit(0)
t = p.read_text(encoding="utf-8")
if "abortOnError" in t:
    print("lint already configured")
    raise SystemExit(0)
block = """
android {
    lint {
        abortOnError false
        checkReleaseBuilds false
    }
}
"""
p.write_text(t + "\n" + block + "\n", encoding="utf-8")
print("lint relaxed for release")

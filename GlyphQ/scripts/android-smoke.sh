#!/usr/bin/env bash
# Install the APK on the running emulator, launch it, and fail unless the
# library screen renders. Usage: android-smoke.sh <apk> <output-dir>
set -euo pipefail

apk="$1"
out="$2"
pkg="com.glyphq.app"
mkdir -p "$out"

adb install -r "$apk"
adb logcat -c
adb shell am start -W -n "$pkg/.MainActivity"

# The JS bundle takes a while to start on a software-rendered emulator.
found=0
for _ in $(seq 1 30); do
  sleep 4
  adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1 || continue
  adb pull /sdcard/ui.xml "$out/ui.xml" >/dev/null
  if grep -q 'text="Library"' "$out/ui.xml"; then
    found=1
    break
  fi
done

adb exec-out screencap -p > "$out/launch.png"
adb logcat -d > "$out/logcat.txt"

if [ "$found" -ne 1 ]; then
  echo "The library screen never appeared." >&2
  grep -E "FATAL EXCEPTION|ReactNativeJS|AndroidRuntime" "$out/logcat.txt" | tail -40 >&2 || true
  exit 1
fi

if ! adb shell pidof "$pkg" >/dev/null; then
  echo "The app is not running after launch." >&2
  exit 1
fi

echo "Library screen rendered."

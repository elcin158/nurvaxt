"""Inflate and capture the real widget RemoteViews on a disposable Android emulator."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = "az.nurvaxt.alarm.test"
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--serial", default="emulator-5556")
parser.add_argument("--skip-install", action="store_true")
args = parser.parse_args()
if not args.serial.startswith("emulator-"):
    raise SystemExit("This check only operates on an emulator, never a personal phone.")
sdk = Path(os.environ.get("ANDROID_HOME", Path.home() / "Android/Sdk"))
adb_path = shutil.which("adb") or str(sdk / "platform-tools/adb")


def adb(*command, binary=False, timeout=45):
    return subprocess.check_output(
        [adb_path, "-s", args.serial, *command], text=not binary, timeout=timeout
    )


if adb("shell", "getprop", "ro.kernel.qemu").strip() != "1":
    raise SystemExit("The selected device is not an emulator.")
if not args.skip_install:
    apk = ROOT / "modules/nurvaxt-alarm/android/build/outputs/apk/androidTest/debug/nurvaxt-alarm-debug-androidTest.apk"
    if not apk.is_file():
        raise SystemExit("Build :nurvaxt-alarm:assembleDebugAndroidTest first.")
    print(adb("install", "-r", "-t", str(apk), timeout=60).strip())
result = adb(
    "shell", "am", "instrument", "-w", "-r", "-e", "class",
    "az.nurvaxt.alarm.PrayerWidgetTest",
    f"{PACKAGE}/az.nurvaxt.alarm.CountdownTestRunner", timeout=60,
)
output = ROOT / "docs/widgets"
output.mkdir(parents=True, exist_ok=True)
(output / "instrumentation.txt").write_text(result)
print(result)
if "3 tests, 0 failures" not in result:
    raise SystemExit("Native widget checks failed; see docs/widgets/instrumentation.txt.")
folder = output / "screenshots"
folder.mkdir(exist_ok=True)
files = adb("shell", "run-as", PACKAGE, "ls", "files/widget-previews").splitlines()
for name in files:
    if Path(name).name != name or not name.endswith(".png"):
        continue
    (folder / name).write_bytes(adb("exec-out", "run-as", PACKAGE, "cat", f"files/widget-previews/{name}", binary=True))
(output / "native-result.json").write_text(json.dumps({
    "serial": args.serial,
    "androidApi": adb("shell", "getprop", "ro.build.version.sdk").strip(),
    "instrumentation": "3 tests, 0 failures",
    "captures": sorted(path.name for path in folder.glob("*.png")),
    "scope": "Real parcelled RemoteViews; sample 22 October timetable, normal/narrow sizes, 12/24-hour format, 200% fonts, missing calendar. Launcher lifecycle is checked separately.",
}, ensure_ascii=False, indent=2) + "\n")

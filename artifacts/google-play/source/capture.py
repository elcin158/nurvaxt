"""Legacy raw capture utility. For the new phone campaign use capture-campaign.py.

Legacy group captures go under source/captures/legacy, so they cannot overwrite
the finished marketing PNGs in phone/ or the shipped tablet screenshots.
"""
import argparse
import json
import re
import subprocess
import time
import xml.etree.ElementTree as ET
from pathlib import Path

SERIAL = "emulator-5558"
PACKAGE = "az.nurvaxt.app"
ROOT = Path(__file__).resolve().parents[1]


def adb(*args, timeout=30):
    return subprocess.run(
        ["adb", "-s", SERIAL, *map(str, args)],
        check=True, capture_output=True, timeout=timeout,
    ).stdout


def route(path):
    adb("shell", "am", "start", "-W", "-a", "android.intent.action.VIEW",
        "-d", "nurvaxt:///" + path, "-p", PACKAGE)
    time.sleep(1.5)


def screenshot(name):
    destination = ROOT / name
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(adb("exec-out", "screencap", "-p"))
    print(json.dumps({"saved": str(destination)}))


def demo():
    adb("shell", "am", "broadcast", "-a", "com.android.systemui.demo", "-e", "command", "exit")
    adb("shell", "settings", "put", "global", "sysui_demo_allowed", "1")
    adb("shell", "settings", "put", "system", "time_12_24", "24")
    adb("shell", "cmd", "connectivity", "airplane-mode", "enable")
    for args in [
        ["command", "enter"],
        ["command", "notifications", "visible", "false"],
        ["command", "battery", "level", "100", "plugged", "false"],
        ["command", "clock", "hhmm", adb("shell", "date", "+%H%M").decode().strip()],
    ]:
        intent = ["shell", "am", "broadcast", "-a", "com.android.systemui.demo"]
        for key, value in zip(args[::2], args[1::2]):
            intent += ["-e", key, value]
        adb(*intent)


def tap_text(text):
    adb("shell", "uiautomator", "dump", "/sdcard/nurvaxt-store-ui.xml", timeout=15)
    tree = ET.fromstring(adb("shell", "cat", "/sdcard/nurvaxt-store-ui.xml"))
    candidates = [node for node in tree.iter("node")
                  if node.get("text") == text or node.get("content-desc") == text]
    if not candidates:
        raise RuntimeError(f"Visible control not found: {text}")
    bounds = candidates[-1].get("bounds", "")
    x1, y1, x2, y2 = map(int, re.findall(r"\d+", bounds))
    adb("shell", "input", "tap", (x1 + x2) // 2, (y1 + y2) // 2)
    time.sleep(1)


parser = argparse.ArgumentParser()
parser.add_argument("action", choices=["configure", "route", "shot", "tap", "swipe", "demo", "onboard", "group", "video"])
parser.add_argument("values", nargs="*")
args = parser.parse_args()
if adb("get-serialno").decode().strip() != SERIAL:
    raise RuntimeError("Only the disposable emulator may be controlled.")

if args.action == "configure":
    size, density = args.values
    adb("shell", "wm", "size", size)
    adb("shell", "wm", "density", density)
    time.sleep(2)
    demo()
elif args.action == "route":
    route(args.values[0])
elif args.action == "shot":
    screenshot(args.values[0])
elif args.action == "tap":
    adb("shell", "input", "tap", *args.values)
    time.sleep(1)
elif args.action == "swipe":
    adb("shell", "input", "swipe", *args.values)
    time.sleep(1)
elif args.action == "demo":
    demo()
elif args.action == "onboard":
    for label in ["Davam et", "Davam et", "Hələlik keç", "Başlayaq"]:
        tap_text(label)
    print("Onboarding complete")
elif args.action == "group":
    group = args.values[0]
    if group not in ["phone", "tablet-7", "tablet-10"]:
        raise ValueError("Unknown screenshot group")
    for screen, name in [("", "01-namaz-vaxtlari"), ("calendar", "02-teqvim"),
                         ("qibla", "03-qible"), ("reminders", "04-xatirlatmalar")]:
        route(screen)
        screenshot(f"source/captures/legacy/{group}/{name}.png")
elif args.action == "video":
    route("")
    device_path = "/sdcard/nurvaxt-store-walkthrough.mp4"
    record = subprocess.Popen(
        ["adb", "-s", SERIAL, "shell", "screenrecord", "--bit-rate", "6000000",
         "--time-limit", "30", "--size", "1080x1920", device_path],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    time.sleep(6)
    for path in ["calendar", "qibla", "reminders", ""]:
        route(path)
        time.sleep(4.5)
    record.communicate(timeout=20)
    if record.returncode != 0:
        raise RuntimeError("Screen recording failed")
    destination = ROOT / "nurvaxt-preview-30s.mp4"
    adb("pull", device_path, destination)
    print(json.dumps({"saved": str(destination)}))

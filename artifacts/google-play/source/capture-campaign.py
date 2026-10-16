"""Capture campaign source screens from the disposable NurVaxt_Store emulator.

Requires the release APK to be installed and launched once, and `adb root`.
Never operates on an attached physical device or a personal emulator.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import re
from pathlib import Path
import sqlite3
import subprocess
import tempfile
import time
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'captures' / 'phone'
SERIAL = 'emulator-5558'
PACKAGE = 'az.nurvaxt.app'
FIELDS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
DB = f'/data/user/0/{PACKAGE}/databases/RKStorage'
# 16 October 2026, 14:15 Asia/Baku: a covered date in the bundled official data.
EPOCH = int(datetime(2026, 10, 16, 10, 15, tzinfo=timezone.utc).timestamp())


def adb(*args):
    return subprocess.check_output(['adb', '-s', SERIAL, *map(str, args)], timeout=45)


def check_emulator():
    if adb('shell', 'getprop', 'ro.kernel.qemu').strip() != b'1':
        raise RuntimeError('A disposable emulator is required.')
    if adb('shell', 'getprop', 'ro.boot.qemu.avd_name').strip() != b'NurVaxt_Store':
        raise RuntimeError('Only the dedicated NurVaxt_Store AVD may be used.')


def preferences(theme):
    adb('shell', 'am', 'force-stop', PACKAGE)
    with tempfile.TemporaryDirectory(prefix='nurvaxt-capture-') as folder:
        local = Path(folder) / 'RKStorage'
        adb('pull', DB, local)
        with sqlite3.connect(local) as connection:
            record = connection.execute(
                'SELECT value FROM catalystLocalStorage WHERE key=?',
                ('nurvaxt-preferences',),
            ).fetchone()
            value = json.loads(record[0])
            state = value['state']
            state.update(theme=theme, visibleFields=FIELDS, onboardingComplete=True,
                         locationId='qmi-1', showHijri=False, showKerahat=False)
            state['reminders']['enabled'] = True
            connection.execute('UPDATE catalystLocalStorage SET value=? WHERE key=?',
                               (json.dumps(value), 'nurvaxt-preferences'))
        # Overwrite the existing file, retaining the app's ownership and permissions.
        adb('push', local, '/data/local/tmp/nurvaxt-campaign-preferences.db')
        adb('shell', f'cat /data/local/tmp/nurvaxt-campaign-preferences.db > {DB}')
    adb('shell', 'pm', 'grant', PACKAGE, 'android.permission.POST_NOTIFICATIONS')
    adb('shell', 'appops', 'set', PACKAGE, 'SCHEDULE_EXACT_ALARM', 'allow')


def demo():
    adb('shell', 'settings', 'put', 'global', 'sysui_demo_allowed', '1')
    for values in [
        ['command', 'enter'],
        ['command', 'clock', 'hhmm', '1415'],
        ['command', 'battery', 'level', '100', 'plugged', 'false'],
        ['command', 'notifications', 'visible', 'false'],
        ['command', 'network', 'wifi', 'show', 'level', '4', 'mobile', 'show', 'datatype', 'lte'],
    ]:
        args = ['shell', 'am', 'broadcast', '-a', 'com.android.systemui.demo']
        for key, value in zip(values[::2], values[1::2]):
            args += ['-e', key, value]
        adb(*args)


def route(name):
    adb('shell', 'date', '-u', f'@{EPOCH}')
    adb('shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW',
        '-d', f'nurvaxt:///{name}', '-p', PACKAGE)
    time.sleep(2)


def dump():
    adb('shell', 'rm', '-f', '/sdcard/nurvaxt-campaign.xml')
    result = adb('shell', 'uiautomator', 'dump', '--compressed', '/sdcard/nurvaxt-campaign.xml')
    if b'dumped to' not in result:
        return None  # The live countdown may prevent UIAutomator from reaching idle.
    return adb('shell', 'cat', '/sdcard/nurvaxt-campaign.xml')


def capture(name):
    OUT.mkdir(parents=True, exist_ok=True)
    xml = dump()
    labels = []
    if xml:
        for node in ET.fromstring(xml).iter('node'):
            bounds = list(map(int, re.findall(r'\d+', node.get('bounds', ''))))
            if len(bounds) == 4 and bounds[2] > bounds[0] and bounds[3] > bounds[1]:
                labels.append(node.get('text', ''))
    expected = {'01-namaz-vaxtlari': ['NurVaxt', 'Sübh', 'Zöhr', 'Əsr', 'Məğrib', 'İşa'],
                '02-teqvim': ['Təqvim', 'Oktyabr 2026', 'Sübh'],
                '03-qible': ['Qiblə', 'Kəbəyə məsafə'],
                '04-xatirlatmalar': ['Xatırlatmalar', 'Sübh'],
                '05-tund-gorunus': ['NurVaxt', 'Sübh', 'Zöhr', 'Əsr', 'Məğrib', 'İşa']}
    if xml and any(label not in labels for label in expected[name]):
        raise RuntimeError(f'Expected screen is not ready: {labels}')
    banned = ['İmsak', 'Günçıxma', 'Günbatımı', 'Gecəyarısı']
    if any(any(word in label for word in banned) for label in labels):
        raise RuntimeError(f'Unwanted time remains visible: {labels}')
    if xml:
        (OUT / f'{name}.xml').write_bytes(xml)
    else:
        (OUT / f'{name}.xml').unlink(missing_ok=True)
    (OUT / f'{name}.png').write_bytes(adb('exec-out', 'screencap', '-p'))
    print(json.dumps({'captured': name, 'visibleLabels': labels,
                      'needsVisualReview': not bool(xml)}, ensure_ascii=False))


parser = argparse.ArgumentParser()
parser.add_argument('action', choices=['prepare', 'home', 'calendar', 'qibla', 'reminders', 'dark'])
args = parser.parse_args()
check_emulator()
if args.action == 'prepare':
    adb('shell', 'wm', 'size', '1080x2160')
    adb('shell', 'wm', 'density', '360')
    adb('shell', 'settings', 'put', 'global', 'auto_time', '0')
    adb('shell', 'settings', 'put', 'global', 'auto_time_zone', '0')
    adb('shell', 'setprop', 'persist.sys.timezone', 'Asia/Baku')
    adb('shell', 'settings', 'put', 'system', 'time_12_24', '24')
    preferences('light')
    demo()
elif args.action == 'dark':
    preferences('dark')
    route('')
    capture('05-tund-gorunus')
elif args.action == 'reminders':
    preferences('light')
    route('reminders')
    # Show the actual daily-prayer reminder controls below the optional imsak card.
    # Keep the fixed Xatırlatmalar header visible. No UI content is fabricated.
    adb('shell', 'input', 'swipe', '540', '1900', '540', '720', '1500')
    time.sleep(1)
    capture('04-xatirlatmalar')
else:
    names = {'home': ('', '01-namaz-vaxtlari'), 'calendar': ('calendar', '02-teqvim'),
             'qibla': ('qibla', '03-qible')}
    screen, name = names[args.action]
    if args.action == 'calendar':
        adb('shell', 'wm', 'density', '340')
        time.sleep(1)
    route(screen)
    capture(name)
    if args.action == 'calendar':
        adb('shell', 'wm', 'density', '360')

apk = ROOT.parents[1] / 'nurvaxt-1.0.6-release.apk'
if apk.exists():
    (ROOT / 'capture-metadata.json').write_text(json.dumps({
        'apkSha256': hashlib.sha256(apk.read_bytes()).hexdigest(),
        'source': 'NurVaxt 1.0.6 release APK on a disposable Android 15 emulator',
        'rawSize': [1080, 2160], 'density': {'default': 360, 'calendar': 340}, 'location': 'Bakı',
        'date': '2026-10-16', 'visibleFields': FIELDS,
        'reminders': 'Actual reminder screen scrolled to the daily prayer controls',
    }, indent=2, ensure_ascii=False) + '\n')

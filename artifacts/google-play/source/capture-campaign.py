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
# Covered date in the bundled official data. Only the disposable guest clock changes.
EPOCH = int(datetime(2026, 10, 21, 11, 30, tzinfo=timezone.utc).timestamp())
KERAHAT_EPOCH = int(datetime(2026, 10, 21, 8, 20, tzinfo=timezone.utc).timestamp())
REPO = ROOT.parents[2]


def adb(*args):
    return subprocess.check_output(['adb', '-s', SERIAL, *map(str, args)], timeout=45)


def check_emulator():
    if adb('shell', 'getprop', 'ro.kernel.qemu').strip() != b'1':
        raise RuntimeError('A disposable emulator is required.')
    if adb('shell', 'getprop', 'ro.boot.qemu.avd_name').strip() != b'NurVaxt_Store':
        raise RuntimeError('Only the dedicated NurVaxt_Store AVD may be used.')


def preferences(theme, kerahat=False):
    adb('shell', 'am', 'force-stop', PACKAGE)
    with tempfile.TemporaryDirectory(prefix='nurvaxt-capture-') as folder:
        local = Path(folder) / 'RKStorage'
        adb('pull', DB, local)
        with sqlite3.connect(local) as connection:
            record = connection.execute(
                'SELECT value FROM catalystLocalStorage WHERE key=?',
                ('nurvaxt-preferences',),
            ).fetchone()
            value = json.loads(record[0]) if record else {'state': {
                'locationId': 'qmi-1', 'recentLocations': [], 'theme': 'light',
                'timeFormat': '24', 'showHijri': False, 'hijriAdjustment': 0,
                'visibleFields': FIELDS, 'qiblaSource': 'city', 'onboardingComplete': True,
                'reminders': {'enabled': True, 'atPrayerTime': True, 'ongoingCountdown': True,
                              'offsets': {'imsak': [], **{field: [10] for field in FIELDS}},
                              'kerahatOffsets': [], 'sound': 'melody', 'vibration': True,
                              'quietHours': {'enabled': False, 'start': '23:00', 'end': '05:00'}},
            }, 'version': 1}
            state = value['state']
            state.update(theme=theme, visibleFields=FIELDS, onboardingComplete=True,
                         locationId='qmi-1', showHijri=False, showKerahat=kerahat,
                         timeFormat='24', qiblaSource='city',
                         kerahatDurations={'morning': 45, 'noon': 10, 'evening': 45})
            state['reminders']['enabled'] = True
            state['reminders']['ongoingCountdown'] = True
            connection.execute('INSERT OR REPLACE INTO catalystLocalStorage (value, key) VALUES (?, ?)',
                               (json.dumps(value), 'nurvaxt-preferences'))
        # Overwrite the existing file, retaining the app's ownership and permissions.
        adb('push', local, '/data/local/tmp/nurvaxt-campaign-preferences.db')
        adb('shell', f'cat /data/local/tmp/nurvaxt-campaign-preferences.db > {DB}')
    adb('shell', 'pm', 'grant', PACKAGE, 'android.permission.POST_NOTIFICATIONS')
    adb('shell', 'appops', 'set', PACKAGE, 'SCHEDULE_EXACT_ALARM', 'allow')


def demo(clock='1530'):
    adb('shell', 'settings', 'put', 'global', 'sysui_demo_allowed', '1')
    for values in [
        ['command', 'enter'],
        ['command', 'clock', 'hhmm', clock],
        ['command', 'battery', 'level', '100', 'plugged', 'false'],
        ['command', 'notifications', 'visible', 'false'],
        ['command', 'network', 'wifi', 'show', 'level', '4', 'mobile', 'show', 'datatype', 'lte'],
    ]:
        args = ['shell', 'am', 'broadcast', '-a', 'com.android.systemui.demo']
        for key, value in zip(values[::2], values[1::2]):
            args += ['-e', key, value]
        adb(*args)


def route(name, epoch=EPOCH):
    adb('shell', 'cmd', 'statusbar', 'collapse')
    adb('shell', 'date', '-u', f'@{epoch}')
    adb('shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW',
        '-d', f'nurvaxt:///{name}', '-p', PACKAGE)
    time.sleep(2)


def dump():
    adb('shell', 'rm', '-f', '/sdcard/nurvaxt-campaign.xml')
    try:
        result = subprocess.check_output(
            ['adb', '-s', SERIAL, 'shell', 'uiautomator', 'dump', '--compressed',
             '/sdcard/nurvaxt-campaign.xml'], timeout=15)
    except (subprocess.TimeoutExpired, subprocess.CalledProcessError):
        return None
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
                labels.extend(value for value in [node.get('text', ''), node.get('content-desc', '')] if value)
    expected = {'01-namaz-vaxtlari': ['NurVaxt', 'Sübh', 'Zöhr', 'Əsr', 'Məğrib', 'İşa'],
                '03-qible': ['Qiblə', 'Kəbəyə məsafə'],
                '04-xatirlatmalar': ['Xatırlatmalar', 'Sübh'],
                '05-tund-gorunus': ['NurVaxt', 'Sübh', 'Zöhr', 'Əsr', 'Məğrib', 'İşa'],
                '02-canli-bildiris': ['Əsr'],
                '06-kerahet-vaxtlari': ['Kərahət vaxtları', 'Zəval'],
                '07-kerahet-bildirisi': ['Zöhr', 'Kərahət bitməsinə'],
                '08-kerahet-ayarlari': ['Kərahət vaxtları', 'Zəval', 'Günbatımı']}
    if xml and any(not any(label in visible for visible in labels) for label in expected[name]):
        raise RuntimeError(f'Expected screen is not ready: {labels}')
    banned = ['İmsak', 'Günçıxma', 'Günbatımı', 'Gecəyarısı']
    if name[:2] in ['01', '04', '05'] and any(any(word in label for word in banned) for label in labels):
        raise RuntimeError(f'Unwanted time remains visible: {labels}')
    if xml:
        (OUT / f'{name}.xml').write_bytes(xml)
        for node in ET.fromstring(xml).iter('node'):
            if (node.get('resource-id', '').endswith('/expandableNotificationRow') and
                    any(child.get('resource-id', '').endswith('/countdown_prayer') for child in node.iter('node'))):
                x1, y1, x2, y2 = map(int, re.findall(r'\d+', node.get('bounds', '')))
                (OUT / f'{name}.crop.json').write_text(json.dumps({
                    'left': x1, 'top': y1, 'width': x2 - x1, 'height': y2 - y1,
                }, indent=2) + '\n')
    else:
        (OUT / f'{name}.xml').unlink(missing_ok=True)
    (OUT / f'{name}.png').write_bytes(adb('exec-out', 'screencap', '-p'))
    print(json.dumps({'captured': name, 'visibleLabels': labels,
                      'needsVisualReview': not bool(xml)}, ensure_ascii=False))


def notification(name, kerahat=False):
    preferences('light', kerahat=kerahat)
    adb('shell', 'cmd', 'statusbar', 'collapse')
    adb('shell', 'cmd', 'uimode', 'night', 'no')
    route('', KERAHAT_EPOCH if kerahat else EPOCH)
    # The real release service creates the panel from the verified Bakı timetable.
    time.sleep(4)
    adb('shell', 'am', 'broadcast', '-a', 'com.android.systemui.demo', '-e', 'command', 'exit')
    adb('shell', 'cmd', 'statusbar', 'expand-notifications')
    time.sleep(2)
    xml = dump()
    if xml:
        for node in ET.fromstring(xml).iter('node'):
            if node.get('resource-id', '').endswith('/expand_button'):
                if node.get('content-desc') != 'Expand':
                    break
                bounds = list(map(int, re.findall(r'\d+', node.get('bounds', ''))))
                if len(bounds) == 4:
                    x1, y1, x2, y2 = bounds
                    adb('shell', 'input', 'tap', (x1 + x2) // 2, (y1 + y2) // 2)
                    time.sleep(1)
                    break
    capture(name)


parser = argparse.ArgumentParser()
parser.add_argument('action', choices=['prepare', 'home', 'qibla', 'reminders', 'dark',
                                     'notification', 'kerahat', 'kerahat-notification', 'kerahat-settings'])
parser.add_argument('--apk', type=Path, default=REPO / 'android/app/build/outputs/apk/release/app-release.apk')
args = parser.parse_args()
check_emulator()
if args.action == 'prepare':
    adb('shell', 'wm', 'size', '1080x2160')
    adb('shell', 'wm', 'density', '360')
    adb('shell', 'settings', 'put', 'global', 'auto_time', '0')
    adb('shell', 'settings', 'put', 'global', 'auto_time_zone', '0')
    adb('shell', 'setprop', 'persist.sys.timezone', 'Asia/Baku')
    adb('shell', 'settings', 'put', 'system', 'time_12_24', '24')
    adb('shell', 'settings', 'put', 'system', 'font_scale', '1.0')
    adb('shell', 'settings', 'put', 'system', 'screen_off_timeout', '1800000')
    adb('shell', 'settings', 'put', 'global', 'window_animation_scale', '0')
    adb('shell', 'settings', 'put', 'global', 'transition_animation_scale', '0')
    adb('shell', 'settings', 'put', 'global', 'animator_duration_scale', '0')
    adb('shell', 'cmd', 'connectivity', 'airplane-mode', 'enable')
    adb('shell', 'cmd', 'uimode', 'night', 'no')
    preferences('light')
    demo()
elif args.action == 'dark':
    preferences('dark')
    route('')
    capture('05-tund-gorunus')
elif args.action == 'kerahat':
    preferences('light', kerahat=True)
    demo('1220')
    route('', KERAHAT_EPOCH)
    capture('06-kerahet-vaxtlari')
elif args.action == 'kerahat-settings':
    preferences('light', kerahat=True)
    demo()
    route('settings')
    adb('shell', 'input', 'swipe', '540', '1700', '540', '1110', '800')
    time.sleep(1)
    capture('08-kerahet-ayarlari')
elif args.action in ['notification', 'kerahat-notification']:
    kerahat = args.action == 'kerahat-notification'
    notification('07-kerahet-bildirisi' if kerahat else '02-canli-bildiris', kerahat)
elif args.action == 'reminders':
    preferences('light')
    route('reminders')
    # Show the actual daily-prayer reminder controls below the optional imsak card.
    # Keep the fixed Xatırlatmalar header visible. No UI content is fabricated.
    adb('shell', 'input', 'swipe', '540', '1900', '540', '720', '1500')
    time.sleep(1)
    capture('04-xatirlatmalar')
else:
    names = {'home': ('', '01-namaz-vaxtlari'), 'qibla': ('qibla', '03-qible')}
    screen, name = names[args.action]
    route(screen)
    capture(name)

apk = args.apk.resolve()
if apk.exists():
    package = json.loads((REPO / 'package.json').read_text())
    (ROOT / 'capture-metadata.json').write_text(json.dumps({
        'apkSha256': hashlib.sha256(apk.read_bytes()).hexdigest(),
        'source': f'NurVaxt {package["version"]} current-workspace release APK on a disposable Android 15 emulator',
        'apk': str(apk.relative_to(REPO)), 'version': package['version'],
        'rawSize': [1080, 2160], 'density': 360, 'location': 'Bakı',
        'date': '2026-10-21', 'timezone': 'Asia/Baku', 'visibleFields': FIELDS,
        'clock': {'default': '15:30', 'activeKerahat': '12:20'},
        'kerahat': 'Opt-in enabled for screens 06, 07 and 08; default 45/10/45 minute estimates',
        'notifications': 'Real production package and CountdownService; verified bundled timetable, no synthetic test notification',
        'reminders': 'Actual reminder screen scrolled to the daily prayer controls',
    }, indent=2, ensure_ascii=False) + '\n')

"""Release countdown/prayer-boundary QA. Changes time ONLY on a disposable emulator."""
import argparse
import hashlib
import json
import pathlib
import re
import subprocess
import time
import xml.etree.ElementTree as ET
from datetime import datetime

parser = argparse.ArgumentParser()
parser.add_argument('--serial', default='emulator-5556')
parser.add_argument('--output-dir', default='docs', help='Keep new visual evidence separate from older release QA')
args = parser.parse_args()
if not args.serial.startswith('emulator-'):
    raise SystemExit('This check only operates on an emulator, never a personal device.')
root = pathlib.Path(__file__).resolve().parents[1]
output = root / args.output_dir
shots = output / 'screenshots'
shots.mkdir(parents=True, exist_ok=True)
report = {'serial': args.serial, 'version': json.loads((root / 'package.json').read_text())['version'], 'physicalDeviceTested': False}


def adb(*parts, binary=False):
    return subprocess.check_output(
        ['adb', '-s', args.serial, *parts], text=not binary, timeout=35,
    )


def wait_for(check, description, timeout=25):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        result = check()
        if result:
            return result
        time.sleep(1)
    raise RuntimeError(description)


def tree():
    for _ in range(2):
        result = adb('shell', 'uiautomator', 'dump', '--compressed', '/sdcard/nurvaxt-countdown-qa.xml')
        if 'dumped to:' in result:
            return ET.fromstring(adb('shell', 'cat', '/sdcard/nurvaxt-countdown-qa.xml'))
    raise RuntimeError('UIAutomator did not return a fresh hierarchy')


def press(label, checked=None):
    for _ in range(16):
        nodes = list(tree().iter('node'))
        found = [n for n in nodes if label in (n.get('text'), n.get('content-desc'))]
        found.sort(key=lambda n: n.get('clickable') != 'true')
        if found:
            node = found[0]
            if checked is not None and node.get('checked') == str(checked).lower():
                return
            x1, y1, x2, y2 = map(int, re.findall(r'\d+', node.get('bounds')))
            adb('shell', 'input', 'tap', str((x1 + x2) // 2), str((y1 + y2) // 2))
            time.sleep(1)
            return
        scroll = next((n for n in nodes if n.get('scrollable') == 'true'), None)
        if scroll is not None:
            x1, y1, x2, y2 = map(int, re.findall(r'\d+', scroll.get('bounds')))
            middle = (y1 + y2) // 2
            # Overlapping slow steps avoid flinging past a short switch row.
            adb('shell', 'input', 'swipe', str((x1 + x2) // 2), str(middle + 250),
                str((x1 + x2) // 2), str(middle - 250), '600')
    raise RuntimeError('Control not found: ' + label)


def open_settings():
    adb('shell', 'cmd', 'statusbar', 'collapse')
    adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW',
        '-d', 'nurvaxt://settings', 'az.nurvaxt.app')
    time.sleep(2)
    # Tabs preserve scroll position, including earlier QA visits to the bottom of settings.
    for _ in range(4):
        adb('shell', 'input', 'swipe', '540', '500', '540', '1900', '250')
    time.sleep(1)


def storage(name):
    return {n.get('name'): n.text for n in ET.fromstring(adb(
        'shell', 'cat', f'/data/user/0/az.nurvaxt.app/shared_prefs/{name}.xml',
    ))}


def notifications():
    return adb('shell', 'dumpsys', 'notification', '--noredact')


def countdown():
    dump = notifications()
    # Search active records, never notification-history/archive entries.
    section = re.search(r'(?ms)^  Notification List:\n(.*?)(?=^  \S|\Z)', dump)
    active = section.group(1) if section else ''
    return '\n'.join(part for part in active.split('NotificationRecord(')
                     if 'pkg=az.nurvaxt.app' in part and 'id=7401 ' in part)


def set_time(value):
    timestamp = int(datetime.fromisoformat(value).timestamp() * 1000)
    adb('shell', 'cmd', 'alarm', 'set-time', str(timestamp))


def capture(name):
    (shots / f'android-countdown-{name}.png').write_bytes(adb('exec-out', 'screencap', '-p', binary=True))


def visible_timer():
    return next((n.get('text') for n in tree().iter('node')
                 if n.get('resource-id') == 'az.nurvaxt.app:id/countdown_timer'), None)


adb('root')
adb('wait-for-device')
old_auto = adb('shell', 'settings', 'get', 'global', 'auto_time').strip()
original_time = int(adb('shell', 'date', '+%s').strip()) * 1000
started = time.monotonic()
try:
    adb('shell', 'settings', 'put', 'global', 'auto_time', '0')
    set_time('2026-10-09T11:40:00+04:00')
    adb('shell', 'pm', 'grant', 'az.nurvaxt.app', 'android.permission.POST_NOTIFICATIONS')
    adb('shell', 'appops', 'set', 'az.nurvaxt.app', 'SCHEDULE_EXACT_ALARM', 'allow')
    open_settings()
    press('Bildirişləri aktivləşdir', checked=False)
    wait_for(lambda: not countdown(), 'Could not pause countdown to clear old test alerts')
    adb('shell', 'cmd', 'statusbar', 'expand-notifications')
    time.sleep(1)
    if any('Clear all' in (n.get('text'), n.get('content-desc')) for n in tree().iter('node')):
        press('Clear all')
    adb('shell', 'cmd', 'statusbar', 'collapse')
    open_settings()
    press('Bildirişləri aktivləşdir', checked=True)
    wait_for(lambda: 'Namaza qalan vaxt' in countdown(), 'No initial ongoing countdown')
    saved = storage('nurvaxt-alarm')
    events = json.loads(saved['plan'])
    at_time = [e for e in events if e.get('offset') == 0 and e.get('date') == '2026-10-10']
    assert {e['prayer'] for e in at_time} == {'fajr', 'dhuhr', 'asr', 'maghrib', 'isha'}
    assert len(at_time) == 5
    assert len(json.loads(saved['registered'])) <= 32
    initial = countdown()
    assert 'DecoratedCustomViewStyle' in initial, 'System-decorated countdown layout missing'
    assert 'android.showWhen=Boolean (false)' in initial, 'Duplicate header timer is visible'
    report['atTimeDailyPrayersScheduled'] = True
    report['systemChronometerVerified'] = True
    adb('shell', 'cmd', 'statusbar', 'expand-notifications')
    time.sleep(1)
    first_timer = visible_timer()
    assert first_timer and re.fullmatch(r'\d+:\d{2}(?::\d{2})?', first_timer), first_timer
    time.sleep(2)
    second_timer = visible_timer()
    def timer_seconds(value):
        return sum(int(part) * 60 ** index for index, part in enumerate(reversed(value.split(':'))))
    assert second_timer and timer_seconds(second_timer) < timer_seconds(first_timer), \
        'System-rendered seconds did not count down'
    report['systemChronometerSecondsAdvance'] = True
    capture('normal')
    adb('shell', 'cmd', 'statusbar', 'collapse')

    for stage, value, expected in [
        ('30-minutes', '2026-10-09T11:57:00+04:00', 'Son 30 dəqiqə'),
        ('15-minutes', '2026-10-09T12:12:00+04:00', 'Son 15 dəqiqə'),
    ]:
        set_time(value)
        wait_for(lambda: expected in countdown(), 'Threshold not updated: ' + stage)
        adb('shell', 'cmd', 'statusbar', 'expand-notifications')
        time.sleep(1)
        capture(stage)
        adb('shell', 'cmd', 'statusbar', 'collapse')
        report[stage] = True
        print('Verified ' + stage, flush=True)

    adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW',
        '-d', 'nurvaxt://', 'az.nurvaxt.app')
    time.sleep(2)
    adb('shell', 'input', 'swipe', '540', '400', '540', '1700', '300')
    time.sleep(1)
    capture('home-15-minutes')
    open_settings()

    # Remove the actual app task before the scheduled prayer-time alarm fires.
    adb('shell', 'input', 'keyevent', 'KEYCODE_APP_SWITCH')
    time.sleep(1)
    task = next(n for n in tree().iter('node') if n.get('content-desc') == 'NurVaxt')
    x1, y1, x2, y2 = map(int, re.findall(r'\d+', task.get('bounds')))
    adb('shell', 'input', 'swipe', str((x1 + x2) // 2), str(y2 - 300),
        str((x1 + x2) // 2), str(y1 + 90), '150')
    # Android can retain a removed task in mHiddenTasks; inspect only the recent-task list.
    wait_for(lambda: 'az.nurvaxt.app' not in adb('shell', 'dumpsys', 'activity', 'recents')
             .split('  Recent tasks:', 1)[-1],
             'NurVaxt task remained in recents after swipe')
    assert countdown(), 'Countdown vanished on normal task removal'
    report['ordinaryTaskRemovalCountdownSurvived'] = True
    adb('shell', 'input', 'keyevent', 'KEYCODE_HOME')
    set_time('2026-10-09T12:26:50+04:00')
    wait_for(lambda: '1 dəq.' in countdown(), 'Final minute did not update')
    wait_for(lambda: 'Zöhr namazının vaxtı daxil oldu.' in notifications(),
             'At-time prayer notification was not delivered in the background', timeout=25)
    wait_for(lambda: 'Əsr' in countdown(), 'Countdown did not advance to the next prayer')
    report['backgroundPrayerAtTimeDelivered'] = True
    report['nextPrayerRolloverVerified'] = True
    adb('shell', 'cmd', 'statusbar', 'expand-notifications')
    time.sleep(1)
    capture('prayer-time')
    adb('shell', 'cmd', 'statusbar', 'collapse')

    open_settings()
    press('Daimi vaxt göstəricisi', checked=False)
    wait_for(lambda: not countdown(), 'Countdown notification remained after disable')
    assert json.loads(storage('nurvaxt-alarm')['plan']), 'Countdown toggle canceled prayer alarms'
    report['countdownOffKeepsPrayerAlarms'] = True
    press('Daimi vaxt göstəricisi', checked=True)
    wait_for(lambda: 'Əsr' in countdown(), 'Countdown did not restart after enable')
    adb('shell', 'input', 'keyevent', 'KEYCODE_HOME')
    report['foregroundServiceActiveInBackground'] = 'foregroundId=7401' in adb(
        'shell', 'dumpsys', 'activity', 'services', 'az.nurvaxt.app',
    )
    assert report['foregroundServiceActiveInBackground']
    apk = root / 'android/app/build/outputs/apk/release/app-release.apk'
    report['apkSha256'] = hashlib.sha256(apk.read_bytes()).hexdigest()
    report['testOnlyAdbPermissionGrants'] = True
    report['dozeVerified'] = False
    report['rebootVerified'] = False
    (output / 'android-countdown-result.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2), flush=True)
finally:
    # Restore the disposable emulator clock even on assertion failure.
    adb('shell', 'cmd', 'alarm', 'set-time', str(original_time + int((time.monotonic() - started) * 1000)))
    adb('shell', 'settings', 'put', 'global', 'auto_time', old_auto)

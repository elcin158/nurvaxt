"""Native AlarmManager integration check with test-only emulator permission grants."""
import argparse, subprocess, time, pathlib, xml.etree.ElementTree as ET, json, re
parser=argparse.ArgumentParser()
parser.add_argument('--serial',default='emulator-5556')
parser.add_argument('--skip-install',action='store_true')
parser.add_argument('--from-settings',action='store_true',help='Resume from the already open Ayarlar screen when UIAutomator cannot idle on the live countdown.')
parser.add_argument('--release',action='store_true',help='Test the signed release on a rooted, disposable emulator without Metro.')
args=parser.parse_args()
SERIAL=args.serial
if not SERIAL.startswith('emulator-'):
 raise SystemExit('This test only operates on an emulator, never a personal device.')
ROOT=pathlib.Path(__file__).resolve().parents[1]
def adb(*args,binary=False):
 return subprocess.check_output(['adb','-s',SERIAL,*args],text=not binary,timeout=30)
def tree():
 for _ in range(6):
  try:
   result=adb('shell','uiautomator','dump','/sdcard/nurvaxt-qa.xml')
   if 'dumped to:' not in result:raise RuntimeError('UIAutomator did not observe a fresh window.')
   return ET.fromstring(adb('shell','cat','/sdcard/nurvaxt-qa.xml'))
  except (subprocess.CalledProcessError,ET.ParseError,RuntimeError):time.sleep(1)
 raise RuntimeError('No readable app window')
def press(label,scroll=True,only_enable=False):
 for _ in range(8):
  t=tree()
  found=[n for n in t.iter('node') if label in [n.get('text'),n.get('content-desc')]]
  found.sort(key=lambda n:n.get('clickable')!='true')
  if found:
   if only_enable and found[0].get('checked')=='true':return
   x1,y1,x2,y2=map(int,re.findall(r'\d+',found[0].get('bounds')))
   if y2-y1>40:
    adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2)); return
  if scroll:
   for n in t.iter('node'):
    if n.get('scrollable')=='true':
     x1,y1,x2,y2=map(int,re.findall(r'\d+',n.get('bounds')))
     adb('shell','input','swipe',str((x1+x2)//2),str(y2-150),str((x1+x2)//2),str(y1+150),'400');break
  time.sleep(1)
 raise RuntimeError('Cannot find control '+label)
def plan():
 if args.release:
  contents=adb('shell','cat','/data/user/0/az.nurvaxt.app/shared_prefs/nurvaxt-alarm.xml')
 else:
  contents=adb('shell','run-as','az.nurvaxt.app','cat','shared_prefs/nurvaxt-alarm.xml')
 p=ET.fromstring(contents)
 return {n.get('name'):n.text for n in p}
if not args.skip_install:
 variant='release' if args.release else 'debug'
 adb('install','-r',str(ROOT/f'android/app/build/outputs/apk/{variant}/app-{variant}.apk'))
if args.release:
 adb('root')
 adb('wait-for-device')
else:
 adb('reverse','tcp:8088','tcp:8088')
# Test-only grants on this disposable emulator; permission UX is tracked separately.
adb('shell','pm','grant','az.nurvaxt.app','android.permission.POST_NOTIFICATIONS')
adb('shell','appops','set','az.nurvaxt.app','SCHEDULE_EXACT_ALARM','allow')
print('Test-only notification/exact grants applied.',flush=True)
if not args.from_settings:
 if args.release:
  adb('shell','am','start','-n','az.nurvaxt.app/.MainActivity')
 else:
  adb('shell','am','start','-a','android.intent.action.VIEW','-d','exp+nurvaxt://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8088','az.nurvaxt.app')
 ready=False
 for _ in range(20):
  t=tree();labels=[n.get('text','') for n in t.iter('node')]
  if 'Continue' in labels:press('Continue',False);continue
  if 'Go home' in labels and 'Reload' in labels:adb('shell','input','keyevent','4');continue
  if 'DEVELOPMENT SERVERS' in labels and 'http://localhost:8088' in labels:press('http://localhost:8088',False);continue
  if any('NÖVBƏTİ NAMAZ' in l for l in labels):ready=True;break
  time.sleep(1)
 assert ready,'The development build did not open its home screen. Open Ayarlar and retry with --skip-install --from-settings.'
 press('Ayarlar',False)
press('Bildirişləri aktivləşdir',only_enable=True)
for _ in range(15):
 p=plan();events=json.loads(p.get('plan','[]'));registered=json.loads(p.get('registered','[]'))
 if events:break
 time.sleep(1)
assert events and len(registered)<=32,(events,registered)
assert all(e['locationId']=='qmi-1' and e['id'].startswith('nurvaxt:qmi-1:') for e in events)
assert not p.get('lastError'),p
print(f'Native prayer plan: {len(events)} future events, {len(registered)} registered timestamps.',flush=True)
press('NurVaxt haqqında')
t=tree()
version=next(n for n in t.iter('node') if n.get('content-desc')=='NurVaxt versiyası')
x1,y1,x2,y2=map(int,re.findall(r'\d+',version.get('bounds')))
for _ in range(7):
 adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2));time.sleep(.2)
press('5 saniyə sonra sınaq bildirişi')
for _ in range(20):
 dump=adb('shell','dumpsys','notification','--noredact')
 if 'Sınaq bildirişi. Namaz xatırlatmaları üçün icazə aktivdir.' in dump:break
 time.sleep(1)
else:raise RuntimeError('Native test alarm notification was not presented')
p=plan();assert not any(e['id'].startswith('nurvaxt:test:') for e in json.loads(p['plan'])),p
# Reminders reuse one dismissible card in their own group, outside the ongoing countdown.
# The silent owner still prevents an OEM aggregate from replaying sound on dismissal.
records=[l.strip() for l in dump.splitlines() if 'NotificationRecord' in l and 'az.nurvaxt.app' in l]
reminders=[l for l in records if 'AUTO_CANCEL' in l]
assert len(reminders)==1 and 'id=7404' in reminders[0] and 'groupKey=nurvaxt-reminders' in reminders[0],reminders
assert 'ONLY_ALERT_ONCE' not in reminders[0],reminders
assert any('GROUP_SUMMARY' in l and 'groupKey=nurvaxt-reminders' in l for l in records),records
assert all('groupKey=nurvaxt-countdown' in l for l in records if 'id=7401' in l),records
assert not any('AUTOGROUP_SUMMARY' in l for l in records),records
prefix='android-release' if args.release else 'android'
(ROOT/f'docs/screenshots/{prefix}-notification.png').write_bytes(adb('exec-out','screencap','-p',binary=True))
report={'platform':'Android 15 / API 35 emulator','variant':'release' if args.release else 'debug','serial':SERIAL,'prayerPlanEvents':len(events),'registeredTimestamps':len(registered),'exactAccessGrantedByAdb':True,'notificationPermissionGrantedByAdb':True,'nativeAlarmNotificationDelivered':True,'singleReminderCard':True,'newDeliveriesCanAlert':True,'separateCountdownGroup':True,'appOwnedGroupSummary':True,'consumedTestNotDuplicated':True,'physicalDeviceTested':False,'backgroundProcessDeathVerified':False,'rebootVerified':False}
(ROOT/f'docs/{prefix}-notification-result.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2),flush=True)

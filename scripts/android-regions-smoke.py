"""Read-only database verification and offline cold launch on a disposable emulator.

Open the installed app once to finish package installation before running this check.
No physical device is accepted. The app is force-stopped only on the specified emulator.
"""
import argparse
import hashlib
import json
import pathlib
import sqlite3
import subprocess
import tempfile
import time
from datetime import datetime,timezone
parser=argparse.ArgumentParser()
parser.add_argument('--serial',default='emulator-5556')
args=parser.parse_args()
if not args.serial.startswith('emulator-'):
    raise SystemExit('This check only operates on an emulator, never a personal device.')
root=pathlib.Path(__file__).resolve().parents[1]
version=json.loads((root/'package.json').read_text())['version']
data=json.loads((root/'data/verified/2026.json').read_text())
assert len(data['supportedLocations'])==74 and len(data['records'])==6808
apk=root/f'artifacts/nurvaxt-{version}-release.apk'
def adb(*parts,binary=False):
    return subprocess.check_output(['adb','-s',args.serial,*parts],text=not binary,timeout=35)
adb('root');adb('wait-for-device')
assert 'versionName='+version in adb('shell','dumpsys','package','az.nurvaxt.app')
assert adb('reverse','--list').strip()==''
adb('shell','svc','wifi','disable');adb('shell','svc','data','disable')
adb('shell','am','force-stop','az.nurvaxt.app')
fields=['date','locationId','imsak','fajr','sunrise','dhuhr','asr','sunset','maghrib','isha','midnight','sourceId','sourceVersion','verified']
with tempfile.TemporaryDirectory(prefix='nurvaxt-region-db-') as temporary:
    dbpath=pathlib.Path(temporary)/'prayer-times.db'
    for suffix in ['', '-wal', '-shm']:
        remote='/data/user/0/az.nurvaxt.app/files/SQLite/prayer-times.db'+suffix
        # Main db is required; optional WAL files may disappear after process exit.
        try:contents=adb('exec-out','cat',remote,binary=True)
        except subprocess.CalledProcessError:
            if not suffix:raise
            continue
        (pathlib.Path(str(dbpath)+suffix)).write_bytes(contents)
    db=sqlite3.connect(dbpath)
    assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
    actual=db.execute('SELECT '+','.join(fields)+' FROM prayer_days ORDER BY locationId,date').fetchall()
    expected=sorted([tuple(int(row[field]) if field=='verified' else row[field] for field in fields) for row in data['records']],key=lambda row:(row[1],row[0]))
    assert actual==expected,'Installed SQLite values differ from the reviewed package'
    coverage=dict(db.execute('SELECT locationId,count(*) FROM prayer_days GROUP BY locationId').fetchall())
    assert set(coverage)==set(data['supportedLocations']) and set(coverage.values())=={92}
    metadata=json.loads(db.execute("SELECT value FROM metadata WHERE key='dataset:2026'").fetchone()[0])
    assert metadata['checksum']==data['checksum'] and metadata['version']==data['version']
    db.close()
adb('shell','am','start','-n','az.nurvaxt.app/.MainActivity')
time.sleep(8)
shots=root/'docs/screenshots';shots.mkdir(exist_ok=True)
shot=shots/'android-regions-cold-launch.png'
shot.write_bytes(adb('exec-out','screencap','-p',binary=True))
report={'checkedAt':datetime.now(timezone.utc).isoformat(),'serial':args.serial,'version':version,
    'apkSha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'datasetVersion':data['version'],
    'nativeDatabaseRows':len(actual),'allPublishedTimeCellsMatchBundle':len(actual)*9,
    'verifiedRegions':len(coverage),'dailyRecordsPerRegion':92,'nativeDatabaseIntegrity':'ok',
    'wifiDisabled':True,'mobileDataDisabled':True,'metroRequired':False,'physicalDeviceTested':False,
    'coldLaunchScreenshot':str(shot.relative_to(root)),'coldLaunchVisuallyVerified':False}
(root/'docs/android-regions-result.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))

"""Verify and copy the signed APK without exposing signing passwords."""
import hashlib
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

root = pathlib.Path(__file__).resolve().parents[1]
sdk = pathlib.Path(os.environ.get('ANDROID_HOME', str(pathlib.Path.home() / 'Android/Sdk')))
build_tools = sdk / 'build-tools/36.0.0'
apk = root / 'android/app/build/outputs/apk/release/app-release.apk'
version = json.loads((root / 'package.json').read_text())['version']
build_metadata = json.loads((apk.parent / 'output-metadata.json').read_text())['elements'][0]
version_code = build_metadata['versionCode']
artifact = root / f'artifacts/nurvaxt-{version}-release.apk'
signing = {}
for line in (root / '.signing/keystore.properties').read_text().splitlines():
    if '=' in line and not line.startswith('#'):
        key, value = line.split('=', 1)
        signing[key] = value
environment = os.environ.copy()
environment['NURVAXT_VERIFY_PASSWORD'] = signing['storePassword']
certificate = subprocess.check_output([
    'keytool', '-exportcert', '-keystore', str(root / signing['storeFile']),
    '-alias', signing['keyAlias'], '-storepass:env', 'NURVAXT_VERIFY_PASSWORD',
], env=environment, stderr=subprocess.PIPE)
expected_certificate = hashlib.sha256(certificate).hexdigest()
verification = subprocess.check_output([
    str(build_tools / 'apksigner'), 'verify', '--verbose', '--print-certs', str(apk),
], text=True)
actual_certificate = re.search(r'Signer #1 certificate SHA-256 digest: ([0-9a-f]+)', verification)
assert actual_certificate and actual_certificate.group(1) == expected_certificate, 'Unexpected APK signing identity'
manifest_xml = subprocess.check_output([
    str(sdk / 'cmdline-tools/latest/bin/apkanalyzer'), 'manifest', 'print', str(apk),
], text=True)
manifest = ET.fromstring(manifest_xml)
android = '{http://schemas.android.com/apk/res/android}'
assert manifest.attrib['package'] == 'az.nurvaxt.app'
assert manifest.attrib[android + 'versionName'] == version
assert manifest.attrib[android + 'versionCode'] == str(version_code)
application = manifest.find('application')
assert application is not None
assert application.attrib.get(android + 'debuggable', 'false') == 'false'
permissions = [node.attrib[android + 'name'] for node in manifest.findall('uses-permission')]
blocked = ['SYSTEM_ALERT_WINDOW', 'CAMERA', 'RECORD_AUDIO', 'ACCESS_FINE_LOCATION',
           'ACCESS_BACKGROUND_LOCATION', 'USE_EXACT_ALARM', 'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE']
assert not any('android.permission.' + name in permissions for name in blocked), 'Unexpected release permission'
countdown_resources = json.loads(subprocess.check_output([
    sys.executable, str(root / 'scripts/verify-countdown-resources.py'), str(apk),
], text=True))
with zipfile.ZipFile(apk) as archive:
    bundle = archive.read('assets/index.android.bundle')
    assert len(bundle) > 100_000, 'Missing embedded JavaScript/Hermes bundle'
    abis = sorted({name.split('/')[1] for name in archive.namelist() if name.startswith('lib/')})
    assert abis == ['arm64-v8a', 'armeabi-v7a', 'x86_64'], abis
    # Resource shrinking can rename the packaged path; compare the actual sound bytes.
    tone_hash = hashlib.sha256((root / 'assets/nurvaxt_tone.wav').read_bytes()).hexdigest()
    tone = any(hashlib.sha256(archive.read(name)).hexdigest() == tone_hash
               for name in archive.namelist() if name.endswith('.wav'))
    assert tone, 'Missing bundled reminder tone'
artifact.parent.mkdir(exist_ok=True)
shutil.copyfile(apk, artifact)
report = {
    'checkedAt': datetime.now(timezone.utc).isoformat(),
    'apk': str(artifact.relative_to(root)),
    'version': version, 'versionCode': version_code, 'applicationId': 'az.nurvaxt.app',
    'bytes': artifact.stat().st_size,
    'sha256': hashlib.sha256(artifact.read_bytes()).hexdigest(),
    'certificateSha256': expected_certificate,
    'signatureVerified': True, 'matchesLocalReleaseKey': True, 'debuggable': False,
    'abis': abis, 'embeddedBundleBytes': len(bundle), 'reminderToneBundled': tone,
    'permissions': permissions,
    'countdownResourcesVerified': True,
    'countdownLayouts': countdown_resources['layouts'],
    'datasetVersions': {path.stem: json.loads(path.read_text())['version']
                        for path in sorted((root / 'data/verified').glob('[0-9][0-9][0-9][0-9].json'))},
    'offlineColdLaunchVerified': False,
}
qa_path = root / 'docs/android-release-result.json'
if qa_path.exists():
    qa = json.loads(qa_path.read_text())
    if qa.get('apkSha256') == report['sha256']:
        report['offlineColdLaunchVerified'] = bool(qa.get('coldOfflineRelaunchVerified'))
        report['qaReport'] = str(qa_path.relative_to(root))
regions_qa_path = root / 'docs/android-regions-result.json'
if regions_qa_path.exists():
    regions_qa = json.loads(regions_qa_path.read_text())
    if regions_qa.get('apkSha256') == report['sha256']:
        report['offlineColdLaunchVerified'] = bool(regions_qa.get('coldLaunchVisuallyVerified'))
        report['qaReport'] = str(regions_qa_path.relative_to(root))
        report['nativeDatabaseRowsVerified'] = regions_qa.get('nativeDatabaseRows')
        report['nativeTimeCellsVerified'] = regions_qa.get('allPublishedTimeCellsMatchBundle')
(artifact.parent / f'nurvaxt-{version}-release.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))

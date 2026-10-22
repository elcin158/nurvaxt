"""Validate and copy a Play bundle using Google's bundletool and the existing release key."""
import argparse
import hashlib
import json
import os
import pathlib
import re
import shutil
import struct
import subprocess
import xml.etree.ElementTree as ET
import zipfile
from datetime import datetime, timezone

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--bundletool', required=True, type=pathlib.Path)
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parents[1]
bundle = root / 'android/app/build/outputs/bundle/release/app-release.aab'
version = json.loads((root / 'package.json').read_text())['version']
version_code = int(re.search(r'versionCode:\s*(\d+)', (root / 'app.config.ts').read_text())[1])
artifact = root / f'artifacts/nurvaxt-{version}-v{version_code}.aab'


def bundletool(*command):
    return subprocess.check_output(
        ['java', '-jar', str(args.bundletool.resolve()), *command, f'--bundle={bundle}'],
        text=True,
    )


bundletool('validate')
manifest = ET.fromstring(bundletool('dump', 'manifest', '--module=base'))
android = '{http://schemas.android.com/apk/res/android}'
assert manifest.attrib['package'] == 'az.nurvaxt.app'
assert manifest.attrib[android + 'versionName'] == version
assert manifest.attrib[android + 'versionCode'] == str(version_code)
application = manifest.find('application')
assert application is not None
assert application.attrib.get(android + 'debuggable', 'false') == 'false'
permissions = [node.attrib[android + 'name'] for node in manifest.findall('uses-permission')]
blocked = ['ACTIVITY_RECOGNITION', 'SYSTEM_ALERT_WINDOW', 'CAMERA', 'RECORD_AUDIO',
           'ACCESS_FINE_LOCATION', 'ACCESS_BACKGROUND_LOCATION', 'USE_EXACT_ALARM',
           'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE']
assert not any('android.permission.' + name in permissions for name in blocked)
config = json.loads(bundletool('dump', 'config'))
alignment = config['optimizations']['uncompressNativeLibraries']['alignment']
assert alignment == 'PAGE_ALIGNMENT_16K'

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
actual = subprocess.check_output([
    'keytool', '-J-Duser.language=en', '-printcert', '-jarfile', str(bundle),
], text=True)
digest = re.search(r'SHA256:\s*([0-9A-F:]+)', actual)
assert digest and digest[1].replace(':', '').lower() == expected_certificate
verification = subprocess.check_output([
    'jarsigner', '-J-Duser.language=en', '-verify', str(bundle),
], text=True, stderr=subprocess.STDOUT)
assert 'jar verified.' in verification and 'unsigned entries' not in verification

with zipfile.ZipFile(bundle) as archive:
    assert archive.testzip() is None
    names = archive.namelist()
    js_bytes = len(archive.read('base/assets/index.android.bundle'))
    assert js_bytes > 100_000
    database = archive.read('base/res/raw/data_verified_prayertimes.db')
    assert database == (root / 'data/verified/prayer-times.db').read_bytes()
    abis = sorted({name.split('/')[2] for name in names if name.startswith('base/lib/')})
    # Preserve the CPU coverage of the published v13 bundle, including 32-bit Intel.
    expected_abis = ['arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64']
    assert abis == expected_abis, f'Release ABI coverage changed: expected {expected_abis}, got {abis}'
    machines = {'arm64-v8a': 183, 'armeabi-v7a': 40, 'x86': 3, 'x86_64': 62}
    libraries_per_abi = {abi: 0 for abi in abis}
    for name in names:
        if not name.startswith('base/lib/') or not name.endswith('.so'):
            continue
        abi = name.split('/')[2]
        data = archive.read(name)
        assert data[:4] == b'\x7fELF' and data[5] == 1, name
        assert struct.unpack_from('<H', data, 18)[0] == machines[abi], name
        libraries_per_abi[abi] += 1
    assert all(libraries_per_abi.values()), 'Missing native libraries for a supported ABI'
    native_libraries = []
    for name in names:
        if not name.endswith('.so') or name.split('/')[2] not in ('arm64-v8a', 'x86_64'):
            continue
        data = archive.read(name)
        assert data[:6] == b'\x7fELF\x02\x01', name
        offset = struct.unpack_from('<Q', data, 32)[0]
        entry_size, entries = struct.unpack_from('<HH', data, 54)
        loads = [struct.unpack_from('<IIQQQQQQ', data, offset + index * entry_size)
                 for index in range(entries)]
        loads = [segment for segment in loads if segment[0] == 1]
        assert loads and all(segment[7] >= 16384 for segment in loads), name
        native_libraries.append(name)

artifact.parent.mkdir(exist_ok=True)
shutil.copyfile(bundle, artifact)
report = {
    'checkedAt': datetime.now(timezone.utc).isoformat(),
    'aab': str(artifact.relative_to(root)),
    'applicationId': 'az.nurvaxt.app',
    'version': version,
    'versionCode': version_code,
    'minSdk': int(manifest.find('uses-sdk').attrib[android + 'minSdkVersion']),
    'targetSdk': int(manifest.find('uses-sdk').attrib[android + 'targetSdkVersion']),
    'bytes': artifact.stat().st_size,
    'sha256': hashlib.sha256(artifact.read_bytes()).hexdigest(),
    'certificateSha256': expected_certificate,
    'signatureVerified': True,
    'matchesLocalReleaseKey': True,
    'bundletoolVersion': config['bundletool']['version'],
    'bundletoolValidation': True,
    'debuggable': False,
    'abis': abis,
    'allFourArchitecturesVerified': True,
    'nativeLibrariesPerAbi': libraries_per_abi,
    'embeddedJavaScriptBytes': js_bytes,
    'bundledDatabaseMatchesSource': True,
    'zipAlignment': alignment,
    'native64BitLoadSegments16KbAligned': True,
    'native64BitLibrariesChecked': len(native_libraries),
    'permissions': permissions,
    'playConsoleSubmitted': False,
}
artifact.with_suffix('.validation.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))

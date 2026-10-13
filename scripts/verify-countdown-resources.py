"""Check notification XML in the packaged APK, including optimized resource paths."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import zipfile

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('apk', nargs='?', default=str(root / 'android/app/build/outputs/apk/release/app-release.apk'))
args = parser.parse_args()
apk = Path(args.apk).resolve()
sdk = Path(os.environ.get('ANDROID_HOME', str(Path.home() / 'Android/Sdk')))
aapt = sdk / 'build-tools/36.0.0/aapt2'


def dump(*parts):
    return subprocess.check_output([str(aapt), 'dump', *parts, str(apk)], text=True)


table = dump('resources')
entries = {}
for match in re.finditer(r'^    resource (0x[0-9a-f]+) (\S+)\n(.*?)(?=^    resource |^  type |\Z)', table, re.M | re.S):
    entries[match[2]] = {'id': match[1], 'values': match[3]}
ids = {entry['id'] for entry in entries.values()}
allowed = {'LinearLayout', 'FrameLayout', 'TextView', 'ImageView', 'Chronometer', 'ProgressBar'}
layout_views = {
    'nurvaxt_countdown_compact': ['countdown_prayer', 'countdown_stage', 'countdown_timer'],
    'nurvaxt_countdown_expanded': ['countdown_prayer', 'countdown_time', 'countdown_stage',
                                  'countdown_timer', 'countdown_symbol', 'countdown_progress',
                                  'countdown_kerahat', 'countdown_kerahat_label',
                                  'countdown_kerahat_stage', 'countdown_kerahat_timer'],
}
report = {'apk': str(apk), 'layouts': {}, 'drawables': {}}
with zipfile.ZipFile(apk) as archive:
    for name, views in layout_views.items():
        key = 'layout/' + name
        assert key in entries, f'Missing packaged {key}'
        path = re.search(r'^      \(\) \(file\) (\S+) type=XML$', entries[key]['values'], re.M)
        assert path, f'Missing default configuration for {key}'
        assert path[1] in archive.namelist(), f'Missing XML file for {key}'
        xml = dump('xmltree', '--file', path[1])
        classes = set(re.findall(r'^\s*E: (\S+) \(line=', xml, re.M))
        assert classes <= allowed, f'Unsupported RemoteViews classes in {key}: {classes - allowed}'
        references = set(re.findall(r'@(0x7f[0-9a-f]+)', xml))
        assert references <= ids, f'Unresolvable references in {key}: {references - ids}'
        for view in views:
            assert 'id/' + view in entries, f'Missing view ID {view}'
            assert entries['id/' + view]['id'] in references, f'{view} absent from {key}'
        report['layouts'][name] = {'id': entries[key]['id'], 'packagedXml': path[1], 'viewIdsVerified': views}
    for key in ['drawable/nurvaxt_countdown_app_mark'] + [
        'drawable/nurvaxt_countdown_' + name for name in ['badge', 'circle', 'diamond', 'divider', 'progress']
    ]:
        assert key in entries, f'Missing packaged {key}'
        path = re.search(r'^      \((?:nodpi)?\) \(file\) (\S+) type=(XML|PNG)$', entries[key]['values'], re.M)
        assert path and path[1] in archive.namelist(), f'Missing default drawable for {key}'
        if path[2] == 'XML':
            references = set(re.findall(r'@(0x7f[0-9a-f]+)', dump('xmltree', '--file', path[1])))
            assert references <= ids, f'Unresolvable references in {key}: {references - ids}'
        else:
            assert archive.read(path[1]).startswith(b'\x89PNG\r\n\x1a\n'), f'Invalid PNG in {key}'
        report['drawables'][key] = entries[key]['id']
    for removed in ['drawable/nurvaxt_countdown_clock', 'drawable/nurvaxt_notification_dot']:
        assert removed not in entries, f'Obsolete notification artwork: {removed}'
print(json.dumps(report, indent=2))

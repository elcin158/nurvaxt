"""ADB/UIAutomator smoke test. Operates ONLY on an explicitly selected emulator."""
import argparse, subprocess, time, pathlib, re, xml.etree.ElementTree as ET, json

parser = argparse.ArgumentParser()
parser.add_argument('--serial', default='emulator-5556')
parser.add_argument('--port', default='8088')
parser.add_argument('--skip-install', action='store_true', help='Resume an already installed development build.')
args = parser.parse_args()
if not args.serial.startswith('emulator-'):
    raise SystemExit('This smoke test only operates on an emulator, never a personal device.')
root = pathlib.Path(__file__).resolve().parents[1]
output = root / 'docs' / 'screenshots'
output.mkdir(exist_ok=True)
def adb(*parts, binary=False):
    return subprocess.check_output(['adb','-s',args.serial,*parts], text=not binary, timeout=30)
def hierarchy():
    for _ in range(8):
        try:
            adb('shell','uiautomator','dump','/sdcard/nurvaxt-smoke.xml')
            return ET.fromstring(adb('shell','cat','/sdcard/nurvaxt-smoke.xml'))
        except (subprocess.CalledProcessError, ET.ParseError): time.sleep(1)
    raise RuntimeError('UIAutomator could not read a ready window.')
def tap(label, attempts=12):
    for _ in range(attempts):
        tree = hierarchy()
        for node in tree.iter('node'):
            if label in (node.attrib.get('text',''),node.attrib.get('content-desc','')):
                box = list(map(int,re.findall(r'\d+',node.attrib['bounds'])))
                adb('shell','input','tap',str((box[0]+box[2])//2),str((box[1]+box[3])//2))
                return
        time.sleep(1)
    raise RuntimeError('Expected visible control not found: '+label)
def capture(name):
    image = adb('exec-out','screencap','-p',binary=True)
    (output/(name+'.png')).write_bytes(image)
    xml = adb('shell','uiautomator','dump','/sdcard/nurvaxt-smoke.xml')
    (output/(name+'.xml')).write_text(adb('shell','cat','/sdcard/nurvaxt-smoke.xml'))
    return xml

apk = root/'android/app/build/outputs/apk/debug/app-debug.apk'
if not args.skip_install:
    adb('install','-r',str(apk))
adb('reverse','tcp:'+args.port,'tcp:'+args.port)
adb('shell','am','start','-a','android.intent.action.VIEW','-d',f'exp+nurvaxt://expo-development-client/?url=http%3A%2F%2Flocalhost%3A{args.port}','az.nurvaxt.app')
print('Installed and launched NurVaxt development build. Waiting for the official-data UI.', flush=True)
for _ in range(40):
    tree = hierarchy()
    labels = [n.attrib.get('text','') for n in tree.iter('node')]
    if 'Continue' in labels:
        tap('Continue'); continue
    if 'Go home' in labels and 'Reload' in labels:
        adb('shell','input','keyevent','4'); continue
    if 'Davam et' in labels:
        tap('Davam et'); continue
    if 'Hələlik keç' in labels:
        tap('Hələlik keç'); continue
    if 'Bildirişləri aktivləşdir' in labels:
        # On smaller screens the optional skip action sits below the fold.
        for node in tree.iter('node'):
            if node.attrib.get('scrollable') == 'true':
                x1,y1,x2,y2 = map(int,re.findall(r'\d+',node.attrib['bounds']))
                adb('shell','input','swipe',str((x1+x2)//2),str(y2-100),str((x1+x2)//2),str(y1+100),'400')
                break
        continue
    if 'Başlayaq' in labels:
        tap('Başlayaq'); continue
    if any('NurVaxt' in text for text in labels) and any('NÖVBƏTİ NAMAZ' in text for text in labels): break
    time.sleep(1)
tree = hierarchy()
contents = '\n'.join(n.attrib.get('text','')+' '+n.attrib.get('content-desc','') for n in tree.iter('node'))
assert 'NurVaxt' in contents, contents
assert 'NÖVBƏTİ NAMAZ' in contents, contents
assert 'Məlumat açıla bilmədi' not in contents and 'Təqvim açıla bilmədi' not in contents, contents
assert 'Bu tarix üçün təqvim yoxdur' not in contents, 'Run the smoke test within the bundled verified range, or select a covered date manually.'
capture('android-home')
report = {'platform':'Android emulator','serial':args.serial,'appInstalled':True,'homeOpened':True,'officialDataVisible':True,'physicalDeviceTested':False,'notificationDeliveryVerified':False,'rebootVerified':False}
(root/'docs/android-smoke-result.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))

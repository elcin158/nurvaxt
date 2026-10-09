"""Create a local signing identity once; never overwrite an existing key or print passwords."""
import os
import pathlib
import secrets
import subprocess

root = pathlib.Path(__file__).resolve().parents[1]
folder = root / '.signing'
keystore = folder / 'nurvaxt-release.keystore'
properties = folder / 'keystore.properties'
if keystore.exists() or properties.exists():
    if not (keystore.exists() and properties.exists()):
        raise SystemExit('Incomplete signing files. Restore their matching backup; nothing was overwritten.')
    print('Existing NurVaxt release identity retained.')
    raise SystemExit(0)
folder.mkdir(mode=0o700, exist_ok=True)
password = secrets.token_urlsafe(32)
environment = dict(os.environ, NURVAXT_STORE_PASSWORD=password)
subprocess.run([
    'keytool', '-genkeypair', '-keystore', str(keystore), '-storetype', 'PKCS12',
    '-alias', 'nurvaxt', '-keyalg', 'RSA', '-keysize', '3072', '-validity', '10000',
    '-dname', 'CN=NurVaxt local release, OU=Mobile, O=NurVaxt, C=AZ',
    '-storepass:env', 'NURVAXT_STORE_PASSWORD', '-keypass:env', 'NURVAXT_STORE_PASSWORD',
], env=environment, check=True, stdout=subprocess.DEVNULL)
keystore.chmod(0o600)
properties.write_text(
    'storeFile=.signing/nurvaxt-release.keystore\n'
    'keyAlias=nurvaxt\n'
    f'storePassword={password}\nkeyPassword={password}\n'
)
properties.chmod(0o600)
print('Created local release key and settings under .signing/. Back up both files securely for future updates.')

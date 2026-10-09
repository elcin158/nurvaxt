"""Called only after the TypeScript validator passes. Atomic database publication.

Usage: build_sqlite.py <output.db> <bundle-id> <year.json>...
All verified years go into one read-only database shipped as an app asset.
"""
import json, sqlite3, sys, os
output, bundle, *sources = sys.argv[1:]
temporary = output + '.tmp'
if os.path.exists(temporary): os.unlink(temporary)
db = sqlite3.connect(temporary)
db.execute('PRAGMA journal_mode=DELETE')
fields = ['date','locationId','imsak','fajr','sunrise','dhuhr','asr','sunset','maghrib','isha','midnight','sourceId','sourceVersion','verified']
db.execute('CREATE TABLE prayer_days (date TEXT NOT NULL, locationId TEXT NOT NULL, imsak TEXT, fajr TEXT, sunrise TEXT, dhuhr TEXT, asr TEXT, sunset TEXT, maghrib TEXT, isha TEXT, midnight TEXT, sourceId TEXT NOT NULL, sourceVersion TEXT NOT NULL, verified INTEGER NOT NULL CHECK(verified=1), PRIMARY KEY(locationId,date))')
db.execute('CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL)')
total = 0
for source in sources:
    data = json.load(open(source, encoding='utf8'))
    db.executemany('INSERT INTO prayer_days VALUES ('+','.join('?' for _ in fields)+')', [[row[f] for f in fields] for row in data['records']])
    metadata = {k: v for k, v in data.items() if k != 'records'}
    db.execute('INSERT INTO metadata VALUES (?,?)', ('dataset:'+str(data['year']),json.dumps(metadata,ensure_ascii=False)))
    total += len(data['records'])
db.execute('INSERT INTO metadata VALUES (?,?)', ('bundle', bundle))
db.execute('PRAGMA user_version=1')
assert db.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
assert db.execute('SELECT count(*) FROM prayer_days').fetchone()[0] == total
db.commit()
db.execute('VACUUM')
db.close(); os.replace(temporary,output)
print(f"Built {output}: {total} verified records, bundle {bundle}")

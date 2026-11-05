#!/usr/bin/env python3.11
"""Package an immutable 3D release with native launcher, notices and media receipts."""
from pathlib import Path
import hashlib,json,sys,zipfile
ROOT=Path(__file__).resolve().parent
version=sys.argv[1] if len(sys.argv)>1 else '0.9.1'
build=(ROOT/'builds'/('v'+version)).resolve()
if not build.is_relative_to(ROOT/'builds'):raise SystemExit('Invalid build')
manifest=json.loads((build/'BUILD.json').read_text())
base='Aurora-7-Freedom-After-Dark-v'+version
output=ROOT/'dist'/(base+'-local.zip');output.parent.mkdir(exist_ok=True)
payload={str(p.relative_to(build)):p.read_bytes() for p in build.rglob('*') if p.is_file()}
for name in ['serve.py','launch.command']:
    payload[name]=(ROOT/name).read_bytes()
payload['README.md']=(ROOT/'README.md').read_bytes()
if (ROOT/'ASSET_PROVENANCE.md').exists():payload['ASSET_PROVENANCE.md']=(ROOT/'ASSET_PROVENANCE.md').read_bytes()
for name in ['LICENSE-MiniMax','voice-manifest.json','music-manifest.json','rupture-receipt.json','voice-text-verification.json','voice-review-boundaries.json']:
    source=ROOT/'notices'/name
    if not source.is_file():source=ROOT/'coordination/production/aurora-audio'/name
    if source.is_file():payload['notices/'+name]=source.read_bytes()
for name in ['qa-v0.9.1-3d-media.md','aurora-008-v0.9.1-final.md','designer-007-v0.9.1-carry-forward.md']:
    source=ROOT/'reviews'/name
    if source.is_file():payload['reviews/'+name]=source.read_bytes()
payload['PLAY-ME.txt']=('Private local/LAN 3D game v'+version+'. Requires Python3.11 and current Chrome/WebGL2. Double-click launch.command on Familiar or run ./launch.command in this extracted folder. Open the printed network URL from another LAN device. --local-only restricts this computer. Keep terminal open; Ctrl-C stops only this game. No model/download/account needed to play. No public internet publication authorized. See README.md.\n').encode()
payload['PACKAGE.json']=(json.dumps({'version':version,'files':{n:hashlib.sha256(d).hexdigest() for n,d in sorted(payload.items())}},indent=2)+'\n').encode()
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as archive:
    for name,data in sorted(payload.items()):
        info=zipfile.ZipInfo(base+'/'+name);info.compress_type=zipfile.ZIP_DEFLATED;info.create_system=3;info.external_attr=(0o100755 if name=='launch.command' else 0o100644)<<16;archive.writestr(info,data)
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
    for name,digest in manifest['files'].items():assert hashlib.sha256(archive.read(base+'/'+name)).hexdigest()==digest,name
    for name,data in payload.items():assert archive.read(base+'/'+name)==data,name
print(json.dumps({'archive':str(output),'bytes':output.stat().st_size,'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'verified':True},indent=2))

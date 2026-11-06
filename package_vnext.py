#!/usr/bin/env python3.11
"""Package an immutable 3D release with native launcher, notices and media receipts."""
from pathlib import Path
import argparse,hashlib,json,sys,zipfile
ROOT=Path(__file__).resolve().parent
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('version',nargs='?');parser.add_argument('--output',type=Path,help='New output archive path; existing artifacts are never overwritten')
args=parser.parse_args()
version=args.version or json.loads((ROOT/'CURRENT_RELEASE.json').read_text())['build'].removeprefix('v')
build=(ROOT/'builds'/('v'+version)).resolve()
if not build.is_relative_to(ROOT/'builds'):raise SystemExit('Invalid build')
manifest=json.loads((build/'BUILD.json').read_text())
base='Aurora-7-Freedom-After-Dark-v'+version
output=args.output or ROOT/'dist'/(base+'-local.zip');output.parent.mkdir(parents=True,exist_ok=True)
if output.exists():raise SystemExit('Refusing to overwrite existing archive '+str(output))
payload={str(p.relative_to(build)):p.read_bytes() for p in build.rglob('*') if p.is_file()}
for name in ['serve.py','launch.command']:
    payload[name]=(ROOT/name).read_bytes()
payload['README.md']=(ROOT/'README.md').read_bytes()
if (ROOT/'ASSET_PROVENANCE.md').exists():payload['ASSET_PROVENANCE.md']=(ROOT/'ASSET_PROVENANCE.md').read_bytes()
for source in (ROOT/'notices').rglob('*'):
    if source.is_file():payload['notices/'+source.relative_to(ROOT/'notices').as_posix()]=source.read_bytes()
for name in ['PUBLICATION.md','VERIFICATION.md']:
    if (ROOT/name).is_file():payload[name]=(ROOT/name).read_bytes()
if (ROOT/'DEPLOYMENT.json').is_file():
    deployment=json.loads((ROOT/'DEPLOYMENT.json').read_text())
    if deployment.get('release')=='v'+version:payload['DEPLOYMENT.json']=(ROOT/'DEPLOYMENT.json').read_bytes()
payload['PLAY-ME.txt']=('Aurora-7 local/LAN 3D and visual-novel game v'+version+'. Requires Python3.11 and current Chrome/WebGL2. Double-click launch.command on Familiar or run ./launch.command in this extracted folder. Open the printed network URL from another LAN device. --local-only restricts this computer. Keep terminal open; Ctrl-C stops only this game. No model/download/account needed to play. Public release and asset provenance are described in README.md; this launcher itself serves only local/private LAN addresses.\n').encode()
payload['PACKAGE.json']=(json.dumps({'version':version,'files':{n:hashlib.sha256(d).hexdigest() for n,d in sorted(payload.items())}},indent=2)+'\n').encode()
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as archive:
    for name,data in sorted(payload.items()):
        info=zipfile.ZipInfo(base+'/'+name);info.compress_type=zipfile.ZIP_DEFLATED;info.create_system=3;info.external_attr=(0o100755 if name=='launch.command' else 0o100644)<<16;archive.writestr(info,data)
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
    for name,digest in manifest['files'].items():assert hashlib.sha256(archive.read(base+'/'+name)).hexdigest()==digest,name
    for name,data in payload.items():assert archive.read(base+'/'+name)==data,name
print(json.dumps({'archive':str(output),'bytes':output.stat().st_size,'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'verified':True},indent=2))

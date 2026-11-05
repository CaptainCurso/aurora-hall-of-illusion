#!/usr/bin/env python3.11
"""Freeze a complete 3D/media candidate, refusing missing required production media."""
from pathlib import Path
import hashlib,json,re,shutil

ROOT=Path(__file__).resolve().parent
source=ROOT/'vnext'
version=re.search(r"VERSION='([^']+)'",(source/'src/app.js').read_text()).group(1)
if version.endswith('-dev'):
    raise SystemExit('Choose an immutable candidate version before freezing; -dev is mutable.')
media=json.loads((source/'assets/media.json').read_text())
required=['aurora','vesper','ilex','worldHub','worldDance','worldLounge','worldMuseum','video1','video2','video3','dance','cozy']
missing=[key for key in required if not media.get(key) or not (source/media[key]).is_file()]
if missing:
    raise SystemExit('Required production media missing: '+', '.join(missing))
output=ROOT/'builds'/('v'+version)
if output.exists():raise SystemExit('Refusing to overwrite '+str(output))
files={'index.html','style.css','src/app.js','src/world.js','src/media.js','assets/media.json','assets/encounters.json','assets/culture.json','assets/runtime-provenance.json','assets/3d/municipal-moon.mesh.json'}
for p in (source/'vendor').rglob('*'):
    if p.is_file():files.add(str(p.relative_to(source)))
def media_paths(value):
    if isinstance(value,str) and value.startswith('assets/'):
        yield value
    elif isinstance(value,dict):
        for child in value.values():yield from media_paths(child)
    elif isinstance(value,list):
        for child in value:yield from media_paths(child)
files.update(media_paths(media))
for name in files:
    resolved=(source/name).resolve()
    if not resolved.is_relative_to(source) or not resolved.is_file():raise SystemExit('Missing/unsafe runtime file: '+name)
output.mkdir(parents=True)
for name in sorted(files):
    (output/name).parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(source/name,output/name)
manifest={'version':version,'build':'v'+version,'kind':'3d-hypermedia','private':True,'media':{k:media[k] for k in required},'files':{name:hashlib.sha256((output/name).read_bytes()).hexdigest() for name in sorted(files)}}
(output/'BUILD.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'build':'v'+version,'path':str(output),'files':len(files),'manifest_sha256':hashlib.sha256((output/'BUILD.json').read_bytes()).hexdigest()},indent=2))

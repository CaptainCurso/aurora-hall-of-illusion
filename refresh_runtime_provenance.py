#!/usr/bin/env python3.11
"""Refresh the public runtime inventory without publishing private generation receipts."""
from pathlib import Path
import hashlib
import json
import re
ROOT=Path(__file__).resolve().parent
runtime=ROOT/'vnext'

def paths(value):
    if isinstance(value,str) and value.startswith('assets/'):yield value
    elif isinstance(value,dict):
        for child in value.values():yield from paths(child)
    elif isinstance(value,list):
        for child in value:yield from paths(child)

if __name__=='__main__':
    names=set(paths(json.loads((runtime/'assets/media.json').read_text())))
    encore_path=runtime/'assets/encore/story.json'
    if encore_path.exists():names.update(paths(json.loads(encore_path.read_text())['assets']))
    proof={}
    base=runtime/'assets/png-sanitization.json'
    if base.exists():proof.update({item['file']:item for item in json.loads(base.read_text())['files']})
    production=runtime/'assets/encore/PRODUCTION.json'
    if production.exists():proof.update({item['file']:item for item in json.loads(production.read_text())['files']})
    records=[];missing=[]
    for name in sorted(names):
        file=runtime/name
        if not file.is_file():missing.append(name);continue
        entry={'file':name,'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()}
        original=proof.get(name,{})
        for key in ['sourceSha256','pixelAndColorDataUnchanged','decodedRgbaSha256','decodedPixelsUnchanged','attributionPreserved']:
            if key in original:entry[key]=original[key]
        records.append(entry)
    result={'version':re.search(r"VERSION='([^']+)'",(runtime/'src/app.js').read_text()).group(1),'status':'Candidate runtime inventory; exact-build acceptance is recorded separately. No artistic hearing claim.','files':records,'pending':missing,'privateProductionReceipts':'Preserved locally; raw prompts, original masters, service state and credentials are not included.','metadataPreparation':'Lossless PNG local-generation metadata removal; creator/rights retained, raster/color/alpha data unchanged. Frozen earlier builds preserved.'}
    (runtime/'assets/runtime-provenance.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({'runtimeMediaFiles':len(records),'pending':missing},indent=2))

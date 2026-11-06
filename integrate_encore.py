#!/usr/bin/env python3.11
"""Copy exact producer-hashed Encore candidates; never synthesize missing media."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
from audit_encore import ROOT, audit
from sanitize_png import clean_png


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def integrate(allow_incomplete=False):
    source_story=ROOT/'assets/encore/story.json'
    target_story=ROOT/'vnext/assets/encore/story.json'
    target_story.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(source_story,target_story)
    story=json.loads(target_story.read_text())
    art_path=ROOT/'assets/encore/manifest.json'
    music_path=ROOT/'coordination/production/encore-audio/music-manifest.json'
    art=json.loads(art_path.read_text()) if art_path.exists() else {'assets':[]}
    music=json.loads(music_path.read_text()) if music_path.exists() else {'tracks':[]}
    candidates={asset['id']:asset for asset in art.get('assets',[]) if asset.get('status')=='accepted'}
    candidates.update({track['id']:track for track in music.get('tracks',[]) if track.get('sha256') and track.get('status','').lower().startswith(('produced','accepted'))})
    prior_path=ROOT/'vnext/assets/encore/PRODUCTION.json'
    prior=json.loads(prior_path.read_text()) if prior_path.exists() else {'files':[]}
    prior_files={entry['id']:entry for entry in prior['files']}
    copied=[];pending=[]
    for kind,entries in story['assets'].items():
        for key,value in entries.items():
            relative=value if isinstance(value,str) else value['file']
            asset=candidates.get(key)
            if not asset:
                pending.append(key);continue
            source=(ROOT/asset['file']).resolve()
            if not source.is_relative_to((ROOT/'assets/encore').resolve()) or not source.is_file():raise ValueError('Missing/unsafe source '+key)
            expected=asset.get('sha256')
            if not expected or digest(source)!=expected:raise ValueError('Producer bytes changed '+key)
            target=(ROOT/'vnext'/relative).resolve()
            if not target.is_relative_to((ROOT/'vnext/assets/encore').resolve()):raise ValueError('Unsafe runtime target '+key)
            if source.suffix.lower()!=target.suffix.lower():raise ValueError('Unexpected encoding extension '+key)
            target.parent.mkdir(parents=True,exist_ok=True)
            proof={}
            if source.suffix.lower()=='.png':
                data,proof=clean_png(source.read_bytes());target.write_bytes(data)
            else:shutil.copy2(source,target)
            copied.append({'id':key,'file':relative,'sourceSha256':expected,'sha256':digest(target),'producerStatus':asset.get('status'),'kind':kind,**proof})
    for entry in copied:
        previous=prior_files.get(entry['id'],{})
        if previous.get('sourceSha256')==entry.get('sourceSha256') and previous.get('sha256')==entry['sha256'] and previous.get('decodedPixelsUnchanged'):
            entry.update({key:previous[key] for key in ['decodedRgbaSha256','decodedPixelsUnchanged']})
    report=audit(require_media=False)
    # File existence alone never substitutes for producer receipt/acceptance.
    complete=not pending and not report['missing']
    runtime={'schema':1,'complete':complete,'storySha256':digest(target_story),'files':copied,'pending':pending,'artManifestSha256':digest(art_path) if art_path.exists() else None,'musicManifestSha256':digest(music_path) if music_path.exists() else None,'limits':'Artwork requires accepted producer hashes; audio is a locally produced technically checked candidate. No perceptual listening pass is invented. Exact-build reviews remain required.'}
    (ROOT/'vnext/assets/encore/PRODUCTION.json').write_text(json.dumps(runtime,indent=2)+'\n')
    receipt=ROOT/'coordination/production/encore/runtime-media-receipt.json';receipt.write_text(json.dumps(runtime,indent=2)+'\n')
    if not complete and not allow_incomplete:raise ValueError('Required produced media still pending: '+', '.join(pending))
    return {'copied':len(copied),'pending':pending,'complete':complete}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--allow-incomplete',action='store_true');args=parser.parse_args()
    print(json.dumps(integrate(args.allow_incomplete),indent=2))

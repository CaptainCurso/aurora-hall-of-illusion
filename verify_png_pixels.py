#!/usr/bin/env python3.11
"""Verify runtime metadata preparation using decoded RGBA, without changing artwork."""
from pathlib import Path
import hashlib
import json
import subprocess

ROOT=Path(__file__).resolve().parent

def rgba(path):
    pixels=subprocess.run(['ffmpeg','-v','error','-i',str(path),'-f','rawvideo','-pix_fmt','rgba','pipe:1'],capture_output=True,check=True).stdout
    return hashlib.sha256(pixels).hexdigest()


def verify():
    production_path=ROOT/'vnext/assets/encore/PRODUCTION.json';production=json.loads(production_path.read_text())
    art=json.loads((ROOT/'assets/encore/manifest.json').read_text());sources={item['id']:item for item in art['assets'] if item.get('status')=='accepted'}
    count=0
    for item in production['files']:
        if item['kind']!='images':continue
        source=ROOT/sources[item['id']]['file'];runtime=ROOT/'vnext'/item['file']
        original=rgba(source);actual=rgba(runtime)
        if original!=actual:raise ValueError('Decoded image changed: '+item['id'])
        item['decodedRgbaSha256']=actual;item['decodedPixelsUnchanged']=True;count+=1
    production_path.write_text(json.dumps(production,indent=2)+'\n')
    base_path=ROOT/'vnext/assets/png-sanitization.json';base=json.loads(base_path.read_text())
    for item in base['files']:
        source=ROOT/'builds/v0.9.1'/item['file'];runtime=ROOT/'vnext'/item['file']
        original=rgba(source);actual=rgba(runtime)
        if original!=actual:raise ValueError('Decoded base image changed: '+item['file'])
        item['decodedRgbaSha256']=actual;item['decodedPixelsUnchanged']=True;count+=1
    base_path.write_text(json.dumps(base,indent=2)+'\n')
    return {'verifiedPNGs':count,'decodedPixelsUnchanged':True,'sourcesUntouched':True}

if __name__=='__main__':print(json.dumps(verify(),indent=2))

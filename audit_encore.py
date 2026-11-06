#!/usr/bin/env python3.11
"""Audit Encore graph/cue completeness; optionally require all production media bytes."""
from pathlib import Path
import argparse
import hashlib
import json

ROOT=Path(__file__).resolve().parent
REQUIRED_IMAGES={*(f'aurora-{x}' for x in ['smug','affronted','vulnerable','ungovernable']),*(f'vesper-{x}' for x in ['welcoming','amused','boundary','wanting']),*(f'ilex-{x}' for x in ['composed','skeptical','delighted','grief']),'cg-faces','cg-teacup','cg-names'}
REQUIRED_VIDEOS={'film-faces','film-teacup','film-names'}
REQUIRED_MUSIC={'music-faces','music-teacup','music-names','music-reprise'}

def audit(story_path=None,require_media=False):
    story_path=Path(story_path) if story_path else ROOT/'vnext/assets/encore/story.json'
    story=json.loads(story_path.read_text())
    if story.get('schema')!=1:raise ValueError('Expected Encore schema1')
    if story.get('production') is False:raise ValueError('Engine fixture cannot be frozen as production')
    assets=story['assets'];used={key:set() for key in ['images','videos','music']};summary=[]
    for kind,required in [('images',REQUIRED_IMAGES),('videos',REQUIRED_VIDEOS),('music',REQUIRED_MUSIC)]:
        missing=required-set(assets.get(kind,{}))
        if missing:raise ValueError('Missing production IDs: '+', '.join(sorted(missing)))
    chapter_ids={chapter['id'] for chapter in story['chapters']}
    if len(story['chapters'])!=4 or chapter_ids!={'faces','teacup','names','coda'}:raise ValueError('Expected three chapters plus coda')
    for chapter in story['chapters']:
        nodes=chapter['nodes'];edges={key:[] for key in nodes}
        for key,node in nodes.items():
            edges[key]=[target for target in [node.get('next'),*[c.get('next') for c in node.get('choices',[])],*[c.get('next') for c in node.get('branch',[])]] if target]
            if any(target not in nodes for target in edges[key]):raise ValueError('Broken node target '+chapter['id']+'/'+key)
            if not node.get('end') and not edges[key]:raise ValueError('Dead end '+key)
            if node.get('branch') and not node.get('next'):raise ValueError('Branch lacks fallback '+key)
            if node.get('background'):used['images'].add(node['background'])
            used['images'].update(actor['expression'] for actor in node.get('cast',[]))
            if node.get('film'):used['videos'].add(node['film'])
            if node.get('music'):used['music'].add(node['music'])
        pending=[chapter['entry']];reached=set()
        while pending:
            key=pending.pop()
            if key in reached:continue
            reached.add(key);pending.extend(edges[key])
        if reached!=set(nodes):raise ValueError('Unreachable nodes in '+chapter['id'])
        can_end={key for key,node in nodes.items() if node.get('end')}
        while True:
            expanded=can_end|{key for key,targets in edges.items() if any(target in can_end for target in targets)}
            if expanded==can_end:break
            can_end=expanded
        if can_end!=set(nodes):raise ValueError('Nodes cannot reach ending in '+chapter['id'])
        summary.append({'chapter':chapter['id'],'nodes':len(nodes),'reachable':len(reached),'choiceMoments':sum(bool(node.get('choices')) for node in nodes.values())})
    for kind,ids in used.items():
        if ids-set(assets.get(kind,{})):raise ValueError('Unmapped used '+kind+' IDs')
    files={};missing=[];hashes={}
    for kind,entries in assets.items():
        for key,value in entries.items():
            if key not in used.get(kind,set()):raise ValueError('Unused asset mapping '+key)
            path=value if isinstance(value,str) else value['file']
            if not path.startswith('assets/encore/') or '..' in Path(path).parts:raise ValueError('Non-production/unsafe asset path '+path)
            file=(ROOT/'vnext'/path).resolve()
            if not file.is_relative_to((ROOT/'vnext/assets/encore').resolve()):raise ValueError('Escaped media path')
            files[key]=path
            if not file.is_file():missing.append(key)
            else:hashes[path]=hashlib.sha256(file.read_bytes()).hexdigest()
    if require_media and missing:raise ValueError('Required media unavailable: '+', '.join(sorted(missing)))
    if require_media:
        for kind in ['images','videos','music']:
            values=[hashes[files[key]] for key in assets[kind]]
            if len(set(values))!=len(values):raise ValueError('Duplicated production bytes within '+kind)
    return {'schema':1,'storySha256':hashlib.sha256(story_path.read_bytes()).hexdigest(),'chapters':summary,'usedAssetCounts':{key:len(value) for key,value in used.items()},'runtimeFiles':files,'hashes':hashes,'missing':missing,'complete':not missing}

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--require-media',action='store_true');args=parser.parse_args()
    print(json.dumps(audit(require_media=args.require_media),indent=2))

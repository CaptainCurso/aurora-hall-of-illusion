#!/usr/bin/env python3.11
"""Remove nonvisual local-generation metadata without re-encoding any PNG pixels."""
from pathlib import Path
import hashlib
import json
import re
import struct
import zlib
import xml.etree.ElementTree as ET

TEXT_CHUNKS={b'tEXt',b'zTXt',b'iTXt',b'eXIf'}
COLOR_CHUNKS={b'cHRM',b'gAMA',b'iCCP',b'sBIT',b'sRGB',b'PLTE',b'tRNS',b'cICP',b'mDCV',b'cLLI'}


def chunks(raw):
    if raw[:8]!=b'\x89PNG\r\n\x1a\n':raise ValueError('Not PNG')
    at=8;result=[]
    while at+12<=len(raw):
        size=struct.unpack('>I',raw[at:at+4])[0];end=at+size+12
        if end>len(raw):raise ValueError('Truncated PNG')
        kind=raw[at+4:at+8];data=raw[at+8:at+8+size]
        if zlib.crc32(kind+data)&0xffffffff!=int.from_bytes(raw[at+8+size:end],'big'):raise ValueError('PNG CRC mismatch')
        result.append((kind,data,raw[at:end]));at=end
        if kind==b'IEND':break
    if at!=len(raw) or not result or result[-1][0]!=b'IEND':raise ValueError('Invalid PNG termination')
    return result


def orientation(exif):
    data=exif[6:] if exif.startswith(b'Exif\0\0') else exif
    if data[:2] not in [b'II',b'MM']:raise ValueError('Unknown EXIF byte order')
    endian='little' if data[:2]==b'II' else 'big'
    offset=int.from_bytes(data[4:8],endian);count=int.from_bytes(data[offset:offset+2],endian)
    for index in range(count):
        item=data[offset+2+index*12:offset+14+index*12]
        if int.from_bytes(item[:2],endian)==0x112:return int.from_bytes(item[8:10],endian)
    return None


def attribution(values):
    result={}
    for kind,data,_ in values:
        if kind!=b'iTXt':continue
        key,rest=data.split(b'\0',1);compressed=rest[0];text=rest[2:].split(b'\0',2)[2]
        if compressed:text=zlib.decompress(text)
        direct={b'Author':'creator',b'Copyright':'rights',b'License':'license'}.get(key)
        if direct:result[direct]=text.decode('utf-8')
        else:
            try:root=ET.fromstring(text)
            except ET.ParseError:continue
            for node in root.iter():
                field=node.tag.rsplit('}',1)[-1].lower()
                if field in ['creator','rights','license','copyright']:
                    value=' '.join(''.join(node.itertext()).split())
                    if value:result[field]=value
    if any('/Users/' in value or '/Volumes/' in value for value in result.values()):raise ValueError('Attribution includes local paths; requires review')
    return result


def text_chunk(key,value):
    data=key.encode()+b'\0\0\0\0\0'+value.encode('utf-8');kind=b'iTXt'
    return len(data).to_bytes(4,'big')+kind+data+(zlib.crc32(kind+data)&0xffffffff).to_bytes(4,'big')


def clean_png(raw):
    original=chunks(raw)
    for kind,data,_ in original:
        if kind==b'eXIf' and orientation(data) not in [None,1]:raise ValueError('Nontrivial EXIF orientation needs explicit visual processing')
    credits=attribution(original)
    kept=[encoded for kind,_,encoded in original if kind not in TEXT_CHUNKS]
    fields={'creator':'Author','rights':'Copyright','copyright':'Copyright','license':'License'}
    credit_chunks=b''.join(text_chunk(fields[key],value) for key,value in sorted(credits.items()))
    cleaned=raw[:8]+b''.join(kept[:-1])+credit_chunks+kept[-1]
    after=chunks(cleaned)
    # Identical compressed pixels, dimensions, alpha and color profile; no raster editing.
    retained=lambda values:[(kind,data) for kind,data,_ in values if kind not in TEXT_CHUNKS]
    if retained(original)!=retained(after):raise ValueError('Visual PNG data changed')
    ihdr_idat=b''.join(data for kind,data,_ in original if kind in [b'IHDR',b'IDAT'])
    return cleaned,{'removedChunks':[kind.decode() for kind,_,_ in original if kind in TEXT_CHUNKS],
                    'visualDataSha256':hashlib.sha256(ihdr_idat).hexdigest(),
                    'colorChunksPreserved':[kind.decode() for kind,_,_ in original if kind in COLOR_CHUNKS],
                    'pixelAndColorDataUnchanged':True,'attributionPreserved':credits}


def has_local_paths(raw):
    for kind,data,_ in chunks(raw):
        if kind not in TEXT_CHUNKS:continue
        value=data
        if kind==b'zTXt':
            try:value=zlib.decompress(data.split(b'\0',1)[1][1:])
            except Exception:pass
        elif kind==b'iTXt':
            try:
                rest=data.split(b'\0',1)[1];compressed=rest[0];text=rest[2:].split(b'\0',2)[2]
                value=zlib.decompress(text) if compressed else text
            except Exception:pass
        plain=value.replace(b'\0',b'')
        if b'/Users/' in plain or b'/Volumes/' in plain:return True
    return False


def sanitize_tree(root,receipt):
    root=Path(root);prior=json.loads(Path(receipt).read_text()) if Path(receipt).exists() else {'files':[]}
    records={item['file']:item for item in prior['files']}
    for path in sorted((root/'assets').rglob('*.png')):
        if path.is_symlink() or not path.resolve().is_relative_to(root.resolve()):raise ValueError('Refuse external PNG path')
        raw=path.read_bytes()
        if not has_local_paths(raw):continue
        cleaned,proof=clean_png(raw)
        if not proof['removedChunks']:continue
        name=path.relative_to(root).as_posix();path.write_bytes(cleaned)
        records[name]={'file':name,'sourceSha256':hashlib.sha256(raw).hexdigest(),'sha256':hashlib.sha256(cleaned).hexdigest(),**proof}
    result={'schema':1,'method':'Remove local-generation XMP/IPTC/EXIF; retain creator/rights as minimal UTF8 metadata and all raster/color/alpha chunks byte-for-byte; source originals retained privately.','files':list(records.values())}
    Path(receipt).parent.mkdir(parents=True,exist_ok=True);Path(receipt).write_text(json.dumps(result,indent=2)+'\n')
    return result


if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('root');parser.add_argument('receipt');args=parser.parse_args()
    report=sanitize_tree(args.root,args.receipt);print(json.dumps({'sanitizedPNGs':len(report['files']),'pixelAndColorDataUnchanged':True},indent=2))

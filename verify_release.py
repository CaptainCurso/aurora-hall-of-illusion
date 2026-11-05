#!/usr/bin/env python3.11
"""Verify the immutable release and its maintained source without changing either."""
from pathlib import Path
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parent


def selected_release():
    release = json.loads((ROOT / 'CURRENT_RELEASE.json').read_text())
    version = release['build']
    if not re.fullmatch(r'v[0-9][A-Za-z0-9._-]*', version):
        raise ValueError('Invalid release name')
    build = ROOT / 'builds' / version
    raw = (build / 'BUILD.json').read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    if digest != release['manifestSha256']:
        raise ValueError('Selected release manifest changed')
    manifest = json.loads(raw)
    for name, expected in manifest['files'].items():
        path = (build / name).resolve()
        if not path.is_relative_to(build.resolve()) or not path.is_file():
            raise ValueError('Invalid release file: ' + name)
        if hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            raise ValueError('Release file changed: ' + name)
    return build, manifest, digest


if __name__ == '__main__':
    build, manifest, digest = selected_release()
    for name, expected in manifest['files'].items():
        source = ROOT / 'vnext' / name
        if hashlib.sha256(source.read_bytes()).hexdigest() != expected:
            raise SystemExit('Maintained source differs from release: ' + name)
    print(json.dumps({'build': build.name, 'manifestSha256': digest,
                      'runtimeFiles': len(manifest['files']),
                      'frozenHashes': 'PASS', 'sourceCopies': 'PASS'}, indent=2))

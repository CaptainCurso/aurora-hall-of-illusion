#!/usr/bin/env python3.11
"""Prepare exact release files; optionally commit/push the dedicated Pages branch."""
from pathlib import Path
import argparse
import hashlib
import json
import os
import shutil
import subprocess
from verify_release import ROOT, selected_release


def git(*args, data=None, env=None):
    return subprocess.run(['git', *args], cwd=ROOT, input=data,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                          check=True, env=env).stdout.decode().strip()


def prepare():
    build, manifest, digest = selected_release()
    output = ROOT / '.publish' / 'site'
    # Remove only this helper's own disposable output, never a user-supplied path.
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)
    names = [*manifest['files'], 'BUILD.json']
    for name in names:
        target = output / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(build / name, target)
    for name in ['ASSET_PROVENANCE.md', 'PUBLICATION.md']:
        shutil.copy2(ROOT / name, output / name)
    shutil.copytree(ROOT / 'notices', output / 'notices')
    (output / '.nojekyll').write_text('')
    (output / 'PUBLICATION.json').write_text(json.dumps({
        'release': build.name, 'audience': 'public',
        'manifestSha256': digest,
        'runtimeBytesUnchanged': True,
        'authorization': 'Project owner explicitly requested public GitHub publication on 2026-11-05.'
    }, indent=2) + '\n')
    for name, expected in manifest['files'].items():
        if hashlib.sha256((output / name).read_bytes()).hexdigest() != expected:
            raise ValueError('Prepared release differs: ' + name)
    return output, build.name, digest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--push', action='store_true', help='Create/advance gh-pages and push to the existing origin')
    args = parser.parse_args()
    output, version, digest = prepare()
    result = {'site': str(output), 'release': version, 'manifestSha256': digest}
    if args.push:
        if git('status', '--porcelain'):
            raise SystemExit('Commit source changes before publishing.')
        # A separate index creates a deployment-only tree without changing main's checkout/index.
        index = ROOT / '.publish' / 'pages.index'
        if index.exists():
            index.unlink()
        env = {**os.environ, 'GIT_INDEX_FILE': str(index)}
        git('read-tree', '--empty', env=env)
        for file in sorted(output.rglob('*')):
            if not file.is_file():
                continue
            name = file.relative_to(output).as_posix()
            blob = git('hash-object', '-w', '--stdin', data=file.read_bytes())
            git('update-index', '--add', '--cacheinfo', '100644', blob, name, env=env)
        tree = git('write-tree', env=env)
        previous_result = subprocess.run(['git', 'rev-parse', '--verify', 'refs/heads/gh-pages'],
                                         cwd=ROOT, capture_output=True, text=True)
        previous = previous_result.stdout.strip() if previous_result.returncode == 0 else None
        commit_args = ['commit-tree', tree]
        if previous:
            commit_args.extend(['-p', previous])
        commit = git(*commit_args, data=('Publish Aurora-7 ' + version + ' to GitHub Pages\n').encode())
        git('update-ref', 'refs/heads/gh-pages', commit, previous or '0' * 40)
        git('push', 'origin', 'refs/heads/gh-pages:refs/heads/gh-pages')
        result['pagesCommit'] = commit
    print(json.dumps(result, indent=2))

#!/usr/bin/env python3.11
"""Serve only this game’s public files on Familiar and its private LAN address."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import mimetypes
import ipaddress
import json
import hashlib
import re
import posixpath
from urllib.parse import unquote,urlsplit
import subprocess
import threading

ROOT = Path(__file__).resolve().parent
mimetypes.add_type('text/javascript', '.js')
PUBLIC_FILES = {'index.html', 'style.css', 'BUILD.json'}
PUBLIC_DIRS = {'src', 'assets', 'vendor', 'builds', 'vnext'}

class GameHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        release=getattr(self.server, 'local_default_release', None)
        if release and urlsplit(self.path).path in ('/', '/index.html'):
            self.send_response(302)
            self.send_header('Location', '/builds/'+release+'/')
            self.end_headers()
            return
        super().do_GET()

    def translate_path(self, path):
        lan_root = getattr(self.server, 'approved_lan_root', None)
        if lan_root is not None:
            decoded = unquote(urlsplit(path).path)
            prefix = '/builds/'+self.server.approved_lan_version+'/'
            if decoded.startswith(prefix):
                decoded = decoded[len(prefix):]
            key = posixpath.normpath('/'+decoded).lstrip('/')
            result = (lan_root/key).resolve()
            if result.is_relative_to(lan_root) and (not key or key in self.server.approved_lan_files):
                return str(result)
            return str(ROOT / '__not_public__')
        result = Path(super().translate_path(path)).resolve()
        try:
            relative = result.relative_to(ROOT)
        except ValueError:
            return str(ROOT / '__not_public__')
        parts = relative.parts
        if not parts or (len(parts) == 1 and parts[0] in PUBLIC_FILES) or (parts and parts[0] in PUBLIC_DIRS):
            return str(result)
        return str(ROOT / '__not_public__')

    def list_directory(self, path):
        self.send_error(403, 'Directory listing disabled')
        return None

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
        super().end_headers()

PRIVATE_NETWORKS = tuple(ipaddress.ip_network(n) for n in ('10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'))

def private_lan(address):
    try:
        ip = ipaddress.ip_address(address)
        return any(ip in network for network in PRIVATE_NETWORKS)
    except ValueError:
        return False

def discover_lan():
    """Use the active macOS interface; never bind VPN/public/unspecified addresses."""
    interfaces = []
    try:
        result = subprocess.run(['/sbin/route', '-n', 'get', 'default'], capture_output=True, text=True, timeout=3)
        for line in result.stdout.splitlines():
            if line.strip().startswith('interface:'):
                interfaces.append(line.split(':', 1)[1].strip())
    except (OSError, subprocess.TimeoutExpired):
        pass
    for interface in dict.fromkeys(interfaces + ['en0', 'en1']):
        if not interface.startswith('en'):
            continue
        try:
            result = subprocess.run(['/usr/sbin/ipconfig', 'getifaddr', interface], capture_output=True, text=True, timeout=3)
            address = result.stdout.strip()
            if private_lan(address):
                return address
        except (OSError, subprocess.TimeoutExpired):
            continue
    return None

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8177)
    default_build='v'+json.loads((ROOT/'BUILD.json').read_text()).get('version','0.2.0') if (ROOT/'BUILD.json').exists() else 'v0.2.0'
    if (ROOT/'CURRENT_RELEASE.json').is_file():
        default_build=json.loads((ROOT/'CURRENT_RELEASE.json').read_text()).get('build',default_build)
    parser.add_argument('--lan-build', default=default_build, help='Exact approved immutable build to serve on LAN; staging is never served')
    parser.add_argument('--local-only', action='store_true', help='Serve only on this computer, without LAN access')
    parser.add_argument('--lan-address', help='Explicit private IPv4 LAN address on this computer, if auto-discovery is unavailable')
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error('Port must be between 1 and 65535')
    if args.local_only and args.lan_address:
        parser.error('--local-only cannot be combined with --lan-address')
    if not re.fullmatch(r'v[0-9][A-Za-z0-9._-]*', args.lan_build):
        parser.error('--lan-build must name an immutable version, e.g. v0.2.0')
    addresses = ['127.0.0.1']
    if not args.local_only:
        address = args.lan_address or discover_lan()
        if not address or not private_lan(address):
            parser.exit(1, 'No private Ethernet/Wi-Fi LAN address found. Use --lan-address with this computer’s private IPv4 address, or --local-only.\n')
        addresses.append(address)
    handler = lambda *a, **kw: GameHandler(*a, directory=str(ROOT), **kw)
    servers = []
    try:
        for address in addresses:
            server = ThreadingHTTPServer((address, args.port), handler)
            server.daemon_threads = True
            if address != '127.0.0.1':
                build_root = (ROOT/'builds'/args.lan_build).resolve()
                if not build_root.is_dir() and (ROOT/'BUILD.json').is_file():
                    root_manifest=json.loads((ROOT/'BUILD.json').read_text())
                    if 'v'+root_manifest.get('version','')==args.lan_build:
                        build_root=ROOT
                approved = json.loads((build_root/'BUILD.json').read_text())
                allowed = set(approved['files'])
                for name, digest in approved['files'].items():
                    source = (build_root/name).resolve()
                    if not source.is_relative_to(build_root) or not source.is_file():
                        raise OSError('Invalid LAN runtime path: '+name)
                    if hashlib.sha256(source.read_bytes()).hexdigest() != digest:
                        raise OSError('LAN-approved bytes changed: '+name)
                allowed.add('BUILD.json')
                server.approved_lan_files = allowed
                server.approved_lan_root = build_root
                server.approved_lan_version = args.lan_build
            if address == '127.0.0.1' and (ROOT/'builds'/args.lan_build).is_dir():
                server.local_default_release=args.lan_build
            servers.append(server)
    except OSError as error:
        for server in servers:
            server.server_close()
        parser.exit(1, f'Could not start game server: {error}\nUse --port 8178 if another process owns this port.\n')
    print('Aurora-7 is waiting:', flush=True)
    print(f'  This computer: http://127.0.0.1:{args.port}', flush=True)
    if len(addresses) > 1:
        print(f'  Local network ({args.lan_build}): http://{addresses[1]}:{args.port}', flush=True)
        print(f'  Familiar name: http://Familiar.local:{args.port} (on networks supporting Bonjour)', flush=True)
    print('Keep this window open. Ctrl-C stops only this game server.', flush=True)
    for server in servers[:-1]:
        threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        servers[-1].serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        for server in servers[:-1]:
            server.shutdown()
        for server in servers:
            server.server_close()

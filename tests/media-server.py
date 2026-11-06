#!/usr/bin/env python3.11
"""Actual HTTP Range/cache/keepalive tests using private temporary fixture bytes."""
from pathlib import Path
from http.client import HTTPConnection
import concurrent.futures,hashlib,importlib.util,tempfile,threading,json
spec=importlib.util.spec_from_file_location('game_server',Path(__file__).resolve().parents[1]/'serve.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class Quiet(module.GameHandler):
    def log_message(self,*args):pass
with tempfile.TemporaryDirectory(prefix='aurora-http-') as folder:
    root=Path(folder).resolve();data=bytes(range(256))*4096;(root/'song.mp3').write_bytes(data);(root/'index.html').write_text('fixture');(root/'private.txt').write_text('must remain private')
    handler=lambda *a,**kw:Quiet(*a,directory=str(root),**kw)
    server=module.GameServer(('127.0.0.1',0),handler);server.daemon_threads=True;server.approved_lan_root=root;server.approved_lan_version='v0.12.0';server.approved_lan_files={'song.mp3','index.html'};server.approved_lan_hashes={'song.mp3':hashlib.sha256(data).hexdigest()}
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start();port=server.server_address[1]
    def request(path='/song.mp3',method='GET',headers=None,connection=None):
        conn=connection or HTTPConnection('127.0.0.1',port,timeout=10);conn.request(method,path,headers=headers or {});r=conn.getresponse();body=r.read();result=(r.status,dict(r.getheaders()),body)
        if connection is None:conn.close()
        return result
    try:
        status,headers,body=request();assert status==200 and body==data and headers['Accept-Ranges']=='bytes';etag=headers['ETag'];assert headers['Cache-Control']=='no-cache'
        for value,start,end in [('bytes=0-65535',0,65535),('bytes=500-',500,len(data)-1),('bytes=-129',len(data)-129,len(data)-1),('bytes=0-0',0,0)]:
            status,h,b=request(headers={'Range':value});assert status==206 and b==data[start:end+1] and int(h['Content-Length'])==len(b);assert h['Content-Range']==f'bytes {start}-{end}/{len(data)}'
        for value in ['bytes=999999999-','bytes=10-2','bytes=-0','bytes=','bytes=0-1,3-4']:
            status,h,b=request(headers={'Range':value});assert status==416 and not b and h['Content-Range']==f'bytes */{len(data)}'
        status,h,b=request(method='HEAD',headers={'Range':'bytes=10-19'});assert status==206 and not b and h['Content-Length']=='10'
        status,h,b=request(headers={'If-None-Match':etag});assert status==304 and not b
        status,h,b=request(headers={'Range':'bytes=10-19','If-Range':etag});assert status==206 and b==data[10:20]
        status,h,b=request(headers={'Range':'bytes=10-19','If-Range':'"stale"'});assert status==200 and b==data
        status,h,b=request('/builds/v0.12.0/song.mp3');assert 'immutable' in h['Cache-Control'] and b==data
        status,h,b=request('/index.html');assert status==200 and h['Cache-Control']=='no-store' and 'ETag' not in h
        for path in ['/private.txt','/../private.txt','/%2e%2e/private.txt','/song.mp3/../private.txt']:
            assert request(path)[0]==404
        conn=HTTPConnection('127.0.0.1',port,timeout=10)
        assert request(headers={'Range':'bytes=5-9'},connection=conn)[2]==data[5:10]
        assert request(headers={'Range':'bytes=20-24'},connection=conn)[2]==data[20:25]
        server.local_default_release='v0.12.0';status,h,b=request('/',connection=conn);assert status==302 and not b and h['Cache-Control']=='no-store' and 'ETag' not in h;conn.close()
        def partial(_):return request(headers={'Range':'bytes=0-65535'})
        with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
            assert all(x[0]==206 and len(x[2])==65536 for x in pool.map(partial,range(24)))
        print(json.dumps({'result':'PASS','fixtureBytes':len(data),'partialBytes':65536,'rangeSuffixHead416':True,'etag304IfRange':True,'cachePolicies':True,'privateExclusions':True,'persistentConnection':True,'parallelRangeRequests':24}))
    finally:server.shutdown();server.server_close();thread.join()

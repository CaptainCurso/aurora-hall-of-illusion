// Actual HTTP/hash/browser checks for a subpath-hosted static release.
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const fs=require('node:fs/promises');
const url=process.argv[2]||'https://captaincurso.github.io/aurora-hall-of-illusion/';
const out=process.argv[3]||'.publish/public-smoke';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const manifestResponse=await fetch(new URL('BUILD.json',url));assert.equal(manifestResponse.status,200);
 const raw=Buffer.from(await manifestResponse.arrayBuffer());
 assert.equal(sha(raw),'e314e82f07eb231d9bc75005b1e749e4129fe60787c0f46645fe0263cd12ca55');
 const manifest=JSON.parse(raw),files=Object.entries(manifest.files);
 for(let i=0;i<files.length;i+=6)await Promise.all(files.slice(i,i+6).map(async([name,digest])=>{
  const response=await fetch(new URL(name,url));assert.equal(response.status,200,name);
  assert.equal(sha(Buffer.from(await response.arrayBuffer())),digest,name);
 }));
 const report={url,version:manifest.version,httpHashes:files.length,pageErrors:[],failedRequests:[]};
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  report.browser=browser.version();const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror',e=>report.pageErrors.push(e.message));
  page.on('requestfailed',request=>report.failedRequests.push(request.url()));
  await page.goto(url);await page.locator('#loading').waitFor({state:'hidden',timeout:30000});
  await page.screenshot({path:out+'/title.png'});
  await page.locator('#enter').click();
  await page.waitForFunction(()=>aurora3DDebug().media.voice?.currentTime>.5&&aurora3DDebug().media.energy>.1,null,{timeout:20000});
  report.arrival=await page.evaluate(()=>aurora3DDebug().media);
  await page.locator('#map').click();await page.getByRole('button',{name:/The Dividend Sea/}).click();
  await page.waitForFunction(()=>aurora3DDebug().videos.some(v=>v.ready>=2&&v.time>.3),null,{timeout:20000});
  report.video=await page.evaluate(()=>aurora3DDebug().videos);
  await page.screenshot({path:out+'/atrium.png'});
  await page.locator('#menu').click();
  const before=await page.evaluate(()=>({audio:aurora3DDebug().media.currentTime,video:aurora3DDebug().videos[0].time}));
  await page.waitForTimeout(500);
  const after=await page.evaluate(()=>({audio:aurora3DDebug().media.currentTime,video:aurora3DDebug().videos[0].time}));
  assert(Math.abs(after.audio-before.audio)<.08);assert(Math.abs(after.video-before.video)<.08);
  report.pause={before,after};assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.failedRequests,[]);
  report.result='PASS';
 }finally{await browser.close();await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify({url,version:report.version,result:report.result,httpHashes:files.length,browser:report.browser,pageErrors:report.pageErrors,failedRequests:report.failedRequests},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});

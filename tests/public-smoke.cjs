// Actual HTTP/hash/browser checks for a subpath-hosted static release.
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const fs=require('node:fs/promises');
const path=require('node:path');
const url=process.argv[2]||'https://captaincurso.github.io/aurora-hall-of-illusion/';
const out=process.argv[3]||'.publish/public-smoke';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const root=path.resolve(__dirname,'..');
 const selected=JSON.parse(await fs.readFile(path.join(root,'CURRENT_RELEASE.json'),'utf8'));
 const expected=await fs.readFile(process.argv[4]||path.join(root,'builds',selected.build,'BUILD.json'));
 const manifestResponse=await fetch(new URL('BUILD.json',url));assert.equal(manifestResponse.status,200);
 const raw=Buffer.from(await manifestResponse.arrayBuffer());
 assert.equal(sha(raw),sha(expected),'Remote manifest must match the independently frozen local release');
 const manifest=JSON.parse(raw),files=Object.entries(manifest.files);
 for(let i=0;i<files.length;i+=6)await Promise.all(files.slice(i,i+6).map(async([name,digest])=>{
  const response=await fetch(new URL(name,url));assert.equal(response.status,200,name);
  assert.equal(sha(Buffer.from(await response.arrayBuffer())),digest,name);
 }));
 const report={url,version:manifest.version,httpHashes:files.length,pageErrors:[],failedRequests:[],cancelledMediaRequests:[]};
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  report.browser=browser.version();const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror',e=>report.pageErrors.push(e.message));
  page.on('requestfailed',request=>{
   const failure={url:request.url(),type:request.resourceType(),error:request.failure()?.errorText};
   // Chromium cancels redundant media/range requests when old room videos are disposed.
   // Native playback must still advance below; actual transport/decoder failures fail the test.
   if(failure.type==='media'&&failure.error==='net::ERR_ABORTED')report.cancelledMediaRequests.push(failure);
   else report.failedRequests.push(failure);
  });
  await page.goto(url);await page.locator('#loading').waitFor({state:'hidden',timeout:30000});
  if(manifest.files['src/gamepad.js']){
   report.controllerApi=await page.evaluate(()=>({type:typeof navigator.getGamepads,pollSlots:navigator.getGamepads().length,state:aurora3DDebug().controller}));
   assert.equal(report.controllerApi.type,'function');
   assert(!report.controllerApi.state.apiUnavailable&&!report.controllerApi.state.apiBlocked,'Native controller API must be available; physical hardware is tested separately');
  }
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
  report.pause={before,after};
  if(manifest.files['src/novel.js']){
   await page.locator('#resume').click();
   await page.locator('#map').click();await page.getByRole('button',{name:/Unscheduled Encore/}).click();
   const chapters=await page.evaluate(()=>fetch('assets/encore/story.json').then(r=>r.json()).then(s=>s.chapters.filter(c=>c.id!=='coda').map(c=>({id:c.id,title:c.title}))));
   report.encore=[];
   for(const chapter of chapters){
    const card=page.locator('.vn-chapter-card').filter({has:page.getByRole('heading',{name:chapter.title,exact:true})});
    await card.getByRole('button',{name:/Begin scene|Resume scene/}).click();
    await page.waitForFunction(()=>{const d=aurora3DDebug();return d.novel.video?.ready===4&&d.novel.video.time>.3&&!d.novel.video.paused&&d.media.currentTime>.3&&d.media.energy>.1;},null,{timeout:20000});
    const active=await page.evaluate(()=>({video:aurora3DDebug().novel.video,audio:aurora3DDebug().media}));
    assert(new URL(active.video.src).pathname.startsWith(new URL(url).pathname));
    assert.equal(await page.locator('.vn-media-warning:visible').count(),0);
    assert.equal(await page.locator('.vn-dock').evaluate(e=>getComputedStyle(e).position),'absolute','Portable package must serve novel.css');
    await page.locator('#vn-pause').click();
    const held=await page.evaluate(()=>({video:aurora3DDebug().novel.video.time,audio:aurora3DDebug().media.currentTime}));
    await page.waitForTimeout(300);
    const heldAfter=await page.evaluate(()=>({video:aurora3DDebug().novel.video.time,audio:aurora3DDebug().media.currentTime}));
    assert(Math.abs(heldAfter.video-held.video)<.08);assert(Math.abs(heldAfter.audio-held.audio)<.08);
    report.encore.push({chapter:chapter.id,active,pause:{before:held,after:heldAfter}});
    await page.locator('#resume').click();await page.getByRole('button',{name:'Chapters',exact:true}).click();
   }
   await page.screenshot({path:out+'/encore-library.png'});
  }
  assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.failedRequests,[]);
  report.result='PASS';
 }finally{await browser.close();await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify({url,version:report.version,result:report.result,httpHashes:files.length,browser:report.browser,pageErrors:report.pageErrors,failedRequests:report.failedRequests},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});

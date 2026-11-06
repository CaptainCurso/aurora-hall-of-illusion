const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs/promises'),assert=require('node:assert/strict');
(async()=>{
 const url=process.argv[2]||'http://127.0.0.1:8177/vnext/',out=process.argv[3]||'.publish/encore-audio';await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 const result={url,browser:browser.version(),tracks:[],errors,note:'Native decoder/signal and control verification only; no subjective listening or pending film/art acceptance.'};page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(url);await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#encore-enter').click();assert.equal((await page.evaluate(()=>aurora3DDebug())).media.voice,null);
  const titles=await page.evaluate(()=>fetch('assets/encore/story.json').then(r=>r.json()).then(s=>s.chapters.map(c=>({id:c.id,title:c.title}))));
  for(const id of (process.env.ENCORE_TRACKS||'faces,teacup,names').split(',')){
   const title=titles.find(c=>c.id===id).title;const card=page.locator('.vn-chapter-card').filter({has:page.getByRole('heading',{name:title,exact:true})});await card.getByRole('button',{name:/Begin scene|Resume scene/}).click();
   await page.waitForFunction(id=>{const d=aurora3DDebug();return d.media.track.endsWith('/'+id+'.mp3')&&d.media.currentTime>1&&d.media.energy>.1&&d.media.readyState===4;},id,{timeout:20000});
   const active=await page.evaluate(()=>aurora3DDebug().media);assert.match(await page.locator('.vn-track').innerText(),new RegExp(id==='faces'?'Seven Mouths':id==='teacup'?'Apartment':'Names'));
   await page.locator('#vn-pause').click();const before=await page.evaluate(()=>aurora3DDebug().media.currentTime);await page.waitForTimeout(450);const after=await page.evaluate(()=>aurora3DDebug().media.currentTime);assert(Math.abs(after-before)<.05);await page.locator('#resume').click();
   await page.locator('#vn-sound').click();await page.waitForFunction(()=>!aurora3DDebug().media.enabled);assert.equal((await page.evaluate(()=>aurora3DDebug().media)).paused,true);await page.locator('#vn-sound').click();await page.waitForFunction(()=>aurora3DDebug().media.enabled&&!aurora3DDebug().media.paused);
   result.tracks.push({id,active,pause:{before,after}});await page.getByRole('button',{name:'Chapters',exact:true}).click();assert.equal((await page.evaluate(()=>aurora3DDebug().media)).paused,true);
  }
  assert.deepEqual(errors,[]);result.result='PASS';await fs.writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({result:result.result,browser:result.browser,tracks:result.tracks.map(t=>({id:t.id,duration:t.active.duration,energy:t.active.energy})),errors},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

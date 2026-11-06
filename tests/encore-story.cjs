const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs/promises'),assert=require('node:assert/strict');
(async()=>{
 const url=process.argv[2]||'http://127.0.0.1:8177/vnext/',out=process.argv[3]||'.publish/encore-story';await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 const read=()=>page.evaluate(()=>aurora3DDebug()),result={url,browser:browser.version(),steps:[],errors,note:'Actual authored chapter/input/audio flow. Pending production images/films are not accepted by this check; no progression injection or auditory hearing claim.'};
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(url);await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#encore-enter').click();await page.locator('#vn-pause').click();await page.getByRole('button',{name:'Reduced motion off',exact:true}).click();await page.locator('#resume').click();
  const chapters=await page.evaluate(()=>fetch('assets/encore/story.json').then(r=>r.json()).then(s=>s.chapters.map(c=>({id:c.id,title:c.title}))));
  for(const chapter of chapters){
   const card=page.locator('.vn-chapter-card').filter({has:page.getByRole('heading',{name:chapter.title,exact:true})});await card.getByRole('button',{name:/Begin scene|Resume scene/}).click();
   if(chapter.id==='coda'){
    await page.waitForFunction(()=>aurora3DDebug().media.track.endsWith('/reprise.mp3')&&aurora3DDebug().media.currentTime>1&&aurora3DDebug().media.energy>.1,null,{timeout:20000});result.reprise=await page.evaluate(()=>aurora3DDebug().media);assert.equal(result.reprise.duration,80);
    await page.keyboard.press('KeyH');const before=(await read()).media.currentTime;await page.waitForTimeout(350);const after=(await read()).media.currentTime;assert(Math.abs(after-before)<.05);await page.keyboard.press('KeyH');
   }
   let steps=0;
   while((await read()).novel.chapter===chapter.id){
    assert(++steps<70,'scene loop');const d=(await read()).novel;result.steps.push({chapter:chapter.id,node:d.node,cues:d.cues});
    if(d.node==='c11b'||d.node==='c12b'){assert.equal(d.cues.background,null);assert.equal(d.cues.film,null);assert.equal((await read()).media.track,null);assert.equal((await read()).media.paused,true);result.darkStage=true;}
    const choices=page.locator('.vn-choices button');
    if(await choices.count())await choices.nth(chapter.id==='coda'?1:0).click();else await page.locator('#vn-next').click();
    await page.waitForTimeout(40);
   }
   assert((await read()).novel.completed.includes(chapter.id));
  }
  assert(result.darkStage);assert.deepEqual((await read()).state.evidence,[]);assert.deepEqual(errors,[]);result.result='PASS';result.final=(await read()).novel;await page.screenshot({path:out+'/completed-library.png'});await fs.writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({result:result.result,browser:result.browser,nodes:result.steps.length,completed:result.final.completed,reprise:{duration:result.reprise.duration,time:result.reprise.currentTime,energy:result.reprise.energy},darkStage:result.darkStage,errors},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises');
(async()=>{
 const out=process.argv[3]||'.publish/encore-engine';await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 const read=()=>page.evaluate(()=>aurora3DDebug());
 const reveal=async()=>{const d=(await read()).novel;if(d.revealed<d.textLength)await page.locator('#vn-next').click();};
 const next=async()=>{const before=(await read()).novel.node;await reveal();if((await read()).novel.node===before)await page.locator('#vn-next').click();await page.waitForTimeout(70);};
 const card=id=>page.locator('.vn-chapter-card').filter({has:page.getByRole('heading',{name:'Engine fixture / '+id,exact:true})});
 const start=async id=>{await card(id).getByRole('button',{name:/Begin scene|Resume scene/}).click();};
 const cinema=async()=>{await page.locator('#map').click();await page.getByRole('button',{name:/The Unscheduled Encore/}).click();};
 const finishChapter=async choice=>{await next();await reveal();await page.locator('.vn-choices button').nth(choice).click();await next();await next();};
 page.on('pageerror',e=>errors.push(e.message));
 try{
  const fixture=await fs.readFile('tests/fixtures/encore-engine-story.json','utf8');await page.route('**/assets/encore/story.json',route=>route.fulfill({contentType:'application/json',body:fixture}));
  await page.goto(process.argv[2]||'http://127.0.0.1:8177/vnext/');await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#enter-muted').click();await cinema();
  assert.equal(await card('Coda').getByRole('button').first().isDisabled(),true);await start('Faces');assert.equal(await page.locator('.vn-actor').count(),2);
  await page.waitForTimeout(180);await page.locator('#vn-pause').click();await page.waitForTimeout(70);const paused=(await read()).novel.revealed;await page.waitForTimeout(350);assert.equal((await read()).novel.revealed,paused);await page.locator('#resume').click();
  await next();await reveal();await page.locator('.vn-choices button').first().click();assert.equal((await read()).novel.node,'transmission');
  await page.waitForFunction(()=>aurora3DDebug().novel.video?.time>.2);await page.screenshot({path:out+'/cinematic.png'});await page.keyboard.press('KeyH');assert.equal((await read()).novel.historyOpen,true);assert.match(await page.locator('.vn-history-list').innerText(),/Keep the opening/);await page.screenshot({path:out+'/history.png'});await page.keyboard.press('Escape');assert.equal((await read()).paused,false);
  await page.locator('#vn-pause').click();await page.locator('#comfort').click();await page.locator('#resume').click();await page.waitForTimeout(100);assert.equal((await read()).novel.video.paused,true);await next();await next();
  for(const id of ['Teacup','Names']){await start(id);await finishChapter(0);}
  assert.deepEqual((await read()).state.evidence,[]);await start('Coda');assert.match(await page.locator('.vn-accessible').textContent(),/stayed open/);assert.equal((await read()).novel.cues.shot,'cg','router visual defaults apply');assert.equal((await read()).novel.cues.background,'cg-faces','leaf cue overrides router');assert.equal((await read()).novel.cues.film,null,'leaf clears router film');await next();
  await card('Faces').getByRole('button',{name:'Replay from the beginning'}).click();await next();await reveal();await page.locator('.vn-choices button').nth(1).click();await page.locator('#vn-close').click();await cinema();assert((await read()).novel.completed.includes('coda'));assert.equal((await read()).novel.flags.faces_vote,'open');
  await start('Faces');await next();await next();assert(!(await read()).novel.completed.includes('coda'));assert.equal((await read()).novel.flags.faces_vote,'changed');
  await page.locator('#vn-close').click();await page.reload();await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#enter-muted').click();await cinema();await start('Coda');assert.match(await page.locator('.vn-accessible').textContent(),/outcome changed/);assert.equal((await read()).novel.cues.shot,'cg');await page.locator('#vn-close').click();await page.reload();await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#enter-muted').click();await cinema();await start('Coda');assert.equal((await read()).novel.cues.shot,'cg','resume reconstructs router defaults');assert.deepEqual((await read()).state.evidence,[]);await page.screenshot({path:out+'/changed-coda.png'});assert.deepEqual(errors,[]);
  const result={result:'PASS',browser:browser.version(),fixture:true,checks:['native input','two cast images','CG/film cut','pause/reveal','history','reduced motion','three chapters/coda gate','committed versus replay draft','coda invalidation','save/reload','old evidence untouched'],debug:(await read()).novel,errors};await fs.writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({result:result.result,browser:result.browser,checks:result.checks,errors},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

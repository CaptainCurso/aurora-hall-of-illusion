// Persisted chapter history remains available from the library, by button and H.
const fs=require('node:fs/promises'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const [url,out]=process.argv.slice(2);
if(!/^http:\/\/127\.0\.0\.1:\d+\//.test(url||'')||!out)process.exit(2);
(async()=>{
 await fs.mkdir(out,{recursive:true});const b=await chromium.launch({channel:'chrome',headless:true}),c=await b.newContext({viewport:{width:1280,height:800}}),p=await c.newPage(),r={url,browser:b.version(),errors:[],note:'Isolated profile and actual UI, no injected history.'};
 p.on('pageerror',e=>r.errors.push(e.message));
 try{
  await p.goto(url);await p.locator('#loading').waitFor({state:'hidden',timeout:30000});await p.locator('#encore-muted').click();
  assert.equal(await p.locator('#vn-history-button').isDisabled(),true,'empty history starts disabled');
  await p.keyboard.press('KeyH');assert.equal(await p.locator('.vn-backlog').isVisible(),false,'H cannot open an empty library history');
  await p.locator('.vn-chapter-card').first().getByRole('button',{name:/Begin scene/}).click();
  await p.waitForFunction(()=>aurora3DDebug().novel.chapter==='faces');
  await p.getByRole('button',{name:'Chapters',exact:true}).click();
  assert.equal(await p.locator('#vn-history-button').isEnabled(),true);
  await p.locator('#vn-history-button').click();assert.equal(await p.locator('.vn-backlog').isVisible(),true);
  const items=await p.locator('.vn-history-list li').count();assert.ok(items>0);
  await p.keyboard.press('Escape');assert.equal(await p.locator('.vn-backlog').isVisible(),false);
  await p.reload();await p.locator('#loading').waitFor({state:'hidden',timeout:30000});await p.locator('#encore-muted').click();
  assert.equal(await p.locator('#vn-history-button').isEnabled(),true,'history remains enabled after reload');
  await p.keyboard.press('KeyH');assert.equal(await p.locator('.vn-backlog').isVisible(),true);assert.ok(await p.locator('.vn-history-list li').count()>=items);
  await p.screenshot({path:out+'/history.png'});assert.deepEqual(r.errors,[]);r.items=items;r.result='pass';
 }catch(e){r.result='fail';r.failure=e.stack;await p.screenshot({path:out+'/failure.png'}).catch(()=>{});}finally{
  await c.close();await b.close();await fs.writeFile(out+'/library-history.json',JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r,null,2));if(r.result!=='pass')process.exitCode=1;
 }
})();

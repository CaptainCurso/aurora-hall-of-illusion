// Closed disclosure contents must not trap controller/keyboard focus.
const fs=require('node:fs/promises'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const [url,out]=process.argv.slice(2);if(!/^http:\/\/127\.0\.0\.1:\d+\//.test(url||'')||!out)process.exit(2);
(async()=>{
 await fs.mkdir(out,{recursive:true});const b=await chromium.launch({channel:'chrome',headless:true}),c=await b.newContext({viewport:{width:1280,height:800}}),p=await c.newPage(),r={url,browser:b.version(),input:'Simulated standard Gamepad API; no physical controller claim',errors:[]};
 await p.addInitScript(()=>{window.virtualPad={id:'Virtual standard controller',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[window.virtualPad]});});
 p.on('pageerror',e=>r.errors.push(e.message));
 const press=async i=>{await p.evaluate(i=>virtualPad.buttons[i]={pressed:true,value:1},i);await p.waitForTimeout(120);await p.evaluate(i=>virtualPad.buttons[i]={pressed:false,value:0},i);await p.waitForTimeout(160)};
 const focus=()=>p.evaluate(()=>({id:document.activeElement.id,tag:document.activeElement.tagName,text:document.activeElement.textContent.trim()}));
 try{
  await p.goto(url);await p.locator('#loading').waitFor({state:'hidden',timeout:30000});await p.locator('#title-controls summary').click();await p.locator('#controller-title').click();await p.locator('#enter-muted').click();await p.waitForFunction(()=>aurora3DDebug().controller.armed);
  await press(9);assert.equal((await p.evaluate(()=>aurora3DDebug())).paused,true);assert.equal((await focus()).id,'resume');
  await press(13);let summary=await focus();assert.equal(summary.tag,'SUMMARY');assert.match(summary.text,/Credits/);
  await press(13);assert.equal((await focus()).id,'volume','closed disclosure links must be skipped');
  await press(12);assert.match((await focus()).text,/Credits/);await press(0);
  assert.equal(await p.locator('#pause details').first().evaluate(e=>e.open),true);
  await press(13);const link=await focus();assert.equal(link.tag,'A');assert.match(link.text,/runtime provenance/);
  await p.keyboard.press('Shift+Tab');assert.match((await focus()).text,/Credits/);
  await p.keyboard.press('Tab');assert.equal((await focus()).tag,'A');
  await p.screenshot({path:out+'/open-credits-focus.png'});assert.deepEqual(r.errors,[]);Object.assign(r,{result:'pass',summary,openDisclosureLink:link});
 }catch(e){r.result='fail';r.failure=e.stack;await p.screenshot({path:out+'/failure.png'}).catch(()=>{});}finally{await c.close();await b.close();await fs.writeFile(out+'/disclosure-focus.json',JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r,null,2));if(r.result!=='pass')process.exitCode=1;}
})();

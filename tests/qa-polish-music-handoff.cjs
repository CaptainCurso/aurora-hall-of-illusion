// Music handoffs observed through actual UI and read-only media diagnostics.
const fs=require('node:fs/promises'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const [url,out]=process.argv.slice(2);if(!/^http:\/\/127\.0\.0\.1:\d+\//.test(url||'')||!out)process.exit(2);
(async()=>{
 await fs.mkdir(out,{recursive:true});const b=await chromium.launch({channel:'chrome',headless:true}),r={url,browser:b.version(),cases:[],errors:[],note:'Isolated UI, frame-sampled media element state; not perceptual listening.'};
 try{
  for(const mode of ['complete','pause','mute','quiet']){
   const c=await b.newContext({viewport:{width:1280,height:800}}),p=await c.newPage();p.on('pageerror',e=>r.errors.push(mode+': '+e.message));
   await p.addInitScript(()=>{window.__musicSamples=[];const tick=()=>{if(window.aurora3DDebug){const d=aurora3DDebug();window.__musicSamples.push({time:performance.now(),room:d.room,handoff:d.media.handoff,enabled:d.media.enabled,tracks:[...document.querySelectorAll('audio[data-aurora-role="music"]')].map(a=>({src:a.currentSrc,paused:a.paused,time:a.currentTime,volume:a.volume}))});}requestAnimationFrame(tick)};requestAnimationFrame(tick)});
   await p.goto(url);await p.locator('#loading').waitFor({state:'hidden',timeout:30000});await p.locator(mode==='quiet'?'#enter-muted':'#enter').click();
   if(mode!=='quiet')await p.waitForFunction(()=>{const m=aurora3DDebug().media;return !m.paused&&m.currentTime>.3},{timeout:20000});
   await p.locator('#map').click();await p.getByRole('button',{name:/The Velvet Lease/}).click();
   await p.waitForFunction(()=>aurora3DDebug().room==='lounge'&&!aurora3DDebug().transitioning,{timeout:30000});
   let beforeCancel=null;
   if(['pause','mute'].includes(mode)){
    beforeCancel=(await p.evaluate(()=>aurora3DDebug())).media.handoff;
    assert.ok(beforeCancel,'cancellation must occur during an active handoff');
   }
   if(mode==='pause')await p.locator('#menu').click();
   if(mode==='mute')await p.locator('#sound').click();
   await p.waitForTimeout(900);
   let samples=await p.evaluate(()=>window.__musicSamples),maxPlaying=Math.max(...samples.map(s=>s.tracks.filter(t=>!t.paused).length));
   assert.ok(maxPlaying<=2,'at most two music elements play');
   const handoff=samples.find(s=>s.handoff);
   if(mode==='complete')assert.ok(handoff,'a real handoff was observed');
   if(mode==='quiet')assert.ok(samples.every(s=>s.tracks.every(t=>t.paused)), 'quiet entry never starts music');
   if(['pause','mute'].includes(mode)){
    const end=samples.at(-1);assert.ok(end.tracks.every(t=>t.paused),'cancelled handoff leaves all tracks paused');assert.equal(end.handoff,null,'handoff is cancelled');
   }
   r.cases.push({mode,maxPlaying,handoffObserved:!!handoff,beforeCancel,last:samples.at(-1)});await c.close();
  }
  assert.deepEqual(r.errors,[]);r.result='pass';
 }catch(e){r.result='fail';r.failure=e.stack;}finally{await b.close();await fs.writeFile(out+'/music-handoff.json',JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r,null,2));if(r.result!=='pass')process.exitCode=1;}
})();

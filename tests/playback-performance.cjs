// Controlled single-page native Chrome measurements. Instruments rendering/media only.
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs/promises');
(async()=>{
 const url=process.argv[2]||'http://127.0.0.1:8177/',out=process.argv[3]||'.publish/performance-baseline';await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:process.env.HEADED!=='1'}),context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:2}),page=await context.newPage();
 const report={url,browser:browser.version(),headless:process.env.HEADED!=='1',viewport:{width:1920,height:1080,dpr:2},warmupMs:2000,sampleMs:6000,phases:[],note:'One test page. Render-call instrumentation, frame timing, media buffering and digital audio clocks are not subjective listening or physical speaker output.'};
 await page.addInitScript(()=>{
  window.__playbackProbe={draws:0,events:[],longTasks:[],contexts:[]};const p=__playbackProbe;
  for(const name of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']){const original=WebGL2RenderingContext.prototype[name];WebGL2RenderingContext.prototype[name]=function(...args){p.draws++;return original.apply(this,args);};}
  const Native=window.AudioContext;window.AudioContext=class extends Native{constructor(...args){super(...args);p.contexts.push(this);}};
  for(const type of ['waiting','stalled','playing','pause','error','ended'])document.addEventListener(type,e=>{if(e.target instanceof HTMLMediaElement)p.events.push({type,time:performance.now(),file:e.target.currentSrc?.split('/').pop(),ready:e.target.readyState,mediaTime:e.target.currentTime,error:e.target.error?.code});},true);
  try{new PerformanceObserver(list=>p.longTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true});}catch{}
 });
 async function sample(name){
  await page.waitForTimeout(2000);
  const result=await page.evaluate(async name=>{
   const p=__playbackProbe,begin=performance.now(),drawStart=p.draws,eventStart=p.events.length,frames=[];let last=begin;
   const audio=p.contexts.map(c=>({state:c.state,time:c.currentTime,baseLatency:c.baseLatency,outputLatency:c.outputLatency,timestamp:c.getOutputTimestamp?.()}));
   const media=()=>[...document.querySelectorAll('video,audio')].map(e=>({tag:e.tagName,file:e.currentSrc.split('/').pop(),time:e.currentTime,paused:e.paused,ready:e.readyState,buffered:e.buffered.length?e.buffered.end(e.buffered.length-1):0,duration:e.duration,dropped:e.getVideoPlaybackQuality?.().droppedVideoFrames,total:e.getVideoPlaybackQuality?.().totalVideoFrames}));
   const before=media();await new Promise(resolve=>{const tick=t=>{frames.push(t-last);last=t;if(t-begin<6000)requestAnimationFrame(tick);else resolve();};requestAnimationFrame(tick);});
   const elapsed=performance.now()-begin,ordered=frames.slice(1).sort((a,b)=>a-b),pct=f=>ordered[Math.min(ordered.length-1,Math.floor(ordered.length*f))],long=p.longTasks.filter(t=>t.start>=begin);
   return{name,elapsed,frames:ordered.length,fps:ordered.length/elapsed*1000,median:pct(.5),p95:pct(.95),p99:pct(.99),over33ms:ordered.filter(t=>t>33.4).length,max:ordered.at(-1),drawCalls:p.draws-drawStart,longTasks:long.length,longTaskMs:long.reduce((s,t)=>s+t.duration,0),audioBefore:audio,audioAfter:p.contexts.map(c=>({state:c.state,time:c.currentTime,timestamp:c.getOutputTimestamp?.()})),mediaBefore:before,mediaAfter:media(),events:p.events.slice(eventStart),hidden:document.hidden};
  },name);
  report.phases.push(result);console.log(JSON.stringify({phase:name,fps:result.fps,median:result.median,p95:result.p95,over33ms:result.over33ms,drawCalls:result.drawCalls,longTaskMs:result.longTaskMs,events:result.events}));await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');
 }
 try{
  if(process.env.PERF_SIMULATE==='1'){const session=await context.newCDPSession(page);await session.send('Network.enable');await session.send('Network.emulateNetworkConditions',{offline:false,latency:30,downloadThroughput:625000,uploadThroughput:625000});await session.send('Emulation.setCPUThrottlingRate',{rate:4});report.simulation={cpuThrottleRate:4,networkLatencyMs:30,downloadBytesPerSecond:625000,uploadBytesPerSecond:625000,note:'Synthetic constraints; not the physical laptop or Wi-Fi.'};}
  await page.goto(url);await page.locator('#loading').waitFor({state:'hidden',timeout:60000});
  const cdp=await browser.newBrowserCDPSession();const info=await cdp.send('SystemInfo.getInfo');report.gpu={devices:info.gpu.devices,featureStatus:info.gpu.featureStatus,auxAttributes:info.gpu.auxAttributes};
  report.canvas=await page.locator('#world').evaluate(c=>{const gl=c.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return {width:c.width,height:c.height,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};});
  await page.locator('#enter').click();await sample('hub');if(process.env.PERF_HUB_ONLY==='1')return;
  await page.locator('#map').click();await page.getByRole('button',{name:/The Dividend Sea/}).click();await page.keyboard.down('ArrowLeft');await sample('dance-turn');await page.keyboard.up('ArrowLeft');
  await page.locator('#map').click();await sample('directory');await page.locator('#close-panel').click();
  await page.locator('#menu').click();await sample('pause');await page.locator('#resume').click();
  await page.locator('#map').click();await page.getByRole('button',{name:/Unscheduled Encore/}).click();await sample('encore-library');
  await page.locator('.vn-chapter-card').first().getByRole('button',{name:/Begin scene/}).click();await sample('encore-film');
  await page.screenshot({path:out+'/encore.png'});console.log(JSON.stringify({result:'measured',browser:report.browser,canvas:report.canvas}));
 }finally{await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

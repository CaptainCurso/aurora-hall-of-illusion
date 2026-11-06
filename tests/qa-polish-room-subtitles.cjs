// Exercise same-room feedback followed by immediate relocation to another district.
// PLAYWRIGHT_PATH=/path/to/playwright node tests/qa-polish-room-subtitles.cjs http://127.0.0.1:8180/builds/v0.13.4/ /tmp/polish-subtitles
const fs = require('node:fs/promises');
const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const [url,out] = process.argv.slice(2);
if (!/^http:\/\/127\.0\.0\.1:\d+\//.test(url || '') || !out) process.exit(2);

(async () => {
  await fs.mkdir(out, {recursive:true});
  const browser = await chromium.launch({channel:'chrome', headless:true});
  const context = await browser.newContext({viewport:{width:1280,height:800}});
  const page = await context.newPage();
  const report = {url, browser:browser.version(), errors:[], note:'Actual UI, quiet entry and Spatial Assist; no injected progress.'};
  page.on('pageerror', e => report.errors.push(e.message));
  try {
    await page.goto(url);
    await page.locator('#loading').waitFor({state:'hidden', timeout:30000});
    await page.locator('#enter-muted').click();
    await page.locator('#menu').click();
    await page.locator('#assist').click();
    await page.locator('#resume').click();
    await page.locator('#map').click();
    await page.getByRole('button',{name:/The Dividend Sea/}).click();
    await page.getByRole('button',{name:/Give every citizen a private tempo/}).waitFor({timeout:60000});
    await page.getByRole('button',{name:/Give every citizen a private tempo/}).click();
    await page.waitForFunction(() => document.querySelector('#subtitle').textContent.includes('Fifteen private tempos'));
    const before = await page.locator('#subtitle').innerText();
    assert.match(before, /Fifteen private tempos/);
    await page.locator('#map').click();
    await page.getByRole('button',{name:/The Velvet Lease/}).click();
    await page.waitForFunction(() => aurora3DDebug().room === 'lounge' && !aurora3DDebug().transitioning, null, {timeout:30000});
    const after = await page.locator('#subtitle').innerText();
    assert.ok(!after.includes('Fifteen private tempos'), 'previous room’s transient caption must not carry into Velvet');
    await page.waitForFunction(() => document.querySelector('#voice-caption').textContent.includes('SILENT TRANSCRIPT'));
    const voiceCaption = await page.locator('#voice-caption').innerText();
    assert.match(voiceCaption, /SILENT TRANSCRIPT/i, 'new room cue retains its quiet transcript');
    await page.screenshot({path:out+'/velvet-after-relocation.png'});
    assert.deepEqual(report.errors, []);
    Object.assign(report,{result:'pass', before, after, voiceCaption});
  } catch (error) {
    report.result='fail'; report.failure=error.stack;
    await page.screenshot({path:out+'/failure.png'}).catch(()=>{});
  } finally {
    await context.close(); await browser.close();
    await fs.writeFile(out+'/room-subtitles.json',JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2));
    if(report.result!=='pass')process.exitCode=1;
  }
})();

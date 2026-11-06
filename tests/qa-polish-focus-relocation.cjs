// Regression: selecting a room must return keyboard focus to the navigable world.
// PLAYWRIGHT_PATH=/path/to/playwright node tests/qa-polish-focus-relocation.cjs http://127.0.0.1:8180/builds/v0.13.4/ /tmp/polish-focus
const fs = require('node:fs/promises');
const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const [url, out] = process.argv.slice(2);
if (!/^http:\/\/127\.0\.0\.1:\d+\//.test(url || '') || !out) process.exit(2);

(async () => {
  await fs.mkdir(out, {recursive:true});
  const browser = await chromium.launch({headless:true, channel:'chrome'});
  const context = await browser.newContext({viewport:{width:1280,height:800}});
  await context.addInitScript(() => {
    window.__qaKeys = [];
    window.addEventListener('keydown', e => {
      if (e.code === 'Space') setTimeout(() => window.__qaKeys.push({code:e.code, prevented:e.defaultPrevented, target:e.target.id}), 0);
    });
  });
  const page = await context.newPage();
  const report = {url, browser:browser.version(), errors:[], note:'Real keyboard events and read-only diagnostics, isolated fresh profile.'};
  page.on('pageerror', e => report.errors.push(e.message));
  try {
    await page.goto(url);
    await page.locator('#loading').waitFor({state:'hidden', timeout:30000});
    await page.locator('#enter-muted').click();
    await page.waitForFunction(() => aurora3DDebug().started && !aurora3DDebug().transitioning);

    // Ordinary dismissal still returns focus to the control that opened the programme.
    await page.locator('#map').click();
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'map');
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(300);
    await page.keyboard.up('KeyW');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'world', 'movement after dismissal must restore world focus');
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__qaKeys.length > 0);
    const afterDismiss = await page.evaluate(() => window.__qaKeys.at(-1));
    assert.equal(afterDismiss.target, 'world');
    assert.equal(afterDismiss.prevented, true, 'world accepts Space after dismissed menu and movement');
    assert.equal((await page.evaluate(() => aurora3DDebug())).panelOpen, false);
    await page.evaluate(() => { window.__qaKeys.length = 0; });
    await page.locator('#map').click();
    await page.getByRole('button', {name:/The Dividend Sea/}).click();
    await page.waitForFunction(() => aurora3DDebug().room === 'dance' && !aurora3DDebug().transitioning, null, {timeout:30000});
    assert.equal(await page.evaluate(() => document.activeElement.id), 'world', 'room selection must focus world rather than programme opener');
    const before = await page.evaluate(() => aurora3DDebug().position);
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(450);
    await page.keyboard.up('KeyW');
    const after = await page.evaluate(() => aurora3DDebug().position);
    assert.ok(Math.hypot(after.x-before.x, after.z-before.z) > .05, 'W moves in the selected room');
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__qaKeys.length > 0);
    const space = await page.evaluate(() => window.__qaKeys.at(-1));
    assert.equal(space.target, 'world');
    assert.equal(space.prevented, true, 'world Space handler accepted the pulse input');
    assert.equal((await page.evaluate(() => aurora3DDebug())).panelOpen, false, 'Space must not reopen programme');
    await page.screenshot({path:out+'/after-space.png'});
    assert.deepEqual(report.errors, []);
    report.result = 'pass';
    report.afterDismiss = afterDismiss;
    report.movement = {before,after};
    report.space = space;
  } catch (error) {
    report.result = 'fail';
    report.failure = error.stack;
    await page.screenshot({path:out+'/failure.png'}).catch(() => {});
  } finally {
    await context.close();
    await browser.close();
    await fs.writeFile(out+'/focus-relocation.json', JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2));
    if (report.result !== 'pass') process.exitCode = 1;
  }
})();

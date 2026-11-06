// Isolated browser profiles, UI actions, and deliberately failed storage writes.
// Run: PLAYWRIGHT_PATH=/path/to/playwright node tests/qa-polish-storage-reset.cjs http://127.0.0.1:8180/builds/v0.13.4/ /tmp/polish-storage-reset
// Uses the installed Chrome browser. No user's save is accessed.
const fs = require('node:fs/promises');
const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const [url, out] = process.argv.slice(2);
if (!/^http:\/\/127\.0\.0\.1:\d+\//.test(url || '') || !out) process.exit(2);
const keys = {world:'aurora7.hypermedia.v1', settings:'aurora7.hypermedia.preferences.v1', encore:'aurora7.encore.v1'};

(async () => {
  await fs.mkdir(out, {recursive:true});
  const browser = await chromium.launch({headless:true, channel:'chrome'});
  const report = {url, browser:browser.version(), cases:[], errors:[], note:'Disposable browser contexts; storage failures deliberately injected; no real user save.'};
  const context = async () => browser.newContext({viewport:{width:1280,height:800}});
  try {
    for (const [kind, key] of Object.entries(keys)) {
      const c = await context();
      await c.addInitScript(({key}) => {
        const nativeSet = Storage.prototype.setItem;
        Storage.prototype.setItem = function(k, v) {
          if (k === key) throw new DOMException('QA simulated storage failure', 'QuotaExceededError');
          return nativeSet.call(this, k, v);
        };
      }, {key});
      const p = await c.newPage();
      p.on('pageerror', e => report.errors.push(kind + ': ' + e.message));
      await p.goto(url);
      await p.locator('#loading').waitFor({state:'hidden', timeout:30000});
      await p.locator(kind === 'encore' ? '#encore-muted' : '#enter-muted').click();
      if (kind === 'settings') {
        await p.locator('#menu').click();
        await p.locator('#comfort').click();
      }
      if (kind === 'encore') await p.locator('.vn-chapter-card').first().getByRole('button',{name:/Begin scene/}).click();
      const status = p.locator('#save-notice [role="status"]');
      await status.waitFor({state:'visible', timeout:10000});
      const message = await status.innerText();
      const expected = {world:'exhibition progress', settings:'settings', encore:'Encore progress'}[kind];
      assert.ok(message.includes(expected), `notice should identify failed ${kind} store`);
      assert.ok(message.includes('could not save') && message.includes('keep playing') && message.includes('lost'));
      for (const other of Object.keys(keys).filter(x => x !== kind)) {
        assert.ok(!message.includes({world:'exhibition progress', settings:'settings', encore:'Encore progress'}[other]), `must not claim ${other} failed`);
      }
      assert.equal(await status.getAttribute('aria-live'), 'polite');
      await p.locator('#save-notice button').click();
      assert.equal(await p.locator('#save-notice').isVisible(), false);
      report.cases.push({kind, message, dismissed:true});
      await c.close();
    }
    const c = await context();
    const p = await c.newPage();
    p.on('pageerror', e => report.errors.push('reset: ' + e.message));
    await p.goto(url);
    await p.locator('#loading').waitFor({state:'hidden', timeout:30000});
    await p.locator('#enter-muted').click();
    await p.locator('#menu').click();
    await p.locator('#comfort').click();
    await p.locator('#resume').click();
    await p.locator('#map').click();
    await p.getByRole('button', {name:/The Velvet Lease/}).click();
    await p.waitForFunction(() => aurora3DDebug().room === 'lounge');
    await p.locator('#map').click();
    await p.getByRole('button', {name:/The Unscheduled Encore/}).click();
    await p.locator('.vn-chapter-card').first().getByRole('button',{name:/Begin scene/}).click();
    await p.locator('#vn-close').click();
    const snapshot = () => p.evaluate(keys => Object.fromEntries(Object.entries(keys).map(([name,key]) => [name,localStorage.getItem(key)])), keys);
    const before = await snapshot();
    assert.ok(before.world && before.settings && before.encore, 'all three stores must have actual UI-created data');
    await p.locator('#menu').click();
    await p.locator('#restart').click();
    assert.equal(await p.locator('#reset-cancel').evaluate(e => e === document.activeElement), true, 'cancel has initial focus');
    await p.locator('#reset-cancel').click();
    assert.deepEqual(await snapshot(), before, 'cancellation preserves all stores');
    await p.locator('#restart').click();
    await p.locator('#reset-accept').click();
    await p.waitForFunction(() => aurora3DDebug().started && aurora3DDebug().room === 'hub');
    const after = await snapshot();
    assert.equal(after.settings, before.settings, 'world restart preserves settings');
    assert.equal(after.encore, before.encore, 'world restart preserves Encore progress');
    assert.notEqual(after.world, before.world, 'world save was reset');
    const world = JSON.parse(after.world);
    assert.deepEqual(world.evidence, []);
    assert.equal(world.room, 'hub');
    report.cases.push({kind:'world-reset', cancelledPreserved:true, confirmedWorldOnly:true});
    await c.close();
    assert.deepEqual(report.errors, []);
    report.result = 'pass';
  } catch (error) {
    report.result = 'fail';
    report.failure = error.stack;
  } finally {
    await browser.close();
    await fs.writeFile(out + '/storage-reset.json', JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
    if (report.result !== 'pass') process.exitCode = 1;
  }
})();

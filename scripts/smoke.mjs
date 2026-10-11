// The built game boots in a real browser: no page errors, the title takes a name, the town loads, the first
// conversation shows and can be clicked through, the hero walks, and the first Latin answer is accepted.
// `npm run build && npm run smoke`. Catches what typecheck and unit tests can't (a bundling or JSX mistake).
import { preview } from 'vite';
import { launch, newPage, DESKTOP } from 'ymir/testkit/browser';

const server = await preview({ preview: { port: 5182, strictPort: true }, logLevel: 'warn' });
const url = server.resolvedUrls?.local[0] ?? 'http://localhost:5182/';
const browser = await launch();
let failed = '';
let errors = [];
let page = null;
try {
  const p = await newPage(browser, DESKTOP);
  page = p.page;
  errors = p.errors;
  await page.goto(`${url}?platform=memory&qa`);
  await page.waitForSelector('[data-ui=title]', { timeout: 30_000 });
  await page.waitForSelector('#world canvas');
  await page.fill('[data-ui=name]', 'Milo');
  await page.click('[data-ui=begin]');
  await page.waitForSelector('[data-ui=dialogue]', { timeout: 60_000 });
  // the arrival: click through until the conversation ends
  // (wait for each click to land in the sim before the next: software rendering is slow)
  for (let guard = 0; guard < 20 && (await page.evaluate(() => !!window.__game.sim().talk)); guard++) {
    const at = await page.evaluate(() => JSON.stringify(window.__game.sim().talk?.cursor));
    await page.locator('[data-ui=dialogue]').click({ timeout: 5_000 }).catch(() => {});
    await page.waitForFunction((c) => JSON.stringify(window.__game.sim().talk?.cursor) !== c, at, { timeout: 10_000 }).catch(() => {});
  }
  await page.waitForSelector('[data-ui=objective]');
  // The hero's position from the sim itself (the `?qa` hook): coins animate on their own, so pixels can't tell.
  const heroX = () => page.evaluate(() => window.__game.sim().hero.x);
  // Hold D until the hero has walked a unit. Headless software rendering is slow and Stage caps each
  // frame's step, so wait on the sim, not on a fixed time.
  const before = await heroX();
  await page.keyboard.down('KeyD');
  const moved = await page.waitForFunction((x0) => window.__game.sim().hero.x > x0 + 1, before, { timeout: 15_000 }).then(() => true, () => false);
  // keep walking to the gate: the toll collector asks «Quis es?»
  await page.keyboard.down('ShiftLeft');
  const asked = await page.waitForSelector('[data-ui=answer-0]', { timeout: 120_000 }).then(() => true, async () => {
    // lines before the question: click through them
    for (let i = 0; i < 6; i++) { if (await page.$('[data-ui=answer-0]')) return true; await page.locator('[data-ui=dialogue]').click({ timeout: 5_000 }).catch(() => {}); await page.waitForTimeout(500); }
    return !!(await page.$('[data-ui=answer-0]'));
  });
  await page.keyboard.up('ShiftLeft');
  await page.keyboard.up('KeyD');
  let answered = false;
  if (asked) {
    await page.click('[data-ui=answer-0]');
    answered = await page.waitForFunction(() => window.__game.sim().answers.some((a) => a.id === 'quis-es' && a.grade === 'right'), null, { timeout: 10_000 }).then(() => true, () => false);
  }
  if (errors.length) failed = `page errors: ${errors.join(' | ')}`;
  else if (!moved) failed = 'the hero did not move when D was held';
  else if (!asked) failed = 'the toll collector never asked who we are';
  else if (!answered) failed = 'the right answer to «Quis es?» was not accepted';
} catch (e) {
  await page?.screenshot({ path: 'test-results/smoke-failed.png' }).catch(() => {});
  // Page errors first: "React is not defined" says more than the timeout it caused.
  failed = errors.length ? `page errors: ${errors.join(' | ')}` : String(e).split('\n')[0];
} finally {
  await browser.close();
  await server.close();
}
if (failed) { console.error(`SMOKE FAILED: ${failed}`); process.exit(1); }
console.log('SMOKE OK');

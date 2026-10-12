// The open city in a real browser (dev server on 5180): name tags and shop signs over the street, a shop
// (buy bread), the satchel, journal and map, a pickup, and walking off Via Marina into the Forum.
// Screenshots in test-results/city-*.png. `node scripts/qa-city.mjs [url]`.
import { launch, newPage, DESKTOP } from 'ymir/testkit/browser';

const url = process.argv[2] ?? 'http://localhost:5180/';
const browser = await launch();
const { page, errors } = await newPage(browser, DESKTOP);
const shot = (n) => page.screenshot({ path: `test-results/city-${n}.png` });
const sim = () => page.evaluate(() => window.__game.sim());
const until = (fn, arg, timeout = 60_000) => page.waitForFunction(fn, arg, { timeout });
const fail = [];
const log = (m) => console.log('·', m);
try {
  await page.goto(`${url}?platform=memory&qa`);
  await page.waitForSelector('[data-ui=title]', { timeout: 60_000 });
  await page.fill('[data-ui=name]', 'Milo');
  await page.click('[data-ui=begin]');
  await page.waitForSelector('[data-ui=dialogue]', { timeout: 120_000 });
  // past the arrival and the gate: up Via Marina among the shops
  await page.evaluate(() => { window.__game.patch({ talk: null, flags: ['passedGate'], objective: 'house' }); window.__game.teleport(400, 222, Math.PI); });
  await page.waitForTimeout(2500);
  await shot('street');
  const tags = await page.$$eval('.tags .tag', (els) => els.filter((e) => Number(e.style.opacity) > 0.5 && e.style.visibility !== 'hidden').map((e) => e.textContent));
  const signs = await page.$$eval('.tags .sign', (els) => els.filter((e) => Number(e.style.opacity) > 0.5).map((e) => e.textContent));
  console.log('tags:', tags.join(' | '));
  console.log('signs:', signs.join(' | '));
  if (!tags.length) fail.push('no name tags near the hero');
  if (!signs.length) fail.push('no shop signs near the hero');
  // the baker's: open the counter, buy two loaves
  await page.evaluate(() => window.__game.patch({ shop: 'baker' }));
  await page.waitForSelector('[data-ui=shop]');
  await page.click('[data-ui=buy-bread]');
  await until(() => window.__game.sim().items.bread === 1);
  await page.click('[data-ui=buy-bread]');
  await until(() => window.__game.sim().items.bread === 2);
  await page.waitForTimeout(400);
  await shot('shop');
  log('bought');
  await page.click('[data-ui=leave]');
  await until(() => !window.__game.sim().shop);
  // the panels
  for (const p of ['bag', 'journal', 'map']) {
    log(`panel ${p}`);
    await page.click(`[data-ui=open-${p}]`);
    await page.waitForSelector(`[data-ui=panel-${p}]`);
    await page.waitForTimeout(1500); // the sheet fades in (slow under software rendering)
    await shot(`panel-${p}`);
    await page.keyboard.press('Escape');
    await page.waitForSelector(`[data-ui=panel-${p}]`, { state: 'detached' });
  }
  // a knucklebone in the street: walk onto it and pick it up
  await page.evaluate(() => window.__game.teleport(440, 205, Math.PI));
  await page.waitForTimeout(3000); // the camera glides after a teleport
  await shot('pickup');
  await page.keyboard.press('KeyE');
  await until(() => (window.__game.sim().items.talus ?? 0) === 1, null, 10_000).catch(() => fail.push('the knucklebone was not picked up'));
  await page.waitForTimeout(300);
  await shot('toast');
  // east to the end of Via Marina: into the Forum
  await page.evaluate(() => window.__game.teleport(610, 216, Math.PI / 2));
  await page.keyboard.down('KeyD');
  await until(() => window.__game.sim().district === 'forum', null, 60_000).catch(() => fail.push('never reached the Forum'));
  await page.keyboard.up('KeyD');
  await until(() => window.__game.view().screen === 'play', null, 120_000);
  await page.waitForTimeout(1500);
  await shot('forum');
  const s = await sim();
  console.log('in', s.district, 'visited', s.visited.join(','), 'coins', s.coins, 'items', JSON.stringify(s.items));
} catch (e) {
  fail.push(String(e).split('\n').slice(0, 12).join('\n'));
  await shot('failed').catch(() => {});
}
if (errors.length) fail.push(`page errors: ${errors.join(' | ')}`);
await browser.close();
if (fail.length) { console.error('FAIL', fail.join('; ')); process.exit(1); }
console.log('qa-city ok');

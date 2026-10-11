// A tour of the city for screenshots (dev server on 5180): each district from the hero's camera, at
// its landmarks. `node scripts/qa-tour.mjs [url]` → test-results/tour-*.png.
import { launch, newPage, DESKTOP } from 'ymir/testkit/browser';

const url = process.argv[2] ?? 'http://localhost:5180/';
const only = process.argv[3];
const STOPS = [
  ['portaMarina', 'quay', 60, 240, 'pm-quay'],
  ['portaMarina', 'quay', 300, 214, 'pm-street'],
  ['forum', 'west', 320, 300, 'forum-piazza'],
  ['forum', 'west', 520, 110, 'forum-macellum'],
  ['abbondanza', 'west', 120, 190, 'abb-bakery'],
  ['abbondanza', 'west', 400, 190, 'abb-thermopolium'],
  ['abbondanza', 'west', 545, 200, 'abb-crossroads'],
];
const browser = await launch();
const { page, errors } = await newPage(browser, DESKTOP);
await page.goto(`${url}?platform=memory&qa`);
await page.waitForSelector('[data-ui=title]', { timeout: 60_000 });
await page.fill('[data-ui=name]', 'Milo');
await page.click('[data-ui=begin]');
await page.waitForSelector('[data-ui=dialogue]', { timeout: 120_000 });
await page.evaluate(() => window.__game.patch({ talk: null, flags: ['passedGate'], objective: 'house' }));
let at = 'portaMarina';
for (const [d, spawn, x, z, name] of STOPS.filter((s) => !only || s[4] === only)) {
  if (d !== at) {
    await page.evaluate(([d, spawn]) => window.__game.go(d, spawn), [d, spawn]);
    await page.waitForFunction(() => window.__game.view().screen === 'play', null, { timeout: 180_000 });
    at = d;
  }
  await page.evaluate(([x, z]) => window.__game.teleport(x, z, Math.PI), [x, z]);
  // mesh the whole district and its ring now (a player walking streams it in as they go)
  await page.evaluate(() => window.__game.world().town.syncAll());
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `test-results/tour-${name}.png` });
  console.log('shot', name);
}
if (errors.length) console.error('page errors', errors.join(' | '));
await browser.close();

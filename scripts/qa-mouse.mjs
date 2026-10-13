// The mouse in a real browser (dev server on 5180): hovering someone shows a hand, a gold ring and the Latin
// for what a click would do; holding the button walks toward the pointer; a quick click walks to a place; a
// click on someone walks up and talks. Screenshot in test-results/mouse-hover.png. `node scripts/qa-mouse.mjs [url]`.
import { launch, newPage, DESKTOP } from 'ymir/testkit/browser';

const url = process.argv[2] ?? 'http://localhost:5180/';
const browser = await launch();
const { page, errors } = await newPage(browser, DESKTOP);
const sim = () => page.evaluate(() => { const s = window.__game.sim(); return { x: s.hero.x, z: s.hero.z, route: s.route, talk: s.talk?.with ?? null }; });
const screenOf = (id) => page.evaluate((id) => {
  const w = window.__game.world(), L = w.level, n = L.npcs.find((n) => n.id === id);
  return w.stage.toScreen(n.x / 8, (L.groundAt(n.x, n.z) + 8) / 8, n.z / 8);
}, id);
const fail = [];
await page.goto(`${url}?platform=memory&qa&quality=low`);
await page.waitForSelector('[data-ui=title]', { timeout: 60_000 });
await page.fill('[data-ui=name]', 'Milo');
await page.click('[data-ui=begin]');
await page.waitForFunction(() => window.__game.view().screen === 'play', null, { timeout: 180_000 });
await page.evaluate(() => window.__game.patch({ talk: null, flags: ['passedGate'], objective: 'house' }));
await page.evaluate(() => { window.__game.teleport(400, 214, Math.PI / 2); window.__game.world().started = false; });
await page.waitForTimeout(2500);

// hover: Lucius by the fountain
const lucius = await screenOf('kids');
await page.mouse.move(lucius.x + 4, lucius.y + 4, { steps: 4 });
const hover = await page.waitForSelector('[data-ui=hover]', { timeout: 10_000 }).then((h) => h.textContent(), () => null);
const cursor = await page.evaluate(() => document.body.dataset.cursor);
if (!hover?.includes('Salūtā')) fail.push(`hovering Lucius shows «${hover}», not «Salūtā»`);
if (cursor !== 'act') fail.push(`the cursor over Lucius is "${cursor}", not a hand`);
await page.screenshot({ path: 'test-results/mouse-hover.png' });
console.log('· hover', hover, cursor);

// hold: the button down to the hero's left until they've walked two metres
const hero = await page.evaluate(() => window.__game.world().heroScreen(window.__game.sim()));
await page.mouse.move(hero.x - 260, hero.y + 70);
const before = await sim();
await page.mouse.down();
// wait on the sim, not the clock: software rendering runs few frames a second
await page.waitForFunction((x0) => window.__game.sim().hero.x < x0 - 16, before.x, { timeout: 30_000 }).catch(() => {});
const during = await sim();
await page.mouse.up();
await page.waitForTimeout(300);
const after = await sim();
if (!(during.x < before.x - 16)) fail.push(`holding left of the hero walked ${before.x - during.x} voxels west`);
if (after.route) fail.push('a held walk left a click behind (a route)');
console.log('· hold', Math.round(before.x), '→', Math.round(during.x), 'route after', !!after.route);

// a quick click on a place: a route there
await page.mouse.click(hero.x + 200, hero.y + 40);
await page.waitForTimeout(400);
if (!(await sim()).route) fail.push('a quick click set no route');
await page.waitForFunction(() => !window.__game.sim().route, null, { timeout: 60_000 }).catch(() => fail.push('the click walk never arrived'));
console.log('· click walk', JSON.stringify(await sim()));

// a click on Lucius: walk up and talk
const l2 = await screenOf('kids');
await page.mouse.click(l2.x + 4, l2.y + 4);
await page.waitForFunction(() => !!window.__game.sim().talk, null, { timeout: 60_000 }).catch(() => {});
const talked = (await sim()).talk;
if (talked !== 'kids') fail.push(`clicking Lucius started «${talked}»`);
console.log('· click Lucius', talked);

if (errors.length) fail.push(`page errors: ${errors.join(' | ')}`);
await browser.close();
if (fail.length) { console.error(`qa-mouse FAILED:\n- ${fail.join('\n- ')}`); process.exit(1); }
console.log('qa-mouse ok');

// The built game boots in a real browser: no page errors, the HUD is up, the world draws, the hero walks.
// `npm run build && npm run smoke`. Catches what typecheck and unit tests can't (a bundling or JSX mistake).
import { preview } from 'vite';
import { launch, newPage, DESKTOP } from 'ymir/testkit/browser';

const server = await preview({ preview: { port: 5182, strictPort: true }, logLevel: 'warn' });
const url = server.resolvedUrls?.local[0] ?? 'http://localhost:5182/';
const browser = await launch();
let failed = '';
let errors = [];
try {
  const p = await newPage(browser, DESKTOP);
  const page = p.page;
  errors = p.errors;
  await page.goto(`${url}?platform=memory&qa`);
  await page.waitForSelector('[data-currency-bar]', { timeout: 15_000 });
  await page.waitForSelector('#world canvas');
  // The hero's position from the sim itself (the `?qa` hook): coins animate on their own, so pixels can't tell.
  const heroX = () => page.evaluate(() => window.__game.sim().hero.x);
  // Hold D until the hero has walked a unit. Headless software rendering is slow and Stage caps each
  // frame's step, so wait on the sim, not on a fixed time.
  const before = await heroX();
  await page.keyboard.down('KeyD');
  const moved = await page.waitForFunction((x0) => window.__game.sim().hero.x > x0 + 1, before, { timeout: 5_000 }).then(() => true, () => false);
  await page.keyboard.up('KeyD');
  if (errors.length) failed = `page errors: ${errors.join(' | ')}`;
  else if (!moved) failed = 'the hero did not move when D was held';
} catch (e) {
  // Page errors first: "React is not defined" says more than the timeout it caused.
  failed = errors.length ? `page errors: ${errors.join(' | ')}` : String(e).split('\n')[0];
} finally {
  await browser.close();
  await server.close();
}
if (failed) { console.error(`SMOKE FAILED: ${failed}`); process.exit(1); }
console.log('SMOKE OK');

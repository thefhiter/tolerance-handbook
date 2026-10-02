// End-to-end smoke test in real Chrome: every page renders in EN and FR, no script errors,
// no horizontal page scroll at phone and desktop widths, key calculators give known answers.
// Usage: node tests/e2e/smoke.cjs [path/to/page.html] [--shots]   (needs the `playwright` package resolvable)
//        node tests/e2e/smoke.cjs --cdp http://127.0.0.1:9222        (drives the running desktop exe started with
//                                                                     TOLERANCE_HANDBOOK_DEBUG=1, through WebView2)
const path = require('path');
const { chromium } = require('playwright');

const CDP = process.argv.includes('--cdp') ? process.argv[process.argv.indexOf('--cdp') + 1] : null;
const target = process.argv.slice(2).find((a) => !a.startsWith('--') && a !== CDP) || path.join(__dirname, '..', '..', 'index.html');
const URL = require('url').pathToFileURL(path.resolve(target)).href;
const SHOTS = process.argv.includes('--shots');
const fails = [];
const fail = (m) => { fails.push(m); console.log('FAIL', m); };

(async () => {
  const browser = CDP ? await chromium.connectOverCDP(CDP) : await chromium.launch({ channel: 'chrome' });
  for (const vp of [{ width: 1366, height: 860 }, { width: 375, height: 760 }]) {
    const page = CDP ? browser.contexts()[0].pages()[0] : await browser.newPage({ viewport: vp });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    if (CDP) {
      await page.setViewportSize(vp);
      await page.evaluate(() => { location.hash = '#/home'; });
      await page.reload();
      console.log('desktop app page:', page.url());
    } else await page.goto(URL + '#/home');
    const ids = await page.evaluate(() => TH.modules.map((m) => m.id));
    for (const lang of ['en', 'fr']) {
      await page.evaluate((l) => TH.setLang(l), lang);
      for (const id of ids) {
        await page.evaluate((i) => { location.hash = '#/' + i; }, id);
        await page.waitForFunction((i) => document.querySelector('.page')?.dataset.module === i, id);
        const info = await page.evaluate(() => ({
          h1: document.querySelector('.page h1')?.textContent || '',
          warn: [...document.querySelectorAll('.page .note')].map((n) => n.textContent).find((t) => /failed to render|Erreur d’affichage/.test(t)),
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          lang: document.documentElement.lang
        }));
        if (!info.h1) fail(`${vp.width} ${lang} ${id}: no h1`);
        if (info.warn) fail(`${vp.width} ${lang} ${id}: ${info.warn}`);
        if (info.overflow > 1) fail(`${vp.width} ${lang} ${id}: horizontal overflow ${info.overflow}px`);
        if (info.lang !== lang) fail(`${id}: html lang ${info.lang}`);
        if (SHOTS && vp.width === 1366) {
          await page.screenshot({ path: path.join(__dirname, '..', '..', 'docs', 'images', `${id}-${lang}.png`) });
        }
      }
    }
    // Known answers in the fit calculator (EN).
    await page.evaluate(() => { TH.setLang('en'); location.hash = '#/fits'; });
    await page.waitForSelector('#fitDesig');
    await page.fill('#fitDesig', 'Ø50 H7/g6');
    let txt = await page.textContent('.page');
    if (!/Clearance fit/.test(txt) || !/0\.05 mm/.test(txt) || !/0\.009 mm/.test(txt)) fail('fits: 50 H7/g6 should give clearance 0.05 / 0.009 mm');
    await page.fill('#fitDesig', '30 H7/s6');
    txt = await page.textContent('.page');
    if (!/Interference fit/.test(txt) || !/0\.048 mm/.test(txt)) fail('fits: 30 H7/s6 should give max interference 0.048 mm');
    // French decimal comma.
    await page.evaluate(() => TH.setLang('fr'));
    txt = await page.textContent('.page');
    if (!/0,048 mm/.test(txt) || !/Ajustement avec serrage/.test(txt)) fail('fits FR: expected decimal comma and French fit type');
    if (errors.length) fail(`${vp.width}: script errors: ${[...new Set(errors)].join(' | ')}`);
    if (!CDP) await page.close();
  }
  if (!CDP) await browser.close();
  console.log(fails.length ? `\n${fails.length} failure(s)` : '\nE2E OK');
  process.exit(fails.length ? 1 : 0);
})();

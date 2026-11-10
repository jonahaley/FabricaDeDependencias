// Node 22+, optional absolute path to playwright/index.mjs as the first argument.
// Runs real controls in isolated profiles, with deterministic background ticks.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import net from 'node:net';
import { Game, SAVE_KEY } from '../src/game.js';
import { TUTORIAL_STEPS, TUTORIAL_KEY } from '../src/tutorial.js';

const { chromium } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : 'playwright');
const reservation = net.createServer();
await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
const port = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
const server = spawn(process.execPath, ['scripts/server.mjs', '--dist'], { env: { ...process.env, PORT: String(port) }, windowsHide: true, stdio: 'pipe' });
const origin = `http://127.0.0.1:${port}`;
let browser, page;
const errors = [];
try {
  for (let i = 0; i < 50; i++) { if (await fetch(origin).then(r => r.ok).catch(() => false)) break; await delay(100); }
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
  await mkdir('.playwright-mcp', { recursive: true });
  for (const width of [1440, 390, 320]) {
    const campaign = new Game();
    campaign.propose('editor', 'Proyecto conservado'); campaign.install('pixel-press'); campaign.deployAll(); campaign.start(); campaign.tick();
    const expected = structuredClone(campaign.state); expected.paused = true;
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript(({ key, state }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
      localStorage.setItem('npm-factory-tutorial-v1', 'complete');
      const nativeInterval = window.setInterval;
      window.setInterval = (fn, ms, ...args) => {
        if (ms === 1000) { window.advanceStudio = () => { for (let i = 0; i < 100; i++) fn(); }; return 99999; }
        return nativeInterval(fn, ms, ...args);
      };
    }, { key: SAVE_KEY, state: campaign.state });
    page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin);
    await page.locator('.tutorial-launch').click();
    assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY), expected);
    // An unrelated action cannot restart the studio or skip a tutorial step.
    await page.locator('[data-action="restart"]').click();
    assert.equal(await page.locator('#modal').evaluate(el => el.open), false);
    assert.equal(await page.locator('#tutorial').getAttribute('data-step'), '0');
    for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
      const step = TUTORIAL_STEPS[i];
      await page.waitForFunction(index => document.querySelector('#tutorial').dataset.step === String(index), i);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
      assert.equal(await page.locator('#tutorial-title').innerText(), step.title);
      const selector = step.action === 'tutorial-next' ? '#tutorial [data-action="tutorial-next"]' : step.target;
      const control = page.locator(selector);
      assert.equal(await control.isVisible(), true, `${width}: visible · ${step.title}`);
      assert.equal(await control.isEnabled(), true, `${width}: habilitado · ${step.title}`);
      // Detect overlays and clipping rather than letting Playwright scroll around them.
      assert.equal(await control.evaluate(el => {
        const rect = el.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return hit === el || el.contains(hit);
      }), true, `${width}: accesible · ${step.title}`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${width}: sin desbordamiento`);
      await page.evaluate(() => window.advanceStudio());
      assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY), expected);
      if (i === 10 || i === 24) await page.screenshot({ path: `.playwright-mcp/tutorial-${width}-${i}.png` });
      if (step.action === 'project-size') await control.selectOption(step.id);
      else {
        if (step.action === 'propose') await page.locator('#project-name').fill('Galería guiada');
        await control.click();
      }
      if (step.action === 'audit') assert.match(await page.locator('#logs').innerText(), /0 avisos conocidos/);
      if (step.next === 'Avanzar hasta el incidente') assert.match(await page.locator('#order').innerText(), /35\/60 unidades/);
    }
    await page.waitForFunction(() => document.querySelector('#tutorial-title').textContent === 'Tu primer lanzamiento, completado.');
    assert.match(await page.locator('#release-report').innerText(), /Galería guiada/);
    assert.match(await page.locator('#studio-level').innerText(), /NIVEL 2/);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), TUTORIAL_KEY), 'complete');
    await page.screenshot({ path: `.playwright-mcp/tutorial-${width}-complete.png` });
    await page.getByRole('button', { name: 'Volver a mi estudio', exact: true }).click();
    assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY), expected);
    assert.equal(await page.locator('.project-identity h1').innerText(), 'Proyecto conservado');
    assert.equal(await page.locator('.tutorial-launch').innerText(), 'Repetir tutorial');
    // The guide can replay the tutorial; reloading mid-practice restores the saved studio.
    await page.getByRole('button', { name: 'Guía de seguridad', exact: true }).click();
    await page.locator('#modal [data-action="tutorial-start"]').click();
    assert.equal(await page.locator('#tutorial').getAttribute('data-step'), '0');
    await page.locator('#tutorial [data-action="tutorial-next"]').click();
    await page.reload();
    assert.equal(await page.locator('#tutorial').isVisible(), false);
    assert.equal(await page.locator('.project-identity h1').innerText(), 'Proyecto conservado');
    assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY), expected);
    await context.close();
    console.log(`Tutorial completo, repetición y guardado verificados a ${width}px.`);
  }
  // Practice remains usable when the browser denies storage.
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Storage.prototype.getItem = Storage.prototype.setItem = () => { throw new DOMException('Storage disabled', 'SecurityError'); };
  });
  page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin); await page.locator('.tutorial-launch').click();
  await page.locator('#tutorial [data-action="tutorial-next"]').click();
  await page.getByRole('button', { name: 'Salir del tutorial', exact: true }).click();
  assert.equal(await page.locator('#studio-home').isVisible(), true);
  assert.match(await page.locator('#save-status').innerText(), /Guardado no disponible/);
  assert.deepEqual(errors, []);
  console.log('Tutorial sin almacenamiento y sin errores de JavaScript.');
} catch (error) {
  await page?.screenshot({ path: '.playwright-mcp/tutorial-failure.png' }).catch(() => {});
  throw error;
} finally {
  await browser?.close(); server.kill();
}

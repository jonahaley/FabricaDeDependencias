// Run with Node 22+ and a path to an installed playwright/index.mjs as the first argument.
// Uses an isolated headless browser and a disposable preview server; never the user's profile.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import net from 'node:net';
import { FILMS, filmDuration } from '../src/films.js';
import { SAVE_KEY } from '../src/game.js';

const { chromium } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : 'playwright');
const reservation = net.createServer();
await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
const port = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
const server = spawn(process.execPath, ['scripts/server.mjs', '--dist'], { env: { ...process.env, PORT: String(port) }, windowsHide: true, stdio: 'pipe' });
const origin = `http://127.0.0.1:${port}`;
let browser;
const errors = [];
try {
  for (let i = 0; i < 50; i++) { if (await fetch(origin).then(r => r.ok).catch(() => false)) break; await delay(100); }
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => {
    const NativeAudio = window.Audio; window.testAudio = [];
    window.Audio = function (...args) { const audio = new NativeAudio(...args); window.testAudio.push(audio); return audio; };
    window.Audio.prototype = NativeAudio.prototype;
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin);
  await page.getByRole('button', { name: 'Omitir por ahora' }).click();
  await page.locator('[data-action="install"]').click();
  await page.getByRole('button', { name: 'Cómo jugar', exact: true }).click();
  assert.equal(await page.locator('.film-card').count(), 10);
  assert.equal(await page.locator('.film-lesson-link').count(), 10);
  const campaign = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY);
  assert.ok(campaign?.started && campaign.paused);
  await mkdir('.playwright-mcp', { recursive: true });
  await page.screenshot({ path: '.playwright-mcp/cinema-library.png', fullPage: true });
  const latestAudio = () => page.evaluate(() => { const a = window.testAudio.at(-1); return { paused: a.paused, time: a.currentTime, duration: a.duration, muted: a.muted, src: a.getAttribute('src'), ready: a.readyState }; });
  const seekTo = async seconds => { await page.locator('.film-seek').evaluate((element, value) => { element.value = String(value); element.dispatchEvent(new Event('input', { bubbles: true })); }, seconds); };
  await page.locator('.film-card').first().click();
  await page.locator('.film-start').click();
  await page.waitForFunction(() => window.testAudio.at(-1).currentTime > 1);
  assert.ok((await latestAudio()).duration > 5);
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  const pausedTime = (await latestAudio()).time; await delay(400);
  assert.equal((await latestAudio()).time, pausedTime);
  await seekTo(FILMS[0].cues[0].duration + 1);
  await page.waitForFunction(() => window.testAudio.at(-1).readyState >= 3);
  assert.equal(await page.locator('.film-cue-title').textContent(), FILMS[0].cues[1].title);
  assert.ok((await latestAudio()).paused);
  await page.getByRole('button', { name: 'Reproducir', exact: true }).click();
  await page.waitForFunction(() => window.testAudio.at(-1).currentTime > 1.1);
  assert.ok((await latestAudio()).time < 3, 'La voz conserva el punto seleccionado');
  await page.getByRole('button', { name: 'Sonido activado', exact: true }).click();
  assert.equal((await latestAudio()).muted, true);
  await page.getByRole('button', { name: 'Subtítulos activados', exact: true }).click();
  assert.equal(await page.locator('.film-subtitle').isVisible(), false);
  await page.getByRole('button', { name: 'Subtítulos desactivados', exact: true }).click();
  await seekTo(FILMS[0].cues[0].duration + FILMS[0].cues[1].duration + 3);
  await delay(400); await page.screenshot({ path: '.playwright-mcp/cinema-desktop.png', fullPage: true });
  // Cross a real audio boundary instead of only jumping directly to a new sequence.
  await seekTo(FILMS[0].cues[0].duration - 0.25);
  await page.waitForFunction(() => document.querySelector('.film-shot').textContent === '02 / 04');
  await seekTo(filmDuration(FILMS[0]) - 0.15);
  await page.waitForFunction(() => document.querySelector('.film-live').textContent === 'CORTO COMPLETADO');
  assert.equal((await latestAudio()).paused, true);
  await page.locator('.film-start').click();
  await page.waitForFunction(() => window.testAudio.at(-1).currentTime > 0.2);
  assert.equal(await page.locator('.film-shot').textContent(), '01 / 04');
  await page.locator('.film-back').click();
  assert.equal((await latestAudio()).src, null);
  for (const film of FILMS) {
    await page.locator(`.film-card[data-id="${film.id}"]`).click();
    await page.locator('.film-start').click();
    await page.waitForFunction(() => window.testAudio.at(-1).currentTime > 0.1);
    assert.equal(await page.locator('.film-stage canvas').count(), 1);
    assert.equal(await page.locator('.film-subtitle p').textContent(), film.cues[0].text);
    await page.getByRole('button', { name: 'Pausar', exact: true }).click();
    for (let index = 0, seconds = 0; index < film.cues.length; seconds += film.cues[index++].duration) {
      await seekTo(seconds + 0.3);
      await page.waitForFunction(() => window.testAudio.at(-1).readyState >= 3);
      assert.equal(await page.locator('.film-cue-title').textContent(), film.cues[index].title);
      assert.ok((await latestAudio()).duration > 2);
    }
    await page.locator('.film-back').click();
    assert.equal((await latestAudio()).src, null);
    console.log(`OK: ${film.id}`);
  }
  const after = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY);
  assert.deepEqual(after, campaign, 'Los cortos no alteran la campaña pausada');
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(await page.locator('#modal').evaluate(e => e.scrollWidth <= e.clientWidth + 1), true, `Guía sin desbordamiento a ${width}px`);
    await page.locator('.film-card').first().click();
    await seekTo(25); await delay(120);
    assert.equal(await page.locator('#modal').evaluate(e => e.scrollWidth <= e.clientWidth + 1), true, `Reproductor sin desbordamiento a ${width}px`);
    await page.screenshot({ path: `.playwright-mcp/cinema-${width}.png`, fullPage: true });
    await page.locator('.film-back').click();
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('.film-card').first().click();
  await page.locator('.film-start').click();
  await page.waitForFunction(() => window.testAudio.at(-1).currentTime > 0.1);
  // Hidden-tab event exercises the exact handler without depending on headless window focus.
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  assert.equal((await latestAudio()).paused, true);
  await page.evaluate(() => { delete document.hidden; });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('#modal').open);
  assert.equal((await latestAudio()).src, null);
  assert.deepEqual(errors, []);
  const fallback = await context.newPage();
  fallback.on('pageerror', error => errors.push(error.message));
  await fallback.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) { return type.startsWith('webgl') ? null : original.call(this, type, ...args); };
  });
  await fallback.goto(origin);
  await fallback.getByRole('button', { name: 'Cómo jugar', exact: true }).click();
  await fallback.locator('.film-card').first().click();
  assert.ok(await fallback.locator('.film-no-webgl').isVisible());
  await fallback.locator('.film-start').click();
  await fallback.waitForFunction(() => window.testAudio.at(-1).currentTime > 0.2);
  await fallback.getByRole('button', { name: 'Cerrar', exact: true }).click();
  assert.equal(await fallback.evaluate(() => window.testAudio.at(-1).getAttribute('src')), null);
  // Missing audio remains an explicit, usable subtitle fallback instead of hanging the player.
  await fallback.route('**/src/audio/*.mp3', route => route.abort());
  await fallback.getByRole('button', { name: 'Cómo jugar', exact: true }).click();
  await fallback.locator('.film-card').first().click();
  await fallback.locator('.film-start').click();
  await fallback.waitForFunction(() => document.querySelector('.film-audio-status').textContent.includes('Audio no disponible'));
  await fallback.waitForFunction(() => Number(document.querySelector('.film-seek').value) > 0.5);
  await fallback.close();
  assert.deepEqual(errors, []);
  const response = await fetch(`${origin}/src/audio/audit-3.mp3`);
  assert.equal(response.headers.get('content-type'), 'audio/mpeg');
  console.log('PASS: 10 cortos / 40 audios, reproducción, pausa, búsqueda, fin, repetición, silencio, CC, cierre, campaña, 320/390/768 px, movimiento reducido, sin WebGL, sin audio y build estático.');
} finally { await browser?.close(); server.kill(); }

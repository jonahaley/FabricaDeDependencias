import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { FILMS, FilmClock, filmDuration, filmFrame } from '../src/films.js';
import { LESSONS } from '../src/catalog.js';
import { FILM_AUDIO } from '../src/film-audio.js';
import { filmDirection } from '../src/film-scene.js';

test('Cada concepto de la guía tiene un corto completo y narración acorde con el guion', async () => {
  assert.deepEqual(FILMS.map(film => film.lesson).sort((a, b) => a - b), LESSONS.map((_, index) => index));
  assert.equal(new Set(FILMS.map(film => film.id)).size, FILMS.length);
  const hashes = JSON.parse(await readFile(new URL('../src/audio/scripts.json', import.meta.url), 'utf8'));
  for (const film of FILMS) {
    assert.equal(film.cues.length, 4);
    assert.ok(filmDuration(film) > 35 && filmDuration(film) < 70);
    for (const [index, cue] of film.cues.entries()) {
      const name = `${film.id}-${index}.mp3`;
      assert.equal(hashes[name], createHash('sha256').update(cue.text).digest('hex'), `Narración desactualizada: ${name}`);
      assert.ok((await stat(new URL(`../src/audio/${name}`, import.meta.url))).size > 15000, name);
      assert.equal(cue.duration, FILM_AUDIO[film.id][index]);
    }
  }
});

test('Pausa, búsqueda y repetición conservan un reloj determinista', () => {
  const film = FILMS[0], clock = new FilmClock(film);
  clock.advance(8); assert.equal(clock.time, 0);
  clock.play(); clock.advance(5); clock.pause(); clock.advance(60); assert.equal(clock.time, 5);
  clock.seek(film.cues[0].duration); assert.equal(filmFrame(film, clock.time).index, 1);
  assert.equal(clock.playing, false, 'Buscar estando en pausa no reproduce');
  clock.play(); clock.seek(film.cues[0].duration + 1); assert.equal(clock.playing, true);
  clock.seek(-4); assert.equal(clock.time, 0);
  clock.advance(999); assert.equal(clock.time, filmDuration(film)); assert.equal(clock.playing, false);
  assert.equal(filmFrame(film, clock.time).ended, true);
  clock.play(); assert.equal(clock.time, 0); assert.equal(clock.playing, true);
});

test('Los límites de secuencia funcionan en ambos sentidos y al terminar', () => {
  for (const film of FILMS) {
    let position = 0;
    film.cues.forEach((cue, index) => {
      const frame = filmFrame(film, position);
      assert.equal(frame.index, index); assert.ok(Math.abs(frame.progress) < 0.00001);
      if (index) assert.equal(filmFrame(film, position - 0.01).index, index - 1);
      position += cue.duration;
    });
    assert.equal(filmFrame(film, position + 20).index, 3);
    assert.equal(filmFrame(film, NaN).time, 0);
  }
});

test('Las defensas representadas no convierten mínimo privilegio en una cura ni EOL en infección', () => {
  assert.deepEqual(filmDirection('eol', 0).infected, []);
  assert.deepEqual(filmDirection('eol', 1).infected, []);
  assert.ok(filmDirection('least-privilege', 3).infected.length > 0);
  assert.equal(filmDirection('least-privilege', 3).repaired, false);
  assert.ok(filmDirection('scripts', 3).infected.includes(1), 'Bloquear scripts no limpia su código');
  assert.ok(filmDirection('lockfile', 3).infected.includes(4), 'El lockfile deja fuera la candidata, sin volverla segura');
  assert.deepEqual(filmDirection('supply-chain', 2).gates, [], 'La propagación se muestra antes del aislamiento');
  assert.ok(filmDirection('supply-chain', 2).infected.includes(2));
  assert.ok(filmDirection('supply-chain', 2).infected.includes(3));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { getProjectSize, PROJECT_TYPES, PROJECT_SIZES } from '../src/catalog.js';

const studio = (points = 10, production = 1) => {
  const g = new Game(); g.state.delivered = 4; g.state.constructionPoints = points; g.state.productionPoints = production; g.state.budget = 1000000; return g;
};
const equip = g => { g.defend('network'); g.defend('lockfile'); g.install('pixel-press'); g.deployAll(); };
const finish = g => { assert.equal(g.start(), true); while (!g.state.paused) g.tick(); assert.equal(g.canDeliver(), true); };

test('A medida conserva los precios de los tres tamaños base y paga más por cada unidad', () => {
  for (const type of PROJECT_TYPES) {
    for (const size of PROJECT_SIZES) {
      const g = studio(); assert.equal(g.propose(type.id, '', 'custom', size.units), true);
      assert.equal(g.state.project.reward, Math.round(type.reward * size.multiplier));
    }
    let last = 0;
    for (let units = 24; units <= 300; units++) {
      const reward = Math.round(type.reward * getProjectSize('custom', units).multiplier);
      assert.ok(reward > last, `${type.id}/${units}`); last = reward;
    }
  }
});

test('El tamaño crece con todos los puntos de construcción, sin el antiguo tope de Plataforma', () => {
  let last = 0;
  for (const points of [4, 5, 10, 1000, 1000000]) {
    const g = studio(points); const units = points * 30;
    assert.equal(g.propose('photo', '', 'custom', units), true);
    assert.equal(g.state.project.units, units); assert.ok(g.state.project.reward > last);
    last = g.state.project.reward;
  }
  const g = studio(4); g.propose('photo', '', 'custom', 120); assert.equal(g.state.project.reward, 2826);
});

test('El motor rechaza unidades inválidas o superiores a la capacidad sin gastar ni crear proyecto', () => {
  for (const units of [undefined, null, '', '120', 0, -1, 23, 24.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, 121]) {
    const g = studio(4); const budget = g.state.budget;
    assert.equal(g.propose('editor', '', 'custom', units), false, String(units));
    assert.equal(g.state.project, null); assert.equal(g.state.budget, budget); assert.equal(g.state.nodes.length, 0);
  }
});

test('Todos los niveles permiten toda la capacidad; los tipos conservan sus desbloqueos', () => {
  for (const delivered of [0, 1, 4]) {
    const g = new Game(); g.state.constructionPoints = 10; g.state.delivered = delivered;
    assert.equal(g.projectCapacity(), 300); assert.equal(g.propose('editor', '', 'custom', 301), false);
    assert.equal(g.propose('editor', '', 'custom', 300), true); g.abandon();
    assert.equal(g.propose('editor'), true); assert.equal(g.expandProject(300), true);
    assert.equal(g.state.project.units, 300);
    const saved = new Game(JSON.parse(JSON.stringify(g.state)));
    assert.equal(saved.projectCapacity(), 300); assert.equal(saved.state.project.units, 300);
  }
  const beginner = new Game(); beginner.state.constructionPoints = 10;
  assert.equal(beginner.propose('shop', '', 'custom', 300), false);
  assert.equal(beginner.propose('marketplace', '', 'prototype'), false);
  beginner.state.delivered = 1; assert.equal(beginner.propose('shop', '', 'custom', 300), true);
});

test('Ampliar en marcha conserva progreso, paquetes, gasto y eventos; aumenta el cobro previsto', () => {
  const g = studio(10, 20); g.propose('editor', 'Mi editor', 'platform'); equip(g); g.start();
  for (let i = 0; i < 3; i++) g.tick();
  const before = structuredClone(g.state);
  assert.equal(g.state.progress, 60); assert.equal(g.expandProject(300), true);
  assert.equal(g.state.project.size, 'custom'); assert.equal(g.state.project.units, 300);
  assert.ok(g.state.project.reward > before.project.reward);
  for (const key of ['progress', 'productionTime', 'elapsed', 'budget', 'started', 'paused', 'nodes', 'flags']) assert.deepEqual(g.state[key], before[key], key);
  assert.equal(g.state.project.spent, before.project.spent); assert.equal(g.state.project.name, 'Mi editor');
  const prevented = g.state.prevented; finish(g); assert.equal(g.state.prevented, prevented);
});

test('Un proyecto terminado puede ampliarse y exige completar el trabajo nuevo antes de cobrar', () => {
  const g = studio(4, 1000); g.propose('editor'); equip(g); finish(g);
  assert.equal(g.expandProject(120), true); assert.equal(g.state.progress, 24); assert.equal(g.state.paused, true);
  assert.equal(g.canDeliver(), false); assert.equal(g.deliver(), false);
  const unchanged = structuredClone(g.state);
  for (const units of [24, 119, 120, 121, NaN]) assert.equal(g.expandProject(units), false);
  assert.deepEqual(g.state, unchanged); finish(g);
  const reward = g.state.project.reward, budget = g.state.budget;
  assert.equal(g.deliver(), true); assert.equal(g.state.history[0].units, 120); assert.equal(g.state.history[0].size, 'custom');
  assert.equal(g.state.history[0].income, reward + g.state.history[0].rating * 40);
  assert.equal(g.state.budget, budget + g.state.history[0].income); assert.equal(g.deliver(), false);
  assert.equal(g.expandProject(150), false);
});

test('Guardar proyectos a medida conserva tamaño, ingreso pactado, progreso e historial', () => {
  const g = studio(10, 3); g.propose('editor', 'Gran proyecto', 'custom', 299); equip(g); g.start(); g.tick();
  assert.deepEqual(new Game(JSON.parse(JSON.stringify(g.state))).state, g.state);
  const old = structuredClone(g.state); delete old.constructionPoints;
  const migrated = new Game(old); assert.equal(migrated.state.constructionPoints, 10);
  assert.equal(migrated.state.project.reward, old.project.reward); assert.equal(migrated.state.progress, 3);
  finish(g); g.deliver(); assert.deepEqual(new Game(JSON.parse(JSON.stringify(g.state))).state, g.state);
  const corrupt = studio().state; corrupt.project = { type: 'editor', size: 'custom', needs: ['image'], reward: 1 };
  assert.equal(new Game(corrupt).state.project, null);
});

test('Proyectos mayores dan más ingresos y beneficio, descontando su mantenimiento adicional', () => {
  const results = [];
  for (const units of [84, 120, 300]) {
    const g = studio(10, 1000); g.propose('editor', '', 'custom', units); equip(g); finish(g); g.deliver(); results.push(g.state.history[0]);
  }
  assert.ok(results[1].income > results[0].income); assert.ok(results[2].income > results[1].income);
  assert.ok(results[1].profit > results[0].profit); assert.ok(results[2].profit > results[1].profit);
  assert.ok(results[2].spent > results[1].spent);
});

test('Proyectos enormes avanzan por bloques conservando todos los cobros y eventos', () => {
  const units = 1000000000, g = studio(Math.ceil(units / 30), units); g.state.budget = 1e12;
  assert.equal(g.propose('editor', '', 'custom', units), true); equip(g); const before = g.state.budget;
  g.start(); g.tick(); assert.equal(g.state.progress, units); assert.equal(g.state.elapsed, 1);
  assert.equal(g.state.maintenance, Math.floor(units / 15) * 6); assert.equal(before - g.state.budget, g.state.maintenance);
  assert.equal(g.state.prevented, 2); assert.equal(g.canDeliver(), true);
});

test('El avance por bloques se detiene en el cobro exacto que agota el presupuesto', () => {
  const g = studio(10, 1000); g.propose('editor', '', 'custom', 300); equip(g); g.state.budget = 25;
  g.start(); g.tick(); assert.equal(g.state.progress, 75); assert.equal(g.state.maintenance, 25);
  assert.equal(g.state.budget, 0); assert.equal(g.state.paused, true); assert.equal(g.canDeliver(), false);
});

test('Una pieza EOL añadida después de su umbral detiene el siguiente avance, sin saltarse el incidente', () => {
  const g = studio(10, 60); g.propose('editor', '', 'custom', 300); equip(g); g.start(); g.tick();
  assert.equal(g.state.progress, 60);
  g.state.defenses = g.state.defenses.filter(id => id !== 'network'); g.install('image-legacy'); g.deployAll(); g.tick();
  assert.equal(g.state.progress, 61); assert.equal(g.state.paused, true); assert.equal(g.node('codec-legacy').compromised, true);
});

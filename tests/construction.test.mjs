import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { constructionPrice, visiblePoints } from '../src/catalog.js';

const equip = g => { g.install('pixel-press'); g.deployAll(); };
const finish = g => { assert.equal(g.start(), true); for (let i = 0; i < g.state.project.units; i++) g.tick(); assert.equal(g.deliver(), true); };

test('Cada puesto cuesta diez veces el anterior y se puede seguir comprando después del tercero', () => {
  const g = new Game();
  assert.equal(g.state.constructionPoints, 1); assert.equal(g.constructionCapacity(), 30);
  assert.equal(g.constructionCost(), 350); assert.equal(g.addConstructionPoint(), true);
  assert.equal(g.state.budget, 2050); assert.equal(g.constructionCapacity(), 60);
  assert.equal(g.constructionCost(), 3500); assert.equal(g.addConstructionPoint(), false);
  assert.equal(g.state.budget, 2050); assert.equal(g.state.constructionPoints, 2);
  g.state.budget = 38500; assert.equal(g.addConstructionPoint(), true);
  assert.equal(g.state.budget, 35000); assert.equal(g.constructionCapacity(), 90);
  assert.equal(g.constructionCost(), 35000); assert.equal(g.addConstructionPoint(), true);
  assert.equal(g.state.budget, 0); assert.equal(g.constructionCapacity(), 120);
  for (const expected of [350000, 3500000, 35000000, 350000000, 3500000000]) {
    assert.equal(g.constructionCost(), expected); g.state.budget = expected;
    assert.equal(g.addConstructionPoint(), true); assert.equal(g.state.budget, 0);
  }
  assert.equal(g.state.constructionPoints, 9); assert.equal(g.constructionCapacity(), 270);
  const restored = new Game(JSON.parse(JSON.stringify(g.state)));
  assert.deepEqual(restored.state, g.state); assert.equal(restored.constructionCost(), 35000000000);
});

test('Sin créditos no se construye ni se descuenta; con el coste exacto sí', () => {
  const g = new Game(); g.state.budget = 349;
  assert.equal(g.addConstructionPoint(), false); assert.equal(g.state.budget, 349); assert.equal(g.state.constructionPoints, 1);
  g.state.budget = 350; assert.equal(g.addConstructionPoint(), true); assert.equal(g.state.budget, 0);
  assert.equal(g.addConstructionPoint(), false); assert.equal(g.state.constructionPoints, 2);
});

test('Los alcances solo exigen capacidad; un intento bloqueado no crea ni cobra proyecto', () => {
  const g = new Game(); g.state.delivered = 4;
  assert.equal(g.propose('editor', '', 'product'), false); assert.equal(g.state.project, null); assert.equal(g.state.budget, 2400);
  g.addConstructionPoint(); assert.equal(g.propose('editor', '', 'platform'), false);
  assert.equal(g.propose('editor', '', 'product'), true); g.abandon();
  g.state.budget = 3500; g.addConstructionPoint(); assert.equal(g.propose('editor', '', 'platform'), true);
  const beginner = new Game(); beginner.state.budget = 5000; beginner.addConstructionPoint(); beginner.addConstructionPoint();
  assert.equal(beginner.level(), 1);
  assert.equal(beginner.propose('editor', '', 'product'), true); beginner.abandon();
  assert.equal(beginner.propose('editor', '', 'platform'), true); beginner.abandon();
  assert.equal(beginner.propose('editor'), true);
});

test('Ampliar un proyecto activo conserva progreso y cuenta la inversión; archivar conserva puntos', () => {
  const g = new Game(); g.propose('editor'); equip(g); g.start(); g.tick();
  const spent = g.state.project.spent, budget = g.state.budget;
  assert.equal(g.addConstructionPoint(), true);
  assert.equal(g.state.progress, 1); assert.equal(g.state.project.units, 24);
  assert.equal(g.state.project.spent, spent + 350); assert.equal(g.state.budget, budget - 350);
  const persisted = new Game(JSON.parse(JSON.stringify(g.state))); assert.deepEqual(persisted.state, g.state);
  g.abandon(); assert.equal(g.state.constructionPoints, 2); assert.equal(g.state.budget, budget - 350);
  g.propose('editor'); assert.equal(g.state.constructionPoints, 2);
});

test('Cuatro publicaciones financian los puntos y una plataforma sin alterar costes ni ritmo', () => {
  const g = new Game(); g.defend('network'); g.defend('lockfile');
  for (let i = 0; i < 4; i++) {
    if (i === 1) assert.equal(g.addConstructionPoint(), true);
    assert.equal(g.propose('editor', '', i ? 'product' : 'prototype'), true); equip(g); finish(g);
  }
  assert.equal(g.addConstructionPoint(), true); assert.equal(g.propose('editor', 'Gran editor', 'platform'), true); equip(g);
  const before = g.state.budget; g.start(); g.tick(); assert.equal(g.state.progress, 1);
  for (let i = 1; i < 15; i++) g.tick();
  assert.equal(before - g.state.budget, g.state.nodes.length * 2);
  finish(g); assert.equal(g.state.history[0].size, 'platform'); assert.equal(g.state.constructionPoints, 3);
  assert.ok(g.state.budget > 0);
});

test('Guardados v2 anteriores conservan capacidad para proyectos activos e históricos sin cobrar', () => {
  const g = new Game(); g.state.budget = 6000; g.state.delivered = 4; g.addConstructionPoint(); g.addConstructionPoint();
  g.propose('editor', '', 'platform'); equip(g); g.start(); g.tick();
  const old = structuredClone(g.state); delete old.constructionPoints;
  const restored = new Game(old);
  assert.equal(restored.state.constructionPoints, 3); assert.equal(restored.state.progress, 1);
  assert.equal(restored.state.budget, old.budget); assert.equal(restored.start(), true);
  const history = new Game().state; history.history = [{ size: 'product' }]; delete history.constructionPoints;
  assert.equal(new Game(history).state.constructionPoints, 2);
  const empty = new Game().state; delete empty.constructionPoints;
  assert.equal(new Game(empty).state.constructionPoints, 1);
});

test('Valores inválidos no conceden capacidad; el motor impide desarrollar o entregar sin ella', () => {
  for (const value of [null, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, '3', Infinity]) {
    const g = new Game({ ...new Game().state, constructionPoints: value });
    assert.equal(g.state.constructionPoints, 1);
  }
  const g = new Game(); g.state.delivered = 4; g.addConstructionPoint(); g.propose('editor', '', 'product'); equip(g); g.start();
  g.state.constructionPoints = 1; g.tick();
  assert.equal(g.state.paused, true); assert.equal(g.state.progress, 0); assert.equal(g.start(), false);
  g.state.progress = g.state.project.units; assert.equal(g.deliver(), false);
});

test('Muchos puestos conservan toda su capacidad y la vista muestra los últimos y la siguiente compra', () => {
  const g = new Game({ ...new Game().state, constructionPoints: 1000 });
  assert.equal(g.state.constructionPoints, 1000); assert.equal(g.constructionCapacity(), 30000);
  assert.deepEqual(visiblePoints(1000), [995, 996, 997, 998, 999, 1000]);
  assert.equal(new Game(JSON.parse(JSON.stringify(g.state))).state.constructionPoints, 1000);
  assert.equal(constructionPrice(2), '3.500'); assert.equal(constructionPrice(3), '35.000');
  assert.equal(constructionPrice(1000), '3,5e1001');
  const budget = g.state.budget; assert.equal(g.addConstructionPoint(), false);
  assert.equal(g.state.budget, budget); assert.equal(g.state.constructionPoints, 1000);
});

test('Precios fuera del rango numérico no corrompen el capital ni el guardado', () => {
  const g = new Game({ ...new Game().state, constructionPoints: 306, budget: Number.MAX_VALUE });
  assert.equal(g.addConstructionPoint(), true); assert.equal(g.state.constructionPoints, 307);
  const before = g.state.budget;
  assert.equal(g.addConstructionPoint(), false); assert.equal(g.state.budget, before);
  assert.ok(Number.isFinite(before));
  const restored = new Game(JSON.parse(JSON.stringify(g.state)));
  assert.equal(restored.state.constructionPoints, 307); assert.equal(restored.state.budget, before);
});

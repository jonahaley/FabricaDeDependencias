import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { productionPrice } from '../src/catalog.js';

const project = ({ points = 1, size = 'prototype', network = true, lockfile = true, legacy = false } = {}) => {
  const g = new Game(); g.state.budget = 10000; g.state.delivered = 4;
  g.addConstructionPoint(); g.addConstructionPoint(); g.state.productionPoints = points;
  g.propose('editor', 'Producción de prueba', size);
  if (network) g.defend('network');
  if (lockfile) g.defend('lockfile');
  g.install(legacy ? 'image-legacy' : 'pixel-press'); g.deployAll();
  return g;
};
const finish = g => { assert.equal(g.start(), true); for (let i = 0; i < 100; i++) g.tick(); assert.equal(g.canDeliver(), true); };

test('Producción comienza con un puesto y crece sin tope con precios ×10 independientes de construcción', () => {
  const g = new Game(); assert.equal(g.state.productionPoints, 1); assert.equal(g.productionRate(), 1);
  for (const cost of [350, 3500, 35000, 350000, 3500000, 35000000]) {
    assert.equal(g.productionCost(), cost); g.state.budget = cost;
    assert.equal(g.addProductionPoint(), true); assert.equal(g.state.budget, 0);
  }
  assert.equal(g.state.productionPoints, 7); assert.equal(g.productionRate(), 7);
  assert.equal(g.state.constructionPoints, 1); assert.equal(g.constructionCapacity(), 30); assert.equal(g.constructionCost(), 350);
  assert.equal(productionPrice(2), '3.500'); assert.equal(productionPrice(3), '35.000');
  assert.equal(g.addProductionPoint(), false); assert.equal(g.state.productionPoints, 7);
});

test('Capital insuficiente no compra producción ni altera progreso; el precio exacto sí', () => {
  const g = project(); g.start(); g.tick(); g.state.budget = 349;
  const spent = g.state.project.spent;
  assert.equal(g.addProductionPoint(), false); assert.equal(g.state.budget, 349); assert.equal(g.state.project.spent, spent);
  assert.equal(g.state.productionPoints, 1); assert.equal(g.state.progress, 1);
  g.state.budget = 350; assert.equal(g.addProductionPoint(), true);
  assert.equal(g.state.budget, 0); assert.equal(g.state.project.spent, spent + 350); assert.equal(g.state.progress, 1);
});

test('Cada puesto aporta una unidad por segundo; comprar durante el desarrollo acelera el siguiente paso', () => {
  const g = project(); g.start(); g.tick(); assert.equal(g.state.progress, 1);
  g.addProductionPoint(); g.tick(); assert.equal(g.state.progress, 3);
  g.addProductionPoint(); g.tick(); assert.equal(g.state.progress, 6);
  assert.equal(g.state.elapsed, 3); assert.equal(g.state.productionTime, 6);
  assert.equal(g.state.project.units, 24);
});

test('Producir más rápido mantiene el coste por unidad y procesa todos los eventos protegidos', () => {
  const slow = project({ size: 'platform' }), fast = project({ points: 7, size: 'platform' });
  const slowSpent = slow.state.project.spent, fastSpent = fast.state.project.spent;
  finish(slow); finish(fast);
  assert.equal(slow.state.elapsed, 84); assert.equal(fast.state.elapsed, 12);
  assert.equal(fast.state.progress, 84); assert.equal(fast.state.productionTime, 84);
  assert.equal(fast.state.maintenance, 30); assert.equal(fast.state.maintenance, slow.state.maintenance);
  assert.equal(fast.state.project.spent - fastSpent, slow.state.project.spent - slowSpent);
  assert.deepEqual(fast.state.flags, slow.state.flags); assert.equal(fast.state.prevented, 2);
});

test('Muchos puestos se detienen exactamente en el incidente EOL de la unidad 22', () => {
  const g = project({ points: 1000, legacy: true, network: false }); g.start(); g.tick();
  assert.equal(g.state.progress, 22); assert.equal(g.state.elapsed, 1); assert.equal(g.state.paused, true);
  assert.equal(g.state.incidents.length, 1); assert.equal(g.node('codec-legacy').compromised, true);
  const frozen = structuredClone(g.state); g.tick(); assert.deepEqual(g.state, frozen);
});

test('Un zero-day frena la producción en 35 y exige recuperación antes de continuar', () => {
  const g = project({ points: 1000, size: 'product', network: false }); g.start(); g.tick();
  assert.equal(g.state.progress, 35); assert.equal(g.state.paused, true); assert.equal(g.start(), false);
  assert.equal(g.state.maintenance, 12); assert.equal(g.state.flags.supply, undefined);
  g.isolate('codec-core'); g.rotate(); g.recover('codec-core');
  assert.equal(g.start(), true); g.tick(); assert.equal(g.state.progress, 54); assert.equal(g.canDeliver(), true);
});

test('La producción rápida no se salta el rebuild vulnerable en la unidad 52', () => {
  const g = project({ points: 1000, size: 'platform', lockfile: false }); g.start(); g.tick();
  assert.equal(g.state.progress, 52); assert.equal(g.state.paused, true);
  assert.equal(g.node('codec-core').version, '1.1.0'); assert.equal(g.node('codec-core').compromised, true);
  assert.equal(g.state.maintenance, 18); assert.equal(g.state.flags.supply, true);
});

test('Agotar capital detiene el lote en el cobro de mantenimiento', () => {
  const g = project({ points: 1000 }); g.state.budget = 1; g.start(); g.tick();
  assert.equal(g.state.progress, 15); assert.equal(g.state.budget, 0); assert.equal(g.state.maintenance, 1);
  assert.equal(g.state.paused, true); assert.equal(g.canDeliver(), false);
});

test('La producción se limita al trabajo pendiente y publicar solo cobra una vez', () => {
  const g = project({ points: 1000000 }); g.start(); g.tick();
  assert.equal(g.state.progress, 24); assert.equal(g.state.productionTime, 24); assert.equal(g.state.elapsed, 1);
  const complete = structuredClone(g.state); g.tick(); assert.deepEqual(g.state, complete);
  assert.equal(g.deliver(), true); const budget = g.state.budget;
  assert.equal(g.deliver(), false); assert.equal(g.state.budget, budget); assert.equal(g.state.productionPoints, 1000000);
});

test('Los puestos no producen durante preparación, pausa ni sin requisitos o seguridad', () => {
  const g = project({ points: 1000 }); const prepared = structuredClone(g.state);
  g.tick(); assert.deepEqual(g.state, prepared);
  g.start(); g.state.paused = true; const paused = structuredClone(g.state); g.tick(); assert.deepEqual(g.state, paused);
  g.state.paused = false; g.isolate('codec-core'); g.tick(); assert.equal(g.state.progress, 0); assert.equal(g.state.paused, true);
  g.recover('codec-core'); g.state.integrity = 79; assert.equal(g.start(), false);
});

test('Producción persiste al guardar y archivar; partidas anteriores reciben un puesto sin cobro', () => {
  const g = project({ points: 8 }); g.start(); g.tick();
  const saved = JSON.parse(JSON.stringify(g.state)), restored = new Game(saved);
  assert.deepEqual(restored.state, saved); restored.abandon(); assert.equal(restored.state.productionPoints, 8);
  restored.propose('editor'); assert.equal(restored.productionRate(), 8);
  delete saved.productionPoints;
  const migrated = new Game(saved); assert.equal(migrated.productionRate(), 1); assert.equal(migrated.state.budget, saved.budget);
  assert.equal(migrated.state.progress, saved.progress); migrated.tick(); assert.equal(migrated.state.progress, saved.progress + 1);
  for (const value of [null, 0, -1, 1.5, '2', Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(new Game({ ...saved, productionPoints: value }).productionRate(), 1);
  }
});

test('Precios enormes no corrompen capital ni guardado y conservan todos los puestos', () => {
  const g = new Game({ ...new Game().state, productionPoints: 1000 });
  assert.equal(g.productionRate(), 1000); assert.equal(productionPrice(1000), '3,5e1001');
  assert.equal(g.addProductionPoint(), false); assert.equal(g.state.budget, 2400);
  assert.equal(new Game(JSON.parse(JSON.stringify(g.state))).state.productionPoints, 1000);
});

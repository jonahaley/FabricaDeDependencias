import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, SAVE_KEY } from '../src/game.js';
import { PROJECT_TYPES, PROJECT_SIZES, PACKAGES } from '../src/catalog.js';
const advance = (g, units) => { for (let i = 0; i < units; i++) g.tick(); };
const equip = g => {
  for (const category of g.state.project.needs) g.install(PACKAGES.find(p => p.category === category && p.official && !p.private && !p.eol).id);
  g.deployAll();
};
test('Estudio inactivo, preparación y espera de publicación no consumen recursos', () => {
  const g = new Game(); const initial = JSON.stringify(g.state); advance(g, 10000); assert.equal(JSON.stringify(g.state), initial);
  assert.equal(g.state.project, null); assert.equal('remaining' in g.state, false); assert.equal('mission' in g.state, false);
  g.install('pixel-press'); assert.equal(g.state.nodes.length, 0); assert.equal(g.start(), false); assert.equal(g.deliver(), false);
  g.propose('photo'); equip(g); const prepared = JSON.stringify(g.state); advance(g, 10000); assert.equal(JSON.stringify(g.state), prepared);
  g.start(); advance(g, 24); assert.equal(g.state.progress, 24); const completed = JSON.stringify(g.state);
  advance(g, 10000); assert.equal(JSON.stringify(g.state), completed); assert.equal(g.state.ended, null);
});
test('Proyectos validan tipos, tamaños, nombres y desbloqueos sin sobrescribir el activo', () => {
  const g = new Game(); assert.equal(g.propose('inventado'), false); assert.equal(g.propose('shop'), false);
  assert.equal(g.propose('photo', '', 'platform'), false); assert.equal(g.propose('photo', ' Mi idea '), true);
  assert.equal(g.state.project.name, 'Mi idea'); assert.deepEqual(g.state.project.needs, ['image', 'data']);
  assert.equal(g.propose('editor'), false); assert.equal(g.state.project.type, 'photo');
});
test('Funciones obligatorias necesitan paquetes operativos; la suite no incluye pagos', () => {
  const g = new Game(); g.state.delivered = 1; g.propose('shop'); g.install('omni-suite'); g.deployAll();
  assert.equal(g.start(), false); assert.deepEqual([...g.functions()], ['image', 'message', 'data']);
  g.install('checkout-flow'); assert.equal(g.start(), false); g.deployAll(); assert.equal(g.start(), true);
  g.isolate('payment-core'); advance(g, 1); assert.equal(g.state.paused, true); assert.equal(g.state.progress, 0);
});
test('Publicar cobra una vez, registra beneficio y reinicia paquetes al crear el siguiente', () => {
  const g = new Game(); g.propose('photo'); g.defend('network'); equip(g); g.start(); advance(g, 24);
  const budget = g.state.budget; assert.equal(g.deliver(), true); const result = g.state.history[0];
  assert.equal(g.state.budget, budget + result.income); assert.equal(result.profit, result.income - result.spent);
  assert.equal(g.state.revenue, result.income); assert.equal(g.state.project, null); assert.equal(g.level(), 2);
  assert.equal(g.deliver(), false); assert.equal(g.state.budget, budget + result.income);
  assert.equal(g.propose('shop'), true); assert.equal(g.state.nodes.length, 0); assert.equal(g.has('network'), true);
});
test('Los ocho tipos y tres tamaños pueden completarse con las categorías exigidas', () => {
  for (const type of PROJECT_TYPES) for (const size of PROJECT_SIZES) {
    const g = new Game(); g.state.delivered = 4; g.state.budget = 8000;
    while (g.constructionCapacity() < size.units) g.addConstructionPoint();
    g.propose(type.id, type.title, size.id);
    ['network', 'lockfile', 'privilege'].forEach(id => g.defend(id)); equip(g); g.start(); advance(g, size.units);
    assert.equal(g.deliver(), true, `${type.id}/${size.id}`); assert.ok(g.state.budget > 0);
    assert.equal(g.state.history[0].packages.length, type.needs.length);
  }
});
test('Incidentes pausan automáticamente; se exige responder antes de reanudar', () => {
  const g = new Game(); g.state.delivered = 1; g.addConstructionPoint(); g.propose('photo', '', 'product'); equip(g); g.start(); advance(g, 35);
  assert.equal(g.state.paused, true); assert.equal(g.start(), false); const before = JSON.stringify(g.state);
  advance(g, 10000); assert.equal(JSON.stringify(g.state), before);
  const id = g.state.incidents[0].node; g.isolate(id); g.rotate(); g.recover(id);
  assert.equal(g.start(), true); advance(g, 1); assert.equal(g.state.progress, 36);
});
test('Archivar no devuelve inversión; conserva seguridad y conocimientos del estudio', () => {
  const g = new Game(); g.propose('photo'); g.defend('network'); g.inspect('pixel-press'); g.install('pixel-pres');
  const budget = g.state.budget; g.abandon(); assert.equal(g.state.budget, budget); assert.equal(g.state.nodes.length, 0);
  assert.equal(g.has('network'), true); g.propose('editor'); assert.equal(g.state.integrity, 100); assert.equal(g.state.secretsLeaked, false);
  assert.ok(g.state.inspected.includes('pixel-press'));
});
test('Guardado v2 conserva el estudio y no reutiliza partidas antiguas incompatibles', () => {
  const g = new Game(); g.propose('photo'); equip(g); g.start(); advance(g, 5);
  assert.deepEqual(new Game(JSON.parse(JSON.stringify(g.state))).state, g.state);
  assert.equal(SAVE_KEY, 'npm-factory-v2'); assert.equal(new Game({ version: 1, nodes: [] }).state.project, null);
  assert.equal(new Game({ version: 2, nodes: [] }).state.budget, 2400);
});

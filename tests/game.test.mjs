import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { PROJECT_TYPES, PROJECT_SIZES, PACKAGES } from '../src/catalog.js';

// Long image projects exercise every security event without a campaign deadline.
const newGame = () => { const g = new Game(); g.state.delivered = 4; g.state.budget = 6250; g.addConstructionPoint(); g.addConstructionPoint(); g.propose('editor', 'Prueba de seguridad', 'platform'); return g; };

const advance = (g, seconds) => { if (!g.state.started && !g.state.paused) g.start(); for (let i = 0; i < seconds; i++) g.tick(); };
const install = (g, ...ids) => ids.forEach(id => g.install(id));

test('La instalación solo prepara el taller; producción requiere desplegar', () => {
  const g = newGame(); install(g, 'pixel-press', 'vault-store'); advance(g, 4);
  assert.equal(g.functions().size, 0); assert.equal(g.state.progress, 0);
  g.deployAll(); advance(g, 5); assert.equal(g.state.progress, 5); assert.equal(g.functions().size, 2);
});
test('Dependencias compartidas se deduplican y el mapa identifica consumidores', () => {
  const g = newGame(); install(g, 'courier-kit', 'vault-store');
  assert.equal(g.state.nodes.filter(n => n.id === 'serializer').length, 1);
  assert.deepEqual(new Set(g.affected('serializer')), new Set(['courier-kit', 'vault-store', 'serializer']));
  g.deployAll(); g.isolate('serializer'); assert.equal(g.functions().size, 0);
  g.recover('serializer'); assert.equal(g.functions().size, 2);
});
test('La suite agrega diez dependencias y eleva costes y superficie', () => {
  const g = newGame(); g.install('omni-suite'); assert.equal(g.state.nodes.length, 11);
  const before = g.state.budget; advance(g, 15); assert.equal(g.state.budget, before);
  const surface = g.surface(); g.deployAll(); assert.ok(g.surface() > surface); advance(g, 15); assert.equal(before - g.state.budget, 22);
});
test('Typosquatting ejecuta el script antes de arrancar la aplicación', () => {
  const g = newGame(); g.inspect('pixel-pres'); assert.ok(g.state.logs[0].text.includes('nombre distinto'));
  g.install('pixel-pres'); assert.equal(g.state.incidents.length, 1); assert.equal(g.node('pixel-pres').phase, 'build'); assert.equal(g.state.secretsLeaked, true);
});
test('Bloquear scripts contiene postinstall pero no vuelve seguro el runtime', () => {
  const g = newGame(); g.defend('scripts'); g.install('pixel-pres'); assert.equal(g.state.incidents.length, 0);
  g.deployAll(); assert.equal(g.state.incidents.length, 1);
});
test('Builds legítimos bloqueados requieren revisión y autorización', () => {
  const g = newGame(); g.defend('scripts'); g.install('pixel-press'); g.deployAll(); assert.equal(g.node('pixel-press').phase, 'build');
  g.authorize('pixel-press'); assert.equal(g.node('pixel-press').buildBlocked, true);
  g.inspect('pixel-press'); g.authorize('pixel-press'); g.deployAll(); assert.ok(g.functions().has('image'));
});
test('El aislamiento del taller impide acceder a secretos de producción', () => {
  const g = newGame(); g.defend('sandbox'); g.install('pixel-pres');
  assert.equal(g.state.integrity, 100); assert.equal(g.state.secretsLeaked, false); assert.equal(g.node('pixel-pres').isolated, true);
});
test('La configuración del scope determina el origen del paquete privado', () => {
  const unsafe = newGame(); unsafe.install('@factory/ledger'); assert.equal(unsafe.node('@factory/ledger').version, '9.9.0'); assert.ok(unsafe.state.incidents[0].title.includes('confusion'));
  const safe = newGame(); safe.defend('registry'); safe.install('@factory/ledger'); assert.equal(safe.node('@factory/ledger').resolved, 'Privado'); assert.equal(safe.state.incidents.length, 0);
  unsafe.defend('registry'); assert.equal(unsafe.node('@factory/ledger').compromised, true, 'Configurar después no limpia lo ya instalado');
});
test('Audit encuentra fallos conocidos, no typosquatting ni zero-day previo', () => {
  const g = newGame(); g.defend('scripts'); install(g, 'pixel-pres', 'image-legacy'); g.audit(); assert.deepEqual(g.state.audit.found, ['codec-legacy']);
  const zero = newGame(); install(zero, 'pixel-press', 'vault-store'); zero.deployAll(); zero.audit(); assert.deepEqual(zero.state.audit.found, []);
  advance(zero, 35); assert.ok(zero.state.incidents.some(i => i.title.includes('Zero-day'))); zero.audit(); assert.ok(zero.state.audit.found.length > 0);
});
test('EOL no causa infección instantánea y exige sustitución', () => {
  const g = newGame(); g.install('image-legacy'); assert.equal(g.node('image-legacy').compromised, false);
  g.deployAll(); advance(g, 22); assert.equal(g.node('codec-legacy').compromised, true);
  g.isolate('codec-legacy'); g.rotate(); g.recover('codec-legacy'); assert.equal(g.node('codec-legacy').compromised, true);
  g.remove('image-legacy'); g.install('pixel-press'); g.deployAll(); assert.ok(g.functions().has('image')); assert.ok(g.state.incidents.every(i => i.resolved));
});
test('Aislar contiene daños; rotar y reconstruir restablece sin recuperar datos robados', () => {
  const g = newGame(); install(g, 'pixel-press', 'vault-store'); g.deployAll(); advance(g, 35);
  const id = g.state.incidents[0].node; g.isolate(id); const integrity = g.state.integrity;
  g.recover(id); assert.equal(g.node(id).compromised, true);
  advance(g, 10); assert.equal(g.state.integrity, integrity);
  g.rotate(); g.recover(id); assert.equal(g.node(id).compromised, false); assert.equal(g.state.integrity, integrity); assert.equal(g.state.secretsLeaked, false); assert.equal(g.functions().size, 2);
});
test('Mínimo privilegio reduce daños, no elimina la explotación', () => {
  const a = newGame(), b = newGame(); b.defend('privilege'); a.install('pixel-pres'); b.install('pixel-pres');
  assert.equal(a.state.integrity, 92); assert.equal(b.state.integrity, 98); assert.equal(b.state.secretsLeaked, true);
});
test('Segmentar reduce superficie y bloquea el vector remoto simulado', () => {
  const g = newGame(); install(g, 'pixel-press', 'vault-store'); g.deployAll(); const before = g.surface();
  g.defend('network'); assert.ok(g.surface() < before); advance(g, 35); assert.equal(g.state.incidents.length, 0); assert.equal(g.state.prevented, 1); assert.equal(g.node('codec-core').known, true);
});
test('Lockfile bloquea cambios implícitos pero permite actualizar explícitamente una versión peligrosa', () => {
  const g = newGame(); g.defend('network'); g.defend('lockfile'); g.install('pixel-press'); g.deployAll(); advance(g, 52);
  assert.equal(g.node('codec-core').version, '1.0.0'); assert.equal(g.node('codec-core').known, true);
  g.update('codec-core'); assert.equal(g.node('codec-core').compromised, true);
});
test('Sin lockfile, el rebuild simulado puede introducir una dependencia comprometida', () => {
  const g = newGame(); g.defend('network'); g.install('pixel-press'); g.deployAll(); advance(g, 52);
  assert.equal(g.node('codec-core').version, '1.1.0'); assert.ok(g.state.incidents.some(i => i.title.includes('rebuild')));
});
test('Revisar y probar rechaza la actualización maliciosa sin coste de aplicación', () => {
  const g = newGame(); g.install('pixel-press'); g.reviewUpdate('codec-core'); const budget = g.state.budget;
  g.update('codec-core'); assert.equal(g.node('codec-core').version, '1.0.0'); assert.equal(g.state.budget, budget);
});
test('Retirar un paquete conserva transitivas usadas y exige rotar secretos robados', () => {
  const g = newGame(); install(g, 'pixel-press', 'pixel-pres'); g.remove('pixel-pres'); assert.ok(g.node('codec-core')); assert.equal(g.state.secretsLeaked, true);
  g.remove('pixel-press'); assert.equal(g.state.nodes.length, 0);
});
test('Pausa congela el tiempo, la producción y el mantenimiento', () => {
  const g = newGame(); g.install('omni-suite'); g.deployAll(); g.state.paused = true; const before = JSON.stringify(g.state); advance(g, 100); assert.equal(JSON.stringify(g.state), before);
});
test('El estudio publica más de tres proyectos, mantiene defensas y desbloquea tipos', () => {
  const g = new Game(); ['scripts', 'sandbox', 'privilege', 'registry', 'lockfile', 'network'].forEach(d => g.defend(d));
  for (let i = 0; i < 8; i++) {
    assert.equal(g.propose(i < 4 ? 'photo' : 'marketplace', 'Proyecto ' + (i + 1)), true);
    for (const category of g.state.project.needs) {
      const p = PACKAGES.find(p => p.category === category && p.official && !p.private && !p.eol);
      g.inspect(p.id); g.install(p.id); g.authorize(p.id);
    }
    g.deployAll(); advance(g, g.state.project.units); assert.equal(g.deliver(), true);
    assert.equal(g.state.ended, null); assert.equal(g.state.integrity, 100); assert.ok(g.state.budget > 0);
  }
  assert.equal(g.state.delivered, 8); assert.equal(g.level(), 3); assert.equal(g.state.history.length, 8);
  assert.equal(g.has('network'), true); assert.equal('remaining' in g.state, false);
});
test('La entrega exige funciones operativas y credenciales protegidas', () => {
  const g = newGame(); install(g, 'pixel-press', 'vault-store'); g.defend('network'); g.defend('lockfile'); g.deployAll(); advance(g, g.state.project.units); g.state.secretsLeaked = true; assert.equal(g.deliver(), false); g.rotate(); g.isolate('codec-core'); assert.equal(g.deliver(), false);
});
test('Sin cuenta atrás; presupuesto agotado pausa y datos insuficientes bloquean publicación', () => {
  const g = newGame(); g.install('pixel-press'); g.deployAll(); g.start(); g.state.budget = 1;
  advance(g, 15); assert.equal(g.state.budget, 0); assert.equal(g.state.paused, true); assert.equal(g.state.ended, null);
  const before = JSON.stringify(g.state); advance(g, 10000); assert.equal(JSON.stringify(g.state), before);
  g.state.progress = g.state.project.units; g.state.integrity = 79; assert.equal(g.deliver(), false);
  g.state.integrity = 80; assert.equal(g.deliver(), true);
});
test('Una partida serializada conserva árbol, presupuesto, incidentes y decisiones', () => {
  const g = newGame(); g.defend('scripts'); g.install('omni-suite'); advance(g, 7); const copy = new Game(JSON.parse(JSON.stringify(g.state))); assert.deepEqual(copy.state, g.state);
});

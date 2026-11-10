import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { Tutorial, TUTORIAL_STEPS } from '../src/tutorial.js';

test('La práctica completa enseña el ciclo del estudio sin alterar la campaña', () => {
  const campaign = new Game(); campaign.propose('newsletter'); campaign.install('courier-kit'); campaign.state.paused = true;
  const original = JSON.stringify(campaign.state), tutorial = new Tutorial(campaign);
  for (const step of TUTORIAL_STEPS) {
    assert.equal(tutorial.step, step);
    assert.equal(tutorial.perform(step.action, step.id), true, step.title);
    assert.equal(tutorial.game.state.paused, true, 'El reloj queda detenido entre pasos');
    const before = JSON.stringify(tutorial.game.state); tutorial.game.tick(); assert.equal(JSON.stringify(tutorial.game.state), before);
    if (step.action === 'audit') assert.deepEqual(tutorial.game.state.audit.found, []);
    if (step.next === 'Avanzar hasta el incidente') {
      assert.equal(tutorial.game.state.progress, 35);
      assert.equal(tutorial.game.state.elapsed, 18);
      assert.equal(tutorial.game.node('codec-core').compromised, true);
      assert.equal(tutorial.game.canDevelop(), false);
    }
  }
  assert.equal(tutorial.done, true); assert.equal(tutorial.game.state.delivered, 1);
  assert.equal(tutorial.game.state.integrity, 92); assert.equal(tutorial.game.state.secretsLeaked, false);
  assert.ok(tutorial.game.state.incidents.every(i => i.resolved));
  assert.equal(tutorial.game.state.constructionPoints, 2);
  assert.equal(tutorial.game.state.productionPoints, 2);
  assert.equal(tutorial.game.state.history[0].units, 60);
  assert.equal(tutorial.game.state.history[0].size, 'custom');
  assert.equal(tutorial.game.state.history[0].reward, 1566);
  assert.equal(tutorial.game.state.maintenance, 48);
  assert.equal(tutorial.game.state.elapsed, 31);
  assert.equal(tutorial.game.state.flags.supply, true);
  assert.equal(tutorial.game.level(), 2);
  assert.ok(tutorial.game.state.budget > 0);
  assert.equal(tutorial.finish(), campaign); assert.equal(JSON.stringify(campaign.state), original);
});
test('Una acción incorrecta no salta pasos ni gasta recursos', () => {
  const tutorial = new Tutorial(new Game()); const before = JSON.stringify(tutorial.game.state);
  assert.equal(tutorial.perform('install', 'pixel-pres'), false);
  assert.equal(tutorial.index, 0); assert.equal(JSON.stringify(tutorial.game.state), before);
  tutorial.perform('tutorial-next'); assert.equal(tutorial.perform('project-type', 'shop'), false); assert.equal(tutorial.index, 1);
});
test('No avanza si la acción no consigue su resultado', () => {
  const tutorial = new Tutorial(new Game());
  while (tutorial.step.action !== 'inspect') tutorial.perform(tutorial.step.action, tutorial.step.id);
  const index = tutorial.index; tutorial.game.state.budget = 0;
  assert.equal(tutorial.perform('inspect', 'pixel-press'), false); assert.equal(tutorial.index, index); assert.equal(tutorial.game.state.inspected.length, 0);
});
test('Salir a mitad de práctica conserva el progreso y deja la campaña en pausa', () => {
  const campaign = new Game(); campaign.propose('newsletter'); campaign.install('courier-kit'); campaign.install('vault-store'); campaign.deployAll(); campaign.start(); campaign.tick();
  const before = JSON.stringify({ ...campaign.state, paused: true });
  const tutorial = new Tutorial(campaign); tutorial.perform('tutorial-next'); tutorial.perform('project-type', 'photo'); tutorial.perform('add-construction');
  assert.equal(JSON.stringify(tutorial.finish().state), before);
  const replay = new Tutorial(campaign); assert.equal(replay.index, 0); assert.equal(replay.game.state.nodes.length, 0);
  assert.equal(replay.game.state.constructionPoints, 1); assert.equal(replay.game.state.project, null);
});

test('Salir en cualquier paso solo pausa el estudio original y permite repetir', () => {
  for (let index = 0; index <= TUTORIAL_STEPS.length; index++) {
    const campaign = new Game(); campaign.propose('editor'); campaign.install('pixel-press'); campaign.deployAll(); campaign.start(); campaign.tick();
    const expected = structuredClone(campaign.state); expected.paused = true;
    const tutorial = new Tutorial(campaign);
    for (let i = 0; i < index; i++) assert.equal(tutorial.perform(tutorial.step.action, tutorial.step.id), true);
    assert.deepEqual(tutorial.finish().state, expected);
    assert.equal(new Tutorial(campaign).game.state.budget, 2400);
  }
});

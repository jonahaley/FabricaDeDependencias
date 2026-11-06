import * as THREE from 'three';

const LIME = '#c6eb88', RED = '#f08e7e', AMBER = '#dfb77a', CYAN = '#92cbd0';
const points = [[-7, 0], [-3.4, 0], [1.5, -3], [1.5, 3], [6.8, 0]];
const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };

// Pure scene direction: seeking backwards must reproduce the same state.
export function filmDirection(id, shot) {
  const directions = {
    'supply-chain': [[], [1], [1, 2, 3, 4], []],
    scripts: [[], [1, 4], [1], [1]],
    eol: [[], [], [1, 2], []],
    'zero-day': [[], [1, 2], [1], []],
    'attack-surface': [[], [0, 1, 3, 4], [], []],
    typosquatting: [[], [1, 3, 4], [1], []],
    'dependency-confusion': [[], [0, 2, 3], [0], [0]],
    'least-privilege': [[], [1, 2, 3, 4], [1, 2], [1, 2]],
    lockfile: [[], [4, 3], [4], [4]],
    audit: [[2], [2], [2], []],
  };
  const infected = directions[id]?.[shot] || [];
  const gates = shot >= (id === 'supply-chain' ? 3 : 2) ? id === 'least-privilege' ? [3, 4] : id === 'dependency-confusion' ? [0] : id === 'lockfile' ? [4] : id === 'attack-surface' ? [0, 3, 4] : id === 'audit' ? [2] : [1] : [];
  return { infected, gates, warning: id === 'eol' && shot < 2 ? [1, 2] : [], repaired: shot === 3 && infected.length === 0 };
}

export function createFilmScene(container, film) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setClearColor('#111b18');
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  container.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-13, 13, 7, -7, 0.1, 100);
  scene.add(new THREE.HemisphereLight('#e1f5e5', '#293b2b', 2.6));
  const sun = new THREE.DirectionalLight('#fff1cc', 3.3); sun.position.set(-8, 16, 10); scene.add(sun);
  const fill = new THREE.DirectionalLight('#92cbd0', 1.4); fill.position.set(12, 5, -8); scene.add(fill);
  const resources = new Set();
  function mesh(geometry, color, parent = scene, glow = false) {
    const material = new THREE.MeshStandardMaterial({ color, metalness: 0.22, roughness: 0.6, ...(glow ? { emissive: color, emissiveIntensity: 0.3 } : {}) });
    resources.add(geometry); resources.add(material);
    const object = new THREE.Mesh(geometry, material); parent.add(object); return object;
  }
  function box(parent, x, y, z, w, h, d, color, glow = false) {
    const object = mesh(new THREE.BoxGeometry(w, h, d), color, parent, glow); object.position.set(x, y, z); return object;
  }
  function label(text, parent) {
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 100;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#122019'; ctx.fillRect(0, 0, 640, 100);
    ctx.strokeStyle = '#586e4c'; ctx.lineWidth = 3; ctx.strokeRect(2, 2, 636, 96);
    ctx.fillStyle = '#e2edda'; ctx.font = '500 43px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 320, 52, 604);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; resources.add(texture);
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false }); resources.add(material);
    const sprite = new THREE.Sprite(material); sprite.scale.set(3.65, 0.57, 1); sprite.position.y = 3.2; parent.add(sprite); return sprite;
  }
  const grid = new THREE.GridHelper(60, 60, '#2c4234', '#203027'); grid.position.y = -0.75; scene.add(grid); resources.add(grid.geometry); resources.add(grid.material);
  box(scene, 0, -0.5, 0, 19.8, 0.5, 12, '#24392e');
  box(scene, 0, -0.2, 0, 19.6, 0.1, 11.8, '#30483a');
  for (let x = -9; x <= 9; x++) for (let z = -5; z <= 5; z++) box(scene, x, -0.12, z, 0.96, 0.02, 0.96, (x + z) % 2 ? '#314b3c' : '#354f40');
  box(scene, 0, -0.04, 5.85, 19.6, 0.07, 0.08, film.color, true);
  for (let x = -9; x < 10; x += 0.65) { const stripe = box(scene, x, 0, -5.65, 0.25, 0.05, 0.27, AMBER); stripe.rotation.y = -0.5; }
  const machines = points.map(([x, z], index) => {
    const group = new THREE.Group(); group.position.set(x, 0, z); scene.add(group);
    box(group, 0, 0.12, 0, 2.1, 0.22, 1.9, '#17271f');
    const trim = box(group, 0, 0.3, 0, 1.95, 0.1, 1.75, film.color, true);
    const body = box(group, 0, 1, 0, 1.55, 1.3, 1.3, index === 4 ? '#7ea2a2' : '#829785');
    const screen = box(group, 0, 1.2, 0.67, 1.12, 0.52, 0.05, film.color, true);
    for (let n = 0; n < 3; n++) box(group, -0.37 + n * 0.36, 0.7, 0.68, 0.18, 0.06, 0.05, '#d5dcc7');
    const rotor = mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.12, 12), '#c0b58d', group); rotor.position.y = 1.75;
    const fin = box(rotor, 0, 0.12, 0, 0.8, 0.16, 0.13, '#384f40');
    const beacon = mesh(new THREE.SphereGeometry(0.13, 12, 8), film.color, group, true); beacon.position.set(0.62, 1.85, 0.4);
    label(film.labels[index], group);
    const halo = mesh(new THREE.RingGeometry(1.22, 1.28, 48), film.color, group, true); halo.rotation.x = -Math.PI / 2; halo.position.y = 0.05;
    const gate = new THREE.Group(); group.add(gate);
    box(gate, -1.2, 1.15, 0.94, 0.12, 2.3, 0.12, LIME, true);
    box(gate, 1.2, 1.15, 0.94, 0.12, 2.3, 0.12, LIME, true);
    box(gate, 0, 2.3, 0.94, 2.5, 0.12, 0.12, LIME, true);
    for (let j = 0; j < 4; j++) box(gate, 0, 0.45 + j * 0.44, 0.94, 2.3, 0.07, 0.07, LIME, true);
    gate.visible = false;
    return { group, trim, body, screen, rotor, fin, beacon, halo, gate };
  });
  const routes = film.id === 'dependency-confusion' ? [[0, 2], [1, 2], [2, 3], [3, 4]]
    : film.id === 'typosquatting' ? [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]]
    : film.id === 'lockfile' ? [[0, 1], [1, 2], [1, 3], [0, 4], [4, 3]]
    : film.id === 'scripts' ? [[0, 1], [1, 2], [2, 3], [1, 4]]
    : film.id === 'attack-surface' ? [[0, 2], [1, 2], [3, 2], [4, 2]]
    : [[0, 1], [1, 2], [1, 3], [2, 4], [3, 4]];
  const belts = routes.map(([a, b]) => {
    const p = points[a], q = points[b];
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(p[0], 0.15, p[1]), new THREE.Vector3((p[0] + q[0]) / 2, 0.15, p[1]), new THREE.Vector3(q[0], 0.15, q[1])]);
    mesh(new THREE.TubeGeometry(curve, 24, 0.18, 6, false), '#182d23');
    const line = mesh(new THREE.TubeGeometry(curve, 24, 0.035, 6, false), '#789d75', scene, true);
    const packets = Array.from({ length: 3 }, () => box(scene, 0, 0, 0, 0.28, 0.28, 0.28, film.color, true));
    return { a, b, curve, line, packets };
  });
  const scanner = mesh(new THREE.TorusGeometry(2, 0.035, 8, 64), CYAN, scene, true); scanner.rotation.x = Math.PI / 2;
  const focus = new THREE.Vector3(), normal = new THREE.Color(film.color), danger = new THREE.Color(RED), amber = new THREE.Color(AMBER);
  let aspect = 2, lastFrame;
  function draw(frame, reducedMotion = false) {
    lastFrame = [frame, reducedMotion];
    const { index, time, progress } = frame;
    const direction = filmDirection(film.id, index);
    const previous = filmDirection(film.id, Math.max(0, index - 1));
    const blend = reducedMotion ? 1 : smooth(progress * 5);
    machines.forEach((machine, i) => {
      const targetColor = direction.infected.includes(i) ? danger : direction.warning.includes(i) ? amber : normal;
      const beforeColor = previous.infected.includes(i) ? danger : previous.warning.includes(i) ? amber : normal;
      for (const object of [machine.trim, machine.screen, machine.beacon, machine.halo]) {
        object.material.color.copy(beforeColor).lerp(targetColor, blend);
        object.material.emissive.copy(object.material.color);
      }
      machine.rotor.rotation.y = reducedMotion ? 0 : time * (direction.gates.includes(i) ? 0 : 1.5) + i;
      machine.gate.visible = direction.gates.includes(i);
      machine.gate.scale.y = reducedMotion ? 1 : Math.max(0.01, blend);
      machine.halo.scale.setScalar(reducedMotion ? 1 : 1 + Math.sin(time * 1.8 + i) * 0.06);
      // A retired component physically leaves the production line.
      machine.group.position.y = film.id === 'eol' && index === 3 && [1, 2].includes(i) ? -blend * 1.7 : 0;
      machine.group.visible = !(index === 3 && (film.id === 'typosquatting' && i === 1 || film.id === 'eol' && [1, 2].includes(i)) && blend > 0.95);
      machine.body.material.color.set(film.id === 'eol' && index < 3 && [1, 2].includes(i) ? '#927957' : i === 4 ? '#7ea2a2' : '#829785');
    });
    belts.forEach(({ a, b, curve, line, packets }) => {
      let enabled = !direction.gates.includes(a) && !direction.gates.includes(b);
      if (film.id === 'dependency-confusion') enabled = a === 0 ? index < 2 : a === 1 ? index >= 2 : enabled;
      if (film.id === 'typosquatting') enabled = a === 1 || b === 1 ? index < 2 : a === 2 || b === 2 ? index >= 2 : enabled;
      if (film.id === 'lockfile' && (a === 4 || b === 4)) enabled = index === 1;
      if (film.id === 'eol' && index === 3) enabled = a === 3 || b === 3;
      const bad = direction.infected.includes(a) || direction.infected.includes(b);
      line.material.color.set(enabled ? bad ? RED : film.color : '#4b6152');
      line.material.emissive.copy(line.material.color).multiplyScalar(enabled ? 0.35 : 0);
      packets.forEach((packet, j) => {
        packet.visible = enabled;
        const phase = reducedMotion ? (j + 1) / 4 : (time * 0.14 + j / 3) % 1;
        packet.position.copy(curve.getPoint(phase)); packet.position.y += 0.3;
        packet.rotation.y = reducedMotion ? 0 : time * 0.65;
        packet.material.color.set(bad ? RED : film.color); packet.material.emissive.copy(packet.material.color);
      });
    });
    scanner.visible = ['audit', 'zero-day', 'attack-surface'].includes(film.id);
    if (scanner.visible) {
      scanner.position.set(film.id === 'audit' ? 1.5 : -3.4, 0.55 + (reducedMotion ? 0 : Math.sin(time * 0.8) * 0.4), film.id === 'audit' ? Math.sin(time * 0.35) * 3 : 0);
      scanner.material.color.set(film.id === 'audit' && scanner.position.z < -1 ? RED : CYAN);
    }
    // Slow dolly and reframing throughout the shot; no abrupt cuts or flashing.
    const movement = reducedMotion ? 0 : Math.sin(time * 0.09);
    focus.set(index === 1 ? -1.5 * blend : index === 2 ? blend : 0, 0.5, 0);
    camera.position.set(13 + movement * 1.3, 19, 24 - movement); camera.lookAt(focus);
    const h = Math.max(6.8, 12.6 / aspect);
    camera.left = -h * aspect; camera.right = h * aspect; camera.top = h; camera.bottom = -h;
    camera.updateProjectionMatrix(); renderer.render(scene, camera);
  }
  const observer = new ResizeObserver(() => { const r = container.getBoundingClientRect(); if (!r.width || !r.height) return; aspect = r.width / r.height; renderer.setSize(r.width, r.height); if (lastFrame) draw(...lastFrame); });
  observer.observe(container);
  return { draw, dispose() { observer.disconnect(); resources.forEach(resource => resource.dispose()); renderer.dispose(); renderer.domElement.remove(); } };
}

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { constructionCost, constructionPrice, productionCost, productionPrice, visiblePoints } from './catalog.js';

export function createFactory(container, onSelect, onExpand, onExpandProduction) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#131c1b');
  scene.fog = new THREE.Fog('#131c1b', 42, 85);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', 'Fábrica isométrica 3D. Arrastra para girar, usa la rueda para acercar. Selecciona máquinas también desde el mapa accesible. Amplía los puntos de construcción y producción con los botones situados bajo la fábrica.');
  const camera = new THREE.OrthographicCamera(-16, 16, 12, -12, 0.1, 120);
  camera.position.set(22, 25, 31);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 2); controls.enableDamping = true;
  controls.minZoom = 0.65; controls.maxZoom = 2.5;
  controls.minPolarAngle = 0.3; controls.maxPolarAngle = Math.PI / 2.5;
  controls.enablePan = false; controls.update();
  scene.add(new THREE.HemisphereLight(0xddeef4, 0x35402f, 2.4));
  const sun = new THREE.DirectionalLight(0xffe8bd, 4.3);
  sun.position.set(-10, 24, 8); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 20, bottom: -20 });
  sun.shadow.bias = -0.0005; scene.add(sun);
  const fill = new THREE.DirectionalLight(0x99d9e4, 2); fill.position.set(15, 8, -15); scene.add(fill);
  const staticGroup = new THREE.Group(); scene.add(staticGroup);
  let dynamic = new THREE.Group(); scene.add(dynamic);
  let movers = [], clickables = [], signature = '', playing = false, needsRender = true, lastFrame = 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  controls.addEventListener('change', () => { needsRender = true; });
  const mats = new Map();
  function material(color, metal = 0.2, glow = false) {
    const key = `${color}-${metal}-${glow}`;
    if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: 0.55, ...(glow ? { emissive: color, emissiveIntensity: 0.5 } : {}) }));
    return mats.get(key);
  }
  function box(parent, x, y, z, w, h, d, color, metal = 0.2, glow = false) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color, metal, glow));
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function cylinder(parent, x, y, z, r, h, color, sides = 24) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, sides), material(color, 0.55)); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function label(parent, text, x, y, z, color = '#d5e8db', size = 2.8) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#14211e'; ctx.fillRect(0, 4, 512, 88);
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.strokeRect(2, 6, 508, 84);
    ctx.font = '500 45px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.fillText(text, 256, 49, 476);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })); sprite.position.set(x, y, z); sprite.scale.set(size, size * 96 / 512, 1); parent.add(sprite); return sprite;
  }
  box(staticGroup, 0, -0.85, 0, 200, 0.1, 200, '#111b19');
  const grid = new THREE.GridHelper(100, 100, '#283c34', '#1c2d27'); grid.position.y = -0.78; staticGroup.add(grid);
  for (const [cx, color, title] of [[-5.4, '#dfb774', '01 / CONSTRUCCIÓN'], [5.4, '#9bcdad', '02 / PRODUCCIÓN']]) {
    box(staticGroup, cx, -0.36, 0, 9.6, 0.75, 11.4, '#25332e');
    box(staticGroup, cx, 0.04, 0, 9.4, 0.12, 11.2, '#35453c');
    for (let x = -4; x <= 4; x++) for (let z = -5; z <= 5; z++) box(staticGroup, cx + x, 0.115, z, 0.94, 0.025, 0.94, (x + z) % 2 ? '#36483e' : '#3a4d42');
    box(staticGroup, cx, 0.15, 5.55, 9.4, 0.07, 0.09, color, 0.5, true);
    box(staticGroup, cx - 4.65, 0.15, 0, 0.07, 0.06, 11.2, color, 0.5, true);
    for (let z = -4.9; z < 5; z += 0.5) { const stripe = box(staticGroup, cx + 4.48, 0.17, z, 0.25, 0.05, 0.2, '#c6af67'); stripe.rotation.y = -0.5; }
    label(staticGroup, title, cx, 0.4, 12.3, color, 4.2);
    for (const z of [-5, 5]) for (const x of [-4, 4]) cylinder(staticGroup, cx + x, -0.55, z, 0.25, 1, '#1a2521');
  }
  // The bridge is a deployment boundary, not a dependency edge.
  box(staticGroup, 0, 0.12, 1, 1.2, 0.22, 1.6, '#4f5f53');
  for (const z of [0.2, 1.8]) box(staticGroup, 0, 0.6, z, 1.25, 0.07, 0.07, '#e0bc7b');
  for (const x of [-9.2, -2]) { box(staticGroup, x, 2.2, -4.5, 0.3, 4.3, 0.4, '#c0b38b'); box(staticGroup, x, 0.3, -4.5, 0.9, 0.4, 0.9, '#566259'); }
  box(staticGroup, -5.6, 4.3, -4.5, 7.6, 0.45, 0.55, '#d0c199');
  for (let x = -8.8; x < -2; x += 0.65) box(staticGroup, x, 4.3, -4.17, 0.28, 0.3, 0.07, '#5f6252');
  const crane = box(staticGroup, -5.9, 3.95, -4.5, 0.9, 0.4, 0.8, '#d8bc77');
  box(crane, 0, -0.7, 0, 0.055, 1.4, 0.055, '#202e27');
  box(crane, 0, -1.4, 0, 0.35, 0.15, 0.35, '#d4ba76');
  // Gateway, terminals and crates make the empty factory a place, not a blank canvas.
  box(staticGroup, 5.4, 0.4, -4.4, 3.2, 0.45, 1.5, '#22302b');
  for (let i = 0; i < 3; i++) {
    box(staticGroup, 4.5 + i * 0.9, 1.15, -4.4, 0.72, 1.2, 0.8, '#82978d');
    for (let j = 0; j < 3; j++) box(staticGroup, 4.5 + i * 0.9, 0.9 + j * 0.27, -3.98, 0.5, 0.12, 0.04, '#a6e1c0', 0.1, true);
  }
  label(staticGroup, 'GATEWAY / API', 5.4, 2.15, -4.4, '#a6e1c0', 2.6);
  for (const [x, z] of [[-9, 3.5], [-8.3, 4.1], [9, 3.8]]) {
    box(staticGroup, x, 0.5, z, 0.7, 0.75, 0.7, '#b6a580'); box(staticGroup, x, 0.5, z + 0.36, 0.08, 0.72, 0.03, '#e6d9b4');
  }
  function machine(n, x, z) {
    const g = new THREE.Group(); g.position.set(x, 0.2, z); dynamic.add(g);
    const c = n.compromised ? '#f27d6f' : n.isolated ? '#e4b96c' : n.color;
    const small = n.transitive;
    box(g, 0, 0.12, 0, small ? 0.95 : 1.85, 0.24, small ? 0.95 : 1.65, '#1b2924');
    box(g, 0, 0.28, 0, small ? 0.8 : 1.65, 0.08, small ? 0.8 : 1.45, c, 0.3, true);
    if (small) {
      box(g, 0, 0.65, 0, 0.65, 0.65, 0.65, '#71897a');
      box(g, 0, 0.65, 0.34, 0.4, 0.2, 0.035, c, 0.3, true);
      cylinder(g, 0, 1.02, 0, 0.16, 0.12, c);
    } else if (n.category === 'data') {
      cylinder(g, 0, 1.05, 0, 0.62, 1.45, '#7da5a7');
      for (let i = 0; i < 3; i++) cylinder(g, 0, 0.5 + i * 0.5, 0, 0.66, 0.1, c);
      box(g, 0.63, 0.9, 0, 0.28, 0.6, 0.55, '#263b35');
      box(g, 0.79, 1, 0, 0.02, 0.22, 0.3, c, 0.2, true);
    } else if (n.category === 'message') {
      box(g, 0, 0.9, 0, 1.3, 1.2, 1.05, '#9996b1');
      for (let i = 0; i < 3; i++) box(g, 0, 0.65 + i * 0.3, 0.55, 0.85, 0.13, 0.04, c, 0.2, true);
      cylinder(g, 0.35, 1.85, 0, 0.035, 0.8, '#b6bacc');
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), material(c, 0.3, true)); ball.position.set(0.35, 2.25, 0); g.add(ball);
    } else {
      box(g, 0, 0.85, 0, 1.4, 1.05, 1.15, '#9cba8a');
      box(g, 0, 1.46, -0.1, 1.2, 0.2, 0.9, c);
      const lens = cylinder(g, 0, 0.9, 0.66, 0.4, 0.22, '#233b31'); lens.rotation.x = Math.PI / 2;
      const inner = cylinder(g, 0, 0.9, 0.8, 0.26, 0.05, c); inner.rotation.x = Math.PI / 2;
      box(g, -0.85, 0.8, 0, 0.2, 0.55, 0.75, '#70886d');
      box(g, 0.85, 0.8, 0, 0.2, 0.55, 0.75, '#70886d');
    }
    if (!small) label(g, n.name, 0, 2.6, 0, c, 3.2);
    if (n.isolated) {
      const cage = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(small ? 1.15 : 2, small ? 1.4 : 2.6, small ? 1.15 : 1.9)), new THREE.LineBasicMaterial({ color: '#e4b96c' })); cage.position.y = small ? 0.7 : 1.3; g.add(cage);
    }
    g.traverse(o => { if (o.isMesh) { o.userData.id = n.id; clickables.push(o); } });
    return g;
  }
  function wire(from, to, color, active) {
    const points = [new THREE.Vector3(from.x, 0.24, from.z), new THREE.Vector3(from.x, 0.24, (from.z + to.z) / 2), new THREE.Vector3(to.x, 0.24, (from.z + to.z) / 2), new THREE.Vector3(to.x, 0.24, to.z)];
    const curve = new THREE.CurvePath(); for (let i = 1; i < points.length; i++) curve.add(new THREE.LineCurve3(points[i - 1], points[i]));
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.045, 5, false), material(color, 0.2, true)); dynamic.add(tube);
    if (active) { const p = box(dynamic, 0, 0.4, 0, 0.16, 0.16, 0.16, color, 0.2, true); movers.push({ mesh: p, curve, offset: movers.length * 0.27 }); }
  }
  function disposeGroup(group) { group.traverse(o => { o.geometry?.dispose(); if (o.isSprite) { o.material.map?.dispose(); o.material.dispose(); } if (o.isLineSegments) o.material.dispose(); }); scene.remove(group); }
  function infrastructurePoints(state, production = false) {
    const points = production ? state.productionPoints : state.constructionPoints;
    const price = production ? productionPrice : constructionPrice;
    const getCost = production ? productionCost : constructionCost;
    const cx = production ? 5.4 : -5.4;
    const visible = visiblePoints(points), compact = visible.length > 3;
    for (const [slot, i] of visible.entries()) {
      const built = i < points, next = i === points;
      const cost = getCost(i);
      const station = new THREE.Group(); station.position.set(cx - 3 + slot % 3 * 3, 0, compact ? 7.6 + Math.floor(slot / 3) * 2.5 : 8.3);
      if (compact) station.scale.setScalar(0.75);
      dynamic.add(station);
      const color = built ? production ? '#8bcad5' : '#b8e981' : '#718275';
      box(station, 0, -0.25, 0, 2.6, 0.6, 2.8, '#25332e');
      box(station, 0, 0.1, 0, 2.4, 0.1, 2.6, built ? '#42553a' : '#2c3b31');
      if (slot < 3) box(station, 0, 0.13, -2, 0.8, 0.12, 1.4, '#4f5f53');
      if (built && production) {
        box(station, 0, 0.8, 0, 1.3, 1.3, 1.1, '#587d83');
        for (let rack = 0; rack < 3; rack++) box(station, 0, 0.4 + rack * 0.35, 0.57, 0.9, 0.15, 0.04, color, 0.2, true);
        cylinder(station, 0, 1.6, 0, 0.35, 0.2, color);
      } else if (built) {
        box(station, 0, 0.55, 0, 1.5, 0.8, 1.1, '#667d60');
        box(station, 0, 1, 0, 1.8, 0.14, 1.3, '#b9c6a3');
        box(station, 0, 1.4, -0.25, 0.9, 0.65, 0.18, '#263c30');
        box(station, 0, 1.4, -0.14, 0.7, 0.42, 0.03, color, 0.2, true);
        for (const x of [-0.95, 0.95]) box(station, x, 1.25, -0.8, 0.1, 2.2, 0.1, '#c0b38b');
        box(station, 0, 2.35, -0.8, 2, 0.15, 0.15, color);
      } else {
        box(station, 0, 0.2, 0, 0.8, 0.06, 0.14, color);
        box(station, 0, 0.2, 0, 0.14, 0.06, 0.8, color);
      }
      label(station, built ? `${production ? 'PROD.' : 'PUNTO'} ${i + 1}` : `+ ${price(i)} CR`, 0, built ? 2.8 : 0.8, 0, color, 2.5);
      if (next && state.budget >= cost && !state.ended) station.traverse(o => { if (o.isMesh) { o.userData.expand = production ? 'production' : 'construction'; clickables.push(o); } });
    }
    if (visible[0]) label(dynamic, `+ ${visible[0]} PUNTOS ANTERIORES`, cx, 0.5, 13.8, production ? '#8bcad5' : '#b8e981', 4);
  }
  function update(state, selected, mapMode) {
    playing = state.started && !state.paused && !state.ended;
    const pointCost = constructionCost(state.constructionPoints);
    const next = JSON.stringify([state.nodes.map(n => [n.id, n.phase, n.compromised, n.isolated, n.buildBlocked]), selected, mapMode, state.defenses, state.constructionPoints, state.budget >= pointCost, state.productionPoints, state.budget >= productionCost(state.productionPoints), state.ended]);
    if (next === signature) return; signature = next; needsRender = true;
    disposeGroup(dynamic); dynamic = new THREE.Group(); scene.add(dynamic); clickables = []; movers = [];
    infrastructurePoints(state); infrastructurePoints(state, true);
    const positions = new Map();
    for (const phase of ['build', 'run']) {
      const cx = phase === 'build' ? -5.4 : 5.4;
      const roots = state.nodes.filter(n => n.phase === phase && !n.transitive);
      const parts = state.nodes.filter(n => n.phase === phase && n.transitive);
      for (let i = 0; i < Math.max(3, roots.length); i++) {
        const x = cx + (i % 3 - 1) * 2.55, z = roots.length > 3 ? -2.2 + Math.floor(i / 3) * 1.85 : -0.3;
        if (roots[i]) { machine(roots[i], x, z); positions.set(roots[i].id, { x, z }); }
        else {
          const line = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.8, 0.05, 1.55)), new THREE.LineBasicMaterial({ color: phase === 'build' ? '#728163' : '#618373', transparent: true, opacity: 0.55 })); line.position.set(x, 0.19, z); dynamic.add(line);
          box(dynamic, x, 0.2, z, 0.45, 0.04, 0.06, '#72816b'); box(dynamic, x, 0.2, z, 0.06, 0.04, 0.45, '#72816b');
        }
      }
      const columns = parts.length > 5 ? 6 : 5;
      parts.forEach((n, i) => { const x = cx + (i % columns - (columns - 1) / 2) * 1.25, z = (roots.length > 3 ? 3.2 : 2.6) + Math.floor(i / columns) * 1.25; machine(n, x, z); positions.set(n.id, { x, z }); });
    }
    for (const n of state.nodes.filter(n => !n.transitive)) {
      for (const dep of n.deps) {
        const a = positions.get(n.id), b = positions.get(dep); if (!a || !b) continue;
        const highlighted = selected === n.id || selected === dep;
        wire(a, b, n.compromised || state.nodes.find(x => x.id === dep)?.compromised ? '#f27d6f' : highlighted || mapMode ? '#c5ed8b' : '#648476', n.phase === 'run');
      }
    }
    if (positions.has(selected)) { const p = positions.get(selected); const ring = new THREE.Mesh(new THREE.RingGeometry(1.05, 1.15, 48), new THREE.MeshBasicMaterial({ color: '#d9f89c', side: THREE.DoubleSide, transparent: true, opacity: 0.9 })); ring.rotation.x = -Math.PI / 2; ring.position.set(p.x, 0.3, p.z); dynamic.add(ring); }
    if (state.defenses.includes('network')) label(dynamic, 'RED SEGMENTADA', 5.4, 3, -5, '#b9ef99', 3);
  }
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(); let down;
  renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
    const r = renderer.domElement.getBoundingClientRect(); pointer.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera); const hit = raycaster.intersectObjects(clickables, false)[0]; if (hit) { if (hit.object.userData.expand === 'production') onExpandProduction?.(); else if (hit.object.userData.expand === 'construction') onExpand?.(); else onSelect(hit.object.userData.id); }
  });
  const observer = new ResizeObserver(() => { const { width, height } = container.getBoundingClientRect(); if (!width || !height) return; renderer.setSize(width, height); const aspect = width / height, h = Math.max(9.7, 14 / aspect); camera.left = -h * aspect; camera.right = h * aspect; camera.top = h; camera.bottom = -h; camera.updateProjectionMatrix(); needsRender = true; }); observer.observe(container);
  let animation;
  function frame(time) {
    animation = requestAnimationFrame(frame); controls.update();
    const animate = playing && !reducedMotion.matches;
    if (!needsRender && (!animate || time - lastFrame < 33)) return;
    if (animate) { crane.position.x = -5.5 + Math.sin(time * 0.0005) * 2; for (const m of movers) m.mesh.position.copy(m.curve.getPoint((time * 0.00016 + m.offset) % 1)).add(new THREE.Vector3(0, 0.12, 0)); }
    renderer.render(scene, camera);
    needsRender = false; lastFrame = time;
  }
  animation = requestAnimationFrame(frame);
  return { update, zoom(delta) { camera.zoom = THREE.MathUtils.clamp(camera.zoom + delta, 0.65, 2.5); camera.updateProjectionMatrix(); needsRender = true; }, reset() { camera.position.set(22, 25, 31); controls.target.set(0, 0, 2); camera.zoom = 1; camera.updateProjectionMatrix(); controls.update(); needsRender = true; }, dispose() { cancelAnimationFrame(animation); observer.disconnect(); controls.dispose(); disposeGroup(dynamic); disposeGroup(staticGroup); mats.forEach(m => m.dispose()); renderer.dispose(); } };
}

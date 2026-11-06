import { Game, SAVE_KEY } from './game.js';
import { PACKAGES, DEFENSES, ORDERS, LABELS, LESSONS } from './catalog.js';
import { createFactory } from './scene.js';
import { Tutorial, TUTORIAL_STEPS, TUTORIAL_KEY } from './tutorial.js';
import { FILMS } from './films.js';
import { filmLibrary, filmMarkup, mountFilm } from './film-player.js';

const icons = {
  box: '<path d="m12 3 9 5v9l-9 5-9-5V8l9-5Z M3 8l9 5 9-5 M12 13v9"/>',
  factory: '<path d="M3 21V10l6 3V8l6 4V3h4l2 18H3Z M7 17h1m4 0h1m4 0h1"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',
  message: '<path d="M21 11a9 9 0 0 1-9 9H4l-2 2V11a9 9 0 0 1 19 0Z M7 10h10M7 14h6"/>',
  data: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5 M4 12c0 4 16 4 16 0"/>',
  all: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  shield: '<path d="m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6l9-4Z m-4 10 3 3 5-6"/>',
  key: '<circle cx="8" cy="8" r="5"/><path d="m12 12 9 9m-3-3 3-3m-6 0 3-3"/>',
  lock: '<rect x="4" y="10" width="16" height="12" rx="2"/><path d="M7 10V7a5 5 0 0 1 10 0v3m-5 5v3"/>',
  file: '<path d="M14 2H5v20h14V7l-5-5Z M14 2v6h5M8 13h8m-8 4h6"/>',
  terminal: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m6 8 4 4-4 4m7 0h5"/>',
  play: '<path d="m7 4 14 8-14 8V4Z"/>', pause: '<path d="M8 4v16M16 4v16"/>',
  map: '<rect x="9" y="2" width="6" height="5" rx="1"/><rect x="2" y="17" width="6" height="5" rx="1"/><rect x="16" y="17" width="6" height="5" rx="1"/><path d="M12 7v5H5v5m7-5h7v5"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>', check: '<path d="m5 12 4 4L19 6"/>',
  search: '<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
  book: '<path d="M12 5c-4-3-8-2-10-1v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-2-1-6-2-10 1Zm0 0v15"/>',
  reset: '<path d="M3 10a9 9 0 1 1 1 8M3 3v7h7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M15 8H9v8h6M8 12h6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>', plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  alert: '<path d="m12 3 10 18H2L12 3Zm0 6v5m0 3v1"/>', target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.box}</svg>`;
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = v => Math.floor(v).toLocaleString('es-ES');
const time = v => `${Math.floor(v / 60).toString().padStart(2, '0')}:${(v % 60).toString().padStart(2, '0')}`;
let saved;
try { saved = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { /* A blocked or absent store starts a fresh session. */ }
let game = new Game(saved);
if (game.state.started && !game.state.ended) game.state.paused = true;
let selected = 'pixel-press', tab = 'packages', filter = 'all', query = '', mapMode = false, summaryShown = false, modalWasRunning = false, storageFailed = false;
let tutorial = null, campaignView = null, tutorialPosition = -1, tutorialSeen = false;
let activeFilm = null, lastFilm = null, modalReturnFocus = null;
try { tutorialSeen = Boolean(localStorage.getItem(TUTORIAL_KEY)); } catch { /* The tutorial also works without storage. */ }

document.querySelector('#app').innerHTML = `
  <header class="topbar">
    <a class="brand" href="#" aria-label="Fábrica de dependencias"> <span class="brand-mark">${icon('box')}</span><span><strong>npm<span class="slash">/</span>factory<span class="brand-dot">.</span></strong><small>FÁBRICA DE DEPENDENCIAS</small></span></a>
    <div class="turn"><span class="live-dot"></span> TURNO 01 <span class="subtle">/</span> <span id="phase-label">PREPARACIÓN</span></div>
    <div class="top-stats"><div class="stat">${icon('coin')}<span><small>PRESUPUESTO</small><b id="budget">2.400 <em>cr</em></b></span></div><div class="stat">${icon('clock')}<span><small>TIEMPO RESTANTE</small><b id="remaining">07:00</b></span></div><div class="stat data-stat">${icon('shield')}<span><small>DATOS PROTEGIDOS</small><b id="integrity">100<em>%</em></b></span></div></div>
    <button class="icon-button help-button" data-action="guide" aria-label="Cómo jugar">${icon('book')}</button>
  </header>
  <main class="workspace">
    <nav class="rail" aria-label="Herramientas"><button class="rail-button active" data-action="factory" aria-label="Fábrica" title="Fábrica">${icon('factory')}</button><button class="rail-button" data-action="map" aria-label="Mapa de dependencias" title="Mapa de dependencias">${icon('map')}</button><button class="rail-button" data-action="defenses" aria-label="Defensas" title="Defensas">${icon('shield')}</button><span class="rail-separator"></span><button class="rail-button" data-action="guide" aria-label="Guía de seguridad" title="Guía de seguridad">${icon('book')}</button><button class="rail-button rail-bottom" data-action="restart" aria-label="Nueva partida" title="Nueva partida">${icon('reset')}</button><span class="rail-version">v1.0</span></nav>
    <aside class="catalog-panel"><div class="panel-heading"><span class="eyebrow">SUMINISTROS</span><h1>Construye tu fábrica<span>.</span></h1><p>Cada paquete es una pieza.<br>Cada dependencia, una decisión.</p></div><div class="tabs"><button data-action="tab" data-id="packages" class="active" id="tab-packages">Paquetes <span>07</span></button><button data-action="tab" data-id="defenses" id="tab-defenses">Defensas <span>06</span></button></div><div id="catalog-tools"><label class="search">${icon('search')}<input id="search" placeholder="Buscar paquete…" aria-label="Buscar paquete"></label><div class="filters"><button class="active" data-action="filter" data-id="all">Todos</button><button data-action="filter" data-id="image" aria-label="Filtrar imágenes">${icon('image')}</button><button data-action="filter" data-id="message" aria-label="Filtrar mensajes">${icon('message')}</button><button data-action="filter" data-id="data" aria-label="Filtrar datos">${icon('data')}</button></div></div><div id="catalog" class="catalog-list"></div><div class="catalog-footer">${icon('box')} Paquetes ficticios. Riesgos reales.</div></aside>
    <section class="factory-panel" aria-label="Área de juego"><div class="factory-toolbar"><div class="view-tabs"><button class="active" data-action="factory" id="view-factory">${icon('factory')} Fábrica</button><button data-action="map" id="view-map">${icon('map')} Dependencias <span id="node-count">0</span></button></div><div class="toolbar-actions"><span class="scene-status" id="scene-status"><i></i> EN ESPERA</span><button class="tutorial-launch" data-action="tutorial-offer">${icon('play')} Tutorial</button></div></div>
      <div class="scene-wrap"><div id="scene"></div><div class="scene-heading"><span class="eyebrow">TU LÍNEA DE PRODUCCIÓN</span><h2>Pequeñas piezas.<br>Grandes responsabilidades.</h2><p id="scene-hint">Selecciona un paquete para empezar.</p></div><div id="incident-banner"></div><div id="graph" class="graph-panel" hidden></div><div class="scene-controls"><button data-action="zoom-in" aria-label="Acercar">${icon('plus')}</button><button data-action="zoom-out" aria-label="Alejar">${icon('minus')}</button><button data-action="camera" aria-label="Restablecer cámara">${icon('target')}</button></div><div class="scene-legend"><span><i class="lime"></i> Operativo</span><span><i class="amber"></i> Taller / aislado</span><span><i class="red"></i> Incidente</span></div><div class="camera-hint">ARRASTRA PARA GIRAR · RUEDA PARA ZOOM</div><div id="pause-overlay" hidden><span>PAUSA</span><small>El tiempo y la producción están detenidos.</small><button class="primary" data-action="pause">${icon('play')} Continuar turno</button></div></div>
      <div class="controlbar"><button id="pause" class="play-control" data-action="pause">${icon('play')} Iniciar turno</button><button id="speed" class="speed" data-action="speed" title="Velocidad de simulación">1×</button><div class="production-count"><span id="running-count">0</span> <small>MÓDULOS ACTIVOS</small></div><button id="deploy" class="primary" data-action="deploy-all">Poner en marcha ${icon('arrow')}</button></div>
      <section class="console"><div class="console-header"><h3>${icon('terminal')} Registro de actividad <span id="log-count">01</span></h3><button data-action="audit">${icon('search')} Ejecutar audit <span>20 cr</span></button></div><div id="logs" class="logs" role="log" aria-label="Actividad de la fábrica"></div></section>
    </section>
    <aside class="right-panel"><section id="order" class="order"></section><section id="inspector" class="inspector"></section><section class="risk"><div><span class="eyebrow">SUPERFICIE DE ATAQUE</span><b id="risk-value">0<small>/100</small></b></div><div class="risk-meter"><i id="risk-fill"></i></div><p id="risk-description">Entradas, permisos y código instalado.</p><div id="defense-badges"></div></section></aside>
  </main><footer class="footer"><span><i class="live-dot"></i> SIMULACIÓN LOCAL <span class="footer-sep">/</span> APRENDE CONSTRUYENDO</span><span id="save-status">Guardado en este navegador</span><button data-action="guide">Manual del operador ${icon('arrow')}</button></footer>
  <dialog id="modal"><div id="modal-content"></div></dialog><div id="announcement" class="sr-only" role="status" aria-live="polite"></div>`;

document.querySelector('#app').insertAdjacentHTML('beforeend', '<aside id="tutorial" class="tutorial-card" aria-label="Tutorial guiado" hidden></aside>');
let factory;
try { factory = createFactory(document.querySelector('#scene'), id => { if (tutorial) return; selected = id; render(); }); }
catch { document.querySelector('#scene').innerHTML = '<div class="webgl-error"><h2>No se pudo iniciar WebGL</h2><p>Activa la aceleración gráfica o prueba otro navegador. Puedes jugar usando el mapa de dependencias.</p><button class="primary" data-action="map">Abrir mapa</button></div>'; }

const htmlCache = new Map();
function put(id, html) { if (htmlCache.get(id) === html) return; const el = document.getElementById(id); el.innerHTML = html; htmlCache.set(id, html); }
function packageCard(p) {
  const installed = game.node(p.id), inspected = game.state.inspected.includes(p.id);
  return `<button class="package-card ${selected === p.id ? 'selected' : ''}" data-action="select" data-id="${p.id}" aria-pressed="${selected === p.id}"><div class="package-top"><span class="package-icon" style="--package-color:${p.color}">${icon(p.category)}</span><span class="package-price">${installed ? icon('check') : `${p.cost}<small> cr</small>`}</span></div><strong>${p.name}</strong><span class="package-title">${p.title}</span><div class="package-meta"><span>v${p.version}</span><span>${p.deps.length} dep.</span><span class="${p.eol ? 'amber-text' : inspected ? 'lime-text' : ''}">${p.eol ? 'EOL' : installed ? 'INSTALADO' : inspected ? 'REVISADO' : LABELS[p.category]}</span></div></button>`;
}
function renderCatalog() {
  document.querySelector('#catalog-tools').hidden = tab !== 'packages';
  document.querySelector('#tab-packages').classList.toggle('active', tab === 'packages'); document.querySelector('#tab-defenses').classList.toggle('active', tab === 'defenses');
  if (tab === 'packages') { const list = PACKAGES.filter(p => (filter === 'all' || p.category === filter || p.category === 'all') && p.name.includes(query.toLowerCase())); put('catalog', list.map(packageCard).join('') || '<p class="empty">No hay paquetes con ese nombre.</p>'); }
  else put('catalog', DEFENSES.map(d => `<div class="defense-card"><span class="defense-icon">${icon(d.icon)}</span><h3>${d.name}</h3><p>${d.description}</p><button class="${game.has(d.id) ? 'installed' : 'secondary'}" data-action="defend" data-id="${d.id}" ${game.has(d.id) || game.state.budget < d.cost || game.state.ended ? 'disabled' : ''}>${game.has(d.id) ? `${icon('check')} Activado` : `Activar <span>${d.cost} cr</span>`}</button></div>`).join(''));
}
function renderOrder() {
  const s = game.state, o = ORDERS[s.mission], functions = game.functions();
  const ready = s.progress >= o.units && o.needs.every(n => functions.has(n)) && !s.secretsLeaked && !s.incidents.some(i => !i.resolved);
  put('order', `<div class="section-line"><span class="eyebrow">ENCARGO ACTIVO</span><span class="order-number">0${s.mission + 1}<span> / 03</span></span></div><span class="client">${o.client}</span><h2>${o.title}</h2><p>${o.description}</p><div class="requirements">${o.needs.map(n => `<div class="requirement ${functions.has(n) ? 'complete' : ''}">${icon(n)}<span>${LABELS[n]}</span><span class="requirement-check">${functions.has(n) ? icon('check') : ''}</span></div>`).join('')}</div><div class="order-progress"><span>Producción</span><b>${s.progress} / ${o.units}</b></div><div class="progress-track"><i style="width:${s.progress / o.units * 100}%"></i></div><div class="reward"><span>Recompensa <b>+${o.reward} cr</b></span><button data-action="deliver" ${ready && !s.ended ? '' : 'disabled'}>Entregar ${icon('arrow')}</button></div>`);
}
function renderInspector() {
  const s = game.state, n = game.node(selected), p = PACKAGES.find(p => p.id === selected) || n;
  if (!p) { put('inspector', '<span class="eyebrow">INSPECTOR</span><p>Selecciona una máquina o una dependencia.</p>'); return; }
  const inspected = s.inspected.includes(p.id) || p.transitive;
  const danger = n?.compromised || inspected && (p.malicious || p.eol);
  const affected = n ? game.affected(n.id).filter(id => id !== n.id) : [];
  const blocked = s.ended ? 'disabled' : '';
  put('inspector', `<div class="section-line"><span class="eyebrow">${n ? n.transitive ? 'DEPENDENCIA TRANSITIVA' : 'MÁQUINA SELECCIONADA' : 'INSPECTOR DE PAQUETES'}</span>${icon('box')}</div><h3>${esc(p.name)}</h3><div class="inspector-meta"><span class="mono">v${n?.version || p.version}</span><span class="status-pill ${danger ? 'danger' : n?.isolated ? 'warning' : ''}">${n?.compromised ? 'COMPROMETIDO' : n?.isolated ? 'AISLADO' : n?.buildBlocked ? 'BUILD PENDIENTE' : n ? n.phase === 'run' ? 'PRODUCCIÓN' : 'EN TALLER' : 'SIN INSTALAR'}</span></div>
  ${inspected ? `<div class="inspection-report"><dl><dt>Publicador</dt><dd>${esc(p.publisher || 'Dependencia transitiva')}</dd><dt>Origen</dt><dd>${esc(n?.resolved || p.registry || 'Público')}</dd><dt>Soporte</dt><dd class="${p.eol ? 'amber-text' : ''}">${p.eol ? 'Finalizado · EOL' : 'Activo'}</dd></dl>${p.script ? `<p>${icon('terminal')} ${esc(p.script)}</p>` : '<p>Sin scripts de instalación declarados.</p>'}${p.malicious ? '<p class="red-text">Nombre esperado: <b>pixel-press</b>. Este publicador no es el oficial.</p>' : ''}${p.private && !game.has('registry') ? '<p class="amber-text">Scope sin fijar: podría resolverse desde un registro público.</p>' : ''}${p.eol ? '<p class="amber-text">codec-legacy tiene un fallo conocido. Sustituye el motor completo.</p>' : ''}</div>` : '<p class="inspector-tip">Verifica identidad, procedencia y scripts antes de confiar en esta pieza.</p>'}
  ${p.deps?.length ? `<div class="dependency-chips">${p.deps.map(d => `<button data-action="select" data-id="${d}" ${game.node(d) ? '' : 'disabled'}>${d}</button>`).join('')}</div>` : ''}
  ${n?.known && !n.patched ? '<p class="red-text">Aviso conocido: esta versión necesita corrección o sustitución.</p>' : ''}
  ${affected.length ? `<p class="affected"><b>Impacto en ${affected.length} módulo${affected.length > 1 ? 's' : ''}</b><br>${affected.map(esc).join(', ')}</p>` : ''}
  <div class="inspector-actions">${!inspected ? `<button class="secondary" data-action="inspect" data-id="${p.id}" ${blocked}>${icon('search')} Inspeccionar <span>15 cr</span></button>` : ''}
  ${!n ? `<button class="primary" data-action="install" data-id="${p.id}" ${s.budget < p.cost ? 'disabled' : blocked}>${icon('plus')} Instalar paquete <span>${p.cost} cr</span></button>` : `
  ${n.buildBlocked ? `<button class="primary" data-action="authorize" data-id="${n.id}" ${!inspected ? 'disabled' : blocked}>Autorizar build aislado</button>` : ''}
  ${!n.transitive && n.phase === 'build' && !n.compromised && !n.isolated && !n.buildBlocked ? `<button class="primary" data-action="deploy" data-id="${n.id}" ${blocked}>Poner en producción ${icon('arrow')}</button>` : ''}
  ${!n.isolated ? `<button class="secondary" data-action="isolate" data-id="${n.id}" ${blocked}>${icon('shield')} Aislar pieza</button>` : !n.eol && !n.malicious ? `<button class="primary" data-action="recover" data-id="${n.id}" ${blocked}>Reconstruir versión confiable <span>90 cr</span></button>` : ''}
  ${s.secretsLeaked ? `<button class="danger-button" data-action="rotate" ${blocked}>${icon('key')} Rotar credenciales <span>70 cr</span></button>` : ''}
  ${!n.eol && !n.malicious && !n.compromised && !n.isolated ? `<button class="text-button" data-action="update-dialog" data-id="${n.id}">Revisar actualizaciones ${icon('arrow')}</button>` : ''}
  ${!n.transitive ? `<button class="text-button" data-action="remove" data-id="${n.id}" ${blocked}>Retirar paquete</button>` : ''}`}</div>`);
}
function renderGraph() {
  document.querySelector('#graph').hidden = !mapMode;
  if (!mapMode) return;
  const roots = game.state.nodes.filter(n => !n.transitive);
  put('graph', `<div class="graph-heading"><span class="eyebrow">ÁRBOL DE LA APLICACIÓN</span><h2>Todo está conectado.</h2><p>Selecciona una pieza para localizar los módulos que dependen de ella.</p></div>${roots.length ? roots.map(n => `<div class="graph-row"><button class="graph-root ${selected === n.id ? 'active' : ''}" data-action="select" data-id="${n.id}">${icon(n.category)}${esc(n.name)}<small>${n.phase === 'run' ? 'PRODUCCIÓN' : 'CONSTRUCCIÓN'}</small></button><div class="graph-connector"></div><div class="graph-deps">${n.deps.map(id => { const d = game.node(id); return `<button class="${selected === id ? 'active' : ''} ${d?.compromised ? 'compromised' : ''}" data-action="select" data-id="${id}"><i></i>${id}<small>${d?.isolated ? 'aislado' : d?.compromised ? 'incidente' : 'v' + d?.version}</small></button>`; }).join('')}</div></div>`).join('') : '<div class="graph-empty">Instala tu primera máquina.<br>Sus dependencias aparecerán aquí.</div>'}<p class="graph-footnote">Una misma pieza puede abastecer a varios módulos. Al aislarla, todos sus consumidores se detienen.</p>`);
}
function render() {
  const s = game.state;
  put('budget', `${money(s.budget)} <em>cr</em>`); put('remaining', time(s.remaining)); put('integrity', `${s.integrity}<em>%</em>`);
  put('phase-label', s.ended ? 'FIN DEL TURNO' : s.paused ? 'PAUSA' : s.started ? 'EN MARCHA' : 'PREPARACIÓN');
  put('pause', `${icon(s.started && !s.paused ? 'pause' : 'play')} ${!s.started ? 'Iniciar turno' : s.paused ? 'Continuar' : 'Pausar'}`);
  document.querySelector('#pause').disabled = Boolean(s.ended || tutorial);
  document.querySelector('#speed').disabled = Boolean(tutorial);
  document.querySelector('#search').disabled = Boolean(tutorial);
  document.querySelector('#pause-overlay').hidden = !s.paused || !s.started || Boolean(s.ended) || mapMode || Boolean(tutorial) || document.querySelector('#modal').open;
  put('scene-status', `<i class="${s.incidents.some(i => !i.resolved) ? 'incident' : ''}"></i> ${s.incidents.some(i => !i.resolved) ? 'INCIDENTE ACTIVO' : s.started && !s.paused ? 'TURNO EN CURSO' : 'EN ESPERA'}`);
  put('node-count', String(s.nodes.length)); put('running-count', String(s.nodes.filter(n => !n.transitive && game.operational(n)).length));
  document.querySelector('#deploy').disabled = !s.nodes.some(n => !n.transitive && n.phase === 'build' && !n.compromised && !n.isolated && !n.buildBlocked) || Boolean(s.ended);
  document.querySelector('.scene-heading').classList.toggle('compact', s.nodes.length > 0);
  put('scene-hint', s.nodes.length ? 'Selecciona una máquina para gestionar su seguridad.' : 'Selecciona un paquete para empezar.');
  const incident = s.incidents.find(i => !i.resolved);
  put('incident-banner', incident ? `<button data-action="select" data-id="${incident.node}">${icon('alert')}<span><b>${esc(incident.title)}</b><small>${esc(incident.node)} · Aislar, rotar y recuperar</small></span>${icon('arrow')}</button>` : s.secretsLeaked ? `<button data-action="rotate">${icon('key')} Credenciales filtradas · Rotar por 70 cr</button>` : '');
  const risk = game.surface(); put('risk-value', `${risk}<small>/100</small>`); document.querySelector('#risk-fill').style.width = `${risk}%`;
  document.querySelector('#risk-fill').style.background = risk > 65 ? 'var(--red)' : risk > 35 ? 'var(--amber)' : 'var(--lime)';
  put('risk-description', `${s.nodes.length} piezas · ${game.has('network') ? 'red segmentada' : 'acceso directo'} · ${game.has('privilege') ? 'permisos limitados' : 'permisos amplios'}`);
  put('defense-badges', s.defenses.length ? s.defenses.map(id => `<span title="${DEFENSES.find(d => d.id === id).name}">${icon(DEFENSES.find(d => d.id === id).icon)}</span>`).join('') : '<button class="text-button" data-action="defenses">Añadir defensas +</button>');
  put('logs', s.logs.slice(0, 12).map(l => `<div class="log ${l.kind}"><time>${time(l.time)}</time><span class="log-dot"></span><p>${esc(l.text)}</p></div>`).join('')); put('log-count', String(s.logs.length).padStart(2, '0'));
  put('save-status', storageFailed ? 'Guardado no disponible en este navegador' : 'Guardado en este navegador');
  document.querySelector('#view-factory').classList.toggle('active', !mapMode); document.querySelector('#view-map').classList.toggle('active', mapMode);
  renderCatalog(); renderOrder(); renderInspector(); renderGraph(); factory?.update(s, selected, mapMode);
  renderTutorial();
  if (s.ended && !summaryShown) { summaryShown = true; showSummary(); }
}
function save() { if (tutorial) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(game.state)); } catch { storageFailed = true; } }
function disposeFilm() { activeFilm?.dispose(); activeFilm = null; document.querySelector('#modal').classList.remove('cinema-modal'); }
function openModal(content) {
  disposeFilm();
  const dialog = document.querySelector('#modal');
  dialog.removeAttribute('aria-labelledby');
  if (!dialog.open) { modalReturnFocus = document.activeElement; modalWasRunning = game.state.started && !game.state.paused && !game.state.ended; game.state.paused = true; }
  put('modal-content', `<button class="modal-close icon-button" data-action="close-modal" aria-label="Cerrar">${icon('close')}</button>${content}`);
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
}
function closeModal() { disposeFilm(); document.querySelector('#modal').close(); }
document.querySelector('#modal').addEventListener('cancel', disposeFilm);
document.querySelector('#modal').addEventListener('close', () => { disposeFilm(); if (modalWasRunning && !game.state.ended && !document.hidden) game.state.paused = false; render(); if (modalReturnFocus?.isConnected) modalReturnFocus.focus({ preventScroll: true }); });
function showGuide() {
  openModal(`<span class="eyebrow">MANUAL DEL OPERADOR / 01</span><h2>Construye. Protege. Recupera.</h2><p class="modal-intro">Tres encargos, siete minutos y 2.400 créditos iniciales. Entrega las funciones solicitadas conservando al menos el 80% de los datos, sin incidentes abiertos ni credenciales filtradas.</p><div class="guide-tutorial"><span>Aprende con una fábrica de práctica, paso a paso.</span><button class="primary" data-action="tutorial-start">Iniciar tutorial ${icon('arrow')}</button></div><div class="guide-steps"><div><b>01</b><h3>Elige e inspecciona</h3><p>Busca las funciones del encargo. Revisa identidad, soporte, scripts y dependencias.</p></div><div><b>02</b><h3>Instala y despliega</h3><p>Las máquinas llegan al taller. Activa defensas y ponlas en producción para procesar el encargo.</p></div><div><b>03</b><h3>Responde y entrega</h3><p>Aísla piezas afectadas, rota secretos y reconstruye desde versiones confiables. Entrega para cobrar.</p></div></div><div class="guide-note">Cada pieza cuesta 2 cr de mantenimiento cada 15 s. Instalar inicia el reloj. Puedes pausar para leer y decidir. Al abrir este manual o cambiar de pestaña, el tiempo se detiene.</div><div class="lessons">${LESSONS.map(([title, body]) => `<details><summary>${title}</summary><p>${body}</p></details>`).join('')}</div><p class="source-links">Fuentes: <a href="https://docs.npmjs.com/cli/v11/commands/npm-audit/" target="_blank" rel="noreferrer">npm audit</a> · <a href="https://docs.npmjs.com/cli/v11/using-npm/scripts/" target="_blank" rel="noreferrer">Scripts npm</a> · <a href="https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html" target="_blank" rel="noreferrer">OWASP</a> · <a href="https://nodejs.org/en/about/eol" target="_blank" rel="noreferrer">EOL</a></p><p class="small-note">Todos los paquetes, registros, incidentes y versiones del juego son ficticios. Ninguna acción instala paquetes reales, ejecuta scripts ni accede a credenciales. El riesgo está simplificado para enseñar decisiones.</p>`);
  if (!document.querySelector('.film-library')) document.querySelector('.guide-steps').insertAdjacentHTML('beforebegin', filmLibrary());
  document.querySelectorAll('.lessons details').forEach((detail, index) => {
    const film = FILMS.find(item => item.lesson === index);
    if (film && !detail.querySelector('[data-action="film"]')) detail.insertAdjacentHTML('beforeend', `<button class="film-lesson-link" data-action="film" data-id="${film.id}">${icon('play')} Ver explicación animada</button>`);
  });
}
function showFilm(id) {
  const film = FILMS.find(item => item.id === id); if (!film) return;
  lastFilm = id; openModal(filmMarkup(film));
  const dialog = document.querySelector('#modal'); dialog.classList.add('cinema-modal'); dialog.setAttribute('aria-labelledby', 'film-title');
  activeFilm = mountFilm(document.querySelector('.film-player'), film);
}
function showSummary() {
  const s = game.state; openModal(`<span class="eyebrow">INFORME DEL TURNO</span><h2>${s.ended === 'won' ? 'Una fábrica en buenas manos.' : 'Este turno deja una lección.'}</h2><p class="modal-intro">${s.ended === 'won' ? 'Entregaste los tres encargos con el servicio recuperado y los datos protegidos.' : esc(s.logs[0]?.text || 'No se completaron todos los encargos.')}</p><div class="summary-stats"><div><b>${game.score()}</b><span>PUNTUACIÓN</span></div><div><b>${s.delivered}/3</b><span>ENCARGOS</span></div><div><b>${s.integrity}%</b><span>DATOS PROTEGIDOS</span></div><div><b>${s.prevented}</b><span>INTENTOS BLOQUEADOS</span></div></div><p>Un escáner sin alertas no basta. Las decisiones sobre procedencia, exposición, permisos y recuperación también cuentan.</p><div class="summary-lessons"><p>${game.has('lockfile') ? '✓ Versiones fijadas para builds reproducibles.' : '• Un lockfile habría evitado cambios implícitos de versión.'}</p><p>${game.has('network') ? '✓ Entradas de red reducidas mediante segmentación.' : '• Reducir las entradas públicas limita los vectores de ataque.'}</p><p>${s.incidents.some(i => i.resolved) ? '✓ Practicaste la recuperación de un incidente.' : '• Recuperar requiere contener, corregir y revocar secretos filtrados.'}</p></div><button class="primary" data-action="new-game">Empezar otro turno ${icon('arrow')}</button>`);
}
function showUpdate(id) {
  const n = game.node(id); if (!n) return;
  openModal(`<span class="eyebrow">CAMBIO DE VERSIÓN</span><h2>${esc(n.name)}</h2><p class="modal-intro">Actual: ${n.version} · Candidata: ${n.id === 'codec-core' ? '1.1.0' : n.version.split('.').slice(0, 2).join('.') + '.9'}</p><div class="update-diff"><span>+ Cambios en el código distribuido</span><span>+ ${n.id === 'codec-core' ? 'Nueva rutina de telemetría; acceso a variables del entorno' : 'Corrección del fallo y ajustes de compatibilidad'}</span><span>~ ${game.has('lockfile') ? 'Requiere actualizar el lockfile' : 'No hay lockfile que fije el árbol'}</span></div><p>Una versión más reciente no es necesariamente más segura. Las pruebas también tienen límites.</p><div class="modal-actions"><button class="secondary" data-action="review-update" data-id="${id}">Revisar y probar · 25 cr</button><button class="primary" data-action="update" data-id="${id}">Aplicar candidata · 40 cr</button></div>`);
}
let speed = 1;
let tutorialNudge = '';
function markTutorial(status) { tutorialSeen = true; try { localStorage.setItem(TUTORIAL_KEY, status); } catch { /* Optional preference; practice does not require storage. */ } }
function showTutorialOffer() {
  markTutorial('offered');
  openModal(`<span class="eyebrow">BIENVENIDO A LA FÁBRICA</span><h2>Tu primer turno, acompañado.</h2><p class="modal-intro">Aprende a construir una aplicación y a recuperar el servicio después de un incidente. El tutorial resalta cada control y avanza cuando realizas la acción.</p><div class="guide-note">Práctica independiente · unos 4 minutos · reloj detenido<br>Tu partida y sus recursos se conservan. Puedes salir en cualquier momento.</div><div class="modal-actions"><button class="primary" data-action="tutorial-start">Empezar tutorial ${icon('arrow')}</button><button class="secondary" data-action="close-modal">Omitir por ahora</button></div><p class="small-note">Puedes repetirlo desde el botón Tutorial o el Manual del operador.</p>`);
}
function startTutorial() {
  if (tutorial) return;
  modalWasRunning = false; closeModal(); save();
  campaignView = { selected, tab, filter, query, mapMode, speed, summaryShown };
  tutorial = new Tutorial(game); game = tutorial.game;
  speed = 1; put('speed', '1×'); filter = 'all'; query = ''; document.querySelector('#search').value = '';
  document.querySelectorAll('[data-action="filter"]').forEach(b => b.classList.toggle('active', b.dataset.id === 'all'));
  tutorialPosition = -1; tutorialNudge = ''; summaryShown = false; markTutorial('started'); syncTutorialView(); render();
}
function syncTutorialView() {
  if (!tutorial || tutorial.done) return;
  const step = tutorial.step;
  selected = step.selected || 'pixel-press'; tab = step.tab || 'packages'; mapMode = Boolean(step.map);
}
function finishTutorial() {
  if (!tutorial) return;
  markTutorial(tutorial.done ? 'complete' : 'skipped');
  game = tutorial.finish(); tutorial = null;
  ({ selected, tab, filter, query, mapMode, speed, summaryShown } = campaignView);
  put('speed', `${speed}×`); document.querySelector('#search').value = query;
  document.querySelectorAll('[data-action="filter"]').forEach(b => b.classList.toggle('active', b.dataset.id === filter));
  document.body.style.removeProperty('--tutorial-space'); save(); render();
  document.querySelector('.tutorial-launch').focus({ preventScroll: true });
}
function locateTutorialTarget(focus = false) {
  if (!tutorial) return;
  const card = document.querySelector('#tutorial'), target = tutorial.done ? null : document.querySelector(tutorial.step.target);
  if (focus && target) target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
  const height = card.getBoundingClientRect().height;
  document.body.style.setProperty('--tutorial-space', `${height + 30}px`);
  const rect = target?.getBoundingClientRect();
  const atTop = rect && rect.top + rect.height / 2 > innerHeight / 2;
  card.style.top = atTop ? '88px' : 'auto'; card.style.bottom = atTop ? 'auto' : '45px';
  if (focus) {
    const control = target?.matches('button') ? target : card.querySelector('.primary');
    (control || card.querySelector('h2')).focus({ preventScroll: true });
  }
}
function renderTutorial() {
  document.querySelectorAll('.tutorial-target').forEach(el => { el.classList.remove('tutorial-target'); el.removeAttribute('aria-describedby'); });
  const card = document.querySelector('#tutorial'); card.hidden = !tutorial;
  document.body.classList.toggle('tutorial-active', Boolean(tutorial));
  if (!tutorial) return;
  put('phase-label', 'PRÁCTICA GUIADA');
  put('pause', `${icon('book')} Práctica guiada`);
  put('save-status', 'Práctica independiente · tu partida está conservada');
  const step = tutorial.step, total = TUTORIAL_STEPS.length;
  put('tutorial', `<div class="tutorial-top"><span class="eyebrow">PRÁCTICA GUIADA</span><button data-action="tutorial-exit" aria-label="Salir del tutorial">${icon('close')}</button></div><div class="tutorial-progress" aria-label="${tutorial.done ? total : tutorial.index + 1} de ${total} pasos"><i style="width:${(tutorial.done ? total : tutorial.index + 1) / total * 100}%"></i></div><span class="tutorial-counter">${tutorial.done ? 'PRÁCTICA COMPLETADA' : `PASO ${String(tutorial.index + 1).padStart(2, '0')} / ${total}`}</span><h2 id="tutorial-title" tabindex="-1">${tutorial.done ? 'Ya sabes operar la fábrica.' : step.title}</h2><p id="tutorial-copy">${tutorial.done ? 'Entregaste el primer encargo y recuperaste el servicio tras un zero-day. En tu partida, el tiempo y el mantenimiento sí cuentan. Combina estas decisiones con mínimo privilegio, segmentación y revisión de actualizaciones.' : step.text}</p><div class="tutorial-actions">${tutorial.done ? '<button class="primary" data-action="tutorial-exit">Volver a mi partida</button>' : step.action === 'tutorial-next' ? `<button class="primary" data-action="tutorial-next">${step.next} ${icon('arrow')}</button>` : '<span class="tutorial-instruction">Haz clic en el control resaltado.</span><button class="text-button" data-action="tutorial-locate">Ver control</button>'}</div><p class="tutorial-nudge" role="status">${esc(tutorialNudge)}</p>${tutorial.done ? '' : '<button class="tutorial-skip" data-action="tutorial-exit">Salir y conservar mi partida</button>'}`);
  if (!tutorial.done) { const target = document.querySelector(step.target); target?.classList.add('tutorial-target'); target?.setAttribute('aria-describedby', 'tutorial-title tutorial-copy'); }
  if (tutorialPosition !== tutorial.index) {
    tutorialPosition = tutorial.index;
    if (tutorial.done) markTutorial('complete');
    requestAnimationFrame(() => locateTutorialTarget(true));
  }
}
window.addEventListener('resize', () => locateTutorialTarget());
document.addEventListener('click', e => {
  const button = e.target.closest('[data-action]'); if (!button || button.disabled) return;
  const { action, id } = button.dataset;
  if (action === 'tutorial-offer') { if (!tutorial) showTutorialOffer(); return; }
  if (action === 'tutorial-start') { startTutorial(); return; }
  if (action === 'tutorial-exit') { finishTutorial(); return; }
  if (action === 'tutorial-locate') { locateTutorialTarget(true); return; }
  if (tutorial && !['zoom-in', 'zoom-out', 'camera'].includes(action)) {
    if (tutorial.perform(action, id)) { tutorialNudge = ''; syncTutorialView(); }
    else tutorialNudge = 'Sigue el control resaltado para completar este paso. Puedes salir cuando quieras.';
    render(); return;
  }
  switch (action) {
    case 'select': selected = id; break;
    case 'tab': tab = id; break;
    case 'filter': filter = id; document.querySelectorAll('[data-action="filter"]').forEach(b => b.classList.toggle('active', b.dataset.id === id)); break;
    case 'factory': mapMode = false; break;
    case 'map': mapMode = !mapMode; break;
    case 'defenses': tab = 'defenses'; break;
    case 'pause': if (!game.state.started) game.start(); else if (!game.state.ended) game.state.paused = !game.state.paused; break;
    case 'speed': speed = speed === 1 ? 2 : 1; put('speed', `${speed}×`); break;
    case 'guide': showGuide(); break;
    case 'film': showFilm(id); break;
    case 'film-back': showGuide(); document.querySelector(`.film-card[data-id="${lastFilm}"]`)?.focus(); break;
    case 'close-modal': closeModal(); break;
    case 'restart': openModal('<span class="eyebrow">NUEVO TURNO</span><h2>¿Empezar de nuevo?</h2><p>Se sustituirá el progreso guardado de esta partida.</p><div class="modal-actions"><button class="secondary" data-action="close-modal">Conservar partida</button><button class="primary" data-action="new-game">Nueva partida</button></div>'); break;
    case 'new-game': game = new Game(); selected = 'pixel-press'; summaryShown = false; speed = 1; put('speed', '1×'); modalWasRunning = false; closeModal(); break;
    case 'zoom-in': factory?.zoom(0.15); break;
    case 'zoom-out': factory?.zoom(-0.15); break;
    case 'camera': factory?.reset(); break;
    case 'deploy-all': game.deployAll(); break;
    case 'update-dialog': showUpdate(id); break;
    case 'review-update': game.reviewUpdate(id); closeModal(); break;
    case 'update': game.update(id); closeModal(); break;
    case 'inspect': case 'install': case 'deploy': case 'authorize': case 'defend': case 'isolate': case 'recover': case 'remove': game[action](id); break;
    case 'rotate': case 'audit': case 'deliver': game[action](); break;
  }
  save(); render();
  const log = game.state.logs[0]; put('announcement', esc(log?.text || ''));
});
document.querySelector('#search').addEventListener('input', e => { query = e.target.value; renderCatalog(); });
document.addEventListener('keydown', e => { if (e.code === 'Space' && !['INPUT', 'BUTTON', 'TEXTAREA', 'SUMMARY', 'A'].includes(e.target.tagName) && !document.querySelector('#modal').open) { e.preventDefault(); document.querySelector('#pause').click(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden) modalWasRunning = false; if (document.hidden && game.state.started && !game.state.ended) { game.state.paused = true; save(); render(); } });
setInterval(() => { if (!tutorial) for (let i = 0; i < speed; i++) game.tick(); save(); render(); }, 1000);
render();
if (!tutorialSeen && !game.state.ended) showTutorialOffer();

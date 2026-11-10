import { Game, SAVE_KEY } from './game.js';
import { PACKAGES, DEFENSES, PROJECT_TYPES, PROJECT_SIZES, getProjectSize, CONSTRUCTION, PRODUCTION, constructionPrice, productionPrice, visiblePoints, LABELS, LESSONS } from './catalog.js';
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
  auth: '<circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3M17 3l4 4-4 4"/>',
  payment: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h4"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.box}</svg>`;
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = v => Math.floor(v).toLocaleString('es-ES');
const rateText = value => `${money(value)} ${value === 1 ? 'unidad' : 'unidades'}/s`;
const time = v => `${Math.floor(v / 60).toString().padStart(2, '0')}:${(v % 60).toString().padStart(2, '0')}`;
let saved;
try { saved = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { /* Storage is optional. */ }
let game = new Game(saved);
if (game.state.started) game.state.paused = true;
let selected = null, tab = 'packages', filter = 'required', query = '', mapMode = false, speed = 1;
let storageFailed = false, modalWasRunning = false, activeFilm = null, lastFilm = null, modalReturnFocus = null;
let projectType = 'photo', projectSize = 'prototype', customUnits = 24;
let tutorial = null, campaignView = null, tutorialPosition = -1, tutorialNudge = '', tutorialCompleted = false;
try { tutorialCompleted = localStorage.getItem(TUTORIAL_KEY) === 'complete'; } catch { /* Optional preference. */ }
const htmlCache = new Map();
function put(id, html) { if (htmlCache.get(id) === html) return; document.getElementById(id).innerHTML = html; htmlCache.set(id, html); }

document.querySelector('#app').innerHTML = `
  <header class="topbar">
    <a class="brand" href="#" aria-label="Fábrica de dependencias"><span class="brand-mark">${icon('box')}</span><span><strong>npm<span class="slash">/</span>factory<span class="brand-dot">.</span></strong><small>TU ESTUDIO DE SOFTWARE</small></span></a>
    <div class="studio-level" id="studio-level"></div>
    <div class="top-stats"><div class="stat">${icon('coin')}<span><small>CAPITAL</small><b id="budget"></b></span></div><div class="stat"><span><small>PUBLICADOS</small><b id="published-count"></b></span></div><div class="stat reputation-stat"><span><small>REPUTACIÓN</small><b id="reputation"></b></span></div></div>
    <button class="icon-button help-button" data-action="guide" aria-label="Guía de seguridad" title="Guía de seguridad">${icon('book')}</button>
    <button class="icon-button" data-action="restart" aria-label="Nuevo estudio" title="Nuevo estudio">${icon('reset')}</button>
  </header>
  <section class="tutorial-entry" aria-label="Aprender a jugar"><p><strong>Aprende a dirigir tu estudio.</strong> Proyectos, ampliaciones y seguridad, paso a paso.</p><button class="tutorial-launch" data-action="tutorial-start">${icon('play')} <span id="tutorial-label">Tutorial guiado</span></button></section>
  <main id="studio-home" class="studio-home">
    <section class="studio-welcome"><div><span class="eyebrow">DE UNA IDEA A TU PRÓXIMO LANZAMIENTO</span><h1>¿Qué vas a crear?</h1><p>Elige tu proyecto. Construye su tecnología. Haz crecer tu estudio.</p></div><span class="no-rush">${icon('check')} A tu ritmo · sin límite de tiempo</span></section>
    <section id="release-report" aria-label="Última publicación"></section>
    <div class="studio-infrastructure"><section id="home-construction" class="construction-panel" aria-label="Puntos de construcción del estudio"></section><section id="home-production" class="construction-panel production-panel" aria-label="Puntos de producción del estudio"></section></div>
    <div class="project-planner"><section><div class="section-line"><h2>1. Elige el tipo de proyecto</h2><span id="unlock-hint"></span></div><div id="project-types" class="project-types"></div></section>
    <form id="project-form" class="project-brief"><span class="eyebrow">TU PRÓXIMO PROYECTO</span><h2 id="brief-title"></h2><p id="brief-description"></p><label for="project-name">2. Ponle nombre <small>opcional</small></label><input id="project-name" name="project-name" maxlength="48" placeholder="Mi próxima gran idea" autocomplete="off"><label for="project-size">3. Decide su alcance</label><select id="project-size" name="project-size" aria-describedby="brief-capacity"></select><div id="custom-scope" hidden><label for="project-units">Unidades del proyecto</label><input id="project-units" name="project-units" type="number" min="24" step="1" inputmode="numeric" aria-describedby="brief-capacity" required disabled><button type="button" class="secondary" data-action="max-project-size">Usar toda la capacidad</button></div><p id="brief-capacity" role="status"></p><div id="brief-requirements"></div><div id="brief-reward"></div><p class="brief-note">Cada proyecto empieza con sus propios paquetes. Conservas capital, puntos de construcción y producción, controles de seguridad y lo aprendido.</p><button type="submit" class="primary">Crear proyecto ${icon('arrow')}</button></form></div>
    <section class="portfolio"><div class="section-line"><h2>Tu trayectoria</h2><span id="portfolio-total"></span></div><div id="portfolio-list"></div></section>
  </main>
  <section id="project-workspace" hidden>
    <section id="order" class="project-banner" aria-label="Proyecto activo"></section>
    <main class="workspace">
      <section class="factory-panel" aria-label="Estudio de desarrollo"><div class="factory-toolbar"><div class="view-tabs"><button class="active" data-action="factory" id="view-factory">${icon('factory')} Estudio</button><button data-action="map" id="view-map">${icon('map')} Dependencias <span id="node-count">0</span></button></div><div class="toolbar-actions"><span id="scene-status" class="scene-status"></span><button id="pause" class="play-control" data-action="pause"></button><button id="speed" class="speed" data-action="speed" aria-label="Velocidad de desarrollo">1×</button></div></div>
        <div class="scene-wrap"><div id="scene"></div><div class="scene-heading"><span class="eyebrow">DEL TALLER A PRODUCCIÓN</span><h2>Tu idea empieza<br>con buenas piezas.</h2><p id="scene-hint"></p></div><div id="incident-banner"></div><div id="graph" class="graph-panel" hidden></div><div class="scene-controls"><button data-action="zoom-in" aria-label="Acercar">${icon('plus')}</button><button data-action="zoom-out" aria-label="Alejar">${icon('minus')}</button><button data-action="camera" aria-label="Restablecer cámara">${icon('target')}</button></div><div class="scene-legend"><span><i class="lime"></i> Operativo</span><span><i class="amber"></i> En taller / aislado</span><span><i class="red"></i> Incidente</span></div></div>
        <section id="workshop-construction" class="construction-panel" aria-label="Puntos de construcción del estudio"></section>
        <section id="workshop-production" class="construction-panel production-panel" aria-label="Puntos de producción del estudio"></section>
        <div id="project-health" class="project-health"></div>
        <details class="diagnostics"><summary>Actividad y seguridad <span id="log-count"></span></summary><div class="console"><div class="console-header"><h3>${icon('terminal')} Registro de actividad</h3><button data-action="audit">${icon('search')} Ejecutar audit <span>20 cr</span></button></div><div id="logs" class="logs" role="log" aria-label="Actividad del estudio"></div></div><div class="risk"><div><span class="eyebrow">SUPERFICIE DE ATAQUE</span><b id="risk-value"></b></div><div class="risk-meter"><i id="risk-fill"></i></div><p id="risk-description"></p><div id="defense-badges"></div></div></details>
      </section>
      <aside class="catalog-panel"><div class="panel-heading"><span class="eyebrow">MESA DE TRABAJO</span><h2>Equipa tu proyecto<span>.</span></h2><p>Las funciones del proyecto guían tu elección.</p></div><div class="tabs"><button data-action="tab" data-id="packages" class="active" id="tab-packages">Paquetes <span>${PACKAGES.length}</span></button><button data-action="tab" data-id="defenses" id="tab-defenses">Seguridad <span>${DEFENSES.length}</span></button></div><div id="catalog-tools"><label class="search">${icon('search')}<input id="search" placeholder="Buscar paquete…" aria-label="Buscar paquete"></label><div id="package-filters" class="filters"></div></div><div id="catalog" class="catalog-list"></div><div id="package-detail" class="package-detail" hidden><button class="back-button" data-action="catalog">← Volver a paquetes</button><section id="inspector" class="inspector"></section></div><div class="catalog-footer">${icon('box')} Paquetes ficticios. Riesgos reales.</div></aside>
    </main>
  </section>
  <footer class="footer"><span>SIMULACIÓN LOCAL · APRENDE CONSTRUYENDO</span><span id="save-status">Guardado en este navegador</span><button data-action="guide">Guía y cortos de seguridad ${icon('arrow')}</button></footer>
  <aside id="tutorial" class="tutorial-card" aria-label="Tutorial guiado" hidden></aside>
  <dialog id="modal"><div id="modal-content"></div></dialog><div id="announcement" class="sr-only" role="status" aria-live="polite"></div>`;

let factory;
try { factory = createFactory(document.querySelector('#scene'), id => { if (tutorial) return; selected = id; tab = 'packages'; render(); document.querySelector('#package-detail').scrollIntoView({ block: 'nearest' }); }, buyConstructionPoint, buyProductionPoint); }
catch { document.querySelector('#scene').innerHTML = '<div class="webgl-error"><h2>Vista 3D no disponible</h2><p>Puedes gestionar todo el proyecto desde el mapa de dependencias.</p><button class="primary" data-action="map">Abrir mapa</button></div>'; }

function buyConstructionPoint() {
  if (tutorial) { performTutorial('add-construction'); return; }
  game.addConstructionPoint(); save(); render(); put('announcement', esc(game.state.logs[0]?.text || ''));
}
function buyProductionPoint() {
  if (tutorial) { performTutorial('add-production'); return; }
  game.addProductionPoint(); save(); render(); put('announcement', esc(game.state.logs[0]?.text || ''));
}
function renderProduction(id) {
  const s = game.state, cost = game.productionCost(), rate = game.productionRate(), visible = visiblePoints(s.productionPoints);
  put(id, `<div class="construction-heading"><div><span class="eyebrow">PRODUCE MÁS RÁPIDO · SIN LÍMITE</span><h2>Puntos de producción <span>${money(s.productionPoints)} ${s.productionPoints === 1 ? 'instalado' : 'instalados'}</span></h2><p>Ritmo base: <strong>${rateText(rate)}</strong> a 1×.${s.project ? ` Con el reloj a ${speed}×: ${rateText(rate * speed)} durante el desarrollo.` : ''}</p></div><button class="secondary" data-action="add-production" ${s.budget < cost || s.ended ? 'disabled' : ''}>${icon('plus')} Añadir producción · ${productionPrice(s.productionPoints)} cr</button></div><div class="construction-slots">${visible.map(i => `<div class="construction-slot ${i < s.productionPoints ? 'built' : ''}"><span class="construction-icon">${icon(i < s.productionPoints ? 'play' : 'plus')}</span><div><strong>Puesto ${money(i + 1)}</strong><small>${i < s.productionPoints ? 'Instalado · permanente' : `${productionPrice(i)} cr · por construir`}</small><small>Ritmo total: ${rateText((i + 1) * PRODUCTION.unitsPerPoint)} a 1×</small></div></div>`).join('')}</div>${visible[0] ? `<p class="construction-note">${money(visible[0])} puestos anteriores también producen. Su velocidad está incluida.</p>` : ''}<p class="construction-note">Cada puesto suma 1 unidad/s y cuesta 10 veces el anterior. Se conserva al publicar o archivar. Mantenimiento e incidentes siguen ligados a las unidades producidas.${s.budget < cost ? Number.isFinite(cost) ? ` Te faltan ${money(cost - s.budget)} cr para ampliar.` : ' Capital insuficiente para la siguiente ampliación.' : ''}</p>`);
}
function renderConstruction(id) {
  const s = game.state, cost = game.constructionCost(), capacity = game.constructionCapacity();
  const needed = s.project ? Math.ceil(s.project.units / CONSTRUCTION.unitsPerPoint) : 0;
  const visible = visiblePoints(s.constructionPoints);
  const scope = getProjectSize('custom', game.projectCapacity());
  const expandedReward = s.project && scope ? Math.round(PROJECT_TYPES.find(type => type.id === s.project.type).reward * scope.multiplier) : 0;
  const expansion = s.project && !s.ended && scope?.units > s.project.units && expandedReward > s.project.reward ? `<div class="scope-expansion"><button class="secondary" data-action="expand-project">Ampliar proyecto a ${money(scope.units)} unidades · +${money(expandedReward - s.project.reward)} cr al publicar</button><p>Conservas el avance. El trabajo adicional consume mantenimiento al desarrollarlo.</p></div>` : '';
  put(id, `<div class="construction-heading"><div><span class="eyebrow">AMPLÍA TU ESTUDIO · SIN LÍMITE</span><h2>Puntos de construcción <span>${money(s.constructionPoints)} ${s.constructionPoints === 1 ? 'instalado' : 'instalados'}</span></h2><p>${s.project ? `Este proyecto necesita ${needed} ${needed === 1 ? 'punto' : 'puntos'}. ` : ''}Capacidad: hasta <strong>${money(capacity)} unidades</strong> por proyecto.</p></div><button class="secondary" data-action="add-construction" ${s.budget < cost || s.ended ? 'disabled' : ''}>${icon('plus')} Añadir punto · ${constructionPrice(s.constructionPoints)} cr</button></div><div class="construction-slots">${visible.map(i => `<div class="construction-slot ${i < s.constructionPoints ? 'built' : ''}"><span class="construction-icon">${icon(i < s.constructionPoints ? 'factory' : 'plus')}</span><div><strong>Punto ${money(i + 1)}${PROJECT_SIZES[i] ? ` · ${PROJECT_SIZES[i].title}` : ''}</strong><small>${i < s.constructionPoints ? i < needed ? 'Asignado al proyecto' : 'Instalado · permanente' : `${constructionPrice(i)} cr · por construir`}</small><small>Capacidad total: ${money((i + 1) * CONSTRUCTION.unitsPerPoint)} unidades</small></div></div>`).join('')}</div>${visible[0] ? `<p class="construction-note">${money(visible[0])} puntos anteriores también instalados. Su capacidad está incluida.</p>` : ''}<p class="construction-note">Cada nuevo punto cuesta 10 veces el anterior y suma ${CONSTRUCTION.unitsPerPoint} unidades de capacidad. Se conserva al publicar o archivar. El tamaño depende solo de los puntos de construcción.${s.budget < cost ? Number.isFinite(cost) ? ` Te faltan ${money(cost - s.budget)} cr para ampliar.` : ' Capital insuficiente para la siguiente ampliación.' : ''}</p>${expansion}`);
}
function renderPlanner() {
  const level = game.level(), type = PROJECT_TYPES.find(p => p.id === projectType), size = getProjectSize(projectSize, customUnits), capacity = game.projectCapacity();
  put('unlock-hint', level === 3 ? 'Todos los tipos disponibles' : level === 1 ? 'Publica 1 proyecto para crecer' : `${4 - game.state.delivered} publicaciones para el nivel 3`);
  put('project-types', PROJECT_TYPES.map(p => `<button class="project-type ${p.id === projectType ? 'selected' : ''}" data-action="project-type" data-id="${p.id}" aria-pressed="${p.id === projectType}" ${p.level > level ? 'disabled' : ''}><span class="project-type-icon">${icon(p.icon)}</span><strong>${p.title}</strong><p>${p.description}</p><span class="type-needs">${p.needs.map(n => LABELS[n]).join(' · ')}</span><span class="type-bottom">${p.level > level ? `${icon('lock')} Nivel ${p.level} · ${p.level === 2 ? '1 publicación' : '4 publicaciones'}` : `Desde ${money(p.reward)} cr ${icon('arrow')}`}</span></button>`).join(''));
  put('brief-title', type.title); put('brief-description', type.description);
  put('project-size', PROJECT_SIZES.map(s => `<option value="${s.id}" ${s.id === projectSize ? 'selected' : ''} ${s.units > capacity ? 'disabled' : ''}>${s.title} · ${s.units} unidades · ${Math.ceil(s.units / CONSTRUCTION.unitsPerPoint)} ${s.units <= CONSTRUCTION.unitsPerPoint ? 'punto' : 'puntos'}</option>`).join('') + `<option value="custom">A medida · hasta ${money(capacity)} unidades</option>`);
  document.querySelector('#project-size').value = projectSize;
  document.querySelector('#custom-scope').hidden = projectSize !== 'custom';
  const input = document.querySelector('#project-units'); input.max = String(capacity); input.disabled = projectSize !== 'custom';
  if (document.activeElement !== input) input.value = Number.isFinite(customUnits) ? String(customUnits) : '';
  const valid = Boolean(size && size.units <= capacity && type.level <= level);
  input.setAttribute('aria-invalid', String(projectSize === 'custom' && !valid));
  put('brief-capacity', !valid ? `Elige un número entero entre 24 y ${money(capacity)} unidades según tus puntos de construcción.` : `${money(size.units)} de ${money(capacity)} unidades de capacidad. El tamaño depende solo de tus puntos de construcción.`);
  document.querySelector('#project-form button[type="submit"]').disabled = !valid;
  put('brief-requirements', `<span class="eyebrow">PAQUETES OBLIGATORIOS</span><div class="brief-needs">${type.needs.map(n => `<span>${icon(n)} ${LABELS[n]}</span>`).join('')}</div>`);
  put('brief-reward', valid ? `<span>Ingresos al publicar</span><b>${money(Math.round(type.reward * size.multiplier))} cr <small>+ valoración</small></b><p>Más unidades, más ingresos y más trabajo. Tiempo mínimo a 1×: ${money(Math.ceil(size.units / game.productionRate()))} s de desarrollo.</p>` : '<span>Ingresos al publicar</span><p>Introduce un alcance válido para calcularlos.</p>');
}
function renderHome() {
  renderPlanner(); renderConstruction('home-construction'); renderProduction('home-production');
  const s = game.state, last = s.history[0];
  put('release-report', last ? `<div class="release-report"><span class="release-check">${icon('check')}</span><div><span class="eyebrow">ÚLTIMO LANZAMIENTO</span><h2>${esc(last.name)}</h2><p>${last.title} · ${last.rating}/5 de valoración · ${last.integrity}% de datos protegidos</p></div><div class="release-income"><strong>+${money(last.income)} cr</strong><small>Beneficio: ${money(last.profit)} cr</small></div></div>` : '');
  put('portfolio-total', `${s.delivered} publicados · ${money(s.revenue)} cr en ingresos`);
  put('portfolio-list', s.history.length ? s.history.map(p => `<article class="portfolio-row"><span>${icon(PROJECT_TYPES.find(t => t.id === p.type)?.icon || 'box')}</span><div><h3>${esc(p.name)}</h3><p>${p.title} · ${getProjectSize(p.size, p.units)?.title || 'Proyecto'} · ${money(p.units)} unidades</p></div><span>${p.rating}/5</span><b>+${money(p.income)} cr</b></article>`).join('') : '<div class="portfolio-empty">Tu primer lanzamiento empieza aquí. Crea un proyecto para abrir el estudio.</div>');
}
function packageCard(p) {
  const installed = game.node(p.id), inspected = game.state.inspected.includes(p.id);
  return `<button class="package-card" data-action="select" data-id="${p.id}"><span class="package-icon" style="--package-color:${p.color}">${icon(p.category)}</span><span class="package-info"><strong>${p.name}</strong><span>${p.title}</span><small>${installed ? installed.compromised ? 'INCIDENTE' : installed.buildBlocked ? 'BUILD PENDIENTE' : installed.phase === 'run' ? 'EN PRODUCCIÓN' : 'EN TALLER' : `${p.deps.length} dependencias · ${p.eol ? 'EOL' : inspected ? 'Revisado' : 'Sin revisar'}`}</small></span><span class="package-price">${installed ? icon('check') : `${p.cost}<small> cr</small>`}</span></button>`;
}
function renderCatalog() {
  const detail = tab === 'packages' && Boolean(selected);
  document.querySelector('#catalog-tools').hidden = tab !== 'packages' || detail;
  document.querySelector('#catalog').hidden = detail;
  document.querySelector('#package-detail').hidden = !detail;
  document.querySelector('#tab-packages').classList.toggle('active', tab === 'packages');
  document.querySelector('#tab-defenses').classList.toggle('active', tab === 'defenses');
  if (detail) { renderInspector(); return; }
  if (tab === 'packages') {
    put('package-filters', [['required', 'Para este proyecto'], ['installed', 'Instalados'], ['all', 'Todos'], ...Object.entries(LABELS).filter(([id]) => id !== 'all')].map(([id, title]) => `<button data-action="filter" data-id="${id}" class="${filter === id ? 'active' : ''}">${title}</button>`).join(''));
    const list = PACKAGES.filter(p => (filter === 'all' || filter === 'installed' && game.node(p.id) || filter === 'required' && (p.category === 'all' ? game.state.project?.needs.some(n => ['image', 'message', 'data'].includes(n)) : game.state.project?.needs.includes(p.category)) || p.category === filter || p.category === 'all' && ['image', 'message', 'data'].includes(filter)) && p.name.includes(query.toLowerCase()));
    put('catalog', list.map(packageCard).join('') || '<p class="empty">No hay paquetes con este filtro.</p>');
  } else put('catalog', `<p class="security-intro">Controles del estudio: se conservan en todos tus proyectos. Activarlos antes de instalar evita algunos riesgos.</p>${DEFENSES.map(d => `<div class="defense-card"><span class="defense-icon">${icon(d.icon)}</span><h3>${d.name}</h3><p>${d.description}</p><button class="${game.has(d.id) ? 'installed' : 'secondary'}" data-action="defend" data-id="${d.id}" ${game.has(d.id) || game.state.budget < d.cost ? 'disabled' : ''}>${game.has(d.id) ? `${icon('check')} Activado` : `Activar <span>${d.cost} cr</span>`}</button></div>`).join('')}`);
}
function nextAction() {
  const s = game.state;
  if (s.incidents.some(i => !i.resolved) || s.secretsLeaked) return { label: 'Resolver incidente', action: 'incident', note: 'Desarrollo detenido. Revisa la pieza afectada y protege las credenciales.' };
  if (s.integrity < 80) return { label: 'Archivar proyecto', action: 'abandon-dialog', note: 'Los datos filtrados no se recuperan. Este proyecto no alcanza el 80% exigido para publicar.' };
  if (game.canDeliver()) return { label: 'Publicar proyecto', action: 'deliver', note: 'Todo listo. Publica, cobra y elige tu próxima idea.' };
  if (s.budget <= 0) return { label: 'Nuevo estudio', action: 'restart', note: 'Sin capital para continuar. Puedes empezar un estudio nuevo.' };
  if (!game.capacityMet()) return { label: 'Añadir punto de construcción', action: 'add-construction', disabled: s.budget < game.constructionCost(), note: `El proyecto necesita ${Math.ceil(s.project.units / CONSTRUCTION.unitsPerPoint)} puntos. Siguiente ampliación: ${constructionPrice(s.constructionPoints)} cr.` };
  if (!game.requirementsMet()) {
    const canDeploy = s.nodes.some(n => !n.transitive && n.phase === 'build' && !n.buildBlocked && !n.isolated && !n.compromised && n.deps.every(id => !game.node(id)?.isolated && !game.node(id)?.compromised));
    return canDeploy ? { label: 'Poner en producción', action: 'deploy-all', note: 'Activa las máquinas instaladas para cubrir los requisitos.' } : { label: 'Elegir paquetes', action: 'catalog', note: 'Instala un paquete de cada tipo obligatorio. Revisa y autoriza los builds pendientes.' };
  }
  if (!s.started || s.paused) return { label: s.started ? 'Continuar desarrollo' : 'Desarrollar proyecto', action: 'develop', note: `Ritmo: ${rateText(game.productionRate() * speed)}. Coste: ${s.nodes.length * 2} cr por cada 15 unidades.` };
  return { label: 'Desarrollando…', action: 'none', disabled: true, note: `Ritmo: ${rateText(game.productionRate() * speed)}. Puedes pausar; no hay fecha límite.` };
}
function renderOrder() {
  const s = game.state, p = s.project, available = game.functions(), next = nextAction();
  const stage = s.progress >= p.units ? 3 : s.started ? 2 : 1;
  put('order', `<div class="project-identity"><span class="eyebrow">${p.title} · ${getProjectSize(p.size, p.units)?.title || 'Proyecto'}</span><h1>${esc(p.name)}</h1><p class="project-value">Ingresos: ${money(p.reward)} cr + valoración</p><button class="text-button" data-action="abandon-dialog">Archivar proyecto</button></div><div class="project-flow"><div class="project-stages">${['Preparar', 'Desarrollar', 'Publicar'].map((name, i) => `<span class="${stage === i + 1 ? 'active' : stage > i + 1 ? 'complete' : ''}"><b>${i + 1}</b>${name}</span>`).join('')}</div><div class="project-requirements">${p.needs.map(n => `<button data-action="requirement" data-id="${n}" class="${available.has(n) ? 'complete' : ''}" title="Ver paquetes de ${LABELS[n].toLowerCase()}">${icon(n)} ${LABELS[n]} ${available.has(n) ? icon('check') : '<span>+</span>'}</button>`).join('')}</div><div class="project-progress"><div class="progress-track"><i style="width:${s.progress / p.units * 100}%"></i></div><span>${Math.round(s.progress / p.units * 100)}% · ${money(s.progress)}/${money(p.units)} unidades</span></div></div><div class="project-next"><button class="primary" data-action="${next.action}" ${next.disabled ? 'disabled' : ''}>${next.label} ${icon('arrow')}</button><p>${next.note}</p></div>`);
}
function render() {
  const s = game.state, active = Boolean(s.project);
  document.querySelector('#studio-home').hidden = active;
  document.querySelector('#project-workspace').hidden = !active;
  put('budget', `${money(s.budget)} <em>cr</em>`); put('published-count', String(s.delivered)); put('reputation', String(s.reputation));
  put('studio-level', `<span class="live-dot"></span> NIVEL ${game.level()} · ${['', 'INDEPENDIENTE', 'ESTUDIO', 'REFERENTE'][game.level()]}`);
  put('save-status', storageFailed ? 'Guardado no disponible en este navegador' : 'Guardado en este navegador');
  if (!active) { renderHome(); factory?.update(s, selected, mapMode); renderTutorial(); return; }
  renderOrder(); renderConstruction('workshop-construction'); renderProduction('workshop-production'); renderCatalog(); renderGraph(); factory?.update(s, selected, mapMode);
  document.querySelector('#view-factory').classList.toggle('active', !mapMode); document.querySelector('#view-map').classList.toggle('active', mapMode);
  put('node-count', String(s.nodes.length));
  const running = s.started && !s.paused;
  put('pause', `${icon(running ? 'pause' : 'play')} ${running ? 'Pausar' : 'Continuar'}`);
  document.querySelector('#pause').hidden = !s.started || s.progress >= s.project.units;
  document.querySelector('#pause').disabled = !running && !game.canDevelop();
  document.querySelector('#speed').hidden = !s.started;
  put('scene-status', `<i></i> ${running ? 'DESARROLLANDO' : s.progress >= s.project.units ? 'LISTO PARA PUBLICAR' : s.started ? 'EN PAUSA' : 'PREPARACIÓN'}`);
  document.querySelector('.scene-heading').classList.toggle('compact', s.nodes.length > 0);
  put('scene-hint', s.nodes.length ? 'Selecciona una máquina para revisar sus dependencias.' : 'Elige los paquetes que necesita tu proyecto.');
  const incident = s.incidents.find(i => !i.resolved);
  put('incident-banner', incident ? `<button data-action="select" data-id="${incident.node}">${icon('alert')}<span><b>${esc(incident.title)}</b><small>${esc(incident.node)} · Desarrollo en pausa</small></span>${icon('arrow')}</button>` : s.secretsLeaked ? `<button data-action="rotate">${icon('key')} Rotar credenciales filtradas · 70 cr</button>` : '');
  put('project-health', `<span>${icon('shield')} Datos protegidos <b class="${s.integrity < 80 ? 'red-text' : ''}">${s.integrity}%</b></span><span>${s.nodes.filter(n => !n.transitive && game.operational(n)).length} módulos activos</span><button data-action="defenses">${icon('lock')} ${s.defenses.length}/6 controles</button><button data-action="audit">${icon('search')} Audit · 20 cr</button>`);
  const risk = game.surface(); put('risk-value', `${risk}<small>/100</small>`); document.querySelector('#risk-fill').style.width = `${risk}%`; document.querySelector('#risk-fill').style.background = risk > 65 ? 'var(--red)' : risk > 35 ? 'var(--amber)' : 'var(--lime)';
  put('risk-description', `${s.nodes.length} piezas · ${game.has('network') ? 'red segmentada' : 'acceso directo'} · ${game.has('privilege') ? 'permisos limitados' : 'permisos amplios'}`);
  put('defense-badges', s.defenses.map(id => `<span title="${DEFENSES.find(d => d.id === id).name}">${icon(DEFENSES.find(d => d.id === id).icon)}</span>`).join(''));
  put('logs', s.logs.slice(0, 12).map(l => `<div class="log ${l.kind}"><time>${time(l.time)}</time><span class="log-dot"></span><p>${esc(l.text)}</p></div>`).join('')); put('log-count', String(s.logs.length));
  renderTutorial();
}
function save() { if (tutorial) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(game.state)); } catch { storageFailed = true; } }

function renderInspector() {
  const s = game.state, n = game.node(selected), p = PACKAGES.find(p => p.id === selected) || n;
  if (!p) { put('inspector', '<span class="eyebrow">INSPECTOR</span><p>Selecciona un paquete o una dependencia.</p>'); return; }
  const inspected = s.inspected.includes(p.id) || p.transitive;
  const danger = n?.compromised || inspected && (p.malicious || p.eol);
  const affected = n ? game.affected(n.id).filter(id => id !== n.id) : [];
  const blocked = !s.project ? 'disabled' : '';
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
document.querySelector('#modal').addEventListener('close', () => { disposeFilm(); if (!tutorial && modalWasRunning && game.canDevelop() && !document.hidden) game.state.paused = false; render(); if (!tutorial && modalReturnFocus?.isConnected) modalReturnFocus.focus({ preventScroll: true }); });
function showGuide() {
  openModal(`<span class="eyebrow">MANUAL DEL OPERADOR / 01</span><h2>Construye. Protege. Recupera.</h2><p class="modal-intro">Un estudio, proyectos ilimitados y 2.400 créditos iniciales. Elige un tipo y un tamaño, equipa sus funciones obligatorias y publica conservando al menos el 80% de los datos, sin incidentes abiertos ni credenciales filtradas.</p><div class="guide-steps"><div><b>01</b><h3>Elige e inspecciona</h3><p>Elige una idea y busca sus tipos de paquetes obligatorios. Revisa identidad, soporte, scripts y dependencias.</p></div><div><b>02</b><h3>Instala y despliega</h3><p>Las máquinas llegan al taller. Activa defensas y ponlas en producción antes de pulsar Desarrollar proyecto.</p></div><div><b>03</b><h3>Responde y publica</h3><p>Aísla piezas afectadas, rota secretos y reconstruye desde versiones confiables. Publica para cobrar, ganar reputación y desbloquear proyectos.</p></div></div><div class="guide-note">No hay turnos ni cuenta atrás. Preparar el proyecto y esperar para publicarlo no consume capital. Durante el desarrollo, cada pieza cuesta 2 cr por cada 15 unidades. Un incidente pausa el desarrollo para que puedas responder. Empiezas con un punto de construcción: 30 unidades de capacidad. El segundo cuesta 350 cr y cada puesto nuevo cuesta diez veces el anterior: 3.500, 35.000, 350.000 cr… Puedes seguir ampliando sin límite de puestos; cada uno añade 30 unidades de capacidad. Producto necesita 2 puntos de construcción y Plataforma, 3. A medida permite elegir cualquier cantidad entera desde 24 unidades hasta toda tu capacidad, desde el primer nivel. El tamaño depende solo de los puntos de construcción; el nivel desbloquea tipos de proyecto. Más unidades dan más créditos; desde Plataforma, cada 30 unidades adicionales suman el 70% del precio base del tipo. Puedes ampliar proyectos activos desde el panel de construcción conservando el avance y la inversión. El trabajo adicional debe completarse antes de publicar. Puedes ampliar desde el planificador, desde el panel bajo la fábrica o pulsando la siguiente parcela 3D. Los puntos de construcción amplían el alcance máximo. Los puntos de producción aumentan el ritmo: empiezas con uno incluido y cada puesto aporta 1 unidad/s a velocidad 1×. También se compran sin límite por 350, 3.500, 35.000 cr…; sus precios son independientes de construcción. El control 2× duplica ese ritmo. El mantenimiento se cobra por unidades producidas y los incidentes detienen el avance inmediatamente. Los puntos y las defensas se conservan entre proyectos; los paquetes se eligen de nuevo. Publicar 1 proyecto desbloquea el nivel 2 y publicar 4, el nivel 3.</div><div class="lessons">${LESSONS.map(([title, body]) => `<details><summary>${title}</summary><p>${body}</p></details>`).join('')}</div><p class="source-links">Fuentes: <a href="https://docs.npmjs.com/cli/v11/commands/npm-audit/" target="_blank" rel="noreferrer">npm audit</a> · <a href="https://docs.npmjs.com/cli/v11/using-npm/scripts/" target="_blank" rel="noreferrer">Scripts npm</a> · <a href="https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html" target="_blank" rel="noreferrer">OWASP</a> · <a href="https://nodejs.org/en/about/eol" target="_blank" rel="noreferrer">EOL</a></p><p class="small-note">Todos los paquetes, registros, incidentes y versiones del juego son ficticios. Ninguna acción instala paquetes reales, ejecuta scripts ni accede a credenciales. El riesgo está simplificado para enseñar decisiones.</p>`);
  document.querySelector('.guide-steps').insertAdjacentHTML('beforebegin', '<div class="guide-tutorial"><span>Practica el ciclo completo del estudio sin gastar los recursos de tu partida.</span><button class="primary" data-action="tutorial-start">Iniciar tutorial</button></div>');
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
function showUpdate(id) {
  const n = game.node(id); if (!n) return;
  openModal(`<span class="eyebrow">CAMBIO DE VERSIÓN</span><h2>${esc(n.name)}</h2><p class="modal-intro">Actual: ${n.version} · Candidata: ${n.id === 'codec-core' ? '1.1.0' : n.version.split('.').slice(0, 2).join('.') + '.9'}</p><div class="update-diff"><span>+ Cambios en el código distribuido</span><span>+ ${n.id === 'codec-core' ? 'Nueva rutina de telemetría; acceso a variables del entorno' : 'Corrección del fallo y ajustes de compatibilidad'}</span><span>~ ${game.has('lockfile') ? 'Requiere actualizar el lockfile' : 'No hay lockfile que fije el árbol'}</span></div><p>Una versión más reciente no es necesariamente más segura. Las pruebas también tienen límites.</p><div class="modal-actions"><button class="secondary" data-action="review-update" data-id="${id}">Revisar y probar · 25 cr</button><button class="primary" data-action="update" data-id="${id}">Aplicar candidata · 40 cr</button></div>`);
}


function startTutorial() {
  if (tutorial) return;
  modalWasRunning = false; closeModal();
  if (game.state.started) game.state.paused = true;
  save();
  campaignView = { selected, tab, filter, query, mapMode, speed, projectType, projectSize, customUnits, name: document.querySelector('#project-name').value, diagnostics: document.querySelector('.diagnostics').open, scrollY: window.scrollY };
  tutorial = new Tutorial(game); game = tutorial.game;
  projectType = 'photo'; projectSize = 'prototype'; customUnits = 24; speed = 1;
  document.querySelector('#project-name').value = '';
  document.querySelector('#search').value = ''; document.querySelector('.diagnostics').open = false;
  put('speed', '1×'); tutorialPosition = -1; tutorialNudge = ''; syncTutorialView(); render();
}
function syncTutorialView() {
  const step = tutorial?.step;
  selected = step?.selected || null; tab = step?.tab || 'packages'; filter = step?.filter || 'required'; query = ''; mapMode = Boolean(step?.map);
}
function finishTutorial() {
  if (!tutorial) return;
  game = tutorial.finish(); tutorial = null;
  ({ selected, tab, filter, query, mapMode, speed, projectType, projectSize, customUnits } = campaignView);
  document.querySelector('#project-name').value = campaignView.name;
  document.querySelector('#search').value = query; document.querySelector('.diagnostics').open = campaignView.diagnostics;
  put('speed', `${speed}×`); document.body.style.removeProperty('--tutorial-space');
  save(); render(); window.scrollTo({ top: campaignView.scrollY, behavior: 'instant' });
  document.querySelector('.tutorial-launch').focus({ preventScroll: true });
}
function performTutorial(action, id, value) {
  if (!tutorial) return;
  if (!tutorial.accepts(action, id)) {
    tutorialNudge = 'Sigue el control resaltado, o pulsa Ver control para localizarlo.';
    renderTutorial(); return;
  }
  if (action === 'project-type') projectType = id;
  if (action === 'project-size') projectSize = id;
  if (tutorial.perform(action, id, value)) {
    tutorialNudge = '';
    if (action === 'audit') document.querySelector('.diagnostics').open = true;
    if (tutorial.done) {
      tutorialCompleted = true;
      try { localStorage.setItem(TUTORIAL_KEY, 'complete'); } catch { /* Optional preference. */ }
    }
    syncTutorialView();
  } else tutorialNudge = 'La acción no pudo completarse. Revisa el estado del proyecto.';
  render();
}
function locateTutorialTarget(focus = false) {
  if (!tutorial) return;
  const card = document.querySelector('#tutorial'), target = document.querySelector(tutorial.done ? '#release-report' : tutorial.step.target);
  document.body.style.setProperty('--tutorial-space', `${card.offsetHeight + 50}px`);
  card.classList.remove('tutorial-left');
  if (focus) target?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
  if (innerWidth >= 1000 && target && target.getBoundingClientRect().left > innerWidth / 2) card.classList.add('tutorial-left');
  if (focus && target) {
    const rect = target.getBoundingClientRect(), panel = card.getBoundingClientRect();
    if (rect.right > panel.left && rect.left < panel.right && rect.bottom > panel.top - 16) window.scrollBy({ top: rect.bottom - panel.top + 24, behavior: 'instant' });
  }
  if (focus) {
    const control = !tutorial.done && target?.matches('button, select, input') ? target : card.querySelector('.primary, h2');
    control?.focus({ preventScroll: true });
  }
}
function renderTutorial() {
  document.querySelectorAll('.tutorial-target').forEach(el => {
    el.classList.remove('tutorial-target');
    const description = (el.getAttribute('aria-describedby') || '').split(' ').filter(id => !['tutorial-title', 'tutorial-copy'].includes(id)).join(' ');
    if (description) el.setAttribute('aria-describedby', description); else el.removeAttribute('aria-describedby');
  });
  const card = document.querySelector('#tutorial'); card.hidden = !tutorial;
  document.body.classList.toggle('tutorial-active', Boolean(tutorial));
  document.querySelector('.tutorial-entry').hidden = Boolean(tutorial);
  document.querySelector('#search').disabled = Boolean(tutorial);
  document.querySelector('#project-size').disabled = Boolean(tutorial && tutorial.step?.action !== 'project-size');
  document.querySelector('#project-name').readOnly = Boolean(tutorial && tutorial.step?.action !== 'propose');
  document.querySelector('#pause').disabled = Boolean(tutorial) || !game.canDevelop() && game.state.paused;
  document.querySelector('#speed').disabled = Boolean(tutorial);
  put('tutorial-label', tutorialCompleted ? 'Repetir tutorial' : 'Tutorial guiado');
  if (!tutorial) return;
  put('save-status', 'Práctica independiente · tu estudio está conservado');
  const step = tutorial.step, total = TUTORIAL_STEPS.length;
  card.dataset.step = String(tutorial.index);
  put('tutorial', `<div class="tutorial-top"><span class="eyebrow">PRÁCTICA GUIADA · RELOJ EN PAUSA</span><button data-action="tutorial-exit" aria-label="Salir del tutorial">${icon('close')}</button></div><div class="tutorial-progress"><i style="width:${(tutorial.done ? total : tutorial.index + 1) / total * 100}%"></i></div><span class="tutorial-counter">${tutorial.done ? 'PRÁCTICA COMPLETADA' : `PASO ${tutorial.index + 1} / ${total}`}</span><h2 id="tutorial-title" tabindex="-1">${tutorial.done ? 'Tu primer lanzamiento, completado.' : step.title}</h2><p id="tutorial-copy">${tutorial.done ? 'Publicaste 60 unidades y desbloqueaste el nivel 2. El informe muestra ingresos y beneficio tras descontar la inversión. Conservas capital, reputación, puntos, controles e inspecciones; cada proyecto empieza con paquetes y datos nuevos. Puedes seguir creando sin límite de proyectos. Los recursos de esta práctica no se trasladan a tu estudio.' : step.text}</p><div class="tutorial-actions">${tutorial.done ? '<button class="primary" data-action="tutorial-exit">Volver a mi estudio</button>' : step.action === 'tutorial-next' ? `<button class="primary" data-action="tutorial-next">${step.next} ${icon('arrow')}</button>` : '<span class="tutorial-instruction">Usa el control resaltado.</span><button class="text-button" data-action="tutorial-locate">Ver control</button>'}</div><p class="tutorial-nudge" role="status">${esc(tutorialNudge)}</p>${tutorial.done ? '' : '<button class="tutorial-skip" data-action="tutorial-exit">Salir y conservar mi estudio</button>'}`);
  const target = document.querySelector(tutorial.done ? '#release-report' : step.target);
  if (target) { target.classList.add('tutorial-target'); target.setAttribute('aria-describedby', [target.getAttribute('aria-describedby'), 'tutorial-title tutorial-copy'].filter(Boolean).join(' ')); }
  if (tutorialPosition !== tutorial.index) { tutorialPosition = tutorial.index; requestAnimationFrame(() => locateTutorialTarget(true)); }
}
window.addEventListener('resize', () => locateTutorialTarget());

document.querySelector('#project-form').addEventListener('submit', e => {
  e.preventDefault();
  if (tutorial) { performTutorial('propose', undefined, document.querySelector('#project-name').value); return; }
  if (game.propose(projectType, document.querySelector('#project-name').value, projectSize, customUnits)) {
    selected = null; tab = 'packages'; filter = 'required'; query = ''; mapMode = false; speed = 1;
    document.querySelector('#search').value = ''; document.querySelector('#project-name').value = ''; put('speed', '1×'); save(); render();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
});
document.querySelector('#project-size').addEventListener('change', e => { if (tutorial) { performTutorial('project-size', e.target.value); e.target.value = projectSize; return; } projectSize = e.target.value; if (projectSize === 'custom') customUnits = game.projectCapacity(); renderPlanner(); });
document.querySelector('#project-units').addEventListener('input', e => { customUnits = e.target.valueAsNumber; renderPlanner(); });
document.querySelector('#search').addEventListener('input', e => { query = e.target.value; renderCatalog(); });
document.addEventListener('click', e => {
  const button = e.target.closest('[data-action]'); if (!button || button.disabled) return;
  const { action, id } = button.dataset;
  if (tutorial) {
    if (action === 'tutorial-exit') finishTutorial();
    else if (action === 'tutorial-locate') locateTutorialTarget(true);
    else performTutorial(action, id);
    return;
  }
  switch (action) {
    case 'tutorial-start': startTutorial(); return;
    case 'project-type': projectType = id; renderPlanner(); return;
    case 'max-project-size': customUnits = game.projectCapacity(); document.querySelector('#project-units').value = String(customUnits); renderPlanner(); return;
    case 'expand-project': game.expandProject(game.projectCapacity()); break;
    case 'add-construction': buyConstructionPoint(); return;
    case 'add-production': buyProductionPoint(); return;
    case 'select': selected = id; tab = 'packages'; break;
    case 'catalog': selected = null; tab = 'packages'; filter = 'required'; query = ''; document.querySelector('#search').value = ''; break;
    case 'tab': tab = id; selected = null; break;
    case 'filter': filter = id; selected = null; break;
    case 'requirement': selected = null; tab = 'packages'; filter = id; query = ''; document.querySelector('#search').value = ''; break;
    case 'factory': mapMode = false; break;
    case 'map': mapMode = !mapMode; break;
    case 'defenses': selected = null; tab = 'defenses'; break;
    case 'pause': if (game.state.started && !game.state.paused) game.state.paused = true; else game.start(); break;
    case 'develop': game.start(); break;
    case 'speed': speed = speed === 1 ? 2 : 1; put('speed', `${speed}×`); break;
    case 'guide': showGuide(); break;
    case 'film': showFilm(id); break;
    case 'film-back': showGuide(); document.querySelector(`.film-card[data-id="${lastFilm}"]`)?.focus(); break;
    case 'close-modal': closeModal(); break;
    case 'restart': openModal('<span class="eyebrow">NUEVO ESTUDIO</span><h2>¿Empezar de nuevo?</h2><p>Se sustituirán el capital, los proyectos y el progreso guardados en este navegador.</p><div class="modal-actions"><button class="secondary" data-action="close-modal">Conservar estudio</button><button class="primary" data-action="new-game">Fundar nuevo estudio</button></div>'); break;
    case 'new-game': game = new Game(); selected = null; projectType = 'photo'; projectSize = 'prototype'; customUnits = 24; modalWasRunning = false; closeModal(); break;
    case 'abandon-dialog': openModal('<span class="eyebrow">ARCHIVAR PROYECTO</span><h2>¿Dejar esta idea?</h2><p>Perderás los paquetes y la inversión de este proyecto. Conservas el estudio, sus puntos de construcción y producción, sus controles de seguridad y los proyectos publicados. Podrás proponer otra idea.</p><div class="modal-actions"><button class="secondary" data-action="close-modal">Seguir trabajando</button><button class="danger-button" data-action="abandon">Archivar proyecto</button></div>'); break;
    case 'abandon': game.abandon(); modalWasRunning = false; closeModal(); break;
    case 'zoom-in': factory?.zoom(0.15); break;
    case 'zoom-out': factory?.zoom(-0.15); break;
    case 'camera': factory?.reset(); break;
    case 'deploy-all': game.deployAll(); break;
    case 'incident': selected = game.state.incidents.find(i => !i.resolved)?.node || selected; tab = 'packages'; if (!game.state.incidents.some(i => !i.resolved)) game.rotate(); break;
    case 'update-dialog': showUpdate(id); break;
    case 'review-update': game.reviewUpdate(id); closeModal(); break;
    case 'update': game.update(id); modalWasRunning = false; closeModal(); break;
    case 'inspect': case 'install': case 'deploy': case 'authorize': case 'defend': case 'isolate': case 'recover': case 'remove': game[action](id); break;
    case 'rotate': case 'audit': game[action](); break;
    case 'deliver': if (game.deliver()) { selected = null; window.scrollTo({ top: 0, behavior: 'instant' }); } break;
  }
  save(); render();
  if (['select', 'requirement', 'catalog', 'defenses', 'incident'].includes(action)) document.querySelector('.catalog-panel').scrollIntoView({ block: 'nearest', behavior: 'instant' });
  if (action === 'audit') { document.querySelector('.diagnostics').open = true; document.querySelector('.diagnostics').scrollIntoView({ block: 'nearest' }); }
  put('announcement', esc(game.state.logs[0]?.text || ''));
});
document.addEventListener('keydown', e => { if (e.code === 'Space' && !['INPUT', 'SELECT', 'BUTTON', 'TEXTAREA', 'SUMMARY', 'A'].includes(e.target.tagName) && !document.querySelector('#modal').open && game.state.started) { e.preventDefault(); if (!tutorial) document.querySelector('#pause').click(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden) { modalWasRunning = false; activeFilm?.pause?.(); if (game.state.started) { game.state.paused = true; save(); render(); } } });
setInterval(() => { if (tutorial) return; for (let i = 0; i < speed; i++) game.tick(); save(); render(); }, 1000);
render();

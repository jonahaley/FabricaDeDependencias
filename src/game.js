import { PACKAGES, PARTS, DEFENSES, PROJECT_TYPES, getProjectSize, CONSTRUCTION, PRODUCTION, constructionCost, constructionPrice, productionCost, productionPrice } from './catalog.js';
export const SAVE_KEY = 'npm-factory-v2';
export function initialState() {
  return { version: 2, budget: 2400, constructionPoints: 1, productionPoints: 1, elapsed: 0, productionTime: 0, integrity: 100, project: null, progress: 0, delivered: 0, reputation: 0, revenue: 0, history: [], nodes: [], inspected: [], defenses: [], incidents: [], logs: [{ text: 'Tu estudio está listo. Propón tu primer proyecto.', kind: 'info', time: 0 }], flags: {}, audit: null, started: false, paused: false, ended: null, secretsLeaked: false, prevented: 0, maintenance: 0 };
}
export class Game {
  constructor(saved) {
    const valid = saved?.version === 2 && Array.isArray(saved.nodes) && Array.isArray(saved.history) && Array.isArray(saved.defenses) && Array.isArray(saved.inspected) && Array.isArray(saved.logs) && Array.isArray(saved.incidents) && saved.flags && Number.isFinite(saved.budget) && Number.isFinite(saved.reputation) && Number.isFinite(saved.delivered) && Number.isFinite(saved.progress);
    const savedSize = saved?.project && getProjectSize(saved.project.size, saved.project.units);
    const validProject = !saved?.project || PROJECT_TYPES.some(p => p.id === saved.project.type) && savedSize && savedSize.units === saved.project.units && Array.isArray(saved.project.needs) && Number.isFinite(saved.project.reward) && saved.project.reward > 0;
    this.state = valid && validProject ? { ...initialState(), ...saved } : initialState();
    // Older v2 studios keep enough infrastructure for their existing projects.
    if (valid && validProject && saved.constructionPoints === undefined) {
      const sizes = [saved.project, ...saved.history].map(p => getProjectSize(p?.size, p?.units)?.units || 0);
      this.state.constructionPoints = Math.max(1, Math.ceil(Math.max(...sizes) / CONSTRUCTION.unitsPerPoint));
    }
    if (!Number.isSafeInteger(this.state.constructionPoints) || this.state.constructionPoints < 1) this.state.constructionPoints = 1;
    if (!Number.isSafeInteger(this.state.productionPoints) || this.state.productionPoints < 1) this.state.productionPoints = 1;
  }
  level() { return this.state.delivered >= 4 ? 3 : this.state.delivered >= 1 ? 2 : 1; }
  constructionCapacity() { return this.state.constructionPoints * CONSTRUCTION.unitsPerPoint; }
  projectCapacity() { return this.constructionCapacity(); }
  constructionCost() { return constructionCost(this.state.constructionPoints); }
  addConstructionPoint() {
    const cost = this.constructionCost();
    if (this.state.ended || !this.spend(cost)) return false;
    this.state.constructionPoints++;
    this.log(`Punto de construcción ${this.state.constructionPoints} instalado · -${constructionPrice(this.state.constructionPoints - 1)} créditos. Capacidad: ${this.constructionCapacity()} unidades por proyecto. Se conserva en tu estudio.`, 'ok');
    return true;
  }
  capacityMet() { return Boolean(this.state.project && this.state.project.units <= this.constructionCapacity()); }
  productionRate() { return this.state.productionPoints * PRODUCTION.unitsPerPoint; }
  productionCost() { return productionCost(this.state.productionPoints); }
  addProductionPoint() {
    const cost = this.productionCost();
    if (this.state.ended || !this.spend(cost)) return false;
    this.state.productionPoints++;
    this.log(`Punto de producción ${this.state.productionPoints} instalado · -${productionPrice(this.state.productionPoints - 1)} créditos. Ritmo: ${this.productionRate()} unidades/s a velocidad 1×. Se conserva en tu estudio.`, 'ok');
    return true;
  }
  propose(typeId, name = '', sizeId = 'prototype', customUnits) {
    const s = this.state, type = PROJECT_TYPES.find(p => p.id === typeId), size = getProjectSize(sizeId, customUnits);
    if (s.project || !type || !size || type.level > this.level()) return false;
    if (size.units > this.constructionCapacity()) { this.log(`Este alcance necesita ${Math.ceil(size.units / CONSTRUCTION.unitsPerPoint)} puntos de construcción. Amplía el estudio.`, 'warn'); return false; }
    const reward = Math.round(type.reward * size.multiplier);
    if (!Number.isFinite(reward)) return false;
    s.project = { type: type.id, size: size.id, name: String(name).trim().slice(0, 48) || `${type.title} ${s.delivered + 1}`, title: type.title, description: type.description, needs: [...type.needs], units: size.units, reward, spent: 0 };
    s.nodes = []; s.incidents = []; s.flags = {}; s.audit = null; s.progress = 0; s.productionTime = 0; s.integrity = 100; s.secretsLeaked = false; s.started = false; s.paused = false; s.ended = null;
    this.log(`Nuevo proyecto: ${s.project.name}. Prepara sus paquetes a tu ritmo.`, 'ok'); return true;
  }
  expandProject(units) {
    const s = this.state, p = s.project, size = getProjectSize('custom', units);
    if (!p || s.ended || !size || units <= p.units || units > this.projectCapacity()) return false;
    const type = PROJECT_TYPES.find(type => type.id === p.type), reward = Math.round(type.reward * size.multiplier);
    if (!Number.isFinite(reward) || reward <= p.reward) return false;
    const extra = reward - p.reward;
    p.size = 'custom'; p.units = units; p.reward = reward;
    this.log(`Alcance ampliado a ${units} unidades · +${extra} créditos al publicar. El trabajo completado y la inversión se conservan.`, 'ok');
    return true;
  }
  abandon() {
    if (!this.state.project) return false;
    this.log(`Proyecto archivado: ${this.state.project.name}. La inversión no se recupera.`, 'warn');
    this.state.project = null; this.state.nodes = []; this.state.incidents = []; this.state.secretsLeaked = false; this.state.started = false; this.state.paused = false; this.state.progress = 0; this.state.integrity = 100; return true;
  }
  requirementsMet() { return Boolean(this.state.project?.needs.every(n => this.functions().has(n))); }
  canDevelop() { return this.capacityMet() && this.requirementsMet() && this.state.progress < this.state.project.units && this.state.integrity >= 80 && !this.state.secretsLeaked && !this.state.incidents.some(i => !i.resolved) && this.state.budget > 0; }
  canDeliver() { const s = this.state; return this.capacityMet() && this.requirementsMet() && s.progress >= s.project.units && s.integrity >= 80 && !s.secretsLeaked && !s.incidents.some(i => !i.resolved); }
  log(text, kind = 'info') { this.state.logs.unshift({ text, kind, time: this.state.elapsed }); this.state.logs = this.state.logs.slice(0, 60); }
  has(id) { return this.state.defenses.includes(id); }
  node(id) { return this.state.nodes.find(n => n.id === id); }
  spend(amount) { if (this.state.budget < amount) { this.log('Presupuesto insuficiente.', 'warn'); return false; } this.state.budget -= amount; if (this.state.project) this.state.project.spent += amount; return true; }
  start() { if (!this.canDevelop()) return false; this.state.started = true; this.state.paused = false; return true; }
  inspect(id) {
    if (this.state.ended || this.state.inspected.includes(id)) return;
    const p = PACKAGES.find(p => p.id === id); if (!p || !this.spend(15)) return;
    this.state.inspected.push(id);
    this.log(`Revisión de ${p.name}: ${p.malicious ? 'nombre distinto del oficial; script que lee secretos.' : p.private ? 'comprueba el registro del scope @factory.' : p.eol ? 'soporte finalizado; dependencia con aviso conocido.' : 'identidad contrastada. La revisión no garantiza ausencia de fallos.'}`, p.malicious || p.eol ? 'warn' : 'ok');
  }
  install(id) {
    if (!this.state.project || this.state.ended || this.node(id)) return;
    const p = PACKAGES.find(p => p.id === id); if (!p || !this.spend(p.cost)) return;
    const confusion = p.private && !this.has('registry');
    const n = { ...p, phase: 'build', compromised: false, isolated: false, patched: false, malicious: confusion ? 'confusion' : p.malicious || null, resolved: confusion ? 'Público (fallback incorrecto)' : p.registry, version: confusion ? '9.9.0' : p.version, buildBlocked: Boolean(p.needsBuild && this.has('scripts')) };
    this.state.nodes.push(n);
    for (const dep of p.deps) if (!this.node(dep)) this.state.nodes.push({ ...PARTS[dep], id: dep, deps: [], phase: 'build', transitive: true, color: PARTS[dep].color || '#96aaa0', compromised: false, isolated: false });
    this.log(`${p.name} instalado en el taller · ${p.deps.length} dependencias.`, 'ok');
    if (n.malicious) {
      if (this.has('scripts')) { this.log('Script bloqueado. El paquete sigue siendo sospechoso: no lo despliegues.', 'warn'); this.state.prevented++; }
      else this.incident(n.id, confusion ? 'Dependency confusion' : 'Typosquatting · postinstall', 'build');
    }
    if (n.buildBlocked) this.log('Build pendiente: inspecciona y autoriza su script legítimo.', 'warn');
    if (this.has('lockfile')) for (const x of this.state.nodes) x.locked = true;
  }
  authorize(id) { const n = this.node(id); if (!n || this.state.ended || !n.buildBlocked || !this.state.inspected.includes(id)) return; n.buildBlocked = false; this.log(`Build revisado de ${id} autorizado en un entorno aislado.`, 'ok'); }
  defend(id) { const d = DEFENSES.find(d => d.id === id); if (!d || this.has(id) || this.state.ended || !this.spend(d.cost)) return; this.state.defenses.push(id); this.log(`Control activado: ${d.name}.`, 'ok'); if (id === 'lockfile') for (const n of this.state.nodes) n.locked = true; }
  deploy(id) {
    const n = this.node(id); if (!n || n.transitive || n.buildBlocked || n.isolated || n.compromised || this.state.ended || n.phase === 'run') return;
    if (n.deps.some(d => this.node(d)?.compromised || this.node(d)?.isolated)) { this.log('Una dependencia impide el despliegue. Revisa el mapa.', 'warn'); return; }
    n.phase = 'run'; for (const d of n.deps) this.node(d).phase = 'run'; this.log(`${n.name} pasa a producción.`, 'ok');
    if (n.malicious) this.incident(n.id, 'Código malicioso en ejecución', 'run');
  }
  deployAll() { for (const n of [...this.state.nodes]) if (n.phase === 'build' && !n.transitive) this.deploy(n.id); }
  affected(id) { return this.state.nodes.filter(n => n.id === id || n.deps?.includes(id)).map(n => n.id); }
  operational(n) { return n.phase === 'run' && !n.isolated && !n.compromised && !n.buildBlocked && n.deps.every(id => { const d = this.node(id); return d && !d.isolated && !d.compromised; }); }
  functions() { return new Set(this.state.nodes.filter(n => !n.transitive && this.operational(n)).flatMap(n => n.category === 'all' ? ['image', 'message', 'data'] : [n.category])); }
  surface() { const s = this.state, running = s.nodes.filter(n => n.phase === 'run' && !n.isolated).length; return Math.min(100, Math.round(s.nodes.length * 1.5 + running * (this.has('network') ? 0.5 : 5) + (!this.has('scripts') && s.nodes.length ? 12 : 0) + (!this.has('privilege') && running ? 18 : 0))); }
  incident(id, title, phase = 'run') {
    const n = this.node(id); if (!n || n.compromised) return;
    if (phase === 'build' && this.has('sandbox')) { n.isolated = true; this.state.prevented++; this.log(`${title}: intento contenido en el taller, sin acceso a secretos. Sustituye o reconstruye la pieza.`, 'ok'); return; }
    n.compromised = true; this.state.incidents.push({ id: `${id}-${this.state.elapsed}`, node: id, title, phase, resolved: false });
    this.state.secretsLeaked = true; this.state.integrity = Math.max(0, this.state.integrity - (this.has('privilege') ? 2 : 8));
    this.log(`${title}: ${id} comprometido. Aísla, rota credenciales y recupera.`, 'danger');
    this.state.paused = true;
  }
  isolate(id) { const n = this.node(id); if (!n || this.state.ended) return; n.isolated = true; this.log(`${id} aislado. ${this.affected(id).length - 1} módulos dependientes afectados.`, 'warn'); }
  rotate() { if (!this.state.secretsLeaked || this.state.ended || !this.spend(70)) return; this.state.secretsLeaked = false; this.log('Credenciales revocadas y rotadas. Los datos ya filtrados no se recuperan.', 'ok'); }
  recover(id) {
    const n = this.node(id); if (!n || this.state.ended) return;
    if (n.malicious || n.eol) { this.log('Esta pieza debe sustituirse por un paquete mantenido y confiable.', 'warn'); return; }
    if (!n.isolated) { this.log('Aísla la pieza antes de reconstruirla.', 'warn'); return; }
    if (this.state.secretsLeaked) { this.log('Rota primero las credenciales comprometidas.', 'warn'); return; }
    if (!this.spend(90)) return;
    n.compromised = false; n.isolated = false; n.patched = true; n.known = false; n.version = n.id === 'codec-core' ? '1.0.1' : `${n.version.split('.').slice(0, 2).join('.')}.9`;
    for (const i of this.state.incidents) if (i.node === id) i.resolved = true;
    this.log(`${id} reconstruido desde una versión confiable y corregida. Servicio recuperado.`, 'ok');
  }
  remove(id) {
    const n = this.node(id); if (!n || n.transitive || this.state.ended) return;
    const removed = [id]; this.state.nodes = this.state.nodes.filter(x => x.id !== id);
    this.state.nodes = this.state.nodes.filter(x => { const keep = !x.transitive || this.state.nodes.some(root => !root.transitive && root.deps.includes(x.id)); if (!keep) removed.push(x.id); return keep; });
    for (const i of this.state.incidents) if (removed.includes(i.node)) i.resolved = true;
    this.log(`${id} retirado junto con sus dependencias huérfanas. Las credenciales filtradas siguen necesitando rotación.`, 'warn');
  }
  audit() { if (this.state.ended || !this.spend(20)) return; const found = this.state.nodes.filter(n => n.known && !n.patched).map(n => n.id); this.state.audit = { found, time: this.state.elapsed }; this.log(`npm audit: ${found.length} avisos conocidos. Cero alertas no garantiza seguridad.`, found.length ? 'warn' : 'ok'); }
  reviewUpdate(id) { const n = this.node(id); if (!n || this.state.ended || !this.spend(25)) return; n.reviewed = true; this.log(n.id === 'codec-core' ? 'Prueba de codec-core@1.1.0: conexión externa y lectura de secretos. Candidata rechazada; conserva 1.0.x.' : `Pruebas de ${id}: actualización compatible. Revisa también su procedencia.`, n.id === 'codec-core' ? 'warn' : 'ok'); }
  update(id) {
    const n = this.node(id); if (!n || this.state.ended || n.eol || n.malicious) return;
    if (n.id === 'codec-core' && n.reviewed) { this.log('La revisión rechazó esta versión. No se aplica.', 'ok'); return; }
    if (!this.spend(40)) return;
    if (n.id === 'codec-core') { n.version = '1.1.0'; this.incident(id, 'Supply chain · versión comprometida', n.phase === 'run' ? 'run' : 'build'); }
    else { n.version = `${n.version.split('.').slice(0, 2).join('.')}.9`; n.patched = true; n.known = false; this.log(`${id} actualizado. Lockfile sincronizado si está activo.`, 'ok'); }
  }
  deliver() {
    if (!this.canDeliver()) return false;
    const s = this.state, project = s.project;
    const rating = Math.max(1, Math.min(5, Math.round((s.integrity - 75) / 5 - this.surface() / 50 + s.defenses.length / 6)));
    const bonus = rating * 40, income = project.reward + bonus;
    s.history.unshift({ ...project, needs: [...project.needs], rating, income, profit: income - project.spent, integrity: s.integrity, packages: s.nodes.filter(n => !n.transitive).map(n => n.name) });
    s.history = s.history.slice(0, 50); s.budget += income; s.revenue += income; s.reputation += rating * 10; s.delivered++;
    this.log(`${project.name} publicado · ${rating}/5 · +${income} créditos. Ya puedes proponer otro proyecto.`, 'ok');
    s.project = null; s.started = false; s.paused = false; s.progress = 0; return true;
  }
  tick() {
    const s = this.state; if (!s.project || !s.started || s.paused || s.ended || s.progress >= s.project.units) return;
    if (!this.canDevelop()) { s.paused = true; return; }
    s.elapsed++;
    let units = Math.min(this.productionRate(), s.project.units - s.progress);
    // Advance to the next event or payment that can stop production, without a loop per unit.
    while (units > 0 && !s.paused) {
      const events = [];
      if (!s.flags.known && this.node('codec-legacy')?.phase === 'run') events.push(22);
      if (!s.flags.zero && s.nodes.some(n => n.transitive && n.phase === 'run' && !n.patched && !n.eol)) events.push(35);
      if (!s.flags.supply) events.push(52);
      const eventDistance = Math.max(1, Math.min(...events) - s.productionTime);
      const maintenance = s.nodes.length * 2;
      const budgetDistance = maintenance ? 15 - s.productionTime % 15 + 15 * (Math.ceil(s.budget / maintenance) - 1) : Infinity;
      const batch = Math.min(units, eventDistance, budgetDistance);
      this.produceUnits(batch); units -= batch;
    }
  }
  produceUnits(units) {
    const s = this.state;
    const payments = Math.floor((s.productionTime + units) / 15) - Math.floor(s.productionTime / 15);
    s.productionTime += units; s.progress += units;
    if (payments) { const cost = Math.min(s.budget, payments * s.nodes.length * 2); s.budget -= cost; s.project.spent += cost; s.maintenance += cost; }
    if (s.productionTime >= 22 && !s.flags.known && this.node('codec-legacy')?.phase === 'run') { s.flags.known = true; if (!this.has('network')) this.incident('codec-legacy', 'Explotación de vulnerabilidad conocida'); else { s.prevented++; this.log('La segmentación bloqueó el acceso al codec EOL. La vulnerabilidad sigue pendiente.', 'warn'); } }
    if (s.productionTime >= 35 && !s.flags.zero) {
      const target = s.nodes.find(n => n.transitive && n.phase === 'run' && !n.patched && !n.eol);
      if (target) { s.flags.zero = true; target.known = true; if (this.has('network') || target.isolated) { s.prevented++; this.log(`Zero-day en ${target.id}: acceso bloqueado. Se publica un aviso y una versión corregida.`, 'warn'); } else this.incident(target.id, 'Zero-day · entrada remota'); }
    }
    if (s.productionTime >= 52 && !s.flags.supply) { s.flags.supply = true; this.log('Nueva codec-core@1.1.0 disponible. Revisa el cambio antes de actualizar.', 'warn');
      const n = this.node('codec-core'); if (n && !this.has('lockfile') && !n.patched) { n.version = '1.1.0'; this.incident(n.id, 'Supply chain · rebuild sin lockfile', n.phase === 'run' ? 'run' : 'build'); } else if (n && this.has('lockfile')) { s.prevented++; this.log('Lockfile: el rebuild conserva la versión fijada. Actualizar sigue siendo una decisión explícita.', 'ok'); }
    }
    if (s.budget <= 0) { s.paused = true; this.log('Presupuesto agotado. Puedes publicar si has terminado o fundar un nuevo estudio.', 'warn'); }
    if (s.progress >= s.project.units) { s.paused = true; this.log('Desarrollo completado. Revisa la seguridad y publica cuando quieras.', 'ok'); }
  }
  score() { const s = this.state; return s.reputation; }
}

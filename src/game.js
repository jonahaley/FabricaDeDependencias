import { PACKAGES, PARTS, DEFENSES, ORDERS } from './catalog.js';
export const SAVE_KEY = 'npm-factory-v1';
export function initialState() {
  return { version: 1, budget: 2400, remaining: 420, elapsed: 0, productionTime: 0, integrity: 100, mission: 0, progress: 0, delivered: 0, nodes: [], inspected: [], defenses: [], incidents: [], logs: [{ text: 'Turno preparado. Elige paquetes para tu primer encargo.', kind: 'info', time: 0 }], flags: {}, audit: null, started: false, paused: false, ended: null, secretsLeaked: false, prevented: 0, maintenance: 0 };
}
export class Game {
  constructor(saved) { this.state = saved && saved.version === 1 && Array.isArray(saved.nodes) ? saved : initialState(); }
  log(text, kind = 'info') { this.state.logs.unshift({ text, kind, time: this.state.elapsed }); this.state.logs = this.state.logs.slice(0, 60); }
  has(id) { return this.state.defenses.includes(id); }
  node(id) { return this.state.nodes.find(n => n.id === id); }
  spend(amount) { if (this.state.budget < amount) { this.log('Presupuesto insuficiente.', 'warn'); return false; } this.state.budget -= amount; return true; }
  start() { if (!this.state.ended) { this.state.started = true; this.state.paused = false; } }
  inspect(id) {
    if (this.state.ended || this.state.inspected.includes(id)) return;
    const p = PACKAGES.find(p => p.id === id); if (!p || !this.spend(15)) return;
    this.state.inspected.push(id);
    this.log(`Revisión de ${p.name}: ${p.malicious ? 'nombre distinto del oficial; script que lee secretos.' : p.private ? 'comprueba el registro del scope @factory.' : p.eol ? 'soporte finalizado; dependencia con aviso conocido.' : 'identidad contrastada. La revisión no garantiza ausencia de fallos.'}`, p.malicious || p.eol ? 'warn' : 'ok');
  }
  install(id) {
    if (this.state.ended || this.node(id)) return;
    const p = PACKAGES.find(p => p.id === id); if (!p || !this.spend(p.cost)) return;
    this.start(); const confusion = p.private && !this.has('registry');
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
    const s = this.state, order = ORDERS[s.mission]; if (s.ended || s.progress < order.units || !order.needs.every(n => this.functions().has(n))) return false;
    if (s.integrity < 80 || s.secretsLeaked || s.incidents.some(i => !i.resolved)) { this.log('Entrega bloqueada: protege los datos y resuelve los incidentes.', 'warn'); return false; }
    s.budget += order.reward; s.delivered++; this.log(`Encargo entregado · +${order.reward} créditos.`, 'ok');
    if (s.mission === ORDERS.length - 1) s.ended = 'won'; else { s.mission++; s.progress = 0; } return true;
  }
  tick() {
    const s = this.state; if (!s.started || s.paused || s.ended) return;
    s.elapsed++; s.remaining--; if (s.nodes.some(n => !n.transitive && n.phase === 'run')) s.productionTime++;
    const order = ORDERS[s.mission]; if (order.needs.every(n => this.functions().has(n))) s.progress = Math.min(order.units, s.progress + 1);
    if (s.elapsed % 15 === 0) { const cost = s.nodes.length * 2; s.budget = Math.max(0, s.budget - cost); s.maintenance += cost; }
    if (s.elapsed % 6 === 0 && s.incidents.some(i => !i.resolved && !this.node(i.node)?.isolated)) { s.integrity = Math.max(0, s.integrity - (this.has('privilege') ? 1 : 4)); s.secretsLeaked = true; }
    if (s.productionTime >= 22 && !s.flags.known && this.node('codec-legacy')?.phase === 'run') { s.flags.known = true; if (!this.has('network')) this.incident('codec-legacy', 'Explotación de vulnerabilidad conocida'); else { s.prevented++; this.log('La segmentación bloqueó el acceso al codec EOL. La vulnerabilidad sigue pendiente.', 'warn'); } }
    if (s.productionTime >= 35 && !s.flags.zero) {
      const target = s.nodes.find(n => n.transitive && n.phase === 'run' && !n.patched && !n.eol);
      if (target) { s.flags.zero = true; target.known = true; if (this.has('network') || target.isolated) { s.prevented++; this.log(`Zero-day en ${target.id}: acceso bloqueado. Se publica un aviso y una versión corregida.`, 'warn'); } else this.incident(target.id, 'Zero-day · entrada remota'); }
    }
    if (s.productionTime >= 52 && !s.flags.supply) { s.flags.supply = true; this.log('Nueva codec-core@1.1.0 disponible. Revisa el cambio antes de actualizar.', 'warn');
      const n = this.node('codec-core'); if (n && !this.has('lockfile') && !n.patched) { n.version = '1.1.0'; this.incident(n.id, 'Supply chain · rebuild sin lockfile', n.phase === 'run' ? 'run' : 'build'); } else if (n && this.has('lockfile')) { s.prevented++; this.log('Lockfile: el rebuild conserva la versión fijada. Actualizar sigue siendo una decisión explícita.', 'ok'); }
    }
    if (s.remaining <= 0 || s.budget <= 0 || s.integrity < 80) { s.ended = 'lost'; this.log(s.integrity < 80 ? 'Pérdida de datos por encima del límite del encargo.' : s.budget <= 0 ? 'Presupuesto agotado.' : 'Tiempo del turno agotado.', 'danger'); }
  }
  score() { const s = this.state; return Math.max(0, Math.round(s.delivered * 200 + s.integrity * 2 + s.prevented * 30 + s.defenses.length * 20 + s.remaining / 4)); }
}

import { Game } from './game.js';

export const TUTORIAL_KEY = 'npm-factory-tutorial-v1';
const button = (action, id) => `[data-action="${action}"]${id ? `[data-id="${id}"]` : ''}`;
export const TUTORIAL_STEPS = [
  { title: 'Empieza por el encargo', text: 'Necesitas procesar imágenes y guardar datos. Las funciones se activan cuando sus máquinas están en producción. Practicaremos sin límite de tiempo y sin modificar tu partida.', target: '#order', action: 'tutorial-next', next: 'Elegir una máquina' },
  { title: 'Elige el nombre exacto', text: 'Selecciona pixel-press en el catálogo. Más abajo hay un nombre parecido: pixel-pres. Una letra puede llevarte al paquete de otra persona.', target: '#catalog ' + button('select', 'pixel-press'), action: 'select', id: 'pixel-press' },
  { title: 'Inspecciona antes de instalar', text: 'Comprueba publicador, origen, soporte y scripts. Esta revisión cuesta 15 créditos y te permite saber qué ejecutará el build.', target: '#inspector ' + button('inspect', 'pixel-press'), action: 'inspect', id: 'pixel-press', complete: g => g.state.inspected.includes('pixel-press') },
  { title: 'Controla los scripts', text: 'Activa Bloquear scripts. El código de una dependencia puede ejecutarse al instalar, antes de poner la aplicación en marcha. Algunos builds legítimos también se bloquearán.', tab: 'defenses', target: button('defend', 'scripts'), action: 'defend', id: 'scripts', complete: g => g.has('scripts') },
  { title: 'Instala en el taller', text: 'Instala pixel-press. Aparecerán la máquina y sus dos dependencias. Todavía no están en producción; el script de compilación quedará pendiente.', target: '#inspector ' + button('install', 'pixel-press'), action: 'install', id: 'pixel-press', complete: g => Boolean(g.node('pixel-press')?.buildBlocked) },
  { title: 'Autoriza lo que has revisado', text: 'El script revisado compila el motor de imágenes. Autoriza este build en un entorno aislado. Bloquear por defecto y revisar las excepciones permite construir con más control.', target: button('authorize', 'pixel-press'), action: 'authorize', id: 'pixel-press', complete: g => !g.node('pixel-press').buildBlocked },
  { title: 'Revisa el almacén', text: 'Para guardar los resultados también necesitas vault-store. Inspecciónalo: no declara scripts de instalación, pero sigue incorporando código y dependencias.', selected: 'vault-store', target: button('inspect', 'vault-store'), action: 'inspect', id: 'vault-store', complete: g => g.state.inspected.includes('vault-store') },
  { title: 'Completa las funciones', text: 'Instala vault-store. Tu taller tendrá las dos máquinas que exige el primer encargo y sus piezas transitivas.', selected: 'vault-store', target: button('install', 'vault-store'), action: 'install', id: 'vault-store', complete: g => Boolean(g.node('vault-store')) },
  { title: 'Fija las versiones', text: 'Activa el lockfile para reproducir el árbol de dependencias. Evita cambios implícitos de versión, pero también conserva los fallos de las versiones fijadas.', tab: 'defenses', target: button('defend', 'lockfile'), action: 'defend', id: 'lockfile', complete: g => g.has('lockfile') },
  { title: 'Pon la aplicación en marcha', text: 'Despliega las dos máquinas. Pasarán del taller a producción y se marcarán las funciones del encargo. El reloj de esta práctica seguirá detenido.', target: '#deploy', action: 'deploy-all', run: g => g.deployAll(), complete: g => g.functions().has('image') && g.functions().has('data') },
  { title: 'Abre el mapa', text: 'El mapa muestra de qué piezas depende cada máquina. Sirve para localizar qué funciones se detendrían si una dependencia falla.', target: '#view-map', action: 'map' },
  { title: 'Sigue una dependencia', text: 'Selecciona codec-core. El inspector mostrará pixel-press como consumidor: una incidencia en esta pieza afectaría al procesamiento de imágenes.', map: true, target: '#graph ' + button('select', 'codec-core'), action: 'select', id: 'codec-core' },
  { title: 'Un audit limpio tiene límites', text: 'Ejecuta audit. En este momento no hay avisos conocidos. Eso no garantiza que el árbol sea seguro ni que no pueda aparecer un zero-day.', selected: 'codec-core', map: true, target: '.console-header ' + button('audit'), action: 'audit', complete: g => Boolean(g.state.audit) },
  { title: 'Ensaya un incidente', text: 'El audit devolvió cero avisos. Ahora simularemos el descubrimiento y explotación de un fallo en codec-core. Es una práctica controlada para aprender a responder.', selected: 'codec-core', target: '#logs', action: 'tutorial-next', next: 'Simular zero-day', run: g => { g.node('codec-core').known = true; g.state.flags.zero = true; g.incident('codec-core', 'Zero-day · práctica guiada'); } },
  { title: 'Primero, contiene el daño', text: 'Aísla codec-core. Detendrás el acceso a la pieza afectada y también el módulo de imágenes que depende de ella. En una partida real, el daño sigue creciendo hasta contenerlo.', selected: 'codec-core', target: button('isolate', 'codec-core'), action: 'isolate', id: 'codec-core', complete: g => g.node('codec-core').isolated },
  { title: 'Revoca los secretos expuestos', text: 'El atacante obtuvo credenciales. Rótalas antes de recuperar el servicio. Borrar el paquete o arreglar el fallo no invalida una credencial robada.', selected: 'codec-core', target: '#inspector ' + button('rotate'), action: 'rotate', complete: g => !g.state.secretsLeaked },
  { title: 'Recupera desde una versión confiable', text: 'En este escenario ya hay una corrección. Reconstruye la pieza: las imágenes volverán a funcionar. El 8% de datos filtrados no se recupera al reparar el software.', selected: 'codec-core', target: button('recover', 'codec-core'), action: 'recover', id: 'codec-core', complete: g => !g.node('codec-core').compromised && g.functions().has('image') },
  { title: 'Procesa el encargo', text: 'Las dos funciones están operativas y el incidente está resuelto. Avanzaremos 18 segundos de producción de una vez para completar este encargo de práctica.', target: '#order', action: 'tutorial-next', next: 'Procesar 18 unidades', run: g => { g.state.paused = false; for (let i = 0; i < 18; i++) g.tick(); }, complete: g => g.state.progress === 18 },
  { title: 'Entrega y cobra', text: 'Entrega el encargo. Conservas más del 80% de los datos, has rotado las credenciales y no quedan incidentes abiertos. La recompensa financia el siguiente trabajo.', target: '#order ' + button('deliver'), action: 'deliver', complete: g => g.state.delivered === 1 },
];

// A separate Game makes rehearsal and replay independent of campaign saves.
export class Tutorial {
  constructor(campaign) { this.campaign = campaign; this.game = new Game(); this.game.state.paused = true; this.index = 0; }
  get step() { return TUTORIAL_STEPS[this.index]; }
  get done() { return this.index >= TUTORIAL_STEPS.length; }
  accepts(action, id) { return Boolean(this.step && this.step.action === action && (!this.step.id || this.step.id === id)); }
  perform(action, id) {
    if (!this.accepts(action, id)) return false;
    const step = this.step;
    if (step.run) step.run(this.game);
    else if (typeof this.game[action] === 'function') this.game[action](id);
    this.game.state.paused = true;
    if (step.complete && !step.complete(this.game)) return false;
    this.index++;
    return true;
  }
  finish() { if (this.campaign.state.started && !this.campaign.state.ended) this.campaign.state.paused = true; return this.campaign; }
}

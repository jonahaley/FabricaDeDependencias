import { FILM_AUDIO } from './film-audio.js';
// Guiones originales con ejemplos ficticios de la fábrica.
const sources = {
  supply: ['OWASP · Cadena de suministro', 'https://cheatsheetseries.owasp.org/cheatsheets/Software_Supply_Chain_Security_Cheat_Sheet.html'],
  npm: ['OWASP · Seguridad npm', 'https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html'],
  scripts: ['npm · Scripts', 'https://docs.npmjs.com/cli/v11/using-npm/scripts/'],
  eol: ['Node.js · Fin de soporte', 'https://nodejs.org/en/about/eol'],
  zero: ['NIST · Zero-day', 'https://csrc.nist.gov/glossary/term/zero_day_attack'],
  surface: ['NIST · Superficie de ataque', 'https://csrc.nist.gov/glossary/term/attack_surface'],
  privilege: ['NIST · Mínimo privilegio', 'https://csrc.nist.gov/glossary/term/least_privilege'],
  scope: ['npm · Scopes', 'https://docs.npmjs.com/cli/v11/using-npm/scope/'],
  lock: ['npm · Instalación reproducible', 'https://docs.npmjs.com/cli/v11/commands/npm-ci/'],
  audit: ['npm · Audit', 'https://docs.npmjs.com/cli/v11/commands/npm-audit/'],
};

// Las cuatro secuencias comparten una escena continua, no diapositivas.
export const FILMS = [
  {
    id: 'supply-chain', title: 'Supply chain attack', subtitle: 'El peligro viaja con la pieza', lesson: 0, color: '#c6eb88',
    labels: ['REGISTRO', 'codec-core', 'pixel-press', 'omni-suite', 'DATOS'], sources: [sources.supply],
    takeaway: 'Revisa el origen y las dependencias transitivas. Una pieza compartida amplía el alcance de un incidente.',
    cues: [
      ['Confianza en cadena', 'Pixel-press y omni-suite comparten codec-core. Tu aplicación también depende de piezas que no elegiste directamente: las dependencias transitivas.'],
      ['La pieza cambia', 'Un ataque a la cadena de suministro compromete un proveedor, una herramienta o un componente para alcanzar a sus consumidores. Aquí entra una actualización maliciosa.'],
      ['El daño se reparte', 'La pieza comprometida llega a ambas máquinas. El atacante aprovecha la confianza en ese componente; no necesita entrar por la puerta principal de cada aplicación.'],
      ['Corta la cadena', 'Aísla la pieza y sus consumidores. Reconstruye desde una versión confiable y revoca los secretos expuestos. Fijar versiones ayuda, pero no certifica su seguridad.'],
    ],
  },
  {
    id: 'scripts', title: 'Scripts de instalación', subtitle: 'El código arranca antes que tu app', lesson: 1, color: '#dfb77a',
    labels: ['PAQUETE', 'postinstall', 'TALLER', 'PRODUCCIÓN', 'SECRETOS'], sources: [sources.scripts, sources.supply],
    takeaway: 'Revisa los scripts necesarios y ejecútalos en un entorno limitado, sin secretos de producción.',
    cues: [
      ['Instalar también ejecuta', 'Los scripts de ciclo de vida pueden ejecutar código durante la instalación. Postinstall podría compilar un motor legítimo, antes de arrancar tu aplicación.'],
      ['El taller tiene llaves', 'Si ese código es malicioso y el entorno permite leer credenciales y salir a internet, el robo puede ocurrir ya en el taller.'],
      ['Detén y revisa', 'Bloquear scripts detiene esa ejecución automática. También deja pendiente el build legítimo de pixel-press: inspecciona y autoriza solo lo necesario.'],
      ['Construye con límites', 'El taller aislado del juego no tiene secretos de producción ni salida de red. Bloquear scripts no elimina el código malicioso que podría ejecutarse después.'],
    ],
  },
  {
    id: 'eol', title: 'Fin de soporte · EOL', subtitle: 'La máquina funciona. El soporte no.', lesson: 2, color: '#dfb77a',
    labels: ['SOPORTE', 'codec-legacy', 'image-legacy', 'ALTERNATIVA', 'SERVICIO'], sources: [sources.eol],
    takeaway: 'Planifica la sustitución de componentes sin soporte. EOL no significa infección automática.',
    cues: [
      ['Todavía produce', 'Image-legacy parece una ganga. Sigue procesando imágenes, pero su soporte ha terminado. Funcionar hoy no garantiza recibir mantenimiento mañana.'],
      ['Dejan de llegar parches', 'Fin de soporte significa que el proyecto deja de mantener esa versión, incluidas sus correcciones de seguridad. EOL no demuestra, por sí solo, una infección.'],
      ['Una grieta conocida', 'En esta simulación, codec-legacy tiene además un fallo conocido que puede explotarse si es accesible. El fin del soporte y la vulnerabilidad son hechos distintos.'],
      ['Sustituye la máquina', 'Aísla lo afectado y migra a una alternativa mantenida. Planifica y prueba el cambio antes de depender de una reparación que quizá nunca llegue.'],
    ],
  },
  {
    id: 'zero-day', title: 'Zero-day', subtitle: 'El fallo que aún no tenía aviso', lesson: 3, color: '#f08e7e',
    labels: ['EXTERIOR', 'FALLO OCULTO', 'pixel-press', 'GATEWAY', 'DATOS'], sources: [sources.zero, sources.audit],
    takeaway: 'Reduce exposición, observa el servicio y prepara la respuesta. Un análisis previo no descarta fallos desconocidos.',
    cues: [
      ['Sin avisos conocidos', 'El análisis termina sin alertas. Ese resultado habla de lo que se conoce, no de todos los fallos que podrían existir.'],
      ['Una entrada desconocida', 'Un ataque zero-day explota una vulnerabilidad hasta entonces desconocida. En la fábrica, una entrada remota alcanza una pieza que parecía funcionar con normalidad.'],
      ['Contén el incidente', 'Aísla la pieza y averigua qué consumidores están afectados. La segmentación del juego bloquea este vector concreto, no todos los zero-days.'],
      ['Recupera con evidencia', 'Aplica una corrección confiable cuando exista y revoca credenciales filtradas. El juego ofrece un parche al descubrir el fallo; en la realidad puede tardar.'],
    ],
  },
  {
    id: 'attack-surface', title: 'Superficie de ataque', subtitle: 'Cuántas puertas dejas abiertas', lesson: 4, color: '#92cbd0',
    labels: ['ENTRADAS', 'DEPENDENCIAS', 'APLICACIÓN', 'SCRIPTS', 'PERMISOS'], sources: [sources.surface],
    takeaway: 'Evalúa qué se puede alcanzar y con qué permisos. El contador del juego es una ayuda didáctica.',
    cues: [
      ['Mira las entradas', 'La superficie de ataque reúne los puntos por los que alguien puede entrar, afectar al sistema o extraer datos. No es solo un recuento de paquetes.'],
      ['Más caminos posibles', 'Una función pública, un script ejecutable y una credencial con muchos permisos abren caminos distintos. Una pieza muy expuesta puede importar más que varias inaccesibles.'],
      ['Cierra lo innecesario', 'Retira componentes que no uses, limita scripts y reduce accesos de red. Desaparecen rutas, mientras las funciones necesarias siguen conectadas.'],
      ['Interpreta el indicador', 'El índice del juego combina código, entradas y permisos para enseñar decisiones. No mide la probabilidad real de un ataque ni sustituye el análisis del contexto.'],
    ],
  },
  {
    id: 'typosquatting', title: 'Typosquatting', subtitle: 'Una letra. Otro publicador.', lesson: 5, color: '#c6eb88',
    labels: ['CATÁLOGO', 'pixel-pres', 'pixel-press', 'TU APP', 'SECRETOS'], sources: [sources.npm],
    takeaway: 'Comprueba el nombre exacto y la identidad del publicador con una referencia confiable.',
    cues: [
      ['Casi el mismo nombre', 'Buscas pixel-press, pero aparece pixel-pres: falta una ese. Las cajas se parecen; sus publicadores son distintos. El parecido intenta aprovechar un error de elección.'],
      ['Entra el impostor', 'Eso es typosquatting. En el juego, la alternativa barata contiene un script que intenta robar secretos. Parecerse al nombre de otra biblioteca no la hace confiable.'],
      ['Mira quién está detrás', 'Contrasta nombre, repositorio y publicador con una referencia confiable. La inspección del juego revela el impostor; en un proyecto real no es una prueba infalible.'],
      ['Retira y recupera', 'Retira el paquete malicioso y evalúa el daño. Bloquear sus scripts no limpia su código. Revoca credenciales expuestas y reconstruye desde un origen confiable.'],
    ],
  },
  {
    id: 'dependency-confusion', title: 'Dependency confusion', subtitle: 'Nombre correcto. Origen equivocado.', lesson: 6, color: '#92cbd0',
    labels: ['PÚBLICO', 'PRIVADO', '@factory/ledger', 'TU APP', 'DATOS'], sources: [sources.scope, sources.npm],
    takeaway: 'Fija el scope al registro esperado antes de instalar. Cambiarlo después no limpia una pieza ya instalada.',
    cues: [
      ['Esperabas una pieza interna', 'Tu aplicación pide una biblioteca interna. Una resolución mal configurada puede seleccionar un paquete público controlado por otra persona.'],
      ['La ruta está mal elegida', 'Dependency confusion aprovecha esa confusión de procedencia. Aquí, el scope de factory sin configurar conduce al registro público ficticio, en lugar del almacén interno.'],
      ['Fija el registro', 'Asocia el scope al registro privado correcto antes de instalar. Revisa también el origen registrado en el lockfile. Un nombre con arroba no basta.'],
      ['Reemplaza lo instalado', 'Cambiar la configuración protege futuras resoluciones; no limpia el paquete que ya entró. Retíralo, reconstruye desde el origen esperado y revoca los secretos expuestos.'],
    ],
  },
  {
    id: 'least-privilege', title: 'Mínimo privilegio', subtitle: 'Cada máquina, solo sus llaves', lesson: 7, color: '#d6b3ef',
    labels: ['PAQUETE', 'TOKEN', 'IMÁGENES', 'MENSAJES', 'DATOS'], sources: [sources.privilege],
    takeaway: 'Limitar el alcance reduce el daño; no corrige el fallo ni recupera los datos ya robados.',
    cues: [
      ['Una llave para todo', 'Imagina que el procesador de imágenes puede leer toda la base de datos y administrar mensajes. Tiene permisos que su trabajo no necesita.'],
      ['El atacante hereda acceso', 'Si esa máquina queda comprometida, el código malicioso puede aprovechar los permisos de su proceso. Una llave maestra amplía el alcance del incidente.'],
      ['Reparte llaves limitadas', 'Mínimo privilegio significa conceder solo el acceso necesario para cada tarea. Separa credenciales, reduce su alcance y evita compartir secretos entre todas las máquinas.'],
      ['Limita y después corrige', 'Las puertas cerradas reducen el daño posible. El fallo sigue necesitando corrección. Revocar una credencial frena su uso futuro, pero no recupera datos robados.'],
    ],
  },
  {
    id: 'lockfile', title: 'Lockfile y actualizaciones', subtitle: 'Repetible no significa seguro', lesson: 8, color: '#c6eb88',
    labels: ['REGISTRO', 'v1.0.0', 'BUILD A', 'BUILD B', 'v1.1.0'], sources: [sources.lock, sources.supply],
    takeaway: 'Conserva un árbol reproducible y revisa cada actualización. El lockfile también puede fijar código vulnerable.',
    cues: [
      ['Dos builds, un árbol', 'El lockfile registra el árbol resuelto. Con npm ci, una discrepancia con package.json provoca un error, en lugar de actualizar automáticamente el lockfile.'],
      ['Una candidata inesperada', 'Una resolución sin fijar puede elegir otra versión permitida. En el juego, un rebuild incorpora una candidata comprometida. No es lo que ocurre en toda instalación.'],
      ['Mantén la referencia', 'El lockfile evita ese cambio implícito del escenario. Ambos builds usan la versión fijada. Repetir el mismo árbol también puede repetir sus vulnerabilidades.'],
      ['Actualiza con revisión', 'Una actualización explícita puede cambiar lo fijado. Revisa procedencia, diferencias y avisos; prueba el resultado. Una versión más nueva no garantiza seguridad.'],
    ],
  },
  {
    id: 'audit', title: 'Los límites de npm audit', subtitle: 'Cero avisos no es un certificado', lesson: 9, color: '#d6b3ef',
    labels: ['AVISOS', 'ESCÁNER', 'FALLO CONOCIDO', 'SIN AVISO', 'APLICACIÓN'], sources: [sources.audit],
    takeaway: 'Combina avisos conocidos con revisión de procedencia, permisos limitados, observación y respuesta.',
    cues: [
      ['Consulta lo conocido', 'Npm audit consulta avisos de vulnerabilidades conocidas para las dependencias del proyecto. El escáner de esta escena encuentra una pieza que coincide con un aviso.'],
      ['Lo que no aparece', 'Otra pieza no tiene aviso. Eso no demuestra que sea segura: puede contener código malicioso o un fallo desconocido. El escáner no ve el futuro.'],
      ['Interpreta el resultado', 'Investiga versiones y consumidores afectados. Algunas correcciones requieren intervención manual. Un informe sin alertas no certifica la identidad ni la inocuidad de los paquetes.'],
      ['Combina las defensas', 'Cruza los avisos con revisión del origen, permisos limitados y observación del servicio. Ante un incidente, aísla, corrige y recupera. El análisis es una capa más.'],
    ],
  },
].map(film => ({ ...film, cues: film.cues.map(([title, text], index) => ({ title, text, duration: FILM_AUDIO[film.id]?.[index] ?? Math.max(10, Math.ceil(text.split(/\s+/).length / 2.1)) })) }));

export function filmDuration(film) { return film.cues.reduce((sum, cue) => sum + cue.duration, 0); }
export function filmFrame(film, seconds) {
  const duration = filmDuration(film);
  const time = Math.max(0, Math.min(Number.isFinite(seconds) ? seconds : 0, duration));
  let start = 0;
  for (let index = 0; index < film.cues.length; index++) {
    const cue = film.cues[index];
    if (time < start + cue.duration || index === film.cues.length - 1) return { index, cue, start, time, progress: (time - start) / cue.duration, ended: time === duration };
    start += cue.duration;
  }
}

export class FilmClock {
  constructor(film) { this.film = film; this.time = 0; this.playing = false; }
  play() { if (this.time >= filmDuration(this.film)) this.time = 0; this.playing = true; }
  pause() { this.playing = false; }
  seek(seconds) { this.time = filmFrame(this.film, seconds).time; if (this.time === filmDuration(this.film)) this.pause(); }
  advance(seconds) { if (this.playing) this.seek(this.time + Math.max(0, seconds)); return filmFrame(this.film, this.time); }
}

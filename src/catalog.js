export const PACKAGES = [
  { id: 'pixel-press', name: 'pixel-press', version: '3.2.1', category: 'image', title: 'Procesador de imágenes', description: 'Redimensiona, comprime y transforma imágenes.', cost: 240, color: '#b8e981', deps: ['codec-core', 'color-math'], publisher: 'equipo-pixel', registry: 'Público', script: 'Compila el motor de imágenes.', needsBuild: true, official: true },
  { id: 'courier-kit', name: 'courier-kit', version: '2.4.0', category: 'message', title: 'Motor de mensajería', description: 'Entrega mensajes y gestiona las colas de envío.', cost: 200, color: '#d6b3ef', deps: ['serializer', 'queue-core'], publisher: 'courier-team', registry: 'Público', official: true },
  { id: 'vault-store', name: 'vault-store', version: '4.1.2', category: 'data', title: 'Almacén de datos', description: 'Persiste los datos de tu aplicación.', cost: 260, color: '#8bcad5', deps: ['query-driver', 'serializer'], publisher: 'vault-maintainers', registry: 'Público', official: true },
  { id: 'pixel-pres', name: 'pixel-pres', version: '3.2.1', category: 'image', title: 'Procesador de imágenes', description: 'Una alternativa económica. Revisa su identidad.', cost: 95, color: '#b8e981', deps: ['codec-core'], publisher: 'pixel-support-01', registry: 'Público', script: 'Lee variables del entorno y contacta con un servidor externo.', malicious: 'typo', official: false },
  { id: 'image-legacy', name: 'image-legacy', version: '0.8.0', category: 'image', title: 'Motor clásico · EOL', description: 'Barato, pero el mantenimiento ha terminado.', cost: 80, color: '#dfb87c', deps: ['codec-legacy'], publisher: 'archivo-imagen', registry: 'Público', eol: true, official: true },
  { id: '@factory/ledger', name: '@factory/ledger', version: '1.3.0', category: 'data', title: 'Registro privado', description: 'Paquete interno. Necesita un registro bien configurado.', cost: 130, color: '#8bcad5', deps: ['query-driver'], publisher: 'factory-internal', registry: 'Privado', private: true, official: true },
  { id: 'omni-suite', name: 'omni-suite', version: '5.0.0', category: 'all', title: 'Suite todo en uno', description: 'Tres funciones. Diez dependencias transitivas.', cost: 380, color: '#f0b896', deps: ['codec-core', 'color-math', 'serializer', 'queue-core', 'query-driver', 'template-kit', 'http-helper', 'file-glob', 'date-tool', 'metrics-agent'], publisher: 'omni-team', registry: 'Público', official: true },
];
export const PARTS = {
  'codec-core': { name: 'codec-core', version: '1.0.0', category: 'image', color: '#b8e981' },
  'color-math': { name: 'color-math', version: '2.1.0', category: 'image', color: '#b8e981' },
  serializer: { name: 'serializer', version: '1.2.0', category: 'message', color: '#d6b3ef' },
  'queue-core': { name: 'queue-core', version: '2.0.2', category: 'message', color: '#d6b3ef' },
  'query-driver': { name: 'query-driver', version: '3.1.1', category: 'data', color: '#8bcad5' },
  'codec-legacy': { name: 'codec-legacy', version: '0.3.0', category: 'image', color: '#dfb87c', known: true, eol: true },
  'template-kit': { name: 'template-kit', version: '1.1.0' }, 'http-helper': { name: 'http-helper', version: '2.0.0' },
  'file-glob': { name: 'file-glob', version: '3.0.0' }, 'date-tool': { name: 'date-tool', version: '1.4.0' }, 'metrics-agent': { name: 'metrics-agent', version: '0.9.0' },
};
export const DEFENSES = [
  { id: 'scripts', name: 'Bloquear scripts', cost: 90, icon: 'terminal', description: 'Desactiva scripts automáticos. Los builds necesarios requieren revisión y autorización.' },
  { id: 'sandbox', name: 'Aislar construcción', cost: 120, icon: 'box', description: 'El taller no recibe secretos de producción ni salida de red. Contiene el robo durante la instalación.' },
  { id: 'privilege', name: 'Mínimo privilegio', cost: 120, icon: 'key', description: 'Tokens limitados por máquina. Reduce el alcance del robo de datos; no elimina la vulnerabilidad.' },
  { id: 'registry', name: 'Registro privado', cost: 70, icon: 'lock', description: 'Fija @factory al registro interno y evita el fallback público en futuras instalaciones.' },
  { id: 'lockfile', name: 'Fijar lockfile', cost: 60, icon: 'file', description: 'Reproduce versiones directas y transitivas. Evita actualizaciones implícitas, pero también conserva fallos existentes.' },
  { id: 'network', name: 'Segmentar la red', cost: 150, icon: 'shield', description: 'Cierra accesos públicos directos. El gateway valida solicitudes y mitiga el vector remoto de esta simulación.' },
];
export const ORDERS = [
  { title: 'Un estudio en la nube', client: 'LUMEN / ESTUDIO CREATIVO', description: 'Procesa las imágenes del estudio y guarda los resultados sin exponer sus datos.', needs: ['image', 'data'], units: 18, reward: 450 },
  { title: 'La entrega importa', client: 'POST / MENSAJERÍA', description: 'Añade notificaciones para avisar al equipo de que sus imágenes están listas.', needs: ['image', 'message', 'data'], units: 24, reward: 400 },
  { title: 'Resistir y recuperar', client: 'NODO / INFRAESTRUCTURA', description: 'Mantén las tres funciones, responde a los incidentes y entrega con los datos protegidos.', needs: ['image', 'message', 'data'], units: 40, reward: 600 },
];
export const LABELS = { image: 'Imágenes', message: 'Mensajes', data: 'Datos', all: 'Todo en uno' };
export const LESSONS = [
  ['Cadena de suministro', 'Una versión comprometida puede entrar a través de una dependencia legítima. Revisa también las transitivas y el origen de las actualizaciones.'],
  ['Scripts de instalación', 'Los scripts de ciclo de vida pueden ejecutar código antes de arrancar la aplicación. Bloquearlos puede impedir builds legítimos: revisa y autoriza lo necesario.'],
  ['Fin de soporte · EOL', 'Terminan las actualizaciones, incluidas las de seguridad. EOL no equivale a infección automática. Planifica la sustitución por una alternativa mantenida.'],
  ['Zero-day', 'Un atacante explota una vulnerabilidad que todavía no era conocida por quienes podían corregirla o defenderse. Un análisis previo sin avisos no podía descartarla.'],
  ['Superficie de ataque', 'Importan las entradas alcanzables, los scripts ejecutables y los permisos, además del código instalado. El índice del juego es didáctico, no una medida de riesgo real.'],
  ['Typosquatting', 'Un nombre casi idéntico puede pertenecer a otra persona. Contrasta el nombre exacto, el repositorio y el publicador con fuentes confiables. Popularidad no significa seguridad.'],
  ['Dependency confusion', 'Una resolución mal configurada puede sustituir un paquete privado por uno público. Configura el scope y el registro esperado; revisa lo que resuelve el lockfile.'],
  ['Mínimo privilegio', 'El código comprometido hereda los permisos del entorno. Limita credenciales, red y acceso a datos. Si un secreto se filtra, hay que revocarlo o rotarlo.'],
  ['Lockfile y actualizaciones', 'El lockfile fija el árbol; npm ci verifica su coherencia con package.json. Reproducibilidad no implica inocuidad. Revisa cambios y prueba antes de actualizar.'],
  ['Límites de npm audit', 'Busca avisos de vulnerabilidades conocidas. Cero alertas no garantiza seguridad ni ausencia de código malicioso. Combina revisión, prevención, monitorización y recuperación.'],
];

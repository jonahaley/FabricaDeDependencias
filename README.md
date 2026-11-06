# Fábrica de dependencias

Juego de gestión y defensa en Three.js. Cada máquina representa un paquete npm; sus conexiones muestran dependencias compartidas. La construcción y la ejecución ocurren en plataformas separadas.

## Ejecutar

Requiere Node.js 22 o superior y npm.

```sh
npm ci --ignore-scripts
npm run dev
```

Abre http://localhost:3036. El servidor escucha únicamente en la máquina local. Puedes cambiar el puerto mediante `PORT`.

```sh
npm test
npm run build
```

El build crea `dist/`, con Three.js y OrbitControls incluidos. Publica esa carpeta en cualquier alojamiento estático con HTTP(S), también bajo un subdirectorio con URL terminada en `/`. Puedes comprobar el resultado con `npm run preview` (puerto 3036; detén antes el servidor de desarrollo o elige otro `PORT`). No necesita backend, claves ni servicios externos. Las fuentes de Google son opcionales y tienen alternativas del sistema. No se ha configurado ningún remoto ni publicación.

## Jugar

La primera visita ofrece un **tutorial interactivo de 19 pasos**. También puedes abrirlo con el botón **Tutorial**, junto a la vista de dependencias, o desde el Manual del operador. Los controles se resaltan y el recorrido avanza cuando completas la acción: selección, inspección, bloqueo de scripts, instalación, autorización del build, lockfile, despliegue, mapa, audit, respuesta a un zero-day y entrega.

El tutorial usa una fábrica de práctica independiente con el reloj detenido. Solo avanza 18 segundos al pulsar el paso de producción. No sobrescribe el guardado ni consume recursos de la campaña. Al terminar o salir, recuperas tu partida en pausa; al recargar durante la práctica se vuelve a la campaña guardada. Se puede omitir o repetir en cualquier momento.

1. Lee el encargo. Selecciona paquetes del catálogo e inspecciona su identidad, scripts, soporte y origen.
2. Instala en el taller. La primera instalación inicia el turno de siete minutos. Puedes pausar para tomar decisiones.
3. Activa defensas y autoriza los builds legítimos que hayas bloqueado. Pon las máquinas en producción.
4. Procesa las unidades solicitadas y entrega para cobrar. Debes conservar al menos el 80% de los datos, no tener incidentes abiertos y haber revocado las credenciales filtradas.
5. Usa el mapa para localizar consumidores de una dependencia. Aísla, rota credenciales y reconstruye desde una versión confiable; sustituye paquetes maliciosos o EOL.

Hay tres encargos, siete paquetes y seis controles de seguridad. Cada pieza cuesta 2 créditos de mantenimiento cada 15 segundos. El reloj puede avanzar a 1× o 2×. Espacio pausa; arrastrar gira la cámara; la rueda hace zoom. Los botones del mapa permiten seleccionar piezas sin usar el lienzo 3D. La partida se guarda en localStorage; recargar la abre en pausa. Cambiar de pestaña también pausa. El manual y las revisiones de versión detienen el reloj mientras se leen.

## Modelo didáctico

### Cine de la fábrica

El **Manual del operador / Guía de seguridad** incluye diez cortos de 40–51 segundos. Cada concepto tiene una escena isométrica 3D continua: las piezas viajan por las conexiones, aparecen incidentes y se cierran barreras. La cámara acompaña la explicación. También puedes abrir el corto desde cada concepto desplegable de la guía.

Incluyen narración sintética en español ya grabada, subtítulos, reproducción y pausa, reinicio, búsqueda por tiempo, silencio, transcripción y enlaces a las fuentes. Los MP3 se sirven localmente con el juego, sin servicios de voz en tiempo de ejecución. La partida se mantiene detenida durante la guía y los cortos. Cambiar de pestaña pausa también el reproductor; cerrar o volver a la guía cancela audio y animación.

Se cubren supply chain attack, scripts de instalación, EOL, zero-day, superficie de ataque, typosquatting, dependency confusion, mínimo privilegio, lockfile y límites de npm audit. La preferencia de movimiento reducido muestra composiciones estáticas por secuencia conservando la voz y los subtítulos. Si WebGL no está disponible, siguen funcionando el audio, los controles y la transcripción.

Los guiones están en `src/films.js`; la dirección 3D en `src/film-scene.js`; el reproductor en `src/film-player.js`. Para regenerar la voz tras cambiar un guion, ejecuta `node scripts/narrate-films.mjs` con Node.js 22 o superior y las dependencias de desarrollo instaladas. Esta operación opcional envía los guiones educativos a Microsoft Edge TTS mediante `node-edge-tts`; usa la voz `es-ES-ElviraNeural`. Genera `src/audio/*.mp3` y las duraciones de `src/film-audio.js`. El build normal solo copia estos recursos, sin generar voz ni usar la red.

Todos los nombres, versiones, vulnerabilidades y registros del catálogo son ficticios. La aplicación no instala los paquetes representados, no ejecuta sus scripts y no accede a secretos. Los eventos son deterministas para poder enseñar y repetir decisiones:

- `pixel-pres` imita a `pixel-press`: su script intenta robar secretos en el taller; bloquear scripts no elimina su código malicioso en ejecución.
- `@factory/ledger` se resuelve desde un registro público ficticio si el scope no se fija antes de instalar. Configurarlo después no limpia la pieza instalada.
- `image-legacy` está fuera de soporte y contiene una vulnerabilidad conocida en `codec-legacy`. EOL por sí solo no implica infección.
- A los 22 segundos de producción, el fallo conocido del codec EOL puede explotarse si es accesible.
- A los 35 segundos, una dependencia activa sin parche sufre un zero-day. El aviso aparece después de descubrir el fallo, no en el audit previo. En este escenario se publica una corrección al detectarlo; en la realidad esa disponibilidad no está garantizada.
- A los 52 segundos, un rebuild de `codec-core` sin lockfile puede resolver una versión comprometida. Esto representa una resolución flotante, no un comportamiento universal de `npm install`.
- El lockfile fija el árbol, pero no garantiza que su contenido sea seguro. Una actualización explícita también puede introducir la candidata maliciosa.
- El control de red bloquea el vector remoto concreto del escenario. No representa protección universal frente a zero-days. El aislamiento del taller modela ausencia de secretos y de salida de red, no una garantía general de cualquier sandbox.
- Mínimo privilegio reduce el daño. Aislar detiene la propagación y también las funciones dependientes. Rotar secretos no recupera los datos ya robados.
- El índice de superficie de ataque combina componentes, entradas y permisos. Es una ayuda visual del juego, no una métrica real de vulnerabilidad.
- `npm audit` simulado solo informa de avisos conocidos. No certifica paquetes ni detecta todas las formas de código malicioso.

## Estructura

- `src/game.js`: estado y reglas deterministas, sin dependencias del navegador.
- `src/catalog.js`: paquetes, defensas, encargos y lecciones.
- `src/scene.js`: escena isométrica, maquinaria, conexiones, animación y selección con raycasting.
- `src/tutorial.js`: pasos y sesión de práctica independiente de la campaña.
- `src/main.js` y `src/style.css`: interfaz, accesibilidad, guardado y controles.
- `scripts/server.mjs`: servidor de desarrollo sin dependencias adicionales.
- `scripts/build.mjs`: empaquetado estático.
- `tests/game.test.mjs`: escenarios de prevención, incidentes, dependencias, recuperación y campaña completa.

## Fuentes

- [npm: scripts de ciclo de vida](https://docs.npmjs.com/cli/v11/using-npm/scripts/)
- [npm audit: vulnerabilidades conocidas](https://docs.npmjs.com/cli/v11/commands/npm-audit/)
- [npm ci: instalaciones coherentes con el lockfile](https://docs.npmjs.com/cli/v11/commands/npm-ci/)
- [OWASP NPM Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html)
- [Node.js: fin de soporte](https://nodejs.org/en/about/eol)

La mecánica comprime el tiempo, los costes y los incidentes para favorecer el aprendizaje; no sustituye una evaluación de seguridad de un proyecto real.

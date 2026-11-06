import { FILMS, FilmClock, filmDuration, filmFrame } from './films.js';
import { createFilmScene } from './film-scene.js';

const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const stamp = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
const playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 11 7-11 7Z" fill="currentColor"/></svg>';
const pauseIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="4"/></svg>';

function thumbnail(film, index) {
  const cube = (x, y, color) => `<g transform="translate(${x} ${y})"><path d="m0 0 30-17 30 17-30 17Z" fill="${color}"/><path d="m0 0 30 17v35L0 35Z" fill="#44654d"/><path d="m30 17 30-17v35L30 52Z" fill="#284638"/><path d="m7 12 15 9v7L7 19Z" fill="${color}"/></g>`;
  return `<svg class="film-thumbnail" viewBox="0 0 300 140" aria-hidden="true"><path d="m10 85 142-70 140 67-140 56Z" fill="#263d2e" stroke="#496444"/><path d="m58 80 87-42 94 47-89 43Z" fill="none" stroke="#68875a" stroke-dasharray="4 5"/>${cube(43, 67, film.color)}${cube(116, 28, index % 3 === 0 ? '#f08e7e' : film.color)}${cube(196, 69, index % 3 === 1 ? '#dfb77a' : film.color)}<circle cx="160" cy="100" r="4" fill="${film.color}"/><path d="m148 94 12 6 14-6" fill="none" stroke="${film.color}"/></svg>`;
}

export function filmLibrary() {
  return `<section class="film-library" aria-labelledby="cinema-title"><div class="film-library-heading"><div><span class="eyebrow">CINE DE LA FÁBRICA / 10 CORTOS</span><h3 id="cinema-title">Los riesgos, en movimiento<span>.</span></h3><p>Conceptos reales. Historias de nuestra fábrica.</p></div><span class="film-format">3D + VOZ EN ESPAÑOL</span></div><div class="film-grid">${FILMS.map((film, index) => `<button class="film-card" data-action="film" data-id="${film.id}" style="--film-accent:${film.color}" aria-label="Ver corto: ${escape(film.title)}"><div class="film-poster">${thumbnail(film, index)}<span class="film-number">${String(index + 1).padStart(2, '0')}</span><span class="film-card-play">${playIcon}</span><span class="film-length">${stamp(filmDuration(film))}</span></div><div class="film-card-copy"><strong>${film.title}</strong><span>${film.subtitle}</span></div></button>`).join('')}</div><p class="film-library-note">Animación continua · narración y subtítulos · tu turno permanece en pausa.</p></section>`;
}

export function filmMarkup(film) {
  const index = FILMS.indexOf(film);
  return `<section class="film-player" style="--film-accent:${film.color}" aria-label="Reproductor del corto"><header class="film-heading"><button class="film-back" data-action="film-back">← Volver a la guía</button><span class="eyebrow">CINE DE LA FÁBRICA / ${String(index + 1).padStart(2, '0')}</span><h2 id="film-title">${film.title}</h2><p>${film.subtitle}</p></header><div class="film-screen"><div class="film-stage" role="img" aria-label="Animación isométrica de ${escape(film.title)}"></div><div class="film-hud"><span class="film-live">CORTO ANIMADO</span><span class="film-shot">01 / 04</span></div><div class="film-scene-caption"><span class="film-cue-title"></span><span class="film-scene-note"></span></div><button class="film-start" data-film-action="toggle" aria-label="Reproducir corto">${playIcon}<span>Reproducir corto</span><small>${stamp(filmDuration(film))} · voz en español</small></button></div><div class="film-subtitle" aria-live="off"><span class="film-caption-label">NARRACIÓN</span><p></p></div><div class="film-controls"><input class="film-seek" type="range" min="0" max="${filmDuration(film)}" step="0.1" value="0" aria-label="Posición del corto"><div class="film-buttons"><button class="film-toggle" data-film-action="toggle" aria-label="Reproducir">${playIcon}</button><button data-film-action="restart" aria-label="Reiniciar corto" title="Reiniciar corto">↺</button><span class="film-time">0:00 / ${stamp(filmDuration(film))}</span><span class="film-control-spacer"></span><button class="film-sound" data-film-action="sound" aria-pressed="true" aria-label="Sonido activado">Sonido: sí</button><button class="film-captions" data-film-action="captions" aria-pressed="true" aria-label="Subtítulos activados">CC</button></div><p class="film-audio-status" role="status"></p></div><div class="film-after"><p><b>Qué te llevas</b> ${film.takeaway}</p><div class="film-next-row"><span>Ejemplo ficticio · concepto real</span>${index < FILMS.length - 1 ? `<button class="text-button" data-action="film" data-id="${FILMS[index + 1].id}">Siguiente corto →</button>` : '<button class="text-button" data-action="film-back">Volver a los cortos →</button>'}</div><details class="film-transcript"><summary>Leer transcripción y fuentes</summary>${film.cues.map(cue => `<p><b>${cue.title}.</b> ${cue.text}</p>`).join('')}<p class="source-links">${film.sources.map(([name, url]) => `<a href="${url}" target="_blank" rel="noreferrer">${name}</a>`).join(' · ')}</p><p>Paquetes y eventos ficticios. La simulación simplifica los tiempos y las defensas para enseñar decisiones.</p></details></div></section>`;
}

export function mountFilm(root, film) {
  const clock = new FilmClock(film), abort = new AbortController(), reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const options = { signal: abort.signal };
  const seek = root.querySelector('.film-seek'), toggle = root.querySelector('.film-toggle'), start = root.querySelector('.film-start');
  const subtitle = root.querySelector('.film-subtitle'), status = root.querySelector('.film-audio-status');
  const audio = new Audio(); audio.preload = 'auto';
  let scene, disposed = false, audioIndex = -1, cueIndex = -1, muted = false, captions = true, failedAudio = false;
  let last = performance.now(), animation = 0, lastDraw = 0, needsDraw = true, loading = false, pendingOffset = 0, audioTail = false;
  try { scene = createFilmScene(root.querySelector('.film-stage'), film); }
  catch { root.querySelector('.film-stage').innerHTML = '<div class="film-no-webgl">La vista 3D necesita WebGL.<br>Puedes escuchar el corto y seguir sus subtítulos.</div>'; }
  function loadAudio(frame) {
    audio.pause(); failedAudio = false; loading = true;
    audioIndex = frame.index;
    pendingOffset = Math.max(0, frame.time - frame.start); audioTail = false;
    audio.src = new URL(`./audio/${film.id}-${frame.index}.mp3`, import.meta.url).href;
    audio.currentTime = pendingOffset;
    status.textContent = 'Cargando narración…';
  }
  function audioPlay() {
    if (failedAudio || disposed || audioTail) return;
    audio.play().then(() => { if (disposed || !clock.playing) audio.pause(); }).catch(error => {
      if (disposed || error.name === 'AbortError') return;
      if (error.name === 'NotAllowedError') { clock.pause(); status.textContent = 'Pulsa Reproducir para activar el sonido.'; update(); }
      else { failedAudio = true; loading = false; status.textContent = 'Audio no disponible. Puedes seguir la animación y los subtítulos.'; }
    });
  }
  audio.addEventListener('loadedmetadata', () => {
    // Some browsers discard a seek issued before the new resource has metadata.
    audioTail = pendingOffset >= audio.duration;
    audio.currentTime = Math.min(pendingOffset, audio.duration);
    if (audioTail) { audio.pause(); loading = false; }
  }, options);
  audio.addEventListener('canplay', () => { loading = false; if (!failedAudio) status.textContent = ''; }, options);
  audio.addEventListener('waiting', () => { loading = true; }, options);
  audio.addEventListener('error', () => { loading = false; failedAudio = true; status.textContent = 'Audio no disponible. Puedes seguir la animación y los subtítulos.'; }, options);
  function update() {
    const frame = filmFrame(film, clock.time);
    if (frame.index !== audioIndex) { loadAudio(frame); if (clock.playing) audioPlay(); }
    if (frame.index !== cueIndex) {
      cueIndex = frame.index; needsDraw = true;
      root.querySelector('.film-cue-title').textContent = frame.cue.title;
      root.querySelector('.film-scene-note').textContent = `SECUENCIA 0${frame.index + 1} · ${frame.index === 3 ? 'LA LECCIÓN' : 'SIGUE LAS CONEXIONES'}`;
      root.querySelector('.film-shot').textContent = `0${frame.index + 1} / 04`;
      subtitle.querySelector('p').textContent = frame.cue.text;
      root.querySelector('.film-stage').setAttribute('aria-label', `${film.title}. ${frame.cue.title}. ${frame.cue.text}`);
    }
    seek.value = String(clock.time);
    seek.style.setProperty('--progress', `${clock.time / filmDuration(film) * 100}%`);
    seek.setAttribute('aria-valuetext', `${stamp(clock.time)} de ${stamp(filmDuration(film))}`);
    toggle.innerHTML = clock.playing ? pauseIcon : playIcon;
    toggle.setAttribute('aria-label', clock.playing ? 'Pausar' : frame.ended ? 'Repetir corto' : 'Reproducir');
    start.hidden = clock.playing || clock.time > 0 && !frame.ended;
    start.querySelector('span').textContent = frame.ended ? 'Volver a verlo' : 'Reproducir corto';
    start.setAttribute('aria-label', frame.ended ? 'Repetir corto' : 'Reproducir corto');
    root.querySelector('.film-time').textContent = `${stamp(clock.time)} / ${stamp(filmDuration(film))}`;
    root.querySelector('.film-live').textContent = frame.ended ? 'CORTO COMPLETADO' : clock.playing ? 'EN REPRODUCCIÓN' : 'EN PAUSA';
    if (!clock.playing) audio.pause();
  }
  function pause() { clock.pause(); audio.pause(); update(); }
  function setTime(seconds) {
    clock.seek(seconds); needsDraw = true;
    const frame = filmFrame(film, clock.time);
    if (audioIndex !== frame.index) loadAudio(frame);
    else if (!failedAudio) {
      pendingOffset = frame.time - frame.start;
      audioTail = Number.isFinite(audio.duration) && pendingOffset >= audio.duration;
      audio.currentTime = Math.min(Number.isFinite(audio.duration) ? audio.duration : Infinity, pendingOffset);
      if (audioTail) { audio.pause(); loading = false; }
    }
    if (clock.playing) audioPlay();
    last = performance.now(); update();
  }
  function playPause() {
    if (clock.playing) pause();
    else { clock.play(); setTime(clock.time); last = performance.now(); update(); }
  }
  root.addEventListener('click', event => {
    const action = event.target.closest('[data-film-action]')?.dataset.filmAction;
    if (!action) return;
    if (action === 'toggle') playPause();
    if (action === 'restart') { clock.pause(); setTime(0); }
    if (action === 'sound') {
      muted = !muted; audio.muted = muted;
      const button = root.querySelector('.film-sound'); button.textContent = `Sonido: ${muted ? 'no' : 'sí'}`;
      button.setAttribute('aria-pressed', String(!muted)); button.setAttribute('aria-label', `Sonido ${muted ? 'desactivado' : 'activado'}`);
    }
    if (action === 'captions') {
      captions = !captions; subtitle.hidden = !captions;
      const button = root.querySelector('.film-captions'); button.setAttribute('aria-pressed', String(captions)); button.setAttribute('aria-label', `Subtítulos ${captions ? 'activados' : 'desactivados'}`);
    }
  }, options);
  seek.addEventListener('input', () => setTime(Number(seek.value)), options);
  root.addEventListener('keydown', event => {
    if (['INPUT', 'BUTTON', 'A', 'SUMMARY'].includes(event.target.tagName)) return;
    if (event.code === 'Space') { event.preventDefault(); playPause(); }
    if (event.code === 'ArrowRight' || event.code === 'ArrowLeft') { event.preventDefault(); setTime(clock.time + (event.code === 'ArrowRight' ? 5 : -5)); }
  }, options);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); }, options);
  window.addEventListener('pagehide', pause, options);
  reduced.addEventListener('change', () => { needsDraw = true; }, options);
  function loop(now) {
    if (disposed) return;
    const dt = Math.min((now - last) / 1000, 0.15); last = now;
    if (clock.playing && (!loading || failedAudio) && !audio.seeking) {
      const frame = filmFrame(film, clock.time);
      // Audio is the master clock while speaking; a short quiet tail joins each sequence.
      if (!failedAudio && !audioTail && !audio.ended && !audio.paused) clock.seek(frame.start + audio.currentTime);
      else clock.advance(dt);
      update();
    }
    if (scene && (needsDraw || clock.playing && !reduced.matches) && now - lastDraw > 32) {
      scene.draw(filmFrame(film, clock.time), reduced.matches); needsDraw = false; lastDraw = now;
    }
    animation = requestAnimationFrame(loop);
  }
  root.tabIndex = -1; root.focus({ preventScroll: true });
  update(); animation = requestAnimationFrame(loop);
  return { pause, dispose() { disposed = true; abort.abort(); cancelAnimationFrame(animation); audio.pause(); audio.removeAttribute('src'); audio.load(); scene?.dispose(); } };
}

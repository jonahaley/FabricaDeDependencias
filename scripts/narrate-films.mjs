// Regeneración opcional: envía únicamente los guiones educativos a Microsoft Edge TTS.
// El juego servido no contacta con ese servicio; reproduce los MP3 incluidos.
import { EdgeTTS } from 'node-edge-tts';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { FILMS } from '../src/films.js';

const folder = new URL('../src/audio/', import.meta.url);
await mkdir(folder, { recursive: true });
let oldHashes = {};
try { oldHashes = JSON.parse(await readFile(new URL('scripts.json', folder), 'utf8')); } catch { /* First generation. */ }
const hashes = {}, timings = {};
// Parse MPEG frames instead of estimating timing from text or file size.
function mp3Duration(data) {
  let offset = data.toString('ascii', 0, 3) === 'ID3' ? 10 + ((data[6] & 127) << 21 | (data[7] & 127) << 14 | (data[8] & 127) << 7 | data[9] & 127) : 0;
  let seconds = 0;
  while (offset + 4 <= data.length) {
    const h = data.readUInt32BE(offset);
    if ((h & 0xffe00000) >>> 0 !== 0xffe00000 || (h >> 17 & 3) !== 1) { offset++; continue; }
    const version = h >> 19 & 3, rateIndex = h >> 10 & 3, bitrateIndex = h >> 12 & 15;
    if (version === 1 || rateIndex === 3 || !bitrateIndex || bitrateIndex === 15) { offset++; continue; }
    const rate = [44100, 48000, 32000][rateIndex] / (version === 3 ? 1 : version === 2 ? 2 : 4);
    const bitrate = (version === 3 ? [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320] : [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160])[bitrateIndex] * 1000;
    const length = Math.floor((version === 3 ? 144 : 72) * bitrate / rate) + (h >> 9 & 1);
    if (offset + length > data.length) break;
    seconds += (version === 3 ? 1152 : 576) / rate;
    offset += length;
  }
  if (seconds < 2) throw new Error('MP3 sin duración válida');
  return Math.ceil((seconds + 0.65) * 100) / 100;
}
for (const film of FILMS) {
  timings[film.id] = [];
  for (const [index, cue] of film.cues.entries()) {
    const name = `${film.id}-${index}.mp3`, target = new URL(name, folder);
    const hash = createHash('sha256').update(cue.text).digest('hex');
    hashes[name] = hash;
    if (oldHashes[name] !== hash || !await stat(target).catch(() => null)) {
      const tts = new EdgeTTS({ voice: 'es-ES-ElviraNeural', lang: 'es-ES', rate: '-4%', outputFormat: 'audio-24khz-48kbitrate-mono-mp3', timeout: 25000 });
      await tts.ttsPromise(cue.text, fileURLToPath(target));
    }
    timings[film.id].push(mp3Duration(await readFile(target)));
  }
  console.log(`${film.id}: ${timings[film.id].reduce((a, b) => a + b, 0).toFixed(1)} s`);
  await writeFile(new URL('scripts.json', folder), JSON.stringify({ ...oldHashes, ...hashes }, null, 2) + '\n');
}
await writeFile(new URL('../src/film-audio.js', import.meta.url), '// Generado por scripts/narrate-films.mjs. Duraciones en segundos, con pausa entre frases.\nexport const FILM_AUDIO = ' + JSON.stringify(timings, null, 2) + ';\n');

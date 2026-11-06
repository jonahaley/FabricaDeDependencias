import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const preview = process.argv.includes('--dist');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', preview ? 'dist' : '.');
const port = Number(process.env.PORT || 3036);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let pathname = decodeURIComponent(url.pathname);
    let base = root;
    if (!preview && pathname.startsWith('/vendor/addons/')) { base = path.join(root, 'node_modules/three/examples/jsm'); pathname = pathname.slice('/vendor/addons'.length); }
    else if (!preview && pathname.startsWith('/vendor/')) { base = path.join(root, 'node_modules/three/build'); pathname = pathname.slice('/vendor'.length); }
    else if (!(pathname === '/' || pathname === '/index.html' || pathname.startsWith('/src/') || preview && pathname.startsWith('/vendor/'))) { res.writeHead(404); res.end('Not found'); return; }
    const target = path.resolve(base, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!target.startsWith(base + path.sep) || !(await stat(target)).isFile()) { res.writeHead(404); res.end('Not found'); return; }
    const data = await readFile(target);
    res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Fábrica de dependencias: http://localhost:${port}`));
server.on('error', err => { console.error(err.message); process.exitCode = 1; });

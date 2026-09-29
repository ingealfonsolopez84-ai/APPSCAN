import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDriver } from './drivers/index.js';
import { LABELS } from './settings.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const DATA = path.join(ROOT, 'data');
const PORT = Number(process.env.PORT) || 8765;
const HOST = process.env.HOST || '0.0.0.0';

// ---------- Configuración ----------
async function loadConfig() {
  for (const file of [process.env.ESTUDIO_CONFIG, path.join(ROOT, 'estudio.config.json')].filter(Boolean)) {
    try {
      return JSON.parse(await fs.readFile(file, 'utf8'));
    } catch (e) {
      if (e.code !== 'ENOENT') throw new Error(`Error en ${file}: ${e.message}`);
    }
  }
  console.log('ℹ️  Sin estudio.config.json: usando cámara simulada + DJI (copia config.example.json para configurar la tuya).');
  return {
    cameras: [
      { id: 'principal', driver: 'mock', name: 'Cámara principal (simulada)' },
      { id: 'osmo', driver: 'dji-osmo', name: 'DJI Osmo Action' },
    ],
  };
}

const config = await loadConfig();
const cameras = new Map();
for (const c of config.cameras) cameras.set(c.id, createDriver(c));
// Conectamos en segundo plano para que el portal abra de inmediato.
for (const d of cameras.values()) {
  d.state.message = 'Conectando…';
  d.connecting = d.connect()
    .catch((e) => { d.state.message = e.message; })
    .finally(() => {
      d.connecting = null;
      console.log(`   • ${d.name} [${d.config.driver}] → ${d.state.message}`);
    });
}

// Refresco periódico del estado de cada cámara (sin solapar llamadas).
for (const d of cameras.values()) {
  let busy = false;
  setInterval(async () => {
    if (busy || d.connecting) return;
    busy = true;
    try {
      if (!d.state.connected && d.config.driver !== 'mock') await d.connect();
      else await d.refresh();
    } catch (e) { d.state.message = e.message; }
    busy = false;
  }, config.refreshMs || 2000);
}

// ---------- Vista previa MJPEG compartida ----------
const pumps = new Map(); // id -> { clients:Set, running }
function addLiveClient(driver, res) {
  let pump = pumps.get(driver.id);
  if (!pump) { pump = { clients: new Set(), running: false }; pumps.set(driver.id, pump); }
  pump.clients.add(res);
  res.on('close', () => pump.clients.delete(res));
  if (pump.running) return;
  pump.running = true;
  const maxFps = driver.config.maxPreviewFps || 15;
  (async () => {
    let last = null;
    while (pump.clients.size) {
      const t0 = Date.now();
      let jpg = null;
      try { jpg = await driver.frame(); } catch { await sleep(1000); }
      if (jpg && jpg !== last && jpg.length > 100) {
        last = jpg;
        const head = `--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${jpg.length}\r\n\r\n`;
        for (const c of pump.clients) { c.write(head); c.write(jpg); c.write('\r\n'); }
      }
      await sleep(Math.max(10, 1000 / maxFps - (Date.now() - t0)));
    }
    pump.running = false;
  })();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Almacenamiento simple (guiones, escenas) ----------
const STORES = new Set(['guiones', 'escenas', 'referencias']);
async function readStore(name) {
  try { return JSON.parse(await fs.readFile(path.join(DATA, `${name}.json`), 'utf8')); } catch { return null; }
}
async function writeStore(name, value) {
  await fs.mkdir(DATA, { recursive: true });
  await fs.writeFile(path.join(DATA, `${name}.json`), JSON.stringify(value, null, 2));
}

// ---------- HTTP ----------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.ico': 'image/x-icon',
};

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readBody(req, limit = 20 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw new Error('Cuerpo demasiado grande');
    chunks.push(c);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function snapshot() {
  const out = {};
  for (const [id, d] of cameras) out[id] = { ...d.state, info: d.publicInfo() };
  return out;
}

async function serveStatic(req, res, pathname) {
  const rel = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
  const file = path.join(PUBLIC, rel);
  if (!file.startsWith(PUBLIC)) return send(res, 403, { error: 'Prohibido' });
  try {
    const data = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    send(res, 404, { error: 'No encontrado' });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean);
  try {
    if (parts[0] !== 'api') return await serveStatic(req, res, url.pathname);

    if (parts[1] === 'cameras' && req.method === 'GET') {
      return send(res, 200, { cameras: [...cameras.values()].map((d) => d.publicInfo()), labels: LABELS });
    }

    if (parts[1] === 'events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      const push = () => res.write(`data: ${JSON.stringify(snapshot())}\n\n`);
      push();
      const t = setInterval(push, 1000);
      req.on('close', () => clearInterval(t));
      return;
    }

    if (parts[1] === 'store' && STORES.has(parts[2])) {
      if (req.method === 'GET') return send(res, 200, { value: await readStore(parts[2]) });
      if (req.method === 'PUT') {
        const { value } = await readBody(req);
        await writeStore(parts[2], value);
        return send(res, 200, { ok: true });
      }
    }

    if (parts[1] === 'camera') {
      const d = cameras.get(parts[2]);
      if (!d) return send(res, 404, { error: 'Cámara no encontrada' });
      const action = parts[3];

      if (action === 'state') return send(res, 200, d.state);

      if (action === 'live') {
        if (d.preview !== 'mjpeg') return send(res, 409, { error: 'Esta cámara usa vista previa del navegador' });
        res.writeHead(200, {
          'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
          'Cache-Control': 'no-store', Pragma: 'no-cache', Connection: 'close',
        });
        return addLiveClient(d, res);
      }

      if (action === 'snapshot') {
        const jpg = await d.frame();
        if (!jpg) return send(res, 404, { error: 'Sin frame disponible' });
        res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' });
        return res.end(jpg);
      }

      if (req.method !== 'POST') return send(res, 405, { error: 'Usa POST' });
      const body = await readBody(req);
      switch (action) {
        case 'connect': await d.connect(); break;
        case 'set': await d.set(body.key, body); break;
        case 'setMany':
          // Aplica varios ajustes en orden (usado por el asistente de iluminación).
          for (const [key, value] of Object.entries(body.values || {})) await d.set(key, { value });
          break;
        case 'record': {
          const start = body.action === 'toggle' ? !d.state.recording : body.action === 'start';
          await d.record(start);
          break;
        }
        case 'zoom': await d.zoom(body.direction, body.action !== 'stop'); break;
        case 'focus': await d.focus(body.action); break;
        default: return send(res, 404, { error: `Acción desconocida: ${action}` });
      }
      return send(res, 200, d.state);
    }

    send(res, 404, { error: 'Ruta no encontrada' });
  } catch (e) {
    send(res, 500, { error: e.message });
  }
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    for (const d of cameras.values()) d.close?.();
    setTimeout(() => process.exit(0), 300);
  });
}

server.listen(PORT, HOST, () => {
  console.log(`🎬 Estudio listo en http://localhost:${PORT}`);
});

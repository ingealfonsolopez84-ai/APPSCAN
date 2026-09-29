import { analyze, compare, plan, ZONES } from './analysis.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const store = {
  get(key, fallback) { try { const v = localStorage.getItem(`estudio.${key}`); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(`estudio.${key}`, JSON.stringify(value)); } catch { /* sin almacenamiento */ } },
};

const SETTING_ORDER = ['iso', 'aperture', 'shutter', 'wb', 'ev'];
const LABELS = { iso: 'ISO', aperture: 'Apertura', shutter: 'Velocidad', wb: 'Balance', ev: 'Compens.' };
const fmt = {
  iso: (v) => v,
  aperture: (v) => (v && v !== '(null)' ? `f${String(v).replace(/^f\/?/, '')}` : '—'),
  shutter: (v) => v,
  wb: (v) => (v ? `${v}K` : '—'),
  ev: (v) => v,
};

const app = {
  cameras: [],
  active: null,
  snapshot: {},
  overlays: new Set(store.get('overlays', [])),
  smooth: store.get('smooth', {}),
  stream: null,
  local: { recorder: null, chunks: [], since: null },
};

// ---------------- Utilidades ----------------
let toastTimer;
function toast(msg, error = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.toggle('error', error);
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3500);
}

async function api(path, body) {
  const res = await fetch(`/api/${path}`, body === undefined ? {} : {
    method: body === null ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
  return json;
}
const camApi = (action, body = {}) => api(`camera/${app.active.id}/${action}`, body).catch((e) => { toast(e.message, true); throw e; });

async function loadStore(name) { try { return (await api(`store/${name}`)).value; } catch { return null; } }
async function saveStore(name, value) {
  await fetch(`/api/store/${name}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value }) });
}

const mmss = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
const camState = () => app.snapshot[app.active?.id] || {};

// ---------------- Cámaras ----------------
async function init() {
  const { cameras } = await api('cameras');
  app.cameras = cameras;
  const tabs = $('#camTabs');
  tabs.innerHTML = '';
  for (const c of cameras) {
    const b = document.createElement('button');
    b.className = 'cam-tab';
    b.dataset.id = c.id;
    b.innerHTML = `<span class="dot"></span><b></b><small></small>`;
    $('b', b).textContent = c.name;
    b.onclick = () => selectCamera(c.id);
    tabs.append(b);
  }
  buildSettings();
  $('#podcastBar').hidden = cameras.length < 2;
  if (cameras.length < 2) app.podcast = false;
  $('#podcastBtn').classList.toggle('on', app.podcast);
  const initial = cameras.find((c) => c.id === store.get('activeCam')) || cameras[0];
  if (initial) selectCamera(initial.id);
  connectEvents();
  initAudio();
  requestAnimationFrame(audioLoop);
}

function connectEvents() {
  const es = new EventSource('/api/events');
  es.onopen = () => $('#conn').classList.add('on');
  es.onerror = () => $('#conn').classList.remove('on');
  es.onmessage = (ev) => {
    app.snapshot = JSON.parse(ev.data);
    render();
  };
}

function selectCamera(id) {
  app.active = app.cameras.find((c) => c.id === id);
  store.set('activeCam', id);
  $$('.cam-tab').forEach((t) => t.classList.toggle('active', t.dataset.id === id));
  const caps = app.active.caps;
  $('#zoomBox').hidden = !caps.zoom;
  $('#btnRec').classList.toggle('wide', !caps.zoom);
  $('#focusBox').hidden = !caps.focus;
  $('#smoothBtn').hidden = app.active.preview !== 'mjpeg';
  $('#smoothBtn').classList.toggle('on', Boolean(app.smooth[id]));
  layoutPreviews();
  fillAudioSources();
  render();
}

const usesWebcam = (cam) => cam.preview === 'webcam' || Boolean(app.smooth[cam.id]);
const visibleCams = () => (app.podcast ? app.cameras : [app.active]);

// ---------------- Vista previa (una por cámara) ----------------
// Cada cámara tiene su propio recuadro. Las webcams (Osmo, capturadora) quedan
// abiertas aunque cambies de pestaña, para que una grabación en curso no se corte.
app.tiles = {};
app.streams = {};
app.podcast = store.get('podcast', false);

function tileFor(cam) {
  if (app.tiles[cam.id]) return app.tiles[cam.id];
  const el = document.createElement('div');
  el.className = 'preview';
  el.innerHTML = `<img alt="" hidden><video autoplay muted playsinline hidden></video><canvas></canvas>
    <div class="preview-empty">Sin vista previa</div><span class="fps"></span><span class="tile-label"></span><div class="vu" hidden><i></i></div>`;
  el.onclick = () => { if (app.podcast && app.active.id !== cam.id) selectCamera(cam.id); };
  const t = { vu: $('.vu', el), vuBar: $('.vu i', el), el, img: $('img', el), video: $('video', el), canvas: $('canvas', el), empty: $('.preview-empty', el), fps: $('.fps', el), label: $('.tile-label', el), mode: null };
  app.tiles[cam.id] = t;
  $('#previews').append(el);
  return t;
}

function layoutPreviews() {
  const shown = new Set(visibleCams().map((c) => c.id));
  $('#previews').classList.toggle('multi', shown.size > 1);
  for (const cam of app.cameras) {
    const t = tileFor(cam);
    const visible = shown.has(cam.id);
    t.el.hidden = !visible;
    t.el.classList.toggle('selected', cam.id === app.active.id);
    t.label.textContent = shown.size > 1 ? cam.name : '';
    const mode = usesWebcam(cam) ? 'webcam' : 'mjpeg';
    if (mode === 'mjpeg') {
      stopWebcam(cam.id);
      // El MJPEG solo se pide mientras se ve (comparte el USB con los ajustes).
      if (visible && t.mode !== 'mjpeg') startMjpeg(cam, t);
      if (!visible && t.mode === 'mjpeg') { t.img.removeAttribute('src'); t.img.hidden = true; t.mode = null; }
    } else if (visible && !app.streams[cam.id]) {
      startWebcam(cam, t);
    }
  }
  $('#sourceBox').hidden = !usesWebcam(app.active);
  fillSources();
  drawOverlay();
}

function startMjpeg(cam, t) {
  t.mode = 'mjpeg';
  t.video.hidden = true;
  t.empty.textContent = 'Conectando vista previa…';
  t.img.onload = () => { t.empty.textContent = ''; };
  t.img.onerror = () => { t.empty.textContent = 'Sin vista previa de la cámara'; };
  t.img.src = `/api/camera/${cam.id}/live?t=${Date.now()}`;
  t.img.hidden = false;
  t.fps.textContent = cam.driver === 'sony-wifi' ? 'Wi-Fi' : 'USB';
}

function stopWebcam(id) {
  if (app.recs[id]) return; // nunca cortar una grabación
  app.streams[id]?.getTracks().forEach((tr) => tr.stop());
  delete app.streams[id];
}

async function startWebcam(cam, t) {
  t.mode = 'webcam';
  t.img.hidden = true;
  t.img.removeAttribute('src');
  if (!navigator.mediaDevices?.getUserMedia) {
    t.empty.textContent = 'El navegador no permite cámaras aquí (usa http://localhost).';
    return;
  }
  let deviceId = store.get(`source.${cam.id}`, null);
  const constraints = (id) => ({ video: { ...(id ? { deviceId: { exact: id } } : {}), width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } }, audio: false });
  try {
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia(constraints(deviceId)); } catch { stream = await navigator.mediaDevices.getUserMedia(constraints(null)); deviceId = null; }
    // Primera vez con la Osmo: la busca por nombre.
    if (!deviceId && cam.driver === 'dji-osmo') {
      const devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
      const osmo = devices.find((d) => /osmo|dji/i.test(d.label));
      if (osmo) {
        stream.getTracks().forEach((tr) => tr.stop());
        stream = await navigator.mediaDevices.getUserMedia(constraints(osmo.deviceId));
        store.set(`source.${cam.id}`, osmo.deviceId);
      } else {
        toast(`${cam.name}: no la encuentro. Ponla en modo "Cámara web" y elígela en "Fuente de video".`, true);
      }
    }
    app.streams[cam.id] = stream;
    t.video.srcObject = stream;
    t.video.hidden = false;
    if (t.empty.textContent.startsWith('Sin') || t.empty.textContent.startsWith('Conect')) t.empty.textContent = '';
    const s = stream.getVideoTracks()[0].getSettings();
    t.fps.textContent = `${s.width || ''}×${s.height || ''} · ${Math.round(s.frameRate || 0)} fps`;
    fillSources();
  } catch (e) {
    t.empty.textContent = `No pude abrir la webcam/capturadora: ${e.message}`;
  }
}

async function fillSources() {
  if (!usesWebcam(app.active) || !navigator.mediaDevices?.enumerateDevices) return;
  const devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
  const current = app.streams[app.active.id]?.getVideoTracks()[0]?.getSettings().deviceId;
  const sel = $('#sourceSelect');
  sel.innerHTML = '';
  for (const d of devices) {
    const o = new Option(d.label || `Cámara ${sel.length + 1}`, d.deviceId);
    o.selected = d.deviceId === current;
    sel.append(o);
  }
}

function restartPreview(cam) {
  if (app.recs[cam.id]) return toast('No se puede cambiar la fuente mientras graba', true);
  stopWebcam(cam.id);
  const t = tileFor(cam);
  t.mode = null;
  layoutPreviews();
}

$('#sourceSelect').onchange = (e) => {
  store.set(`source.${app.active.id}`, e.target.value);
  restartPreview(app.active);
};
$('#smoothBtn').onclick = () => {
  app.smooth[app.active.id] = !app.smooth[app.active.id];
  store.set('smooth', app.smooth);
  $('#smoothBtn').classList.toggle('on', app.smooth[app.active.id]);
  restartPreview(app.active);
};
$('#podcastBtn').onclick = () => {
  app.podcast = !app.podcast;
  store.set('podcast', app.podcast);
  $('#podcastBtn').classList.toggle('on', app.podcast);
  layoutPreviews();
  render();
};
app.clap = store.get('clap', true);
$('#clapBtn').classList.toggle('on', app.clap);
$('#clapBtn').onclick = () => {
  app.clap = !app.clap;
  store.set('clap', app.clap);
  $('#clapBtn').classList.toggle('on', app.clap);
};

// Superposiciones: cuadrícula, guías y recorte vertical.
function drawOverlay() {
  for (const t of Object.values(app.tiles)) if (!t.el.hidden) drawOverlayOn(t.canvas);
}

function drawOverlayOn(c) {
  const r = c.getBoundingClientRect();
  c.width = r.width * devicePixelRatio; c.height = r.height * devicePixelRatio;
  const g = c.getContext('2d');
  g.scale(devicePixelRatio, devicePixelRatio);
  const w = r.width; const h = r.height;
  g.lineWidth = 1;
  if (app.overlays.has('grid')) {
    g.strokeStyle = 'rgba(255,255,255,.45)';
    g.beginPath();
    for (const f of [1 / 3, 2 / 3]) { g.moveTo(w * f, 0); g.lineTo(w * f, h); g.moveTo(0, h * f); g.lineTo(w, h * f); }
    g.stroke();
  }
  if (app.overlays.has('guides')) {
    g.strokeStyle = 'rgba(245,197,24,.8)';
    g.strokeRect(w * 0.05, h * 0.05, w * 0.9, h * 0.9);
    g.beginPath(); g.moveTo(w / 2 - 12, h / 2); g.lineTo(w / 2 + 12, h / 2); g.moveTo(w / 2, h / 2 - 12); g.lineTo(w / 2, h / 2 + 12); g.stroke();
    g.setLineDash([4, 4]); g.strokeStyle = 'rgba(255,255,255,.5)';
    g.beginPath(); g.moveTo(0, h * 0.33); g.lineTo(w, h * 0.33); g.stroke(); // línea de ojos
    g.setLineDash([]);
  }
  if (app.overlays.has('vertical')) {
    const vw = h * 9 / 16;
    g.fillStyle = 'rgba(0,0,0,.5)';
    g.fillRect(0, 0, (w - vw) / 2, h); g.fillRect((w + vw) / 2, 0, (w - vw) / 2, h);
    g.strokeStyle = 'rgba(245,197,24,.9)'; g.strokeRect((w - vw) / 2, 0, vw, h);
  }
}
$$('[data-overlay]').forEach((b) => {
  b.classList.toggle('on', app.overlays.has(b.dataset.overlay));
  b.onclick = () => {
    const k = b.dataset.overlay;
    app.overlays.has(k) ? app.overlays.delete(k) : app.overlays.add(k);
    b.classList.toggle('on', app.overlays.has(k));
    store.set('overlays', [...app.overlays]);
    drawOverlay();
  };
});
addEventListener('resize', drawOverlay);

// ---------------- Ajustes ----------------
function buildSettings() {
  const root = $('#settings');
  root.innerHTML = '';
  for (const key of SETTING_ORDER) {
    const el = document.createElement('div');
    el.className = 'setting';
    el.dataset.key = key;
    el.innerHTML = `<span class="name">${LABELS[key]}</span><span class="value">—</span>
      <div class="row tight"><button class="btn" data-step="-1">◀</button><button class="btn" data-step="1">▶</button></div>`;
    $$('[data-step]', el).forEach((b) => {
      b.onclick = async () => {
        const st = await camApi('set', { key, step: Number(b.dataset.step) });
        app.snapshot[app.active.id] = { ...camState(), ...st };
        render();
      };
    });
    root.append(el);
  }
}

// ---------------- Grabación ----------------
app.recs = {}; // grabaciones en el navegador: id de cámara -> { recorder, since, file }
app.lastFiles = {};

const isRecording = (cam) => (cam.caps.record === 'browser' ? Boolean(app.recs[cam.id]) : Boolean(app.snapshot[cam.id]?.recording));
const recordingSince = (cam) => (cam.caps.record === 'browser' ? app.recs[cam.id]?.since : app.snapshot[cam.id]?.recordingSince);

async function setRecording(cam, start, session) {
  if (isRecording(cam) === start) return;
  if (cam.caps.record === 'browser') return start ? startLocalRecord(cam, session) : stopLocalRecord(cam);
  if (!cam.caps.record) throw new Error(`${cam.name}: no permite grabar en remoto`);
  const st = await api(`camera/${cam.id}/record`, { action: start ? 'start' : 'stop' });
  app.snapshot[cam.id] = { ...app.snapshot[cam.id], ...st };
}

async function toggleRecord() {
  const cams = app.podcast ? app.cameras.filter((c) => c.caps.record) : [app.active];
  const start = !cams.some(isRecording);
  const session = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
  const results = await Promise.allSettled(cams.map((c) => setRecording(c, start, session)));
  const failed = results.map((r, i) => (r.status === 'rejected' ? `${cams[i].name}: ${r.reason.message}` : null)).filter(Boolean);
  if (failed.length) toast(failed.join(' · '), true);
  if (start && app.podcast && app.clap && failed.length < cams.length) setTimeout(clap, 1500);
  render();
}

// Claqueta: pitido + destello para alinear los videos al editar.
function clap() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 1000;
    gain.gain.value = 0.6;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    setTimeout(() => ctx.close(), 500);
  } catch { /* sin audio */ }
  const f = $('#flash');
  f.classList.add('on');
  setTimeout(() => f.classList.remove('on'), 150);
}

// Grabación en el navegador (Osmo en modo webcam o capturadora): se va
// guardando en el servidor por trozos, en la carpeta grabaciones/.
async function startLocalRecord(cam, session) {
  const stream = app.streams[cam.id];
  if (!stream) throw new Error(`${cam.name}: primero abre su vista previa`);
  // Cada cámara graba con su propia fuente de audio (la que elegiste en "Audio").
  const audio = app.audio[cam.id]?.stream;
  if (!audio) toast(`${cam.name}: grabando sin audio (elige una fuente en "Audio")`);
  const tracks = [...stream.getVideoTracks(), ...(audio ? audio.getAudioTracks() : [])];
  const type = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t));
  const ext = type.includes('mp4') ? 'mp4' : 'webm';
  const { id, file } = await api('recordings/start', { camera: cam.id, ext, session });
  const rec = new MediaRecorder(new MediaStream(tracks), { mimeType: type, videoBitsPerSecond: 12e6 });
  const entry = { recorder: rec, since: Date.now(), file, uploads: Promise.resolve(), failed: false };
  rec.ondataavailable = (e) => {
    if (!e.data.size) return;
    entry.uploads = entry.uploads.then(() => fetch(`/api/recordings/${id}/chunk`, { method: 'POST', body: e.data }))
      .then((r) => { if (!r.ok) throw new Error(r.status); })
      .catch(() => { if (!entry.failed) toast(`${cam.name}: se perdió un trozo de la grabación`, true); entry.failed = true; });
  };
  entry.done = new Promise((resolve) => {
    rec.onstop = async () => {
      await entry.uploads;
      const r = await api(`recordings/${id}/stop`, {}).catch(() => null);
      if (r) {
        app.lastFiles[cam.id] = [`${r.file} (${(r.size / 1e6).toFixed(0)} MB)`, ...(app.lastFiles[cam.id] || [])].slice(0, 5);
        toast(`${cam.name}: guardado en ${r.file}`);
      }
      delete app.recs[cam.id];
      render();
      resolve();
    };
  });
  rec.start(2000);
  app.recs[cam.id] = entry;
}

async function stopLocalRecord(cam) {
  const entry = app.recs[cam.id];
  if (!entry) return;
  entry.recorder.stop();
  await entry.done;
}

// Evita cerrar la pestaña con una grabación del navegador en curso.
addEventListener('beforeunload', (e) => { if (Object.keys(app.recs).length) { e.preventDefault(); e.returnValue = ''; } });

$('#btnRec').onclick = toggleRecord;

// Zoom: mientras se mantiene presionado.
$$('[data-zoom]').forEach((b) => {
  const start = (e) => { e.preventDefault(); camApi('zoom', { direction: b.dataset.zoom, action: 'start' }).catch(() => {}); };
  const stop = () => camApi('zoom', { direction: b.dataset.zoom, action: 'stop' }).catch(() => {});
  b.addEventListener('pointerdown', start);
  b.addEventListener('pointerup', stop);
  b.addEventListener('pointerleave', stop);
  b.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.repeat) start(e); });
  b.addEventListener('keyup', (e) => { if (e.key === 'Enter') stop(); });
});
$$('[data-focus]').forEach((b) => { b.onclick = () => camApi('focus', { action: b.dataset.focus }).catch(() => {}); });
$('#reconnectBtn').onclick = async () => { await camApi('connect'); restartPreview(app.active); toast('Reconectado'); };

// ---------------- Audio por cámara ----------------
// Cada cámara tiene una fuente de audio (entrada de la Mac) con su medidor:
//  - Sony: el audio llega por la capturadora HDMI (incluye el micrófono conectado a la cámara).
//  - Osmo en modo cámara web: suele aparecer como micrófono propio.
//  - O cualquier micrófono USB / receptor inalámbrico conectado a la Mac.
app.audio = {}; // id de cámara -> { stream, analyser, buf, level, peak, peakAt, deviceId }
let audioCtx = null;
const AUTO_AUDIO = {
  'dji-osmo': /osmo|dji/i,
  default: /cam ?link|usb video|capture|hdmi|elgato|ugreen|av to usb|usb3/i,
};

async function audioInputs() {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  return (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'audioinput' && d.deviceId !== 'communications');
}

// Elige una fuente automáticamente la primera vez (por el nombre del dispositivo).
async function defaultAudioFor(cam) {
  const saved = store.get(`audio.${cam.id}`, null);
  if (saved) return saved;
  const inputs = await audioInputs();
  const match = inputs.find((d) => (AUTO_AUDIO[cam.driver] || AUTO_AUDIO.default).test(d.label));
  return match ? match.deviceId : 'none';
}

async function setupAudio(cam) {
  const current = app.audio[cam.id];
  const deviceId = await defaultAudioFor(cam);
  if (current && current.deviceId === deviceId) return;
  if (app.recs[cam.id]) return; // no cambiar el audio a media grabación
  current?.stream.getTracks().forEach((t) => t.stop());
  delete app.audio[cam.id];
  if (deviceId === 'none' || !navigator.mediaDevices?.getUserMedia) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: deviceId === 'default' ? undefined : { exact: deviceId }, echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: { ideal: 2 } },
    });
    audioCtx ||= new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    const monitor = audioCtx.createGain();
    monitor.gain.value = 0;
    source.connect(monitor).connect(audioCtx.destination);
    app.audio[cam.id] = { stream, analyser, monitor, buf: new Float32Array(analyser.fftSize), level: -90, peak: -90, peakAt: 0, deviceId };
  } catch (e) {
    toast(`${cam.name}: no pude abrir el audio (${e.message})`, true);
  }
}

async function fillAudioSources() {
  const cam = app.active;
  if (!cam) return;
  $('#audioCamName').textContent = cam.name;
  applyMonitor();
  const inputs = await audioInputs();
  const chosen = await defaultAudioFor(cam);
  const sel = $('#audioSelect');
  sel.innerHTML = '';
  sel.append(new Option('Sin audio', 'none'));
  for (const d of inputs) sel.append(new Option(d.label || `Entrada ${sel.length}`, d.deviceId));
  sel.value = inputs.some((d) => d.deviceId === chosen) ? chosen : 'none';
  const hint = $('#audioHint');
  if (!inputs.some((d) => d.label)) hint.textContent = 'Permite el micrófono en el navegador para ver las entradas de audio.';
  else if (cam.driver === 'dji-osmo') hint.textContent = 'Con la Osmo en modo cámara web, elige su entrada ("Osmo…") para grabar su audio por separado.';
  else if (cam.caps.record !== 'browser') hint.textContent = 'La Sony graba su audio en la tarjeta. Para verlo aquí: su salida de audífonos → adaptador de audio USB, o su HDMI → capturadora; luego elige esa entrada.';
  else hint.textContent = '';
}

// Escuchar una fuente por la salida de la Mac (usa audífonos para evitar acople).
app.monitorId = null;
function applyMonitor() {
  for (const [id, a] of Object.entries(app.audio)) a.monitor.gain.value = id === app.monitorId ? 1 : 0;
  $('#monitorBtn').classList.toggle('on', app.monitorId === app.active?.id && Boolean(app.audio[app.active.id]));
}
$('#monitorBtn').onclick = () => {
  if (!app.audio[app.active.id]) return toast('Primero elige una fuente de audio', true);
  if (audioCtx?.state === 'suspended') audioCtx.resume();
  app.monitorId = app.monitorId === app.active.id ? null : app.active.id;
  applyMonitor();
  if (app.monitorId) toast('Escuchando por la salida de la Mac: usa audífonos para evitar acople');
};

$('#audioSelect').onchange = async (e) => {
  if (app.recs[app.active.id]) { toast('No se puede cambiar el audio mientras graba', true); fillAudioSources(); return; }
  store.set(`audio.${app.active.id}`, e.target.value);
  await setupAudio(app.active);
  applyMonitor();
};

// Pide permiso de micrófono una vez para poder leer los nombres de las entradas.
async function initAudio() {
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    s.getTracks().forEach((t) => t.stop());
  } catch { /* sin permiso: se muestra el aviso en la caja de audio */ }
  for (const cam of app.cameras) await setupAudio(cam);
  fillAudioSources();
}
navigator.mediaDevices?.addEventListener?.('devicechange', () => fillAudioSources());
// Chrome deja el audio en pausa hasta la primera interacción.
addEventListener('pointerdown', () => { if (audioCtx?.state === 'suspended') audioCtx.resume(); }, { capture: true });

// Medidor: pico en dBFS con caída suave y retención del pico.
function toDb(x) { return x > 0 ? 20 * Math.log10(x) : -90; }
const dbToPct = (db) => Math.max(0, Math.min(100, ((db + 60) / 60) * 100)); // -60..0 dBFS
const levelClass = (db) => (db > -3 ? 'clip' : db > -12 ? 'warn' : '');

function audioLoop() {
  const now = performance.now();
  for (const cam of app.cameras) {
    const a = app.audio[cam.id];
    const t = app.tiles?.[cam.id];
    if (t) t.vu.hidden = !a;
    if (!a) continue;
    a.analyser.getFloatTimeDomainData(a.buf);
    let peak = 0;
    for (let i = 0; i < a.buf.length; i++) { const v = Math.abs(a.buf[i]); if (v > peak) peak = v; }
    const db = toDb(peak);
    a.level = Math.max(db, a.level - 1.2); // caída ~70 dB/s
    if (db > a.peak || now - a.peakAt > 1500) { a.peak = db; a.peakAt = now; }
    if (t) {
      t.vuBar.style.height = `${dbToPct(a.level)}%`;
      t.vuBar.className = levelClass(a.level);
    }
  }
  const a = app.audio[app.active?.id];
  const bar = $('#audioBar');
  bar.style.width = `${a ? dbToPct(a.level) : 0}%`;
  bar.className = a ? levelClass(a.level) : '';
  $('#audioDb').textContent = a ? `${a.peak <= -89 ? '−∞' : Math.round(a.peak)} dB` : '—';
  requestAnimationFrame(audioLoop);
}

// ---------------- Escenas (ajustes guardados) ----------------
const DEFAULT_SCENES = [
  { name: 'Natural', values: { wb: '5600', ev: '0' } },
  { name: 'Podcast cálido', values: { wb: '6200', ev: '0' } },
  { name: 'Frío / tech', values: { wb: '4600', ev: '0' } },
  { name: 'Cine 24p', values: { shutter: '1/50' } },
];
let scenes = DEFAULT_SCENES;
function renderScenes() {
  const root = $('#scenes');
  root.innerHTML = '';
  for (const sc of scenes) {
    const b = document.createElement('button');
    b.className = 'btn small';
    b.textContent = sc.name;
    b.title = Object.entries(sc.values).map(([k, v]) => `${LABELS[k]}: ${v}`).join(' · ');
    b.onclick = async () => { await camApi('setMany', { values: sc.values }); toast(`Escena “${sc.name}” aplicada`); };
    root.append(b);
  }
  const save = document.createElement('button');
  save.className = 'btn small';
  save.textContent = '+ Guardar escena';
  save.onclick = async () => {
    const name = prompt('Nombre de la escena');
    if (!name) return;
    const values = {};
    for (const [k, s] of Object.entries(camState().settings || {})) if (s?.value != null) values[k] = s.value;
    scenes = [...scenes.filter((s) => s.name !== name), { name, values }];
    await saveStore('escenas', scenes);
    renderScenes();
  };
  root.append(save);
}

// ---------------- Render del estado ----------------
function render() {
  if (!app.active) return;
  const st = camState();
  const caps = app.active.caps;

  for (const t of $$('.cam-tab')) {
    const s = app.snapshot[t.dataset.id] || {};
    const dot = $('.dot', t);
    const cam = app.cameras.find((c) => c.id === t.dataset.id);
    dot.className = `dot ${cam && isRecording(cam) ? 'rec' : s.connected ? 'on' : ''}`;
    $('small', t).textContent = s.message || '';
  }

  // Ajustes
  for (const el of $$('.setting')) {
    const key = el.dataset.key;
    const s = st.settings?.[key];
    const enabled = Boolean(s) && caps.settings.includes(key) && !s.readonly;
    el.classList.toggle('disabled', !enabled);
    $('.value', el).textContent = s ? fmt[key](s.value) : '—';
    $$('button', el).forEach((b) => { b.disabled = !enabled; });
  }

  // Grabación (en modo podcast, cualquier cámara grabando cuenta)
  const recCams = app.podcast ? app.cameras : [app.active];
  const recording = recCams.some(isRecording);
  const starts = recCams.filter(isRecording).map(recordingSince).filter(Boolean);
  const since = starts.length ? Math.min(...starts) : null;
  $('#btnRec').classList.toggle('recording', recording);
  $('#recLabel').textContent = recording ? 'DETENER' : app.podcast ? 'GRABAR TODAS' : 'GRABAR';
  $('#recBadge').hidden = !recording;
  $('#recTime').textContent = since ? mmss((Date.now() - since) / 1000) : '0:00';
  for (const cam of app.cameras) {
    const t = app.tiles[cam.id];
    if (t) t.label.innerHTML = app.podcast ? `${escapeHtml(cam.name)}${isRecording(cam) ? '<span class="rec">● REC</span>' : ''}` : '';
  }
  $('#zoomPos').textContent = st.zoom || '—';

  // Panel de estado
  $('#stModel').textContent = st.model || app.active.name;
  $('#stLens').textContent = st.lens || '';
  const stateEl = $('#stState');
  const activeRec = isRecording(app.active);
  stateEl.textContent = !st.connected ? 'Sin conexión' : activeRec ? 'Grabando' : 'Lista';
  stateEl.classList.toggle('rec', activeRec);
  $('#stMsg').textContent = st.message || '';

  const sto = st.storage;
  let minutes = sto?.recordableMinutes ?? null;
  if (minutes == null && sto?.freeBytes) minutes = Math.floor(sto.freeBytes / ((sto.bitrateMbps || 100) * 1e6 / 8) / 60);
  $('#stTime').textContent = minutes != null ? `${minutes} min` : '—';
  const usedPct = sto?.totalBytes ? (sto.freeBytes / sto.totalBytes) * 100 : 0;
  $('#stTimeBar').style.width = `${usedPct}%`;
  $('#stTimeBar').classList.toggle('low', minutes != null && minutes < 10);
  $('#stStorage').textContent = sto?.totalBytes
    ? `${(sto.freeBytes / 1e9).toFixed(1)} GB libres de ${(sto.totalBytes / 1e9).toFixed(1)} GB` : '';
  $('#stBattery').textContent = st.battery != null ? `${Math.round(st.battery)}%` : '—';
  $('#stBatteryBar').style.width = `${st.battery || 0}%`;
  $('#stBatteryBar').classList.toggle('low', st.battery != null && st.battery < 20);
  $('#stTemp').textContent = st.temperature || '—';
  $('#stZoom').textContent = st.zoom ? `Zoom: ${st.zoom}` : '';
  const s = st.settings || {};
  $('#stExposure').textContent = s.iso
    ? [s.shutter?.value, fmt.aperture(s.aperture?.value), `ISO ${s.iso?.value}`, fmt.wb(s.wb?.value)].filter(Boolean).join(' · ')
    : caps.record === 'browser' ? 'Ajustes fijados en la propia cámara' : '—';
  const clips = $('#stClips');
  clips.innerHTML = '';
  const clipList = caps.record === 'browser' ? app.lastFiles[app.active.id] : st.lastClips;
  for (const c of clipList?.length ? clipList : ['Sin clips']) clips.append(Object.assign(document.createElement('li'), { textContent: c }));
}
setInterval(() => app.active && render(), 1000);

// ---------------- Teleprompter ----------------
const SAMPLE = {
  id: 'ejemplo',
  title: 'Ejemplo · Bienvenida',
  body: `## INTRO
Hola, bienvenidos a una nueva clase.
Hoy vamos a ver cómo controlar una cámara desde el navegador.

## EL MAPA
Primero conectamos la cámara por USB.
Después ajustamos ISO, apertura y velocidad desde esta pantalla.

## CIERRE
Si te sirvió, compártelo con alguien que esté armando su estudio.`,
};
const tp = {
  scripts: [],
  current: null,
  playing: false,
  ppm: store.get('tp.ppm', 150),
  size: store.get('tp.size', 34),
  mirror: store.get('tp.mirror', false),
  pos: 0,
  words: 0,
};

function escapeHtml(s) { return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function loadScript(script) {
  tp.current = script;
  store.set('tp.current', script.id);
  $('#tpText').innerHTML = escapeHtml(script.body)
    .split('\n')
    .map((l) => (l.startsWith('## ') ? `<span class="section">${l.slice(3)}</span>` : l))
    .join('\n');
  tp.words = script.body.replace(/^## .*$/gm, '').split(/\s+/).filter(Boolean).length;
  $('#tpTitle').textContent = script.title;
  $('#tpMiniTitle').textContent = `Teleprompter · ${script.title}`;
  tpTop();
}

function tpApplyStyle() {
  $('#tpText').style.setProperty('--tp-size', `${tp.size}px`);
  $('#prompter').classList.toggle('mirror', tp.mirror);
  $('#tpMirrorBtn').classList.toggle('on', tp.mirror);
  $$('.ppmVal').forEach((e) => { e.textContent = tp.ppm; });
}

function pxPerWord() {
  const el = $('#tpText');
  const cs = getComputedStyle(el);
  const h = el.offsetHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  return tp.words ? h / tp.words : 0;
}

function tpTop() { tp.pos = 0; $('#tpScroll').scrollTop = 0; }
function tpSetPlaying(p) {
  tp.playing = p;
  $('#tpPlay').textContent = p ? '❚❚' : '▶';
  $('#tpPlayMini').textContent = p ? '❚❚' : '▶ Texto';
}
function tpSpeed(delta) {
  tp.ppm = Math.min(400, Math.max(40, tp.ppm + delta));
  store.set('tp.ppm', tp.ppm);
  tpApplyStyle();
}

let lastT = performance.now();
function tpLoop(t) {
  const dt = (t - lastT) / 1000;
  lastT = t;
  const sc = $('#tpScroll');
  const ppw = pxPerWord();
  if (tp.playing && ppw) {
    tp.pos += (tp.ppm / 60) * ppw * dt;
    sc.scrollTop = tp.pos;
    if (sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2) tpSetPlaying(false);
  } else {
    tp.pos = sc.scrollTop; // permite desplazar con la rueda o el dedo
  }
  if (ppw && tp.words) {
    const read = Math.min(tp.words, Math.max(0, tp.pos / ppw));
    $('#tpProgress').textContent = `${mmss((read / tp.ppm) * 60)} de ${mmss((tp.words / tp.ppm) * 60)} · ${tp.words} palabras`;
  }
  requestAnimationFrame(tpLoop);
}

async function tpInit() {
  tp.scripts = (await loadStore('guiones')) || store.get('guiones', null) || [SAMPLE];
  const saved = await loadStore('escenas');
  if (Array.isArray(saved) && saved.length) scenes = saved;
  renderScenes();
  loadScript(tp.scripts.find((s) => s.id === store.get('tp.current')) || tp.scripts[0]);
  tpApplyStyle();
  requestAnimationFrame(tpLoop);
}

async function persistScripts() {
  store.set('guiones', tp.scripts);
  await saveStore('guiones', tp.scripts).catch(() => {});
}

function openList() {
  const ul = $('#scriptList');
  ul.innerHTML = '';
  for (const s of tp.scripts) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.className = 'btn';
    b.type = 'button';
    b.textContent = `${s.id === tp.current?.id ? '▶ ' : ''}${s.title}`;
    b.onclick = () => { loadScript(s); $('#scriptsDlg').close(); };
    const e = document.createElement('button');
    e.className = 'btn small'; e.type = 'button'; e.textContent = '✎';
    e.onclick = () => { $('#scriptsDlg').close(); openEditor(s); };
    li.append(b, e);
    ul.append(li);
  }
  $('#scriptsDlg').showModal();
}

function openEditor(script) {
  const dlg = $('#editDlg');
  $('#editTitle').value = script?.title || '';
  $('#editBody').value = script?.body || '';
  dlg.onclose = async () => {
    if (dlg.returnValue === 'save') {
      const data = { id: script?.id || `g${Date.now()}`, title: $('#editTitle').value.trim() || 'Sin título', body: $('#editBody').value };
      const i = tp.scripts.findIndex((s) => s.id === data.id);
      if (i >= 0) tp.scripts[i] = data; else tp.scripts.push(data);
      await persistScripts();
      loadScript(data);
    } else if (dlg.returnValue === 'delete' && script && confirm(`¿Eliminar “${script.title}”?`)) {
      tp.scripts = tp.scripts.filter((s) => s.id !== script.id);
      if (!tp.scripts.length) tp.scripts = [SAMPLE];
      await persistScripts();
      loadScript(tp.scripts[0]);
    }
  };
  dlg.showModal();
}

$('#scriptsDlg').addEventListener('close', () => { if ($('#scriptsDlg').returnValue === 'new') openEditor(null); });
$('#tpListBtn').onclick = openList;
$('#tpBack').onclick = openList;
$('#tpEdit').onclick = () => openEditor(tp.current);
$('#tpTopBtn').onclick = tpTop;
$('#tpTop2').onclick = tpTop;
$('#tpPlay').onclick = () => tpSetPlaying(!tp.playing);
$('#tpPlayMini').onclick = () => tpSetPlaying(!tp.playing);
$$('[data-ppm]').forEach((b) => { b.onclick = () => tpSpeed(Number(b.dataset.ppm)); });
$('#tpFontUp').onclick = () => { tp.size = Math.min(90, tp.size + 2); store.set('tp.size', tp.size); tpApplyStyle(); };
$('#tpFontDown').onclick = () => { tp.size = Math.max(18, tp.size - 2); store.set('tp.size', tp.size); tpApplyStyle(); };
$('#tpMirrorBtn').onclick = () => { tp.mirror = !tp.mirror; store.set('tp.mirror', tp.mirror); tpApplyStyle(); };

// ---------------- Asistente de iluminación ----------------
const ANALYSIS_W = 320; const ANALYSIS_H = 180;
const light = { ref: null, refData: null, lastPlan: null, busy: false };

function toImageData(source) {
  const c = document.createElement('canvas');
  c.width = ANALYSIS_W; c.height = ANALYSIS_H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(source, 0, 0, ANALYSIS_W, ANALYSIS_H);
  return g.getImageData(0, 0, ANALYSIS_W, ANALYSIS_H);
}

function grabLive() {
  const t = app.tiles[app.active.id];
  if (t && !t.video.hidden && t.video.videoWidth) return toImageData(t.video);
  if (t && !t.img.hidden && t.img.naturalWidth) return toImageData(t.img);
  throw new Error('No hay vista previa de la cámara seleccionada para medir');
}

function drawZones(canvas, imageData) {
  canvas.width = ANALYSIS_W; canvas.height = ANALYSIS_H;
  const g = canvas.getContext('2d');
  if (imageData) g.putImageData(imageData, 0, 0);
  const colors = { left: '#f5c518', right: '#3ddc97', bgLeft: '#6ea8fe', bgRight: '#6ea8fe' };
  for (const [k, color] of Object.entries(colors)) {
    const [x0, y0, x1, y1] = ZONES[k];
    g.strokeStyle = color; g.lineWidth = 2;
    g.strokeRect(x0 * ANALYSIS_W, y0 * ANALYSIS_H, (x1 - x0) * ANALYSIS_W, (y1 - y0) * ANALYSIS_H);
  }
}

async function setReference(src, persist = true) {
  const img = $('#refImg');
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src; });
  light.refData = toImageData(img);
  light.ref = analyze(light.refData);
  drawZones($('#refZones'), null);
  if (persist) {
    // Guardamos una versión reducida para que la referencia sobreviva recargas.
    const c = document.createElement('canvas'); c.width = 640; c.height = 360;
    c.getContext('2d').drawImage(img, 0, 0, 640, 360);
    await saveStore('referencias', { image: c.toDataURL('image/jpeg', 0.85) }).catch(() => {});
  }
}

$('#refFile').onchange = (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => setReference(r.result).then(() => toast('Referencia cargada'));
  r.readAsDataURL(f);
};
$('#refFromLive').onclick = () => {
  try {
    const data = grabLive();
    const c = document.createElement('canvas'); c.width = ANALYSIS_W; c.height = ANALYSIS_H;
    c.getContext('2d').putImageData(data, 0, 0);
    setReference(c.toDataURL('image/jpeg', 0.9)).then(() => toast('Toma actual guardada como referencia'));
  } catch (e) { toast(e.message, true); }
};

function lightOptions() {
  const num = (id) => { const v = Number($(id).value); return v > 0 ? v : null; };
  const opts = {
    fps: num('#optFps') || 30,
    maxIso: num('#optMaxIso') || 3200,
    allowAperture: $('#optAperture').checked,
    distances: { key: num('#dKey'), fill: num('#dFill'), bg: num('#dBg') },
  };
  store.set('light.opts', { ...opts, allowAperture: opts.allowAperture });
  return opts;
}
(() => {
  const o = store.get('light.opts', null);
  if (!o) return;
  $('#optFps').value = o.fps; $('#optMaxIso').value = o.maxIso; $('#optAperture').checked = o.allowAperture;
  if (o.distances?.key) $('#dKey').value = o.distances.key;
  if (o.distances?.fill) $('#dFill').value = o.distances.fill;
  if (o.distances?.bg) $('#dBg').value = o.distances.bg;
})();

function measure() {
  if (!light.ref) throw new Error('Primero carga una imagen de referencia');
  const data = grabLive();
  drawZones($('#liveThumb'), data);
  const diff = compare(light.ref, analyze(data));
  const p = plan(diff, camState().settings || {}, lightOptions());
  light.lastPlan = p;
  renderPlan(diff, p);
  $('#applyBtn').disabled = !Object.keys(p.camera).length || !app.active.caps.settings.length;
  return p;
}

function renderPlan(diff, p) {
  const r = (x) => `${x > 0 ? '+' : ''}${x.toFixed(1)}`;
  const row = (label, value, good) => `<span>${label}</span><b class="${good ? 'good' : 'bad'}">${value}${good ? ' ✓' : ''}</b>`;
  const mired = diff.lnRb * 110;
  const html = [
    `<div class="meter">
      ${row('Exposición del sujeto', `${r(diff.ev)} EV`, p.ok.ev)}
      ${row(`Contraste (principal a la ${diff.keySide})`, `${diff.ratioLive.toFixed(1)} / ${diff.ratioRef.toFixed(1)} pasos`, p.ok.ratio)}
      ${row('Separación del fondo', `${diff.sepLive.toFixed(1)} / ${diff.sepRef.toFixed(1)} pasos`, p.ok.bg)}
      ${row('Color vs referencia', Math.abs(mired) < 8 ? 'igual' : mired > 0 ? 'más cálida' : 'más fría', Math.abs(mired) < 8)}
    </div>`,
  ];
  if (p.matched) html.push('<p><b class="good">✓ La toma coincide con la referencia.</b></p>');
  if (p.steps.length) html.push(`<small class="label">Cámara (se aplica con un clic)</small><ul class="plan">${p.steps.map((s) => `<li>${s}</li>`).join('')}</ul>`);
  if (p.lights.length) {
    html.push(`<small class="label">Luces (ajuste manual)</small><ul class="plan">${p.lights.map((l) => `<li><b>${l.light}:</b> ${l.text}${l.distance ? ` → <span class="dist">${l.distance}</span>` : ''}</li>`).join('')}</ul>`);
  }
  $('#lightResult').innerHTML = html.join('');
}

$('#measureBtn').onclick = () => { try { measure(); } catch (e) { toast(e.message, true); } };
$('#applyBtn').onclick = async () => {
  if (!light.lastPlan) return;
  await camApi('setMany', { values: light.lastPlan.camera });
  toast('Ajustes aplicados. Vuelve a medir para confirmar.');
};

// Bucle cerrado: medir → aplicar → esperar → medir, hasta coincidir.
$('#autoBtn').onclick = async () => {
  if (light.busy) { light.busy = false; return; }
  if (!app.active.caps.settings.length) return toast('Esta cámara no permite ajustes remotos', true);
  light.busy = true;
  $('#autoBtn').textContent = '■ Detener';
  try {
    for (let i = 1; i <= 6 && light.busy; i++) {
      const p = measure();
      const changes = { ...p.camera };
      if (!Object.keys(changes).length) { toast(p.matched ? '✓ Igualada' : 'La cámara ya está al límite: revisa las luces'); break; }
      toast(`Iteración ${i}: ${p.steps.join(' · ')}`);
      await camApi('setMany', { values: changes });
      await new Promise((r) => setTimeout(r, 2000)); // espera a que la vista previa refleje el cambio
    }
    measure();
  } catch (e) { toast(e.message, true); }
  light.busy = false;
  $('#autoBtn').textContent = 'Igualar automático';
};

(async () => {
  const saved = await loadStore('referencias');
  if (saved?.image) setReference(saved.image, false).catch(() => {});
})();

// ---------------- Pestañas del panel derecho ----------------
$$('.tab').forEach((t) => {
  t.onclick = () => {
    $$('.tab').forEach((x) => x.classList.toggle('active', x === t));
    $$('.tab-panel').forEach((p) => { p.hidden = p.dataset.panel !== t.dataset.tab; });
  };
});
$('#helpBtn').onclick = () => $('#helpDlg').showModal();

// ---------------- Teclado / control remoto ----------------
// Navegación espacial con flechas: pensada para usar el portal en una TV.
function moveFocus(dir) {
  const items = $$('button, select, input, [tabindex]')
    .filter((el) => !el.disabled && el.offsetParent !== null && !el.closest('dialog:not([open])'));
  const cur = document.activeElement;
  if (!items.includes(cur)) { items[0]?.focus(); return; }
  const a = cur.getBoundingClientRect();
  const ax = a.left + a.width / 2; const ay = a.top + a.height / 2;
  let best = null; let bestScore = Infinity;
  for (const el of items) {
    if (el === cur) continue;
    const b = el.getBoundingClientRect();
    const dx = b.left + b.width / 2 - ax; const dy = b.top + b.height / 2 - ay;
    const along = { ArrowRight: dx, ArrowLeft: -dx, ArrowDown: dy, ArrowUp: -dy }[dir];
    if (along <= 1) continue;
    const across = dir === 'ArrowLeft' || dir === 'ArrowRight' ? Math.abs(dy) : Math.abs(dx);
    const score = along + across * 2.5;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  best?.focus();
}

addEventListener('keydown', (e) => {
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
  if (typing || e.metaKey || e.ctrlKey) return;
  if (document.querySelector('dialog[open]') && !e.key.startsWith('Arrow')) return;
  switch (e.key) {
    case ' ': e.preventDefault(); tpSetPlaying(!tp.playing); break;
    case 'r': case 'R': toggleRecord(); break;
    case '+': case '=': tpSpeed(5); break;
    case '-': case '_': tpSpeed(-5); break;
    case 'Home': tpTop(); break;
    case 'ArrowUp': case 'ArrowDown': case 'ArrowLeft': case 'ArrowRight':
      e.preventDefault(); moveFocus(e.key); break;
    default:
  }
});

init().catch((e) => toast(`No pude conectar con el servidor: ${e.message}`, true));
tpInit();
drawOverlay();

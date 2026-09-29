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
  const initial = cameras.find((c) => c.id === store.get('activeCam')) || cameras[0];
  if (initial) selectCamera(initial.id);
  connectEvents();
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
  setupPreview();
  render();
}

function usesWebcam() {
  return app.active.preview === 'webcam' || Boolean(app.smooth[app.active.id]);
}

// ---------------- Vista previa ----------------
async function setupPreview() {
  const img = $('#liveImg'); const video = $('#liveVideo');
  app.stream?.getTracks().forEach((t) => t.stop());
  app.stream = null;
  img.hidden = true; video.hidden = true;
  img.removeAttribute('src');
  $('#fps').textContent = '';
  $('#sourceBox').hidden = !usesWebcam();

  if (!usesWebcam()) {
    $('#previewEmpty').textContent = 'Conectando vista previa…';
    img.onload = () => { $('#previewEmpty').textContent = ''; };
    img.onerror = () => { $('#previewEmpty').textContent = 'Sin vista previa de la cámara'; };
    img.src = `/api/camera/${app.active.id}/live?t=${Date.now()}`;
    img.hidden = false;
    $('#fps').textContent = app.active.driver === 'sony-wifi' ? 'Wi-Fi' : 'USB';
    return;
  }
  await startWebcam();
}

async function startWebcam() {
  const video = $('#liveVideo');
  const key = `source.${app.active.id}`;
  let deviceId = store.get(key, null);
  if (!navigator.mediaDevices?.getUserMedia) {
    $('#previewEmpty').textContent = 'El navegador no permite cámaras aquí (usa http://localhost o https).';
    return;
  }
  try {
    const constraints = (id) => ({ video: { ...(id ? { deviceId: { exact: id } } : {}), width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia(constraints(deviceId)); } catch { stream = await navigator.mediaDevices.getUserMedia(constraints(null)); deviceId = null; }
    const devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
    // Primera vez con la Osmo: intenta elegirla por nombre.
    if (!deviceId && app.active.driver === 'dji-osmo') {
      const osmo = devices.find((d) => /osmo|dji/i.test(d.label));
      if (osmo) {
        stream.getTracks().forEach((t) => t.stop());
        stream = await navigator.mediaDevices.getUserMedia(constraints(osmo.deviceId));
      }
    }
    app.stream = stream;
    video.srcObject = stream;
    video.hidden = false;
    $('#previewEmpty').textContent = '';
    const current = stream.getVideoTracks()[0];
    const s = current.getSettings();
    $('#fps').textContent = `${s.width || ''}×${s.height || ''} · ${Math.round(s.frameRate || 0)} fps`;
    const sel = $('#sourceSelect');
    sel.innerHTML = '';
    for (const d of devices) {
      const o = new Option(d.label || `Cámara ${sel.length + 1}`, d.deviceId);
      o.selected = d.deviceId === s.deviceId;
      sel.append(o);
    }
  } catch (e) {
    $('#previewEmpty').textContent = `No pude abrir la webcam/capturadora: ${e.message}`;
  }
}

$('#sourceSelect').onchange = (e) => {
  store.set(`source.${app.active.id}`, e.target.value);
  setupPreview();
};
$('#smoothBtn').onclick = () => {
  app.smooth[app.active.id] = !app.smooth[app.active.id];
  store.set('smooth', app.smooth);
  $('#smoothBtn').classList.toggle('on', app.smooth[app.active.id]);
  setupPreview();
};

// Superposiciones: cuadrícula, guías y recorte vertical.
function drawOverlay() {
  const c = $('#overlay');
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
async function toggleRecord() {
  if (app.active.caps.record === 'browser') return toggleLocalRecord();
  if (!app.active.caps.record) return toast('Esta cámara no permite iniciar la grabación en remoto', true);
  const st = await camApi('record', { action: 'toggle' });
  app.snapshot[app.active.id] = { ...camState(), ...st };
  render();
}

// Grabación en el navegador (Osmo Action en modo webcam o cualquier capturadora).
async function toggleLocalRecord() {
  const L = app.local;
  if (L.recorder) { L.recorder.stop(); return; }
  if (!app.stream) return toast('Primero abre la vista previa de la cámara', true);
  let audio = null;
  try { audio = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { toast('Grabando sin audio (sin permiso de micrófono)'); }
  const tracks = [...app.stream.getVideoTracks(), ...(audio ? audio.getAudioTracks() : [])];
  const type = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t));
  const rec = new MediaRecorder(new MediaStream(tracks), { mimeType: type, videoBitsPerSecond: 16e6 });
  L.chunks = [];
  rec.ondataavailable = (e) => e.data.size && L.chunks.push(e.data);
  rec.onstop = () => {
    audio?.getTracks().forEach((t) => t.stop());
    const blob = new Blob(L.chunks, { type: rec.mimeType });
    const a = document.createElement('a');
    const ext = rec.mimeType.includes('mp4') ? 'mp4' : 'webm';
    a.href = URL.createObjectURL(blob);
    a.download = `${app.active.id}-${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    L.recorder = null; L.since = null;
    render();
  };
  rec.start(1000);
  L.recorder = rec; L.since = Date.now();
  render();
}

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
$('#reconnectBtn').onclick = async () => { await camApi('connect'); setupPreview(); toast('Reconectado'); };

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
    dot.className = `dot ${s.recording ? 'rec' : s.connected ? 'on' : ''}`;
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

  // Grabación
  const localRec = Boolean(app.local.recorder);
  const recording = caps.record === 'browser' ? localRec : Boolean(st.recording);
  const since = caps.record === 'browser' ? app.local.since : st.recordingSince;
  $('#btnRec').classList.toggle('recording', recording);
  $('#recLabel').textContent = recording ? 'DETENER' : 'GRABAR';
  $('#recBadge').hidden = !recording;
  $('#recTime').textContent = since ? mmss((Date.now() - since) / 1000) : '0:00';
  $('#zoomPos').textContent = st.zoom || '—';

  // Panel de estado
  $('#stModel').textContent = st.model || app.active.name;
  $('#stLens').textContent = st.lens || '';
  const stateEl = $('#stState');
  stateEl.textContent = !st.connected ? 'Sin conexión' : recording ? 'Grabando' : 'Lista';
  stateEl.classList.toggle('rec', recording);
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
  for (const c of st.lastClips?.length ? st.lastClips : ['Sin clips']) clips.append(Object.assign(document.createElement('li'), { textContent: c }));
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
  const video = $('#liveVideo'); const img = $('#liveImg');
  if (!video.hidden && video.videoWidth) return toImageData(video);
  if (!img.hidden && img.naturalWidth) return toImageData(img);
  throw new Error('No hay vista previa para medir');
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

/**
 * Oremus · Demo — Aplicación (POO)
 * -----------------------------------------------------------------
 * Endurecimiento de seguridad aplicado:
 *  - Todo el DOM dinámico se construye con textContent / createElement.
 *    Nunca se inserta dato de usuario con innerHTML (evita XSS).
 *  - innerHTML solo se usa para SVG de iconos, que son constantes
 *    estáticas de confianza definidas por nosotros en data.js.
 *  - Sin manejadores en línea (onclick=...): todo con addEventListener,
 *    para poder aplicar una CSP estricta (script-src 'self').
 *  - Enlaces externos con rel="noopener noreferrer".
 *  - Comentarios con honeypot + límite de frecuencia + tope de longitud.
 *  - localStorage siempre envuelto en try/catch.
 */
(function (w, doc) {
  'use strict';

  var CFG = w.OREMUS_CONFIG || { analytics: {}, support: {} };
  var DATA = w.OREMUS_DATA || {};

  /* ----------------------------- Utilidades DOM ----------------------------- */
  var Dom = {
    el: function (tag, opts) {
      opts = opts || {};
      var n = doc.createElement(tag);
      if (opts.cls) n.className = opts.cls;
      if (opts.text != null) n.textContent = opts.text;      // seguro
      if (opts.trustedHtml != null) n.innerHTML = opts.trustedHtml; // solo iconos estáticos
      if (opts.attrs) Object.keys(opts.attrs).forEach(function (k) {
        if (opts.attrs[k] != null) n.setAttribute(k, opts.attrs[k]);
      });
      if (opts.style) n.style.cssText = opts.style;
      if (opts.on) Object.keys(opts.on).forEach(function (ev) { n.addEventListener(ev, opts.on[ev]); });
      if (opts.children) opts.children.forEach(function (c) {
        if (c == null) return;
        n.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c);
      });
      return n;
    },
    icon: function (name) { return Dom.el('span', { cls: 'ic', trustedHtml: DATA.icons[name] || '' }); },
    iconRaw: function (name, cls) { return Dom.el('span', { cls: cls || '', trustedHtml: DATA.icons[name] || '' }); },
    clear: function (n) { while (n.firstChild) n.removeChild(n.firstChild); return n; }
  };

  function card(o) {
    o = o || {};
    var cls = 'card' + (o.hero ? ' hero' : '') + (o.cls ? ' ' + o.cls : '');
    return Dom.el('div', { cls: cls, children: o.children, on: o.on });
  }
  function kicker(t) { return Dom.el('div', { cls: 'kicker', text: t }); }
  function verse(t, lg) { return Dom.el('p', { cls: 'verse' + (lg ? ' lg' : ''), text: t }); }
  function rowButton(iconName, title, sub, onClick) {
    return Dom.el('button', { cls: 'row', on: { click: onClick }, children: [
      Dom.icon(iconName),
      Dom.el('span', { cls: 'tx', children: [
        Dom.el('span', { cls: 'rt', text: title }),
        sub ? Dom.el('span', { cls: 'rs', text: sub }) : null
      ] }),
      Dom.el('span', { cls: 'chev', text: '›' })
    ] });
  }

  /* ------------------------------- Almacén ------------------------------- */
  function Store() {}
  Store.prototype.getJSON = function (key, def) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : def; }
    catch (e) { return def; }
  };
  Store.prototype.setJSON = function (key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  };
  Store.prototype.incr = function (key) {
    try { var n = (+localStorage.getItem(key) || 0) + 1; localStorage.setItem(key, String(n)); return n; }
    catch (e) { return 0; }
  };
  Store.prototype.num = function (key) { try { return +localStorage.getItem(key) || 0; } catch (e) { return 0; } };
  Store.prototype.bumpPlatform = function (platform) {
    var c = this.getJSON('oremus.demo.counts', {});
    c[platform] = (c[platform] || 0) + 1;
    this.setJSON('oremus.demo.counts', c);
    return c;
  };
  Store.prototype.addFeedback = function (entry) {
    var arr = this.getJSON('oremus.feedback', []);
    arr.unshift(entry);
    this.setJSON('oremus.feedback', arr.slice(0, 200));
  };

  /* ------------------------------ Analítica ------------------------------ */
  function Analytics(store) { this.store = store; this.platform = this.detect(); }
  Analytics.prototype.detect = function () {
    var ua = navigator.userAgent || '';
    if (/android/i.test(ua)) return 'Android';
    if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
    if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return 'iOS';
    return 'Escritorio';
  };
  Analytics.prototype.trackVisit = function () {
    this.store.bumpPlatform(this.platform);
    this._loadGoatCounter();
  };
  Analytics.prototype.event = function (path, title) {
    if (w.goatcounter && w.goatcounter.count) w.goatcounter.count({ path: path, title: title, event: true });
  };
  Analytics.prototype._loadGoatCounter = function () {
    var code = (CFG.analytics && CFG.analytics.goatcounterCode) || '';
    if (!code) return;
    var self = this;
    var s = doc.createElement('script');
    s.async = true; s.src = 'https://gc.zgo.at/count.js';
    s.setAttribute('data-goatcounter', 'https://' + encodeURIComponent(code) + '.goatcounter.com/count');
    s.onload = function () { self.event('plataforma/' + self.platform, 'Plataforma ' + self.platform); };
    doc.body.appendChild(s);
  };

  /* ------------------------------- Router -------------------------------- */
  function Router(app) { this.app = app; this.stack = []; }
  Router.prototype.go = function (view) { this.stack = [{ v: view }]; this._render(); };
  Router.prototype.push = function (state) { this.stack.push(state); this._render(); };
  Router.prototype.back = function () { if (this.stack.length > 1) { this.stack.pop(); this._render(); } };
  Router.prototype.current = function () { return this.stack[this.stack.length - 1]; };
  Router.prototype.canBack = function () { return this.stack.length > 1; };
  Router.prototype._render = function () { this.app.renderState(this.current()); };

  /* ------------------------- Donación / PayPal --------------------------- */
  function Donation(cfg) { this.s = cfg.support || {}; this.amount = null; }
  Donation.prototype.ready = function () { return !!(this.s.paypalBusiness || this.s.paypalHostedButtonId || this.s.paypalMe); };
  Donation.prototype.url = function () {
    var s = this.s, amt = this.amount;
    if (s.paypalBusiness) {
      var u = 'https://www.paypal.com/donate?business=' + encodeURIComponent(s.paypalBusiness) +
        '&item_name=' + encodeURIComponent('Donativo OREMUS') +
        '&currency_code=' + encodeURIComponent(s.currency || 'USD');
      if (amt) u += '&amount=' + encodeURIComponent(amt);
      return u;
    }
    if (s.paypalHostedButtonId) return 'https://www.paypal.com/donate/?hosted_button_id=' + encodeURIComponent(s.paypalHostedButtonId);
    if (s.paypalMe) return 'https://www.paypal.me/' + encodeURIComponent(s.paypalMe) + (amt ? ('/' + encodeURIComponent(amt) + (s.currency || '')) : '');
    return '';
  };

  /* -------------------------- Envío de comentarios ------------------------ */
  function Feedback(cfg, store, analytics) { this.s = cfg.support || {}; this.store = store; this.analytics = analytics; }
  Feedback.prototype.submit = function (data) {
    // Anti-spam: honeypot. Un bot rellena el campo oculto -> se descarta en silencio.
    if (data.website) return Promise.resolve({ ok: true, silent: true });
    // Límite de frecuencia: 1 comentario cada 15 s.
    var last = this.store.num('oremus.fb.last');
    if (Date.now() - last < 15000) return Promise.resolve({ ok: false, reason: 'rate' });
    var msg = (data.msg || '').trim().slice(0, 2000);
    if (!msg) return Promise.resolve({ ok: false, reason: 'empty' });
    var entry = {
      name: ((data.name || '').trim().slice(0, 80)) || 'Anónimo',
      rating: Math.max(0, Math.min(5, data.rating | 0)),
      msg: msg, platform: this.analytics.platform, date: new Date().toISOString()
    };
    this.store.addFeedback(entry);
    try { localStorage.setItem('oremus.fb.last', String(Date.now())); } catch (e) {}
    this.analytics.event('comentario/enviado', 'Comentario enviado');

    var self = this;
    if (this.s.formspreeId) {
      return fetch('https://formspree.io/f/' + encodeURIComponent(this.s.formspreeId), {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(entry)
      }).then(function () { return { ok: true }; })
        .catch(function () { self._mailto(entry); return { ok: true }; });
    }
    if (this.s.feedbackEmail) { this._mailto(entry); return Promise.resolve({ ok: true }); }
    return Promise.resolve({ ok: true });
  };
  Feedback.prototype._mailto = function (entry) {
    if (!this.s.feedbackEmail) return;
    var sub = encodeURIComponent('Comentario Oremus' + (entry.rating ? (' · ' + entry.rating + '★') : ''));
    var body = encodeURIComponent('De: ' + entry.name + ' (' + entry.platform + ')\n\n' + entry.msg);
    w.location.href = 'mailto:' + encodeURIComponent(this.s.feedbackEmail) + '?subject=' + sub + '&body=' + body;
  };

  /* ------------------------- Fechas / calendario ------------------------- */
  function mysteriesForToday() {
    var d = new Date().getDay(), M = DATA.mysteries;
    if (d === 1 || d === 6) return M.gozosos;
    if (d === 2 || d === 5) return M.dolorosos;
    if (d === 3 || d === 0) return M.gloriosos;
    return M.luminosos;
  }
  function greeting() { var h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches'; }
  function prettyDate() {
    try { return new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }); }
    catch (e) { return ''; }
  }
  function openExternal(url) {
    var wnd = w.open(url, '_blank');
    if (wnd) { try { wnd.opener = null; } catch (e) {} }
  }

  /* -------------------------------- App ---------------------------------- */
  function OremusApp() {
    this.store = new Store();
    this.analytics = new Analytics(this.store);
    this.donation = new Donation(CFG);
    this.feedback = new Feedback(CFG, this.store, this.analytics);
    this.router = new Router(this);
    this.tabs = [
      { id: 'inicio', label: 'Inicio', icon: 'home' },
      { id: 'oraciones', label: 'Oraciones', icon: 'book' },
      { id: 'rosario', label: 'Rosario', icon: 'rosary' },
      { id: 'misas', label: 'Misas', icon: 'pin' },
      { id: 'adorar', label: 'Adorar', icon: 'host' }
    ];
    this.sectionOf = {
      inicio: 'inicio', oraciones: 'oraciones', cat: 'oraciones', prayer: 'oraciones',
      rosario: 'rosario', guia: 'rosario', rezo: 'rosario', misas: 'misas', adorar: 'adorar', apoyo: null
    };
    this.rezo = { steps: [], i: 0, amTimer: null, revealed: false };
    this.ad = { timer: null, remain: 900, total: 900, running: false, moment: 0, minutes: 15 };
  }

  OremusApp.prototype.start = function () {
    this.dom = {
      view: doc.getElementById('view'),
      title: doc.getElementById('title'),
      back: doc.getElementById('back'),
      heart: doc.getElementById('heart'),
      spark: doc.getElementById('spark'),
      tabs: doc.getElementById('tabs'),
      panel: doc.getElementById('panel')
    };
    this.dom.spark.appendChild(Dom.iconRaw('star'));
    this.dom.back.addEventListener('click', this.router.back.bind(this.router));
    this.dom.heart.addEventListener('click', this.pushApoyo.bind(this));
    this._buildTabs();
    this._buildPanel();
    this.analytics.trackVisit();
    this.router.go('inicio');
  };

  OremusApp.prototype.pushApoyo = function () { this.router.push({ v: 'apoyo' }); };

  OremusApp.prototype._buildTabs = function () {
    var self = this; this.tabButtons = {};
    var nav = Dom.clear(this.dom.tabs);
    this.tabs.forEach(function (t) {
      var b = Dom.el('button', {
        on: { click: function () { self.router.go(t.id); } },
        children: [Dom.iconRaw(t.icon), Dom.el('span', { text: t.label })]
      });
      self.tabButtons[t.id] = b;
      nav.appendChild(b);
    });
  };

  OremusApp.prototype._setActiveTab = function (section) {
    var self = this;
    Object.keys(this.tabButtons).forEach(function (id) {
      self.tabButtons[id].classList.toggle('on', id === section);
    });
  };

  OremusApp.prototype.renderState = function (state) {
    var v = state.v;
    this.dom.view.scrollTop = 0;
    this.dom.back.style.display = this.router.canBack() ? 'block' : 'none';
    this._setActiveTab(this.sectionOf[v] || null);
    var map = {
      inicio: this.viewInicio, oraciones: this.viewOraciones,
      cat: function () { return this.viewCat(state.cat); },
      prayer: function () { return this.viewPrayer(state.cat, state.i); },
      rosario: this.viewRosario, guia: this.viewGuia, rezo: this.viewRezo,
      misas: this.viewMisas, adorar: this.viewAdorar, apoyo: this.viewApoyo
    };
    var res = (map[v] || this.viewInicio).call(this);
    this.dom.title.textContent = res.title;
    var main = Dom.clear(this.dom.view);
    res.nodes.forEach(function (n) { if (n) main.appendChild(n); });
  };

  /* ------------------------------- Vistas -------------------------------- */
  OremusApp.prototype.viewInicio = function () {
    var self = this;
    var vs = DATA.verses[Math.floor(Date.now() / 8.64e7) % DATA.verses.length];
    var my = mysteriesForToday();
    var nodes = [
      Dom.el('div', { style: 'margin:8px 0 2px', children: [
        Dom.el('span', { cls: 'device-chip', children: ['📱 Estás en ', Dom.el('b', { text: this.analytics.platform })] })
      ] }),
      Dom.el('h2', { cls: 't', style: 'font-size:30px', text: greeting() }),
      Dom.el('p', { cls: 'sub', text: prettyDate() }),
      card({ hero: true, children: [
        kicker('Palabra del día'), verse(vs[0], true),
        Dom.el('p', { cls: 'muted', style: 'font-weight:600', text: vs[1] })
      ] }),
      kicker('Para hoy'),
      Dom.el('div', { cls: 'card pad-row', style: 'margin-top:8px', children: [
        rowButton('rosary', 'Rosario de hoy', my.name + ' · ' + my.days, function () { self.router.go('rosario'); }),
        rowButton('pin', 'Misas cerca de ti', 'Según tu ubicación', function () { self.router.go('misas'); }),
        rowButton('host', '15 min ante el Santísimo', 'Adoración guiada', function () { self.router.go('adorar'); }),
        rowButton('book', 'Oraciones', 'Antes y después de misa, y más', function () { self.router.go('oraciones'); })
      ] }),
      card({ hero: true, cls: 'tap', on: { click: function () { self.pushApoyo(); } }, children: [
        kicker('Apoya el proyecto'),
        Dom.el('p', { cls: 'support-msg', style: 'margin:10px 0 12px', text: 'Ayúdanos a que Oremus llegue a ser una app. Con tu apoyo llegaremos más rápido. 🙏' }),
        Dom.el('button', { cls: 'btn gold', text: '♥ Donar o dejar tu comentario', on: { click: function (e) { e.stopPropagation(); self.pushApoyo(); } } })
      ] })
    ];
    return { title: 'Oremus', nodes: nodes };
  };

  OremusApp.prototype.viewOraciones = function () {
    var self = this;
    var total = DATA.categories.reduce(function (a, c) { return a + c.prayers.length; }, 0);
    var list = Dom.el('div', { cls: 'card pad-row', children: DATA.categories.map(function (c) {
      return rowButton(c.icon, c.title, c.sub, function () { self.router.push({ v: 'cat', cat: c.id }); });
    }) });
    return { title: 'Oraciones', nodes: [Dom.el('p', { cls: 'sub', text: total + ' rezos · toca una categoría' }), list] };
  };

  OremusApp.prototype._cat = function (id) { return DATA.categories.filter(function (c) { return c.id === id; })[0]; };

  OremusApp.prototype.viewCat = function (id) {
    var self = this, c = this._cat(id);
    var list = Dom.el('div', { cls: 'card pad-row', children: c.prayers.map(function (p, i) {
      return rowButton(c.icon, p.t, p.p[0].slice(0, 52) + '…', function () { self.router.push({ v: 'prayer', cat: id, i: i }); });
    }) });
    return { title: c.title, nodes: [list] };
  };

  OremusApp.prototype.viewPrayer = function (id, i) {
    var c = this._cat(id), p = c.prayers[i];
    return { title: p.t, nodes: [card({ hero: true, children: p.p.map(function (x) { return verse(x); }) })] };
  };

  OremusApp.prototype.viewRosario = function () {
    var self = this, my = mysteriesForToday();
    var heroCard = card({ hero: true, children: [
      kicker('Rosario de hoy'),
      Dom.el('h2', { cls: 't', style: 'font-size:24px;margin:8px 0 2px', text: my.name }),
      Dom.el('p', { cls: 'muted', text: my.days }),
      Dom.el('button', { cls: 'btn gold', style: 'margin-top:14px', text: '▶ Rezar guiado', on: { click: function () { self.router.push({ v: 'rezo' }); } } })
    ] });
    var guiaCard = Dom.el('div', { cls: 'card pad-row', children: [
      rowButton('book', 'Cómo se reza, paso a paso', 'Con las oraciones y qué misterios según el día', function () { self.router.push({ v: 'guia' }); })
    ] });
    var allSets = Dom.el('div', { cls: 'card pad-row', children: Object.keys(DATA.mysteries).map(function (k) {
      var m = DATA.mysteries[k];
      return rowButton('rosary', m.name, m.days, function () { self.router.push({ v: 'rezo' }); });
    }) });
    return { title: 'Santo Rosario', nodes: [
      heroCard, guiaCard,
      Dom.el('div', { cls: 'kicker', style: 'margin:16px 0 8px', text: 'Todos los misterios' }),
      allSets
    ] };
  };

  OremusApp.prototype.viewGuia = function () {
    var nodes = DATA.guide.map(function (s, i) {
      return card({ children: [Dom.el('div', { style: 'display:flex;gap:14px', children: [
        Dom.el('div', { cls: 'step-num', text: String(i + 1) }),
        Dom.el('div', { children: [
          Dom.el('div', { style: 'font-family:var(--display);font-size:18px', text: s[0] }),
          Dom.el('div', { cls: 'muted', style: 'font-size:14px;margin-top:2px', text: s[1] })
        ] })
      ] })] });
    });
    nodes.push(card({ hero: true, children: [kicker('Oración de Fátima'), verse(DATA.prayers.FA)] }));
    return { title: 'Cómo rezar el Rosario', nodes: nodes };
  };

  /* --------------------------- Rosario guiado ---------------------------- */
  OremusApp.prototype._buildRezo = function () {
    var P = DATA.prayers, my = mysteriesForToday(), s = [];
    s.push(['Para comenzar', 'Señal de la Cruz', 'Por la señal de la Santa Cruz… En el nombre del Padre, y del Hijo, y del Espíritu Santo. Amén.', null, false]);
    s.push(['Para comenzar', 'Padre Nuestro', P.PN, null, false]);
    for (var k = 1; k <= 3; k++) s.push(['Fe, esperanza y caridad', 'Ave María (' + k + 'ª)', null, null, true]);
    s.push(['Para comenzar', 'Gloria', P.GL, null, false]);
    my.list.forEach(function (m, mi) {
      s.push([(mi + 1) + 'º misterio · ' + my.name, m[0], m[1], null, false]);
      s.push(['Decena ' + (mi + 1), 'Padre Nuestro', P.PN, null, false]);
      for (var b = 1; b <= 10; b++) s.push(['Decena ' + (mi + 1) + ' de 5', 'Ave María', null, b, true]);
      s.push(['Decena ' + (mi + 1), 'Gloria', P.GL, null, false]);
      s.push(['Decena ' + (mi + 1), 'Oración de Fátima', P.FA, null, false]);
    });
    s.push(['Para terminar', 'Salve', P.SALVE, null, false]);
    return s;
  };
  OremusApp.prototype.viewRezo = function () {
    if (!this.rezo.steps.length) { this.rezo.steps = this._buildRezo(); this.rezo.i = 0; }
    this._drawRezo();
    return { title: 'Rezar el Rosario', nodes: [this._rezoHost || (this._rezoHost = Dom.el('div'))] };
  };
  OremusApp.prototype._drawRezo = function () {
    var self = this, r = this.rezo, st = r.steps[r.i];
    clearTimeout(r.amTimer); r.revealed = false;
    var pct = Math.round((r.i + 1) / r.steps.length * 100);
    var host = Dom.clear(this._rezoHost || (this._rezoHost = Dom.el('div')));

    host.appendChild(Dom.el('div', { cls: 'progwrap', children: [
      Dom.el('div', { cls: 'prog', children: [Dom.el('i', { style: 'width:' + pct + '%' })] }),
      Dom.el('span', { cls: 'muted', style: 'font-weight:600', text: (r.i + 1) + '/' + r.steps.length })
    ] }));
    host.appendChild(kicker(st[0]));
    host.appendChild(Dom.el('h2', { cls: 't', style: 'font-size:26px;margin:8px 0', text: st[1] }));

    if (st[3] !== null) {
      var beads = Dom.el('div', { cls: 'beads' });
      for (var n = 1; n <= 10; n++) {
        var cls = 'bead' + (n < st[3] ? ' done' : n === st[3] ? ' now' : '');
        beads.appendChild(Dom.el('span', { cls: cls }));
      }
      host.appendChild(beads);
    }

    if (st[4]) { // Ave María en dos partes
      var am2 = verse(DATA.prayers.AM2); am2.id = 'am2';
      am2.style.cssText = 'opacity:0;transform:translateY(6px);transition:opacity 1.1s ease,transform 1.1s ease;margin-top:16px';
      var hint = Dom.el('p', { cls: 'muted', style: 'margin:10px 0 0;font-size:11.5px', text: 'Toca para ver la respuesta…' });
      var reveal = function () { clearTimeout(r.amTimer); am2.style.opacity = '1'; am2.style.transform = 'none'; hint.style.display = 'none'; };
      host.appendChild(card({ hero: true, on: { click: reveal }, cls: 'tap', children: [verse(DATA.prayers.AM1), am2, hint] }));
      r.amTimer = setTimeout(reveal, 5000);
    } else {
      host.appendChild(card({ hero: true, children: [verse(st[2])] }));
    }

    var controls = Dom.el('div', { style: 'display:flex;gap:10px;margin-top:6px', children: [
      r.i > 0 ? Dom.el('button', { cls: 'btn ghost', style: 'flex:0 0 40%', text: 'Anterior', on: { click: function () { r.i--; self._drawRezo(); } } }) : null,
      Dom.el('button', { cls: 'btn gold', text: r.i < r.steps.length - 1 ? 'Siguiente' : 'Terminar', on: { click: function () {
        if (r.i < r.steps.length - 1) { r.i++; self._drawRezo(); } else { r.steps = []; self.router.back(); }
      } } })
    ] });
    host.appendChild(controls);
  };

  /* ------------------------------- Misas --------------------------------- */
  OremusApp.prototype.viewMisas = function () {
    var self = this;
    var host = Dom.el('div');
    var intro = Dom.el('p', { cls: 'sub', text: 'Encuentra iglesias y parroquias católicas cerca de ti y abre las indicaciones para llegar.' });
    var box = Dom.el('div');
    var note = card({ children: [Dom.el('div', { cls: 'muted', text: 'Los horarios exactos de cada misa los publica la propia parroquia. Al abrir Mapas verás su ficha con teléfono y web para confirmarlos. Tu ubicación se usa solo aquí y no se guarda.' })] });

    function idle() {
      Dom.clear(box).appendChild(card({ hero: true, cls: 'center', children: [
        Dom.el('div', { style: 'width:64px;height:64px;border-radius:50%;background:rgba(198,143,44,.14);display:grid;place-items:center;margin:0 auto 14px', children: [Dom.iconRaw('church', 'ic')] }),
        Dom.el('h2', { cls: 't', style: 'font-size:22px', text: 'Buscar cerca de mí' }),
        Dom.el('p', { cls: 'muted', style: 'margin:6px 0 16px', text: 'Usaremos tu ubicación solo en este momento para mostrarte iglesias cercanas.' }),
        Dom.el('button', { cls: 'btn gold', text: '📍 Usar mi ubicación', on: { click: locate } })
      ] }));
    }
    function mapsLink(label, href, ghost) {
      return Dom.el('a', { cls: 'btn ' + (ghost ? 'ghost' : 'gold'), text: label,
        attrs: { href: href, target: '_blank', rel: 'noopener noreferrer' }, style: 'text-decoration:none;margin-bottom:10px' });
    }
    function fallback(msg) {
      Dom.clear(box).appendChild(card({ children: [
        Dom.el('p', { cls: 'muted', text: msg }),
        mapsLink('Buscar iglesias en Mapas', 'https://www.google.com/maps/search/iglesia+catolica+cerca', true)
      ] }));
    }
    function locate() {
      if (!navigator.geolocation) { fallback('Tu navegador no permite geolocalización.'); return; }
      Dom.clear(box).appendChild(card({ children: [Dom.el('p', { cls: 'muted', text: 'Buscando tu ubicación…' })] }));
      navigator.geolocation.getCurrentPosition(function (pos) {
        var la = pos.coords.latitude, lo = pos.coords.longitude;
        Dom.clear(box).appendChild(card({ hero: true, children: [
          kicker('Ubicación lista'),
          Dom.el('p', { cls: 'muted', style: 'margin:6px 0 14px', text: 'Lat ' + la.toFixed(4) + ', Lon ' + lo.toFixed(4) }),
          mapsLink('⛪ Iglesias católicas cercanas', 'https://www.google.com/maps/search/iglesia+cat%C3%B3lica/@' + la + ',' + lo + ',15z'),
          mapsLink('🕑 Buscar horarios de misa', 'https://www.google.com/maps/search/horario+de+misa+iglesia/@' + la + ',' + lo + ',14z', true)
        ] }));
        self.analytics.event('misas/ubicacion', 'Ubicación usada');
      }, function (err) { fallback('No pudimos obtener tu ubicación (' + (err && err.message ? err.message : 'error') + ').'); },
      { enableHighAccuracy: false, timeout: 10000 });
    }

    idle();
    host.appendChild(intro); host.appendChild(box); host.appendChild(note);
    return { title: 'Misas cerca', nodes: [host] };
  };

  /* ------------------------------ Adoración ------------------------------ */
  OremusApp.prototype.viewAdorar = function () {
    var self = this, ad = this.ad;
    clearInterval(ad.timer); ad.running = false;
    var host = Dom.el('div');
    host.appendChild(Dom.el('p', { cls: 'sub', text: 'Un rato de adoración guiada, para estar con Jesús presente en la Eucaristía.' }));

    var chips = Dom.el('div', { children: [10, 15, 20, 30].map(function (m) {
      return Dom.el('span', { cls: 'chip' + (m === ad.minutes ? ' on' : ''), text: m + ' min', on: { click: function () {
        ad.minutes = m; ad.total = m * 60; ad.remain = m * 60; ad.moment = 0; self.router.go('adorar');
      } } });
    }) });
    host.appendChild(chips);

    var canvas = Dom.el('canvas', { cls: 'ring', attrs: { width: '200', height: '200' } });
    var btn = Dom.el('button', { cls: 'btn gold', text: '▶ Comenzar' });
    var resetBtn = Dom.el('button', { cls: 'btn ghost', style: 'flex:0 0 30%', text: '■', on: { click: function () { doReset(); } } });
    host.appendChild(card({ hero: true, cls: 'center', children: [
      canvas, Dom.el('div', { style: 'display:flex;gap:10px;margin-top:6px', children: [btn, resetBtn] })
    ] }));

    var kEl = kicker('Meditación · 1 de ' + DATA.adoration.length);
    var tEl = Dom.el('h2', { cls: 't', style: 'font-size:20px;margin:8px 0', text: DATA.adoration[0][0] });
    var pEl = verse(DATA.adoration[0][1]);
    host.appendChild(card({ hero: true, children: [
      kEl, tEl, pEl,
      Dom.el('div', { style: 'display:flex;justify-content:space-between;margin-top:10px', children: [
        Dom.el('button', { cls: 'chip', text: '‹ Anterior', on: { click: function () { moveMoment(-1); } } }),
        Dom.el('button', { cls: 'chip', text: 'Siguiente ›', on: { click: function () { moveMoment(1); } } })
      ] })
    ] }));

    function updMoment() {
      kEl.textContent = 'Meditación · ' + (ad.moment + 1) + ' de ' + DATA.adoration.length;
      tEl.textContent = DATA.adoration[ad.moment][0];
      pEl.textContent = DATA.adoration[ad.moment][1];
    }
    function moveMoment(d) { ad.moment = Math.max(0, Math.min(DATA.adoration.length - 1, ad.moment + d)); updMoment(); }
    function draw() {
      var ctx = canvas.getContext('2d'), wd = canvas.width, r = 80, cx = wd / 2, cy = wd / 2;
      ctx.clearRect(0, 0, wd, wd); ctx.lineWidth = 12; ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(110,151,201,.35)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.stroke();
      var pct = 1 - ad.remain / ad.total;
      if (pct > 0) { ctx.strokeStyle = '#c68f2c'; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * pct); ctx.stroke(); }
      ctx.fillStyle = '#26344f'; ctx.textAlign = 'center'; ctx.font = '500 40px Georgia,serif';
      var mm = String(Math.floor(ad.remain / 60)).padStart(2, '0'), ss = String(ad.remain % 60).padStart(2, '0');
      ctx.fillText(ad.remain === 0 ? '¡Amén!' : mm + ':' + ss, cx, cy + 8);
      ctx.fillStyle = '#c68f2c'; ctx.font = '700 11px system-ui,sans-serif';
      ctx.fillText(ad.remain === 0 ? 'COMPLETADA' : 'RESTANTES', cx, cy + 30);
    }
    function tick() {
      ad.remain--;
      if (ad.remain <= 0) { ad.remain = 0; clearInterval(ad.timer); ad.running = false; btn.textContent = '↻ De nuevo'; }
      var idx = Math.min(DATA.adoration.length - 1, Math.floor((ad.total - ad.remain) / ad.total * DATA.adoration.length));
      if (idx !== ad.moment) { ad.moment = idx; updMoment(); }
      draw();
    }
    function doToggle() {
      if (ad.running) { clearInterval(ad.timer); ad.running = false; btn.textContent = '▶ Reanudar'; return; }
      ad.running = true; btn.textContent = '⏸ Pausar'; ad.timer = setInterval(tick, 1000);
    }
    function doReset() { clearInterval(ad.timer); ad.running = false; ad.remain = ad.total; ad.moment = 0; btn.textContent = '▶ Comenzar'; updMoment(); draw(); }
    btn.addEventListener('click', doToggle);
    draw();
    return { title: 'Ante el Santísimo', nodes: [host] };
  };

  /* ------------------------------- Apoyo --------------------------------- */
  OremusApp.prototype.viewApoyo = function () {
    var self = this, s = CFG.support || {}, don = this.donation;
    don.amount = null;

    // Mensaje
    var msg = card({ hero: true, children: [
      kicker('Tu apoyo cuenta'),
      Dom.el('p', { cls: 'support-msg', style: 'margin:12px 0 0', text: 'Es importante tu apoyo para que este proyecto se vea realizado como una app. Con tu ayuda llegaremos más rápido. Que Dios te bendiga. 🙏' })
    ] });

    // Donación
    var amtRow = Dom.el('div', { cls: 'amt-row' });
    var chips = [];
    (s.suggested || []).forEach(function (a) {
      var chip = Dom.el('span', { cls: 'chip', text: '$' + a, on: { click: function () { select(a, chip); } } });
      chips.push(chip); amtRow.appendChild(chip);
    });
    var other = Dom.el('span', { cls: 'chip', text: 'Otro', on: { click: function () { select(null, other); } } });
    chips.push(other); amtRow.appendChild(other);
    function select(a, el) { don.amount = a; chips.forEach(function (c) { c.classList.toggle('on', c === el); }); }

    var payBtn = Dom.el('button', { cls: 'paypal-btn', children: [
      Dom.el('span', { text: 'Pay' }), Dom.el('span', { cls: 'pp2', text: 'Pal' }), Dom.el('span', { text: ' · Donar' })
    ] });
    if (!don.ready()) payBtn.disabled = true;
    payBtn.addEventListener('click', function () {
      var url = don.url();
      if (!url) { return; }
      self.store.incr('oremus.demo.don');
      self.analytics.event('donar/click', 'Clic en Donar');
      openExternal(url);
    });

    var donChildren = [
      kicker('Hacer un donativo'),
      Dom.el('h2', { cls: 't', style: 'font-size:20px;margin:8px 0 2px', text: 'Donativo a la causa de Oremus' }),
      Dom.el('p', { cls: 'muted', style: 'margin:0 0 12px', text: 'Elige un monto (opcional) y continúa con PayPal de forma segura.' }),
      amtRow, payBtn
    ];
    if (!don.ready()) donChildren.push(Dom.el('p', { cls: 'muted', style: 'margin:10px 0 0', text: 'El botón se activa cuando configures tu PayPal (ver web-demo/README.md).' }));

    // Transferencia bancaria (opcional)
    var b = s.bank || {};
    var bankRows = [['Banco', b.banco], ['Beneficiario', b.beneficiario], ['Cuenta', b.cuenta], ['CLABE', b.clabe], ['Concepto', b.concepto]]
      .filter(function (r) { return r[1]; });
    if (bankRows.length && (b.cuenta || b.clabe)) {
      var bank = Dom.el('div', { cls: 'bank', children: [Dom.el('div', { cls: 'kicker', style: 'margin-bottom:6px', text: 'O por transferencia' })] });
      bankRows.forEach(function (r) {
        var val = Dom.el('span', { cls: 'bval' });
        val.appendChild(doc.createTextNode(r[1]));
        if (r[0] === 'CLABE' || r[0] === 'Cuenta') {
          val.appendChild(Dom.el('button', { cls: 'copy', text: 'copiar', on: { click: function (e) {
            var btn = e.currentTarget;
            if (navigator.clipboard) navigator.clipboard.writeText(r[1]);
            var t = btn.textContent; btn.textContent = '¡Copiado!'; setTimeout(function () { btn.textContent = t; }, 1200);
          } } }));
        }
        bank.appendChild(Dom.el('div', { cls: 'brow', children: [Dom.el('b', { text: r[0] }), val] }));
      });
      donChildren.push(bank);
    }
    var donCard = card({ children: donChildren });

    // Comentarios
    var stars = Dom.el('div', { cls: 'stars' });
    var starEls = []; var rating = { v: 0 };
    for (var i = 1; i <= 5; i++) (function (n) {
      var st = Dom.el('span', { text: '★', on: { click: function () { rating.v = n; starEls.forEach(function (s2, idx) { s2.classList.toggle('on', idx < n); }); } } });
      starEls.push(st); stars.appendChild(st);
    })(i);
    var nameFld = Dom.el('input', { cls: 'fld', attrs: { placeholder: 'Tu nombre (opcional)', maxlength: '80', autocomplete: 'off' }, style: 'margin-bottom:10px' });
    var honey = Dom.el('input', { cls: 'hp', attrs: { name: 'website', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true' } });
    var msgFld = Dom.el('textarea', { attrs: { rows: '4', placeholder: 'Escribe aquí tu comentario…', maxlength: '2000' } });
    var result = Dom.el('div');
    var sendBtn = Dom.el('button', { cls: 'btn gold', style: 'margin-top:12px', text: 'Enviar comentario' });
    sendBtn.addEventListener('click', function () {
      self.feedback.submit({ name: nameFld.value, msg: msgFld.value, rating: rating.v, website: honey.value })
        .then(function (res) {
          Dom.clear(result);
          if (res.ok) {
            result.appendChild(Dom.el('div', { cls: 'thanks', text: '¡Gracias por tu comentario! Nos ayuda muchísimo. Que Dios te bendiga. 🙏' }));
            nameFld.value = ''; msgFld.value = ''; rating.v = 0; starEls.forEach(function (s2) { s2.classList.remove('on'); });
          } else if (res.reason === 'empty') {
            result.appendChild(Dom.el('div', { cls: 'thanks err', text: 'Escribe tu comentario antes de enviar.' }));
          } else if (res.reason === 'rate') {
            result.appendChild(Dom.el('div', { cls: 'thanks err', text: 'Espera unos segundos antes de enviar otro comentario.' }));
          }
        });
    });
    var fbCard = card({ children: [
      kicker('Déjanos tu comentario'),
      Dom.el('p', { cls: 'muted', style: 'margin:8px 0 10px', text: '¿Qué te pareció Oremus? Tu opinión nos guía.' }),
      stars, nameFld, honey, msgFld, sendBtn, result
    ] });

    return { title: 'Apoya a Oremus', nodes: [
      msg, donCard, fbCard,
      Dom.el('p', { cls: 'muted center', style: 'margin:4px 0 0', text: 'Gracias por ser parte de esta misión. 🕊️' })
    ] };
  };

  /* ---------------------- Panel del dueño (?panel=1) --------------------- */
  OremusApp.prototype._buildPanel = function () {
    try { if (new URLSearchParams(location.search).get('panel') !== '1') return; } catch (e) { return; }
    var store = this.store, p = this.dom.panel;
    var counts = store.getJSON('oremus.demo.counts', {});
    var fb = store.getJSON('oremus.feedback', []);
    function stat(n, label, span) {
      return Dom.el('div', { style: span ? 'grid-column:span 2' : '', children: [
        Dom.el('div', { cls: 'n', text: String(n) }), Dom.el('small', { text: label })
      ] });
    }
    Dom.clear(p);
    p.appendChild(Dom.el('button', { cls: 'x', text: '✕', on: { click: function () { p.hidden = true; } } }));
    p.appendChild(Dom.el('h3', { text: 'Impacto (este navegador)' }));
    p.appendChild(Dom.el('div', { cls: 'grid', children: [
      stat(counts['Android'] || 0, 'Android'), stat(counts['iOS'] || 0, 'iOS'), stat(counts['Escritorio'] || 0, 'Escritorio')
    ] }));
    p.appendChild(Dom.el('div', { cls: 'grid', style: 'margin-top:8px', children: [
      stat(store.num('oremus.demo.don'), 'Clics donar'), stat(fb.length, 'Comentarios (este navegador)', true)
    ] }));
    p.appendChild(Dom.el('p', { cls: 'muted', style: 'color:#9fb3d4;margin:10px 0 0', text: 'Los totales de todos los visitantes se ven en tu panel de analítica (ver README).' }));
    p.hidden = false;
  };

  /* ------------------------------ Arranque ------------------------------- */
  doc.addEventListener('DOMContentLoaded', function () { new OremusApp().start(); });
})(window, document);

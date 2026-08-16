# Oremus — Demo web (endurecida, POO)

Réplica web navegable de la app Oremus (Inicio, Oraciones, Rosario guiado, Misas con
geolocalización, Adoración) más un apartado de **apoyo** (donativo PayPal + comentarios).
Reescrita en **Programación Orientada a Objetos** y **endurecida** siguiendo buenas
prácticas de seguridad web.

## Estructura (POO, sin dependencias)

```
web-demo/
├── index.html            # solo estructura + CSP; carga los tres scripts
├── assets/
│   ├── styles.css        # estilos
│   ├── config.js         # ⚙️ LO ÚNICO QUE EDITAS (PayPal, banco, comentarios, analítica)
│   ├── data.js           # contenido (oraciones, rosario, adoración) — congelado
│   └── app.js            # clases: Store, Analytics, Router, Donation, Feedback,
│                         #         OremusApp (+ vistas). DOM seguro, sin innerHTML de datos
├── _headers              # cabeceras de seguridad (Netlify / Cloudflare Pages)
├── netlify.toml          # idem, en TOML
└── .htaccess             # cabeceras de seguridad (Apache)
```

## Verlo en local

Como es un sitio modular con **CSP estricta**, **no lo abras con doble clic** (`file://`
lo bloquea a propósito). Levanta un servidor estático:

```bash
cd web-demo
python3 -m http.server 8000
# abre http://localhost:8000
```

(o `npx serve`, la extensión *Live Server* de VS Code, etc.)

## Configuración (solo `assets/config.js`)

```js
support: {
  paypalBusiness: "tucorreo@ejemplo.com", // tu PayPal (concepto "Donativo OREMUS" + monto)
  // o paypalHostedButtonId / paypalMe
  currency: "MXN",
  suggested: [50, 100, 200, 500],
  bank: { banco:"BBVA", beneficiario:"Tu Nombre", clabe:"...", concepto:"Donativo OREMUS" },
  formspreeId: "",              // recomendado: recibe comentarios sin exponer tu correo
  feedbackEmail: "tucorreo@…"   // alternativa por mailto
},
analytics: { goatcounterCode: "" } // GoatCounter (sin cookies) para el % Android/iOS
```

> Nunca pongas contraseñas, tokens ni claves de API aquí: el navegador del visitante
> puede leer este archivo. Los datos de PayPal/banco son públicos por naturaleza.

---

## Seguridad — qué se hizo (y qué NO es seguridad)

**La verdad primero:** una web corre en el navegador del visitante, así que **su código
siempre es visible**. Ofuscar o “esconder” el JavaScript **no es seguridad** — cualquiera
abre las DevTools. La seguridad real de un front‑end está en cerrar vectores de ataque:

| Medida | Implementación |
|---|---|
| **Anti‑XSS** | Todo el DOM dinámico se construye con `textContent`/`createElement`. **Nunca** se inserta dato de usuario con `innerHTML` (solo se usa para los SVG de iconos, que son constantes nuestras). |
| **CSP estricta** | `script-src 'self'` (bloquea scripts inyectados), `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`, `default-src 'none'`. Sin `unsafe-inline` en scripts: **no hay un solo `onclick` en el HTML**, todo con `addEventListener`. |
| **Cabeceras** | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (anti‑clickjacking), `Referrer-Policy`, `Permissions-Policy` (geolocalización solo `self`; cámara/micrófono/pago desactivados), **HSTS**, COOP/CORP. En `_headers`, `netlify.toml` y `.htaccess`. |
| **Enlaces externos** | `rel="noopener noreferrer"` y `window.open` con `opener` anulado (evita *tabnabbing*). |
| **Anti‑spam** | Comentarios con **honeypot** (campo trampa oculto), **límite de frecuencia** (1 cada 15 s) y **tope de longitud** (nombre 80 / mensaje 2000). |
| **Sin secretos** | No hay claves ni tokens en el cliente; no hay backend propio que atacar. |
| **Datos** | `localStorage` siempre en `try/catch`; config congelada con `Object.freeze`. La ubicación se usa en el momento y **no se guarda**. |

**Lo que un front‑end estático NO puede garantizar** (y es honesto decirlo): validación de
lado servidor, protección del contenido ante copia, o “no ser hackeable”. Si en el futuro
agregas backend (guardar comentarios, pagos propios), ahí van: validación/-sanitización en
servidor, autenticación, HTTPS obligatorio, rate‑limiting real y protección CSRF.

> **Nota sobre el artefacto de claude.ai:** ese preview es un único archivo con scripts en
> línea (por eso puede compartirse al instante), y por diseño no lleva la CSP estricta ni
> las cabeceras. **La versión endurecida es esta carpeta**, pensada para publicarse en tu
> hosting con las cabeceras incluidas.

---

## Publicarlo (con las cabeceras de seguridad)

- **Netlify / Cloudflare Pages:** arrastra la carpeta `web-demo` (o conéctala al repo). Los
  archivos `_headers` / `netlify.toml` aplican la CSP y demás cabeceras automáticamente.
- **Apache (hosting clásico):** sube el contenido; el `.htaccess` fija las cabeceras.
- **GitHub Pages:** funciona, pero **no permite cabeceras personalizadas**; en ese caso la
  CSP del `<meta>` sigue activa, pero para todas las cabeceras usa Netlify/Cloudflare.

Verifica tu despliegue en <https://securityheaders.com> y <https://csp-evaluator.withgoogle.com>.

## Analítica (Android vs iOS) y comentarios

- **GoatCounter** (gratis, sin cookies): pon `goatcounterCode` en `config.js`. Registra
  `plataforma/Android|iOS|Escritorio` y en su panel ves el desglose.
- **Formspree**: pon `formspreeId` para recibir los comentarios sin exponer tu correo.
- **Panel del dueño:** abre `…?panel=1` para ver, en tu navegador, conteos por plataforma,
  clics en *Donar* y nº de comentarios. Los totales globales van a tu analítica/Formspree.

## Qué mirar para decidir

- **% iOS vs % Android** → dónde priorizar la app nativa y el gasto de tienda.
- **% Escritorio alto** → considera también una PWA.
- **Vistas más usadas** (Rosario, Adoración, Misas) → qué función engancha.
- **Clics en “Usar mi ubicación”** y en **Donar** → interés real y disposición a apoyar.

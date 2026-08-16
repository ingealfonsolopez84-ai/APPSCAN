# Oremus — Demo web (para medir tracción)

`index.html` es una **réplica web navegable** de la app Oremus (Inicio, Oraciones,
Rosario guiado, Misas con geolocalización y Adoración). Es un **solo archivo**, sin
dependencias, sin backend. Sirve para compartir un enlace y **medir dónde tienes más
impacto: Android, iOS o escritorio.**

## Cómo funciona la medición

1. **Detección de plataforma** — al abrir, lee `navigator.userAgent` y clasifica al
   visitante en **Android / iOS / Escritorio** (incluye el caso de iPadOS, que se
   reporta como Mac). Es un dato de categoría, **no personal**.
2. **Panel local del dueño** — abre el enlace con `?panel=1` para ver un recuadro con
   los conteos guardados **en tu propio navegador** (útil para probar). Ejemplo:
   `https://tusitio.com/?panel=1`
3. **Totales entre todos los visitantes** — como una página estática no puede sumar
   visitas de otras personas, esto lo da un analítico externo (abajo). Es la pieza que
   te dice, de verdad, "tengo X% de Android vs Y% de iOS".

## Publicarlo gratis (elige uno)

### Opción A — GitHub Pages (0 €, 2 min)
```bash
# en la raíz del repo
git subtree push --prefix oremus/web-demo origin gh-pages   # o copia index.html a una rama/carpeta servida
```
O más simple desde la web de GitHub: **Settings → Pages → Deploy from a branch**,
elige la rama y la carpeta `/oremus/web-demo`. Tu demo quedará en
`https://<usuario>.github.io/<repo>/`.

### Opción B — Netlify / Vercel (arrastrar y soltar)
Entra a Netlify Drop (`app.netlify.com/drop`) y **arrastra la carpeta `web-demo`**.
Te da una URL pública al instante, con HTTPS.

> HTTPS es necesario para que funcione la **geolocalización** (Misas) en el navegador.

## Conectar la analítica de plataforma (gratis, sin cookies)

### GoatCounter (recomendado: gratis, sin cookies, muestra SO/plataforma)
1. Crea una cuenta en <https://www.goatcounter.com> → obtienes un código, p. ej. `oremus`.
2. En `index.html`, arriba del `<script>`, cambia:
   ```js
   const ANALYTICS = { goatcounterCode: "oremus" };
   ```
3. Listo. Cada visita registra un evento `plataforma/Android`, `plataforma/iOS` o
   `plataforma/Escritorio`. En tu panel de GoatCounter verás el desglose y podrás
   ordenar por plataforma para saber dónde tienes más impacto.

### Alternativas
- **Cloudflare Web Analytics** (gratis, sin cookies): pega su snippet antes de `</script>`.
  Ya trae desglose por sistema operativo.
- **Plausible / Umami / Simple Analytics**: de pago o autoalojados; mismo enfoque.

> El **artefacto de claude.ai** sirve para *ver y compartir* el demo al instante, pero
> bloquea llamadas externas: la analítica agregada solo funciona cuando lo publicas en
> tu propio hosting (GitHub Pages / Netlify).

## Privacidad

Sin cuentas, sin cookies propias, sin datos personales. Solo se cuenta la **categoría de
dispositivo**. La ubicación (Misas) se pide en el momento, se usa para abrir Mapas y no
se guarda. Declara *"No se recopilan datos personales"* con tranquilidad.

## Apoyo: donativos (PayPal) y comentarios

El demo incluye un apartado **"Apoya a Oremus"** (botón ♥ en la cabecera y tarjeta en
Inicio) con el mensaje de apoyo, un **botón de donación por PayPal** y un formulario de
**comentarios**. Todo se configura en un solo bloque `const SUPPORT = { … }` al inicio
del `<script>` de `index.html`:

```js
const SUPPORT = {
  // PayPal — elige UNA vía (prioridad: negocio > botón > paypal.me)
  paypalBusiness: "tucorreo@ejemplo.com", // permite fijar concepto "Donativo OREMUS" y monto
  paypalHostedButtonId: "",               // o el ID de un botón "Donar" creado en PayPal
  paypalMe: "",                            // o tu usuario de PayPal.me
  currency: "MXN",
  suggested: [50, 100, 200, 500],         // montos sugeridos

  // Transferencia bancaria (opcional; déjalo vacío para ocultarlo)
  bank: { banco:"BBVA", beneficiario:"Tu Nombre", cuenta:"", clabe:"0123 4567 8901 2345 67", concepto:"Donativo OREMUS" },

  // Comentarios
  feedbackEmail: "tucorreo@ejemplo.com",   // los comentarios llegan por correo (mailto)
  formspreeId: ""                          // o un ID de Formspree para recibirlos sin abrir el correo
};
```

- **El donativo cobra a TU cuenta de PayPal.** Con `paypalBusiness` el pago se etiqueta
  con el concepto **"Donativo OREMUS"** y toma el monto elegido; PayPal maneja los datos
  de pago de forma segura (la página nunca ve tarjetas ni contraseñas).
- **Datos bancarios:** los que pongas en `bank` se muestran con botón de "copiar". Son
  **tuyos**; nadie más los edita.
- **Comentarios:** se guardan en el navegador del visitante y, además,
  - con `formspreeId` → te llegan a Formspree (recomendado, no expone tu correo), o
  - con `feedbackEmail` → abren el correo del visitante ya redactado hacia tu email.
  > En el **artefacto de claude.ai** el envío por Formspree no funciona (bloquea red);
  > usa `feedbackEmail` para probar, o publica en tu hosting para Formspree.
- Métricas rápidas: abre con `?panel=1` para ver clics en *Donar* y número de comentarios
  guardados en tu navegador. Los totales reales van a tu analítica/Formspree.

> Seguridad: no se piden ni almacenan datos de pago en la página. Un donativo por PayPal
> es una transacción tuya con PayPal; el demo solo abre el enlace a tu cuenta.

## Qué mirar para decidir

- **% iOS vs % Android** → dónde priorizar la app nativa y el gasto de tienda.
- **% Escritorio alto** → considera también una versión web/PWA.
- **Páginas más visitadas** (Rosario, Adoración, Misas) → qué función engancha más.
- **Tasa de uso de "Usar mi ubicación"** → interés real en Misas cercanas.
```

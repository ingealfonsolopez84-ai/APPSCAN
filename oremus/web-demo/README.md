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

## Qué mirar para decidir

- **% iOS vs % Android** → dónde priorizar la app nativa y el gasto de tienda.
- **% Escritorio alto** → considera también una versión web/PWA.
- **Páginas más visitadas** (Rosario, Adoración, Misas) → qué función engancha más.
- **Tasa de uso de "Usar mi ubicación"** → interés real en Misas cercanas.
```

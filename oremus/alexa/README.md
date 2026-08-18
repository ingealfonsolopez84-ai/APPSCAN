# Santo Rosario — Skill de Amazon Alexa (Oremus)

Reza el **Santo Rosario guiado por voz**. Di *“Alexa, abre santo rosario”* y luego
*“reza el rosario”*: Alexa reza los misterios del día y tú avanzas diciendo
**“siguiente”**, repites con **“repite”** y terminas con **“detente”**.

> 💡 **Publicar skills de Alexa es GRATIS** (a diferencia de App Store/Play Store).
> Con un skill **Alexa-hosted**, Amazon te da el servidor (AWS Lambda) sin costo.

## Contenido de esta carpeta
```
alexa/
├── skill-package/
│   ├── skill.json                         # manifiesto (nombre, categoría, idiomas)
│   └── interactionModels/custom/
│       ├── es-MX.json                      # frases y comandos (México)
│       └── es-ES.json                      # frases y comandos (España)
└── lambda/
    ├── index.js                           # lógica del skill (Node.js, ask-sdk)
    ├── rosary.js                           # contenido del Rosario (SSML por segmentos)
    └── package.json                        # dependencias
```

## Cómo se reza (flujo)
El Rosario se divide en **7 segmentos**: oraciones iniciales (señal de la cruz, Credo,
Padre Nuestro, 3 Ave Marías, Gloria), **un segmento por cada misterio** (anuncio +
Padre Nuestro + 10 Ave Marías + Gloria + oración de Fátima) y las **oraciones finales**
(Salve). Alexa reza cada segmento de corrido con pausas; tú dices **“siguiente”** para
pasar al próximo misterio. Los misterios del día se eligen solos:
lunes/sábado = Gozosos · jueves = Luminosos · martes/viernes = Dolorosos · miércoles/domingo = Gloriosos.

---

## Opción A — Crearlo en la consola (la más fácil, 15 min, gratis)

1. Entra a **https://developer.amazon.com/alexa/console/ask** (crea cuenta gratis).
2. **Create Skill** → Nombre: `Santo Rosario` → idioma **Español (MX)**.
3. Tipo: **Custom** · Hosting: **Alexa-hosted (Node.js)** → **Create skill**.
4. **Build → JSON Editor:** borra lo que haya y pega el contenido de
   `skill-package/interactionModels/custom/es-MX.json` → **Save Model** → **Build Model**.
5. **Code** (pestaña): reemplaza los archivos por los de la carpeta `lambda/`:
   - Pega `lambda/index.js` en `index.js`.
   - Crea un archivo `rosary.js` y pega `lambda/rosary.js`.
   - Asegúrate de que `package.json` tenga las dependencias de `lambda/package.json`
     (`ask-sdk-core`). → **Save** → **Deploy**.
6. **Test** (pestaña): cambia a *Development* y escribe o di:
   `abre santo rosario` → `reza el rosario` → `siguiente`.

> Para añadir España: en **Build**, agrega el idioma **Español (ES)** y pega
> `es-ES.json`.

## Opción B — Con ASK CLI (para desarrolladores)

```bash
npm install -g ask-cli
ask configure                 # inicia sesión con tu cuenta de Amazon
cd oremus/alexa
ask deploy                    # sube skill-package + lambda
```
(La estructura ya está lista: `skill-package/` y `lambda/`.)

---

## Probar sin dispositivo
En la pestaña **Test** de la consola tienes un simulador (escribe o habla).
También funciona en cualquier Echo/allí donde inicies sesión con tu cuenta de desarrollador.

## Publicar (certificación) — gratis
1. **Distribution:** completa ícono (108x108 y 512x512), descripción y frases de ejemplo
   (ya vienen en `skill.json`), y una **política de privacidad** (puedes usar
   `https://oremusweb.netlify.app/`).
2. **Certification → Submit for review.** Amazon revisa (suele tardar 1–3 días).
3. Al aprobarse, cualquiera podrá activarlo diciendo *“Alexa, abre santo rosario”*.

### Costo
- **0 USD.** Crear, probar y publicar es gratis. El hosting *Alexa-hosted* incluye el
  AWS Lambda gratuito para el uso normal de un skill.

## Notas y mejoras futuras
- Voz: puedes cambiar la voz/idioma o usar `<voice>`/`<amazon:domain>` en el SSML de
  `rosary.js` para un tono más solemne.
- Reanudar donde te quedaste: guardar el progreso con *persistencia* (S3/DynamoDB en
  Alexa-hosted) para continuar el rosario más tarde.
- Modo “letanías” y “coronilla de la Divina Misericordia” como intents adicionales.
- Recordatorio diario del rosario con la API de *Reminders* de Alexa.

# 🩺 Citas Médicas — Sistema de agenda para consultorios

MVP de un sistema de citas para consultorios médicos independientes, pensado
como producto **SaaS por suscripción**. Incluye agenda con estados, registro de
pacientes, recordatorios por WhatsApp y —el diferenciador— **analítica del
consultorio** (tasa de no-show, horarios pico, pacientes recurrentes).

## ¿Qué resuelve?

- **Ausentismo (no-show):** recordatorios automáticos por WhatsApp, que es lo
  que más reduce las ausencias.
- **Desorganización de la agenda:** vista del día con estados claros
  (programada, confirmada, cancelada, no-show, atendida).
- **Falta de visibilidad:** métricas que justifican cobrar suscripción en vez
  de un pago único.

## Arquitectura

```
citas-medicas/
├── app/
│   ├── main.py          # App FastAPI y montaje de routers
│   ├── config.py        # Configuración vía variables de entorno / .env
│   ├── database.py      # Motor y sesión de SQLAlchemy
│   ├── models.py        # Consultorio, Paciente, Cita, RecordatorioLog
│   ├── schemas.py       # Modelos Pydantic (entrada/salida)
│   ├── crud.py          # Acceso a datos
│   ├── metrics.py       # Cálculos puros (probables sin dependencias)
│   ├── analytics.py     # Métricas del consultorio sobre la BD
│   ├── whatsapp.py      # Recordatorios (proveedores: stub / twilio / meta)
│   ├── routers/         # API REST + vistas web (HTMX)
│   ├── templates/       # Jinja2 + HTMX
│   └── static/          # CSS + enhancer de HTMX
├── seed.py              # Datos de demostración
├── tests/               # Pruebas (pytest)
└── requirements.txt
```

**Stack:** FastAPI · SQLAlchemy 2 · Pydantic · Jinja2 + HTMX · SQLite (dev) /
PostgreSQL (producción).

## Puesta en marcha

Requiere Python 3.11+.

```bash
cd citas-medicas
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env          # ajusta configuración si quieres
python seed.py                # (opcional) datos de demostración
uvicorn app.main:app --reload
```

Abre <http://localhost:8000>:

- `/` — Panel con métricas (no-show, horarios pico, recurrentes)
- `/agenda` — Agenda del día, crear citas, cambiar estado, enviar recordatorio
- `/pacientes` — Alta y búsqueda de pacientes
- `/docs` — Documentación interactiva de la API (Swagger)

> La interfaz funciona **con o sin JavaScript**: HTMX mejora la experiencia
> (actualizaciones parciales), pero si no carga, los formularios recargan la
> página igualmente.

## Recordatorios por WhatsApp

Configurable con `WHATSAPP_PROVIDER` en `.env`:

| Valor    | Comportamiento                                              |
|----------|-------------------------------------------------------------|
| `stub`   | No envía nada real; registra en consola y BD (dev/demo).    |
| `twilio` | Usa la API de WhatsApp de Twilio.                           |
| `meta`   | Usa la WhatsApp Business Cloud API (Meta).                  |

Cada intento queda registrado en la tabla `recordatorios_log` (auditoría).

## Pruebas

```bash
# Suite completa (requiere las dependencias instaladas):
pytest

# Solo la lógica de métricas (biblioteca estándar, sin dependencias):
python tests/test_metrics.py
```

## API (resumen)

| Método | Ruta                                   | Descripción                        |
|--------|----------------------------------------|------------------------------------|
| GET    | `/api/pacientes`                       | Listar/buscar pacientes            |
| POST   | `/api/pacientes`                       | Crear paciente                     |
| GET    | `/api/citas`                           | Citas por rango de fechas          |
| POST   | `/api/citas`                           | Crear cita                         |
| PATCH  | `/api/citas/{id}/estado`               | Cambiar estado de una cita         |
| POST   | `/api/citas/{id}/recordatorio`         | Enviar recordatorio por WhatsApp   |
| GET    | `/api/analitica/resumen`               | Métricas del periodo               |
| GET    | `/api/analitica/horarios-pico`         | Distribución por hora              |
| GET    | `/api/analitica/pacientes-recurrentes` | Pacientes con más citas            |
| GET    | `/api/analitica/tendencia-no-show`     | Tasa de no-show por semana         |

## Hoja de ruta (siguientes pasos)

- [ ] Autenticación y multi-tenant real (varios consultorios / usuarios).
- [ ] Envío programado de recordatorios (tarea periódica, p. ej. 24 h antes).
- [ ] Webhook de WhatsApp para procesar respuestas CONFIRMAR / CANCELAR.
- [ ] Vista de semana y bloqueo de horarios no disponibles.
- [ ] Exportación de reportes (PDF/CSV) para el médico.
- [ ] Modelo de predicción de no-show por paciente (alimenta el portafolio de
      analítica freelance).

## Modelo de negocio

SaaS por suscripción mensual (≈ 400–800 MXN por consultorio). Estrategia de
arranque: 2–3 consultorios piloto con descuento a cambio de testimonios.

## ⚠️ Consideración regulatoria

Este MVP maneja **datos de citas**, no un expediente clínico completo. Si más
adelante guardas información clínica, entras en el ámbito de la
**NOM-024-SSA3** (expediente clínico electrónico) y de la Ley de Protección de
Datos Personales en México. No es asesoría legal: conviene revisarlo con un
especialista antes de escalar.

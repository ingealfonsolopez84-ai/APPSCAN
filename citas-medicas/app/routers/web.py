"""Vistas web renderizadas con Jinja2 + HTMX (panel de la recepcionista/médico)."""
from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from .. import analytics, crud, models, schemas, whatsapp
from ..config import settings
from ..database import get_db

router = APIRouter(tags=["web"])
templates = Jinja2Templates(directory=str(Path(__file__).resolve().parent.parent / "templates"))

TZ = ZoneInfo(settings.timezone)


def _dia_utc(d: date) -> tuple[datetime, datetime]:
    """Rango [inicio, fin) del día local expresado en UTC."""
    inicio_local = datetime.combine(d, time.min, tzinfo=TZ)
    fin_local = inicio_local + timedelta(days=1)
    return inicio_local.astimezone(timezone.utc), fin_local.astimezone(timezone.utc)


def _fmt_hora(dt: datetime) -> str:
    return dt.astimezone(TZ).strftime("%H:%M")


@router.get("/", response_class=HTMLResponse)
def inicio(request: Request, db: Session = Depends(get_db)):
    consultorio = crud.obtener_o_crear_consultorio_default(db)
    metricas = analytics.resumen(db, consultorio.id, dias=30)
    recurrentes = analytics.pacientes_recurrentes(db, consultorio.id)
    pico = analytics.horarios_pico(db, consultorio.id)
    max_pico = max((h["citas"] for h in pico), default=0) or 1
    return templates.TemplateResponse(
        "dashboard.html",
        {
            "request": request,
            "consultorio": consultorio,
            "m": metricas,
            "recurrentes": recurrentes,
            "pico": pico,
            "max_pico": max_pico,
        },
    )


@router.get("/agenda", response_class=HTMLResponse)
def agenda(request: Request, dia: str | None = None, db: Session = Depends(get_db)):
    consultorio = crud.obtener_o_crear_consultorio_default(db)
    d = date.fromisoformat(dia) if dia else datetime.now(TZ).date()
    desde, hasta = _dia_utc(d)
    citas = crud.listar_citas_rango(db, consultorio.id, desde, hasta)
    pacientes = crud.listar_pacientes(db, consultorio.id)
    return templates.TemplateResponse(
        "agenda.html",
        {
            "request": request,
            "consultorio": consultorio,
            "dia": d,
            "dia_prev": (d - timedelta(days=1)).isoformat(),
            "dia_next": (d + timedelta(days=1)).isoformat(),
            "citas": citas,
            "pacientes": pacientes,
            "estados": list(models.EstadoCita),
            "fmt_hora": _fmt_hora,
        },
    )


@router.post("/agenda/cita", response_class=HTMLResponse)
def crear_cita_web(
    request: Request,
    paciente_id: int = Form(...),
    fecha: str = Form(...),
    hora: str = Form(...),
    duracion_min: int = Form(30),
    motivo: str = Form(""),
    db: Session = Depends(get_db),
):
    consultorio = crud.obtener_o_crear_consultorio_default(db)
    inicio_local = datetime.combine(date.fromisoformat(fecha), time.fromisoformat(hora), tzinfo=TZ)
    crud.crear_cita(
        db,
        schemas.CitaCrear(
            consultorio_id=consultorio.id,
            paciente_id=paciente_id,
            inicio=inicio_local.astimezone(timezone.utc),
            duracion_min=duracion_min,
            motivo=motivo,
        ),
    )
    return _fragmento_agenda(request, db, consultorio.id, date.fromisoformat(fecha))


@router.post("/agenda/cita/{cita_id}/estado", response_class=HTMLResponse)
def cambiar_estado_web(
    request: Request,
    cita_id: int,
    estado: str = Form(...),
    dia: str = Form(...),
    db: Session = Depends(get_db),
):
    consultorio = crud.obtener_o_crear_consultorio_default(db)
    cita = crud.obtener_cita(db, cita_id)
    if cita is not None:
        crud.actualizar_estado_cita(db, cita, models.EstadoCita(estado))
    return _fragmento_agenda(request, db, consultorio.id, date.fromisoformat(dia))


@router.post("/agenda/cita/{cita_id}/recordatorio", response_class=HTMLResponse)
def recordatorio_web(
    request: Request, cita_id: int, dia: str = Form(...), db: Session = Depends(get_db)
):
    consultorio = crud.obtener_o_crear_consultorio_default(db)
    cita = crud.obtener_cita(db, cita_id)
    if cita is not None:
        whatsapp.enviar_recordatorio(db, cita)
    return _fragmento_agenda(request, db, consultorio.id, date.fromisoformat(dia))


@router.post("/pacientes", response_class=HTMLResponse)
def crear_paciente_web(
    request: Request,
    nombre: str = Form(...),
    telefono: str = Form(""),
    email: str = Form(""),
    db: Session = Depends(get_db),
):
    consultorio = crud.obtener_o_crear_consultorio_default(db)
    crud.crear_paciente(
        db,
        schemas.PacienteCrear(
            consultorio_id=consultorio.id, nombre=nombre, telefono=telefono, email=email
        ),
    )
    if not request.headers.get("HX-Request"):
        return RedirectResponse(url="/pacientes", status_code=303)
    pacientes = crud.listar_pacientes(db, consultorio.id)
    return templates.TemplateResponse(
        "_lista_pacientes.html",
        {"request": request, "pacientes": pacientes},
    )


@router.get("/pacientes", response_class=HTMLResponse)
def pagina_pacientes(request: Request, buscar: str | None = None, db: Session = Depends(get_db)):
    consultorio = crud.obtener_o_crear_consultorio_default(db)
    pacientes = crud.listar_pacientes(db, consultorio.id, buscar)
    plantilla = "_lista_pacientes.html" if request.headers.get("HX-Request") else "pacientes.html"
    return templates.TemplateResponse(
        plantilla, {"request": request, "consultorio": consultorio, "pacientes": pacientes}
    )


def _fragmento_agenda(request: Request, db: Session, consultorio_id: int, d: date):
    # Petición HTMX -> devolvemos solo el fragmento de citas.
    # Petición normal (sin JS) -> redirigimos a la agenda completa (patrón PRG).
    if not request.headers.get("HX-Request"):
        return RedirectResponse(url=f"/agenda?dia={d.isoformat()}", status_code=303)
    desde, hasta = _dia_utc(d)
    citas = crud.listar_citas_rango(db, consultorio_id, desde, hasta)
    return templates.TemplateResponse(
        "_lista_citas.html",
        {
            "request": request,
            "citas": citas,
            "dia": d,
            "estados": list(models.EstadoCita),
            "fmt_hora": _fmt_hora,
        },
    )

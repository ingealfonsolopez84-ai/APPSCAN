"""Analítica del consultorio: métricas que justifican el modelo de suscripción."""
from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import models
from .metrics import ingreso_proyectado, tasa_cancelacion, tasa_no_show
from .models import EstadoCita


def _rango_default(dias: int = 30) -> tuple[datetime, datetime]:
    hasta = datetime.now(timezone.utc)
    desde = hasta - timedelta(days=dias)
    return desde, hasta


def resumen(db: Session, consultorio_id: int, dias: int = 30, tarifa: float | None = None) -> dict:
    """Métricas agregadas del periodo: no-show, cancelación, ingreso proyectado."""
    desde, hasta = _rango_default(dias)

    base = select(models.Cita).where(
        models.Cita.consultorio_id == consultorio_id,
        models.Cita.inicio >= desde,
        models.Cita.inicio < hasta,
    )
    citas = list(db.scalars(base))
    total = len(citas)
    atendidas = sum(1 for c in citas if c.estado == EstadoCita.atendida)
    canceladas = sum(1 for c in citas if c.estado == EstadoCita.cancelada)
    no_shows = sum(1 for c in citas if c.estado == EstadoCita.no_show)

    pacientes_activos = db.scalar(
        select(func.count(func.distinct(models.Cita.paciente_id))).where(
            models.Cita.consultorio_id == consultorio_id,
            models.Cita.inicio >= desde,
            models.Cita.inicio < hasta,
        )
    ) or 0

    return {
        "total_citas": total,
        "atendidas": atendidas,
        "canceladas": canceladas,
        "no_shows": no_shows,
        "tasa_no_show": tasa_no_show(no_shows, atendidas),
        "tasa_cancelacion": tasa_cancelacion(canceladas, total),
        "pacientes_activos": pacientes_activos,
        "ingreso_proyectado": ingreso_proyectado(atendidas, tarifa),
    }


def horarios_pico(db: Session, consultorio_id: int, dias: int = 90) -> list[dict]:
    """Distribución de citas por hora del día (para detectar horarios de mayor demanda)."""
    desde, hasta = _rango_default(dias)
    citas = db.scalars(
        select(models.Cita).where(
            models.Cita.consultorio_id == consultorio_id,
            models.Cita.inicio >= desde,
            models.Cita.inicio < hasta,
        )
    )
    conteo: Counter[int] = Counter()
    for c in citas:
        conteo[c.inicio.astimezone(timezone.utc).hour] += 1
    return [{"hora": h, "citas": conteo.get(h, 0)} for h in range(7, 21)]


def pacientes_recurrentes(
    db: Session, consultorio_id: int, minimo: int = 2, limite: int = 10
) -> list[dict]:
    """Pacientes con más citas en el historial (fidelización)."""
    stmt = (
        select(
            models.Paciente.id,
            models.Paciente.nombre,
            func.count(models.Cita.id).label("num_citas"),
        )
        .join(models.Cita, models.Cita.paciente_id == models.Paciente.id)
        .where(models.Paciente.consultorio_id == consultorio_id)
        .group_by(models.Paciente.id, models.Paciente.nombre)
        .having(func.count(models.Cita.id) >= minimo)
        .order_by(func.count(models.Cita.id).desc())
        .limit(limite)
    )
    return [
        {"paciente_id": pid, "nombre": nombre, "num_citas": n}
        for pid, nombre, n in db.execute(stmt).all()
    ]


def tendencia_no_show(db: Session, consultorio_id: int, semanas: int = 8) -> list[dict]:
    """Tasa de no-show por semana, para ver si mejora con los recordatorios."""
    resultado: list[dict] = []
    ahora = datetime.now(timezone.utc)
    for i in range(semanas - 1, -1, -1):
        fin = ahora - timedelta(weeks=i)
        ini = fin - timedelta(weeks=1)
        citas = list(
            db.scalars(
                select(models.Cita).where(
                    models.Cita.consultorio_id == consultorio_id,
                    models.Cita.inicio >= ini,
                    models.Cita.inicio < fin,
                )
            )
        )
        atendidas = sum(1 for c in citas if c.estado == EstadoCita.atendida)
        no_shows = sum(1 for c in citas if c.estado == EstadoCita.no_show)
        resultado.append(
            {"semana": ini.strftime("%d/%m"), "tasa_no_show": tasa_no_show(no_shows, atendidas), "no_shows": no_shows}
        )
    return resultado

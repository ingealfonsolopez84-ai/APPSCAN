"""Operaciones de acceso a datos."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models, schemas


# ---------- Consultorio ----------
def obtener_o_crear_consultorio_default(db: Session) -> models.Consultorio:
    c = db.scalar(select(models.Consultorio).order_by(models.Consultorio.id).limit(1))
    if c is None:
        c = models.Consultorio(nombre="Mi Consultorio")
        db.add(c)
        db.commit()
        db.refresh(c)
    return c


# ---------- Pacientes ----------
def crear_paciente(db: Session, data: schemas.PacienteCrear) -> models.Paciente:
    p = models.Paciente(**data.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def listar_pacientes(db: Session, consultorio_id: int, buscar: str | None = None) -> list[models.Paciente]:
    stmt = select(models.Paciente).where(models.Paciente.consultorio_id == consultorio_id)
    if buscar:
        like = f"%{buscar.strip()}%"
        stmt = stmt.where(
            models.Paciente.nombre.ilike(like) | models.Paciente.telefono.ilike(like)
        )
    stmt = stmt.order_by(models.Paciente.nombre)
    return list(db.scalars(stmt))


def obtener_paciente(db: Session, paciente_id: int) -> models.Paciente | None:
    return db.get(models.Paciente, paciente_id)


# ---------- Citas ----------
def crear_cita(db: Session, data: schemas.CitaCrear) -> models.Cita:
    c = models.Cita(**data.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


def obtener_cita(db: Session, cita_id: int) -> models.Cita | None:
    return db.get(models.Cita, cita_id)


def listar_citas_rango(
    db: Session, consultorio_id: int, desde: datetime, hasta: datetime
) -> list[models.Cita]:
    stmt = (
        select(models.Cita)
        .where(
            models.Cita.consultorio_id == consultorio_id,
            models.Cita.inicio >= desde,
            models.Cita.inicio < hasta,
        )
        .order_by(models.Cita.inicio)
    )
    return list(db.scalars(stmt))


def actualizar_estado_cita(
    db: Session, cita: models.Cita, estado: models.EstadoCita
) -> models.Cita:
    cita.estado = estado
    db.commit()
    db.refresh(cita)
    return cita

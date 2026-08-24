"""Modelos de datos (SQLAlchemy)."""
from __future__ import annotations

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class EstadoCita(str, enum.Enum):
    """Estados del ciclo de vida de una cita."""

    programada = "programada"
    confirmada = "confirmada"
    cancelada = "cancelada"
    no_show = "no_show"          # el paciente no se presentó
    atendida = "atendida"        # cita completada


class Consultorio(Base):
    """Un consultorio médico (tenant). El MVP soporta uno o varios."""

    __tablename__ = "consultorios"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(160), nullable=False)
    medico: Mapped[str] = mapped_column(String(160), default="")
    especialidad: Mapped[str] = mapped_column(String(120), default="")
    telefono: Mapped[str] = mapped_column(String(40), default="")
    creado: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    pacientes: Mapped[list["Paciente"]] = relationship(back_populates="consultorio", cascade="all, delete-orphan")
    citas: Mapped[list["Cita"]] = relationship(back_populates="consultorio", cascade="all, delete-orphan")


class Paciente(Base):
    __tablename__ = "pacientes"

    id: Mapped[int] = mapped_column(primary_key=True)
    consultorio_id: Mapped[int] = mapped_column(ForeignKey("consultorios.id"), index=True)
    nombre: Mapped[str] = mapped_column(String(160), nullable=False)
    telefono: Mapped[str] = mapped_column(String(40), default="", index=True)
    email: Mapped[str] = mapped_column(String(160), default="")
    notas: Mapped[str] = mapped_column(Text, default="")
    creado: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    consultorio: Mapped["Consultorio"] = relationship(back_populates="pacientes")
    citas: Mapped[list["Cita"]] = relationship(back_populates="paciente", cascade="all, delete-orphan")


class Cita(Base):
    __tablename__ = "citas"

    id: Mapped[int] = mapped_column(primary_key=True)
    consultorio_id: Mapped[int] = mapped_column(ForeignKey("consultorios.id"), index=True)
    paciente_id: Mapped[int] = mapped_column(ForeignKey("pacientes.id"), index=True)

    inicio: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    duracion_min: Mapped[int] = mapped_column(Integer, default=30)
    estado: Mapped[EstadoCita] = mapped_column(
        SAEnum(EstadoCita, native_enum=False, length=20), default=EstadoCita.programada, index=True
    )
    motivo: Mapped[str] = mapped_column(String(240), default="")
    notas: Mapped[str] = mapped_column(Text, default="")

    # Control de recordatorios
    recordatorio_enviado: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    creado: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    actualizado: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    consultorio: Mapped["Consultorio"] = relationship(back_populates="citas")
    paciente: Mapped["Paciente"] = relationship(back_populates="citas")


class RecordatorioLog(Base):
    """Registro de recordatorios enviados (auditoría y métricas)."""

    __tablename__ = "recordatorios_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    cita_id: Mapped[int] = mapped_column(ForeignKey("citas.id"), index=True)
    canal: Mapped[str] = mapped_column(String(30), default="whatsapp")
    proveedor: Mapped[str] = mapped_column(String(30), default="stub")
    destino: Mapped[str] = mapped_column(String(60), default="")
    mensaje: Mapped[str] = mapped_column(Text, default="")
    exito: Mapped[bool] = mapped_column(default=True)
    detalle: Mapped[str] = mapped_column(Text, default="")
    enviado: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

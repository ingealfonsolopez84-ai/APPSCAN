"""Schemas de entrada/salida (Pydantic)."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from .models import EstadoCita


# ---------- Paciente ----------
class PacienteBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=160)
    telefono: str = Field(default="", max_length=40)
    email: str = Field(default="", max_length=160)
    notas: str = ""


class PacienteCrear(PacienteBase):
    consultorio_id: int = 1


class PacienteOut(PacienteBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    consultorio_id: int
    creado: datetime


# ---------- Cita ----------
class CitaBase(BaseModel):
    inicio: datetime
    duracion_min: int = Field(default=30, ge=5, le=480)
    motivo: str = Field(default="", max_length=240)
    notas: str = ""


class CitaCrear(CitaBase):
    consultorio_id: int = 1
    paciente_id: int


class CitaActualizarEstado(BaseModel):
    estado: EstadoCita


class CitaOut(CitaBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    consultorio_id: int
    paciente_id: int
    estado: EstadoCita
    recordatorio_enviado: datetime | None = None
    creado: datetime


# ---------- Analítica ----------
class MetricasResumen(BaseModel):
    total_citas: int
    atendidas: int
    canceladas: int
    no_shows: int
    tasa_no_show: float          # 0..1
    tasa_cancelacion: float      # 0..1
    pacientes_activos: int
    ingreso_proyectado: float | None = None

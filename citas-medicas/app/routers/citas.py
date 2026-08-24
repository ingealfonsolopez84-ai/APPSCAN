"""API REST de citas."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import crud, models, schemas, whatsapp
from ..database import get_db

router = APIRouter(prefix="/api/citas", tags=["citas"])


@router.get("", response_model=list[schemas.CitaOut])
def listar(
    consultorio_id: int = 1,
    desde: datetime | None = Query(default=None),
    hasta: datetime | None = Query(default=None),
    db: Session = Depends(get_db),
):
    if desde is None:
        desde = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    if hasta is None:
        hasta = desde + timedelta(days=1)
    return crud.listar_citas_rango(db, consultorio_id, desde, hasta)


@router.post("", response_model=schemas.CitaOut, status_code=201)
def crear(data: schemas.CitaCrear, db: Session = Depends(get_db)):
    if crud.obtener_paciente(db, data.paciente_id) is None:
        raise HTTPException(400, "El paciente no existe")
    return crud.crear_cita(db, data)


@router.patch("/{cita_id}/estado", response_model=schemas.CitaOut)
def cambiar_estado(
    cita_id: int, data: schemas.CitaActualizarEstado, db: Session = Depends(get_db)
):
    cita = crud.obtener_cita(db, cita_id)
    if cita is None:
        raise HTTPException(404, "Cita no encontrada")
    return crud.actualizar_estado_cita(db, cita, data.estado)


@router.post("/{cita_id}/recordatorio")
def enviar_recordatorio(cita_id: int, db: Session = Depends(get_db)):
    cita = crud.obtener_cita(db, cita_id)
    if cita is None:
        raise HTTPException(404, "Cita no encontrada")
    resultado = whatsapp.enviar_recordatorio(db, cita)
    return {"exito": resultado.exito, "detalle": resultado.detalle}

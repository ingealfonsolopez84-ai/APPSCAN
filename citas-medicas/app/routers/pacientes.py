"""API REST de pacientes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api/pacientes", tags=["pacientes"])


@router.get("", response_model=list[schemas.PacienteOut])
def listar(
    consultorio_id: int = 1,
    buscar: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return crud.listar_pacientes(db, consultorio_id, buscar)


@router.post("", response_model=schemas.PacienteOut, status_code=201)
def crear(data: schemas.PacienteCrear, db: Session = Depends(get_db)):
    return crud.crear_paciente(db, data)


@router.get("/{paciente_id}", response_model=schemas.PacienteOut)
def detalle(paciente_id: int, db: Session = Depends(get_db)):
    p = crud.obtener_paciente(db, paciente_id)
    if p is None:
        raise HTTPException(404, "Paciente no encontrado")
    return p

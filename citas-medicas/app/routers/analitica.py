"""API REST de analítica."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from .. import analytics
from ..database import get_db

router = APIRouter(prefix="/api/analitica", tags=["analitica"])


@router.get("/resumen")
def resumen(
    consultorio_id: int = 1,
    dias: int = 30,
    tarifa: float | None = Query(default=None, description="Tarifa por consulta para ingreso proyectado"),
    db: Session = Depends(get_db),
):
    return analytics.resumen(db, consultorio_id, dias, tarifa)


@router.get("/horarios-pico")
def horarios_pico(consultorio_id: int = 1, dias: int = 90, db: Session = Depends(get_db)):
    return analytics.horarios_pico(db, consultorio_id, dias)


@router.get("/pacientes-recurrentes")
def pacientes_recurrentes(consultorio_id: int = 1, db: Session = Depends(get_db)):
    return analytics.pacientes_recurrentes(db, consultorio_id)


@router.get("/tendencia-no-show")
def tendencia_no_show(consultorio_id: int = 1, semanas: int = 8, db: Session = Depends(get_db)):
    return analytics.tendencia_no_show(db, consultorio_id, semanas)

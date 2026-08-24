"""Cálculos de métricas puros, sin dependencias externas ni de base de datos.

Separados a propósito para poder probarlos con la biblioteca estándar.
"""
from __future__ import annotations


def tasa_no_show(no_shows: int, atendidas: int) -> float:
    """Proporción de ausencias sobre las citas con desenlace conocido (0..1)."""
    resueltas = no_shows + atendidas
    return round(no_shows / resueltas, 4) if resueltas else 0.0


def tasa_cancelacion(canceladas: int, total: int) -> float:
    """Proporción de citas canceladas sobre el total (0..1)."""
    return round(canceladas / total, 4) if total else 0.0


def ingreso_proyectado(atendidas: int, tarifa: float | None) -> float | None:
    """Ingreso estimado por citas atendidas a una tarifa dada."""
    return round(atendidas * tarifa, 2) if tarifa else None

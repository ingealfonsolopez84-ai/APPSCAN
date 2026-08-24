"""Pruebas de los cálculos de métricas puros (no requieren dependencias externas).

Se pueden ejecutar con la biblioteca estándar:
    python -m pytest tests/test_metrics.py
    # o incluso sin pytest:
    python tests/test_metrics.py
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.metrics import ingreso_proyectado, tasa_cancelacion, tasa_no_show


def test_tasa_no_show_basica():
    assert tasa_no_show(no_shows=2, atendidas=8) == 0.2


def test_tasa_no_show_sin_citas_resueltas():
    assert tasa_no_show(no_shows=0, atendidas=0) == 0.0


def test_tasa_no_show_ignora_programadas():
    # Solo cuentan atendidas + no_shows (desenlace conocido).
    assert tasa_no_show(no_shows=1, atendidas=3) == 0.25


def test_tasa_cancelacion():
    assert tasa_cancelacion(canceladas=3, total=12) == 0.25
    assert tasa_cancelacion(canceladas=0, total=0) == 0.0


def test_ingreso_proyectado():
    assert ingreso_proyectado(atendidas=10, tarifa=500) == 5000.0
    assert ingreso_proyectado(atendidas=10, tarifa=None) is None  # sin tarifa -> None
    assert ingreso_proyectado(atendidas=0, tarifa=500) == 0.0     # con tarifa pero 0 atendidas -> 0.0


if __name__ == "__main__":
    # Ejecución directa sin pytest.
    fns = [v for k, v in list(globals().items()) if k.startswith("test_")]
    for fn in fns:
        fn()
        print(f"  ✓ {fn.__name__}")
    print(f"\n✅ {len(fns)} pruebas de métricas pasaron")

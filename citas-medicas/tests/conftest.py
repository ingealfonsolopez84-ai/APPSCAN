"""Configuración de pytest: base de datos temporal por sesión de prueba."""
from __future__ import annotations

import os
import tempfile

import pytest

# Usa una BD SQLite temporal antes de importar la app.
_db_fd, _db_path = tempfile.mkstemp(suffix=".db")
os.environ["DATABASE_URL"] = f"sqlite:///{_db_path}"
os.environ["WHATSAPP_PROVIDER"] = "stub"

from fastapi.testclient import TestClient  # noqa: E402

from app.database import init_db  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _preparar_db():
    init_db()
    yield
    os.close(_db_fd)
    os.unlink(_db_path)


@pytest.fixture()
def client():
    return TestClient(app)

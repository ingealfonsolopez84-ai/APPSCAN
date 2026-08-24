"""Punto de entrada de la aplicación FastAPI."""
from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .database import init_db
from .routers import analitica, citas, pacientes, web

app = FastAPI(title="Citas Médicas", version="0.1.0")


@app.on_event("startup")
def _startup() -> None:
    init_db()


app.mount(
    "/static",
    StaticFiles(directory=str(Path(__file__).resolve().parent / "static")),
    name="static",
)

app.include_router(web.router)
app.include_router(pacientes.router)
app.include_router(citas.router)
app.include_router(analitica.router)


@app.get("/salud", tags=["infra"])
def salud() -> dict:
    return {"estado": "ok"}

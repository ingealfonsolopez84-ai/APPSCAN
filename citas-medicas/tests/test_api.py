"""Pruebas de la API: pacientes, citas, estados, recordatorios y analítica."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone


def _crear_paciente(client, nombre="Paciente Test", telefono="+523520000000"):
    r = client.post("/api/pacientes", json={"nombre": nombre, "telefono": telefono})
    assert r.status_code == 201, r.text
    return r.json()


def test_salud(client):
    assert client.get("/salud").json() == {"estado": "ok"}


def test_crear_y_listar_paciente(client):
    p = _crear_paciente(client, "María López")
    assert p["nombre"] == "María López"
    listado = client.get("/api/pacientes").json()
    assert any(x["id"] == p["id"] for x in listado)


def test_buscar_paciente(client):
    _crear_paciente(client, "Zoraida Quintero", "+523529998877")
    r = client.get("/api/pacientes", params={"buscar": "Zoraida"})
    assert r.status_code == 200
    assert any("Zoraida" in x["nombre"] for x in r.json())


def test_ciclo_de_cita(client):
    p = _crear_paciente(client)
    inicio = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
    r = client.post("/api/citas", json={"paciente_id": p["id"], "inicio": inicio, "motivo": "Consulta"})
    assert r.status_code == 201, r.text
    cita = r.json()
    assert cita["estado"] == "programada"

    # Cambiar estado
    r2 = client.patch(f"/api/citas/{cita['id']}/estado", json={"estado": "atendida"})
    assert r2.status_code == 200
    assert r2.json()["estado"] == "atendida"


def test_cita_paciente_inexistente(client):
    inicio = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
    r = client.post("/api/citas", json={"paciente_id": 999999, "inicio": inicio})
    assert r.status_code == 400


def test_recordatorio_stub(client):
    p = _crear_paciente(client, "Recordatorio Test", "+523521112233")
    inicio = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    cita = client.post("/api/citas", json={"paciente_id": p["id"], "inicio": inicio}).json()
    r = client.post(f"/api/citas/{cita['id']}/recordatorio")
    assert r.status_code == 200
    assert r.json()["exito"] is True


def test_recordatorio_sin_telefono(client):
    p = _crear_paciente(client, "Sin Teléfono", "")
    inicio = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    cita = client.post("/api/citas", json={"paciente_id": p["id"], "inicio": inicio}).json()
    r = client.post(f"/api/citas/{cita['id']}/recordatorio")
    assert r.json()["exito"] is False


def test_analitica_resumen(client):
    r = client.get("/api/analitica/resumen", params={"dias": 60, "tarifa": 500})
    assert r.status_code == 200
    data = r.json()
    for clave in ("total_citas", "atendidas", "no_shows", "tasa_no_show", "pacientes_activos"):
        assert clave in data
    assert 0.0 <= data["tasa_no_show"] <= 1.0


def test_analitica_endpoints(client):
    assert client.get("/api/analitica/horarios-pico").status_code == 200
    assert client.get("/api/analitica/pacientes-recurrentes").status_code == 200
    assert client.get("/api/analitica/tendencia-no-show").status_code == 200


def test_paginas_web(client):
    assert client.get("/").status_code == 200
    assert client.get("/agenda").status_code == 200
    assert client.get("/pacientes").status_code == 200

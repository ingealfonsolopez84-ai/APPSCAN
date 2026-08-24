"""Envío de recordatorios por WhatsApp con proveedores intercambiables.

Proveedores:
  - stub  : no envía nada real, solo registra (ideal para desarrollo/demo).
  - twilio: Twilio WhatsApp API.
  - meta  : WhatsApp Business Cloud API (Meta).

El proveedor se elige con la variable de entorno WHATSAPP_PROVIDER.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

import httpx
from sqlalchemy.orm import Session

from . import models
from .config import settings


@dataclass
class ResultadoEnvio:
    exito: bool
    detalle: str = ""


def _formatear_mensaje(cita: models.Cita) -> str:
    tz = ZoneInfo(settings.timezone)
    inicio_local = cita.inicio.astimezone(tz)
    fecha = inicio_local.strftime("%d/%m/%Y a las %H:%M")
    nombre = cita.paciente.nombre if cita.paciente else "paciente"
    consultorio = cita.consultorio.nombre if cita.consultorio else "el consultorio"
    return (
        f"Hola {nombre}, le recordamos su cita en {consultorio} "
        f"el {fecha}. Responda CONFIRMAR para confirmar o CANCELAR si no podrá asistir. "
        f"¡Gracias!"
    )


# ---------- Proveedores ----------
def _enviar_stub(destino: str, mensaje: str) -> ResultadoEnvio:
    print(f"[WhatsApp:stub] -> {destino}\n{mensaje}\n")
    return ResultadoEnvio(exito=True, detalle="stub (no se envió mensaje real)")


def _enviar_twilio(destino: str, mensaje: str) -> ResultadoEnvio:
    if not (settings.twilio_account_sid and settings.twilio_auth_token):
        return ResultadoEnvio(exito=False, detalle="Faltan credenciales de Twilio")
    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_account_sid}/Messages.json"
    data = {
        "From": settings.twilio_whatsapp_from,
        "To": f"whatsapp:{destino}",
        "Body": mensaje,
    }
    try:
        resp = httpx.post(
            url, data=data,
            auth=(settings.twilio_account_sid, settings.twilio_auth_token),
            timeout=15,
        )
        ok = resp.status_code < 300
        return ResultadoEnvio(exito=ok, detalle=f"HTTP {resp.status_code}")
    except Exception as e:  # noqa: BLE001
        return ResultadoEnvio(exito=False, detalle=str(e))


def _enviar_meta(destino: str, mensaje: str) -> ResultadoEnvio:
    if not (settings.meta_whatsapp_token and settings.meta_whatsapp_phone_id):
        return ResultadoEnvio(exito=False, detalle="Faltan credenciales de Meta")
    url = f"https://graph.facebook.com/v20.0/{settings.meta_whatsapp_phone_id}/messages"
    headers = {"Authorization": f"Bearer {settings.meta_whatsapp_token}"}
    payload = {
        "messaging_product": "whatsapp",
        "to": destino.lstrip("+"),
        "type": "text",
        "text": {"body": mensaje},
    }
    try:
        resp = httpx.post(url, json=payload, headers=headers, timeout=15)
        ok = resp.status_code < 300
        return ResultadoEnvio(exito=ok, detalle=f"HTTP {resp.status_code}")
    except Exception as e:  # noqa: BLE001
        return ResultadoEnvio(exito=False, detalle=str(e))


_PROVEEDORES = {"stub": _enviar_stub, "twilio": _enviar_twilio, "meta": _enviar_meta}


def enviar_recordatorio(db: Session, cita: models.Cita) -> ResultadoEnvio:
    """Envía el recordatorio de una cita y registra el intento."""
    proveedor = settings.whatsapp_provider.lower()
    fn = _PROVEEDORES.get(proveedor, _enviar_stub)
    destino = cita.paciente.telefono if cita.paciente else ""
    mensaje = _formatear_mensaje(cita)

    if not destino:
        resultado = ResultadoEnvio(exito=False, detalle="El paciente no tiene teléfono")
    else:
        resultado = fn(destino, mensaje)

    log = models.RecordatorioLog(
        cita_id=cita.id,
        canal="whatsapp",
        proveedor=proveedor,
        destino=destino,
        mensaje=mensaje,
        exito=resultado.exito,
        detalle=resultado.detalle,
    )
    db.add(log)
    if resultado.exito:
        cita.recordatorio_enviado = datetime.now(timezone.utc)
    db.commit()
    return resultado

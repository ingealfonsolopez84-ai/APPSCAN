"""Configuración de la aplicación, leída de variables de entorno / .env."""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./citas.db"
    timezone: str = "America/Mexico_City"

    # WhatsApp
    whatsapp_provider: str = "stub"  # stub | twilio | meta
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_whatsapp_from: str = "whatsapp:+14155238886"
    meta_whatsapp_token: str = ""
    meta_whatsapp_phone_id: str = ""


settings = Settings()

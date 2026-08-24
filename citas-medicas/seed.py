"""Genera datos de demostración realistas para probar el sistema.

Uso:
    python seed.py
"""
from __future__ import annotations

import random
from datetime import datetime, time, timedelta, timezone

from app import models
from app.database import SessionLocal, init_db
from app.models import EstadoCita

NOMBRES = [
    "María González", "José Ramírez", "Guadalupe Torres", "Juan Hernández",
    "Ana Martínez", "Luis Sánchez", "Rosa Flores", "Miguel Ángel Cruz",
    "Verónica Díaz", "Roberto Jiménez", "Patricia Morales", "Fernando Reyes",
]


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        # Limpia datos previos
        db.query(models.RecordatorioLog).delete()
        db.query(models.Cita).delete()
        db.query(models.Paciente).delete()
        db.query(models.Consultorio).delete()
        db.commit()

        consultorio = models.Consultorio(
            nombre="Consultorio Dr. Alfonso López",
            medico="Dr. Alfonso López",
            especialidad="Medicina General",
            telefono="+52 352 000 0000",
        )
        db.add(consultorio)
        db.commit()
        db.refresh(consultorio)

        pacientes = []
        for i, nombre in enumerate(NOMBRES):
            p = models.Paciente(
                consultorio_id=consultorio.id,
                nombre=nombre,
                telefono=f"+52352{random.randint(1000000, 9999999)}",
                email=f"paciente{i}@ejemplo.com",
            )
            db.add(p)
            pacientes.append(p)
        db.commit()
        for p in pacientes:
            db.refresh(p)

        # Genera citas de los últimos 45 días + próximos 7 días
        motivos = ["Consulta general", "Control", "Seguimiento", "Revisión", "Primera vez"]
        horas_posibles = [time(h, m) for h in range(9, 19) for m in (0, 30)]
        random.seed(42)

        ahora = datetime.now(timezone.utc)
        total = 0
        for delta_dia in range(-45, 8):
            dia = (ahora + timedelta(days=delta_dia)).date()
            if dia.weekday() == 6:  # domingo cerrado
                continue
            num_citas = random.randint(3, 9)
            horas = random.sample(horas_posibles, num_citas)
            for hora in horas:
                inicio = datetime.combine(dia, hora, tzinfo=timezone.utc)
                paciente = random.choice(pacientes)
                if delta_dia < 0:  # citas pasadas: ya tienen desenlace
                    estado = random.choices(
                        [EstadoCita.atendida, EstadoCita.no_show, EstadoCita.cancelada],
                        weights=[75, 15, 10],
                    )[0]
                else:  # citas futuras
                    estado = random.choice([EstadoCita.programada, EstadoCita.confirmada])
                db.add(
                    models.Cita(
                        consultorio_id=consultorio.id,
                        paciente_id=paciente.id,
                        inicio=inicio,
                        duracion_min=30,
                        estado=estado,
                        motivo=random.choice(motivos),
                    )
                )
                total += 1
        db.commit()
        print(f"Datos creados: {len(pacientes)} pacientes, {total} citas.")
        print(f"Consultorio: {consultorio.nombre}")
    finally:
        db.close()


if __name__ == "__main__":
    main()

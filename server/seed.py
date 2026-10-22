from sqlalchemy import select
from models import Role, Type, EventType


def seed_roles(session):
    existing = session.execute(select(Role.name)).scalars().all()

    default_roles = ["admin", "teacher", "student"]

    for role_name in default_roles:
        if role_name not in existing:
            session.add(Role(name=role_name))

    session.commit()

def seed_types(session):
    existing = session.execute(select(Type.name)).scalars().all()

    default_types = ["python", "blockly"]

    for type_name in default_types:
        if type_name not in existing:
            session.add(Type(name=type_name))

    session.commit()

def seed_event_types(session):
    existing = session.execute(select(EventType.name)).scalars().all()

    default_event_types = [
        "code_edit",
        "sim_run",
        "sim_code_err",
        "sim_end_succ",
        "sim_end_fail",
        "robot_run",
        "robot_code_err",
        "robot_end_succ",
        "robot_end_fail",
        "task_start",
        "task_continue",
        "task_finish",
    ]

    for event_name in default_event_types:
        if event_name not in existing:
            session.add(EventType(name=event_name))

    session.commit()
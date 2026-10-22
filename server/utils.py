from datetime import datetime, timezone

def utc_now():
    return datetime.now(timezone.utc)

def parse_boolean_param(value: str | bool | None) -> bool | None:
    if value is None:
        return None

    if isinstance(value, bool):
        return value

    v = value.lower()

    if v in ("1", "true", "yes", "on"):
        return True
    if v in ("0", "false", "no", "off"):
        return False

    raise ValueError(f"Invalid boolean value: {value}")

def parse_datetime(value: str) -> datetime:
    if not value or not isinstance(value, str):
        raise ValueError("Invalid datetime value")

    s = value.strip()

    if s.endswith("Z"):
        s = s[:-1] + "+00:00"

    try:
        dt = datetime.fromisoformat(s)
    except ValueError:
        raise ValueError(f"Invalid datetime format: {value}")

    # if client sent naive datetime assume UTC
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    # normalize everything to UTC
    return dt.astimezone(timezone.utc)

def _to_utc_iso(dt):
    if dt is None:
        return None
    return dt.astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%fZ')
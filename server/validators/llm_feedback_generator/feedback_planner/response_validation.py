from __future__ import annotations

import re


_NUMERIC_GRADE = re.compile(
    r"\b\d+(?:[.,]\d+)?\s*/\s*5\b|\b(?:ocjena|bodovi)\s*:?\s*\d+",
    re.IGNORECASE,
)


def validate_safety_text(
    text: str,
    *,
    max_length: int,
    reject_newlines: bool,
) -> str | None:
    """Apply mode-independent output safeguards before mode-specific validation."""
    normalized = text.strip()
    if not normalized or len(normalized) > max_length:
        return None
    if reject_newlines and ("\n" in normalized or "\r" in normalized):
        return None
    if _NUMERIC_GRADE.search(normalized):
        return None
    return normalized
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
    """Apply shared length, line-break, and grade checks before mode validation.

    Args:
        text: Raw provider output to normalize and inspect.
        max_length: Character limit for this section or final response.
        reject_newlines: Whether this response shape must fit on one line.

    Returns:
        Trimmed text when it passes every shared safeguard, otherwise None.
    """
    normalized = text.strip()
    if not normalized or len(normalized) > max_length:
        return None
    if reject_newlines and ("\n" in normalized or "\r" in normalized):
        return None
    if _NUMERIC_GRADE.search(normalized):
        return None
    return normalized
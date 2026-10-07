from __future__ import annotations

import logging
import math
from typing import Any

from validators.code_element_detection.analyzer_ast import analyze_code as analyze_code_ast
from validators.code_element_detection.analyzer_regex import analyze_code as analyze_code_regex

logger = logging.getLogger(__name__)


def _roc_weights(positions: list[int]) -> list[float]:
    element_count = len(positions)
    if element_count == 0:
        return []
    weights = [0.0] * element_count
    ranked_indexes = sorted(range(element_count), key=positions.__getitem__)
    for ordinal, index in enumerate(ranked_indexes, start=1):
        weights[index] = sum(
            1 / rank for rank in range(ordinal, element_count + 1)
        ) / element_count
    return weights


def _evidence_for_element(raw_elements: list[dict[str, Any]], element_id: str) -> list[dict[str, Any]]:
    return [
        {
            "lineno": element.get("lineno"),
            "end_lineno": element.get("end_lineno", element.get("lineno")),
            "col_offset": element.get("col_offset"),
            "end_col_offset": element.get("end_col_offset"),
            "issues": [],
        }
        for element in raw_elements
        if element.get("type") == element_id
    ]


def _attach_syntax_issue(
    expected_elements: list[dict[str, Any]],
    syntax_error: dict[str, Any] | None,
) -> None:
    if not syntax_error or not syntax_error.get("lineno"):
        return

    error_start = syntax_error["lineno"]
    error_end = syntax_error.get("end_lineno") or error_start
    issue = f"Pogreška sintakse: {syntax_error['message']}"
    for expected in expected_elements:
        for evidence in expected["evidence"]:
            evidence_start = evidence.get("lineno")
            evidence_end = evidence.get("end_lineno") or evidence_start
            if evidence_start is None or evidence_end is None:
                continue
            if evidence_start <= error_end and error_start <= evidence_end and issue not in evidence["issues"]:
                evidence["issues"].append(issue)
                expected["status"] = "detected_with_issue"
                break


def analyze_task_elements(code: str, selected_elements: list[dict[str, Any]]) -> dict[str, Any]:
    """Analyze supported elements, then project detections onto one activity task."""
    ast_result = analyze_code_ast(code)
    syntax_error = ast_result.get("syntax_error")
    if "error" in ast_result:
        raw_result = analyze_code_regex(code)
        detection_method = "REGEX"
    else:
        raw_result = ast_result
        detection_method = "AST"

    configured = sorted(selected_elements, key=lambda element: element["position"])
    weights = _roc_weights([element["position"] for element in configured])
    expected_elements = []
    for element, weight in zip(configured, weights):
        element_id = element["id"]
        evidence = _evidence_for_element(raw_result.get("code_elements", []), element_id)
        expected_elements.append({
            "element_id": element_id,
            "name": element["name"],
            "description": element.get("description"),
            "feedback_region_description": element.get("feedback_region_description"),
            "position": element["position"],
            "weight": round(weight, 4),
            "count": len(evidence),
            "status": "detected" if evidence else "not_detected",
            "evidence": evidence,
        })

    _attach_syntax_issue(expected_elements, syntax_error)
    weighted_completion = None
    if expected_elements:
        completion = math.fsum(
            weight
            for element, weight in zip(expected_elements, weights)
            if element["status"] == "detected"
        )
        weighted_completion = round(min(1.0, max(0.0, completion)), 4)

    return {
        "syntax_valid": syntax_error is None,
        "detection_method": detection_method,
        "syntax_error": syntax_error,
        "expected_elements": expected_elements,
        "weighted_completion": weighted_completion,
    }
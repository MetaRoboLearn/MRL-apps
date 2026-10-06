from __future__ import annotations

from typing import Any


def _ordered_elements(task_analysis: dict[str, Any]) -> list[dict[str, Any]]:
    elements = task_analysis.get("expected_elements", [])
    if not isinstance(elements, list):
        return []
    return sorted(
        (element for element in elements if isinstance(element, dict)),
        key=lambda element: element.get("position", float("inf")),
    )


def _plan_item(element: dict[str, Any]) -> dict[str, Any]:
    return {
        "kind": "element",
        "element_id": element.get("element_id"),
        "name": element.get("name"),
        "status": element.get("status"),
        "position": element.get("position"),
        "description": element.get("description"),
        "evidence": element.get("evidence", []),
    }


def _has_same_syntax_issue(
    element: dict[str, Any],
    syntax_error: dict[str, Any] | None,
) -> bool:
    if not isinstance(syntax_error, dict):
        return False

    message = syntax_error.get("message")
    error_start = syntax_error.get("lineno")
    if not isinstance(message, str) or not isinstance(error_start, int):
        return False

    error_end = syntax_error.get("end_lineno") or error_start
    issue = f"Pogreška sintakse: {message}"
    evidence_items = element.get("evidence", [])
    if not isinstance(evidence_items, list):
        return False

    for evidence in evidence_items:
        if not isinstance(evidence, dict) or issue not in evidence.get("issues", []):
            continue
        evidence_start = evidence.get("lineno")
        evidence_end = evidence.get("end_lineno") or evidence_start
        if (
            isinstance(evidence_start, int)
            and isinstance(evidence_end, int)
            and evidence_start <= error_end
            and error_start <= evidence_end
        ):
            return True
    return False


def build_feedback_plan(
    task_analysis: dict[str, Any] | None,
    code_standard_analysis: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Select evidence-backed feedback sections without generating their wording."""
    analysis = task_analysis if isinstance(task_analysis, dict) else {}
    expected_elements = _ordered_elements(analysis)

    if not expected_elements:
        return {
            "source": "coding_standard_compatibility",
            "praises": [],
            "completion_statement": None,
            "main_recommendation": None,
            "additional_recommendation": None,
            "reflection_question": None,
            "code_standard_analysis": code_standard_analysis or {},
        }

    detected = [
        element for element in expected_elements
        if element.get("status") == "detected" and element.get("evidence")
    ]
    problems = [
        element for element in expected_elements
        if element.get("status") in ("not_detected", "detected_with_issue")
    ]

    syntax_error = analysis.get("syntax_error")
    syntax_recommendation = (
        {
            "kind": "syntax_error",
            "element_id": None,
            "name": None,
            "status": "detected_with_issue",
            "position": None,
            "description": None,
            "evidence": [],
            "syntax_error": syntax_error,
        }
        if analysis.get("syntax_valid") is False and isinstance(syntax_error, dict)
        else None
    )

    all_detected = len(detected) == len(expected_elements)

    main_recommendation = syntax_recommendation
    if main_recommendation is None and problems:
        main_recommendation = _plan_item(problems[0])

    additional_recommendation = None
    for element in problems:
        if main_recommendation and element.get("element_id") == main_recommendation.get("element_id"):
            continue
        if syntax_recommendation and _has_same_syntax_issue(element, syntax_error):
            continue
        additional_recommendation = _plan_item(element)
        break

    reflection_target = main_recommendation
    if reflection_target is None and detected:
        reflection_target = _plan_item(detected[0])
    reflection_question = None
    if reflection_target:
        reflection_question = {
            "reflection_goal": (
                "refine_existing_code"
                if all_detected and main_recommendation is None
                else "address_selected_issue"
            ),
            "kind": reflection_target["kind"],
            "element_id": reflection_target.get("element_id"),
            "name": reflection_target.get("name"),
            "status": reflection_target.get("status"),
            "description": reflection_target.get("description"),
            "position": reflection_target.get("position"),
            "topic": reflection_target.get("name") or "pogreška sintakse",
            "evidence": reflection_target.get("evidence", []),
            "syntax_error": reflection_target.get("syntax_error"),
        }

    return {
        "source": "task_analysis",
        "syntax_valid": analysis.get("syntax_valid"),
        "detection_method": analysis.get("detection_method"),
        "syntax_error": syntax_error,
        "praises": [_plan_item(element) for element in detected[:2]],
        "completion_statement": (
            "Svi očekivani programski elementi pronađeni su u rješenju."
            if all_detected
            else None
        ),
        "main_recommendation": main_recommendation,
        "additional_recommendation": additional_recommendation,
        "reflection_question": reflection_question,
    }
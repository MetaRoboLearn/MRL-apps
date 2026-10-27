from __future__ import annotations

from typing import Any


def _ordered_elements(task_analysis: dict[str, Any]) -> list[dict[str, Any]]:
    """Normalize and sort expected elements from task-analysis output.

    Args:
        task_analysis: Analysis mapping whose ``expected_elements`` list is read.

    Returns:
        Dictionary elements ordered by their planner ``position`` value.
    """
    elements = task_analysis.get("expected_elements", [])
    if not isinstance(elements, list):
        return []
    return sorted(
        (element for element in elements if isinstance(element, dict)),
        key=lambda element: element.get("position", float("inf")),
    )


def _plan_item(element: dict[str, Any]) -> dict[str, Any]:
    """Project one analyzed element onto the stable feedback-plan item shape.

    Args:
        element: Expected-element record selected for a feedback section.

    Returns:
        The fields shared by recommendation, praise, and reflection planning.
    """
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
    """Check whether element evidence overlaps the analyzer's syntax-error range.

    Args:
        element: Expected element whose evidence and issue labels are examined.
        syntax_error: Analyzer report containing the message and source-line range.

    Returns:
        Whether matching syntax evidence overlaps the reported range.
    """
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


def _syntax_region(
    expected_elements: list[dict[str, Any]],
    syntax_error: dict[str, Any] | None,
) -> str:
    """Find the task-specific region associated with the syntax error.

    Args:
        expected_elements: Ordered task elements used to locate matching evidence.
        syntax_error: Parser result whose line range is matched against that evidence.

    Returns:
        The matching feedback-region description, or a generic structural region.
    """
    for element in expected_elements:
        if _has_same_syntax_issue(element, syntax_error):
            region = element.get("feedback_region_description")
            if isinstance(region, str) and region.strip():
                return region.strip()
    return "opći strukturni dio koda"


def _syntax_recommendation(
    analysis: dict[str, Any],
    expected_elements: list[dict[str, Any]],
) -> dict[str, Any] | None:
    """Create the syntax error's main-recommendation item when syntax is invalid.

    Args:
        analysis: Task-analysis result containing syntax status and parser details.
        expected_elements: Ordered elements used to find a task-specific syntax region.

    Returns:
        A syntax recommendation, or None when no syntax error was reported.
    """
    syntax_error = analysis.get("syntax_error")
    if analysis.get("syntax_valid") is not False or not isinstance(syntax_error, dict):
        return None
    return {
        "kind": "syntax_error",
        "element_id": None,
        "name": None,
        "status": "detected_with_issue",
        "position": None,
        "description": None,
        "evidence": [],
        "syntax_error": syntax_error,
        "syntax_region": _syntax_region(expected_elements, syntax_error),
    }


def _reflection_question(target: dict[str, Any], reflection_goal: str) -> dict[str, Any]:
    """Build reflection context around the selected recommendation or element.

    Args:
        target: Plan item whose evidence and topic should guide reflection.
        reflection_goal: Instructional purpose, such as addressing an issue or refining code.

    Returns:
        Context fields consumed by the reflection-question prompt.
    """
    return {
        "reflection_goal": reflection_goal,
        "kind": target["kind"],
        "element_id": target.get("element_id"),
        "name": target.get("name"),
        "status": target.get("status"),
        "description": target.get("description"),
        "position": target.get("position"),
        "topic": target.get("name") or "pogreška sintakse",
        "evidence": target.get("evidence", []),
        "syntax_error": target.get("syntax_error"),
        "syntax_region": target.get("syntax_region"),
    }


def build_feedback_plan(
    task_analysis: dict[str, Any] | None,
    code_standard_analysis: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Select evidence-backed feedback sections without generating their wording.

    Args:
        task_analysis: Expected elements, evidence, completion, and syntax findings.
        code_standard_analysis: Optional compatibility findings used when no task elements exist.

    Returns:
        A mode-independent plan containing selected feedback items and source metadata.
    """
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

    if all(element.get("status") == "not_detected" for element in expected_elements):
        guidance = _syntax_recommendation(analysis, expected_elements) or _plan_item(expected_elements[0])
        return {
            "source": "all_not_detected",
            "syntax_valid": analysis.get("syntax_valid"),
            "detection_method": analysis.get("detection_method"),
            "syntax_error": analysis.get("syntax_error"),
            "praises": [],
            "completion_statement": None,
            "main_recommendation": guidance,
            "additional_recommendation": None,
            "reflection_question": (
                _reflection_question(guidance, "address_selected_issue") if guidance else None
            ),
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
    syntax_recommendation = _syntax_recommendation(analysis, expected_elements)

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
        reflection_question = _reflection_question(
            reflection_target,
            "refine_existing_code" if all_detected and main_recommendation is None else "address_selected_issue",
        )

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